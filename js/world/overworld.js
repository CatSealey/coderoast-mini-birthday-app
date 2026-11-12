import { CASTLE_ENTRANCE, INTERACTION_RANGE, QUEST_LOCATIONS, WORLD_SIZE, WORLD_SPAWN } from './world-data.js';
import { cameraFor, createWorldArt, projectWorld, unprojectWorld } from './world-art.js';
import { constrainToWorld, distanceBetween, isNearQuest, isQuestAvailable, moveToward, nearestNpcIndex } from './world-logic.js';
import { regionBlendAt } from './world-regions.js';
import { createWorld3D } from './world-3d.js';
import { WORLD_NPCS } from './world-npcs.js';
import { birthdayProgress } from '../progression.js';
import { speechBubblePosition } from './speech-bubble.js';
import { createCollision, findWorldPath, worldObstacles } from './world-collision.js';
import { CHARACTER_HAIR, GUIDE_HAIRSTYLES, PLAYER_OUTFIT, PLAYER_STYLE, TOWNSFOLK_HAIRSTYLES } from '../character-appearance.js';
import { TATTOO_ACCENT, TATTOO_INK } from '../character-body.js';

const WALK_SPEED = 220;
const PLAYER_RADIUS = 12;
const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }
};

function entranceLabelOffset(index) {
  return index === 3 ? { x: -90, y: -50 } : { x: 0, y: -35 };
}

function drawPerson(ctx, color, moving, time, longHair = false, hair = CHARACTER_HAIR, belt = '#dbbd79') {
  const stride = moving ? Math.sin(time / 120) * 5 : 0;
  ctx.fillStyle = 'rgba(10, 20, 15, .38)';
  ctx.beginPath(); ctx.ellipse(4, 2, 19, 7, 0, 0, Math.PI * 2); ctx.fill();
  const isPlayer = color === PLAYER_OUTFIT;
  ctx.strokeStyle = isPlayer ? '#d7aa83' : '#36362e'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(-6 + stride, -2);
  ctx.moveTo(4, -18); ctx.lineTo(6 - stride, -2); ctx.stroke();
  if (isPlayer) {
    ctx.strokeStyle = TATTOO_INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(4.5, -12); ctx.lineTo(5 - stride * 0.65, -5); ctx.stroke();
    ctx.fillStyle = TATTOO_ACCENT; ctx.fillRect(4 - stride * 0.4, -9, 2, 2);
    ctx.fillStyle = PLAYER_STYLE.shorts; ctx.fillRect(-10, -20, 20, 9);
  }
  ctx.fillStyle = '#392d25'; ctx.fillRect(-12 + stride, -4, 10, 5); ctx.fillRect(2 - stride, -4, 10, 5);
  if (longHair) { ctx.fillStyle = hair; ctx.fillRect(-10, -54, 20, 28); }
  ctx.fillStyle = color === PLAYER_OUTFIT ? color : '#d2bd86'; ctx.beginPath(); ctx.moveTo(-9, -42); ctx.lineTo(9, -42);
  ctx.lineTo(13, -17); ctx.lineTo(-12, -17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-11, -41); ctx.lineTo(0, -36); ctx.lineTo(11, -41);
  ctx.lineTo(9, -16); ctx.lineTo(-10, -16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color === PLAYER_OUTFIT ? '#44474b' : '#dbbd79'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -19); ctx.stroke();
  ctx.fillStyle = belt; ctx.fillRect(-10, -20, 20, 3);
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-10, -37); ctx.lineTo(-15, -23 - stride * 0.5);
  ctx.moveTo(10, -37); ctx.lineTo(15, -23 + stride * 0.5); ctx.stroke();
  ctx.fillStyle = '#e1b58d'; ctx.beginPath(); ctx.arc(0, -50, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(0, -54, 9, Math.PI, 0); ctx.lineTo(9, -53); ctx.lineTo(-9, -53); ctx.fill();
  ctx.fillRect(-8, -56, 10, 4);
  if (longHair) { ctx.fillRect(-10, -52, 3, 22); ctx.fillRect(7, -52, 3, 22); }
  ctx.fillStyle = '#49382f'; ctx.fillRect(-4, -50, 2, 2); ctx.fillRect(2, -50, 2, 2);
}

function label(ctx, text, y, color = '#f2e3b1') {
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  const width = ctx.measureText(text).width + 16;
  ctx.fillStyle = 'rgba(12, 20, 22, .88)';
  ctx.beginPath(); ctx.roundRect(-width / 2, y - 14, width, 19, 3); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(text, 0, y);
}

export function mountOverworld({ characterName, worldCanvas, mapCanvas, interactButton, messageElement, locationElement, targetElement, onGuide, onAcceptQuest, onEntrance, onCastle, onTrophyGuide, onAcceptTrophy, onMessage, onQuestSelected }) {
  const mapContext = mapCanvas.getContext('2d');
  if (!mapContext) throw new Error('The browser could not initialize the game world map.');
  const art = createWorldArt();
  const probe = document.createElement('canvas').getContext('webgl2');
  const hasWebGL = Boolean(probe);
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const world3d = hasWebGL ? createWorld3D(worldCanvas, art.ground, characterName) : null;
  const renderNotice = document.querySelector('#worldRenderNotice');
  if (!world3d && renderNotice) renderNotice.hidden = false;
  const context = world3d ? null : worldCanvas.getContext('2d');
  if (!world3d && !context) throw new Error('The browser could not initialize the game world canvas.');
  const speechBubble = document.querySelector('#worldSpeechBubble');
  const speechName = document.querySelector('#worldSpeechName');
  const speechText = document.querySelector('#worldSpeechText');
  const speechChoices = document.querySelector('#worldSpeechChoices');
  const acceptOfferButton = document.querySelector('#acceptQuestOffer');
  const declineOfferButton = document.querySelector('#declineQuestOffer');
  const state = {
    player: { ...WORLD_SPAWN }, target: null, questIndex: null, destinationKind: 'guide', pendingEntrance: null,
    completed: Array(QUEST_LOCATIONS.length).fill(false), accepted: Array(QUEST_LOCATIONS.length).fill(false), finaleCompleted: false, paused: false,
    npcIndex: null, npcDialogue: Array(WORLD_NPCS.length).fill(0), speaker: null,
    frame: 0, lastFrame: 0, keys: new Set(), heldDirections: new Set(), disposed: false, path: []
  };
  const collision = createCollision(worldObstacles(), PLAYER_RADIUS);
  let canvasWidth = 0;
  let canvasHeight = 0;
  let zoom = 1;
  let camera = { x: 0, y: 0 };
  let animationFrame = 0;

  function say(message) {
    if (messageElement) messageElement.textContent = message;
    onMessage?.(message);
  }

  function setDestination(destination) {
    const target = constrainToWorld(destination, PLAYER_RADIUS);
    const path = findWorldPath(state.player, target, collision);
    if (!path) {
      state.target = null; state.path = []; state.pendingEntrance = null;
      say('There is no clear route to that destination. Choose another spot.');
      return false;
    }
    state.target = path.at(-1) || { ...state.player };
    state.path = path;
    return true;
  }

  function clearSpeech() {
    if (speechBubble.contains(document.activeElement)) worldCanvas.focus();
    state.speaker = null;
    speechBubble.hidden = true;
    speechBubble.setAttribute('aria-hidden', 'true');
    speechChoices.hidden = true;
  }

  function updateSpeechBubble() {
    if (state.speaker === null || state.paused) return;
    const { kind, index } = state.speaker;
    const npc = kind === 'guide' ? QUEST_LOCATIONS[index] : WORLD_NPCS[index];
    if (!isNearQuest(state.player, npc)) {
      clearSpeech();
      return;
    }
    const groundPoint = world3d ? null : projectWorld(npc, camera, zoom);
    const anchor = world3d
      ? kind === 'guide' ? world3d.guideSpeechAnchor(index) : world3d.npcSpeechAnchor(index)
      : { x: groundPoint.x, y: groundPoint.y - (kind === 'guide' ? 120 : 95) * zoom };
    if (!anchor || anchor.x < 0 || anchor.x > canvasWidth || anchor.y < 0 || anchor.y > canvasHeight) {
      speechBubble.hidden = true;
      return;
    }
    speechBubble.hidden = false;
    const { x, y, tailX } = speechBubblePosition(anchor,
      { width: canvasWidth, height: canvasHeight },
      { width: speechBubble.offsetWidth, height: speechBubble.offsetHeight });
    speechBubble.style.transform = `translate(${x}px, ${y}px)`;
    speechBubble.style.setProperty('--speech-tail-x', `${tailX}px`);
  }

  function showGuideSpeech(index, words, offer) {
    clearSpeech();
    state.speaker = { kind: 'guide', index };
    speechName.textContent = QUEST_LOCATIONS[index].guide;
    speechText.textContent = words;
    speechChoices.hidden = !offer;
    speechBubble.setAttribute('aria-hidden', offer ? 'false' : 'true');
    say(`${QUEST_LOCATIONS[index].guide}: ${words}`);
    drawWorld();
    if (offer && !speechBubble.hidden) acceptOfferButton.focus();
  }

  function acceptOffer() {
    if (!state.speaker || speechChoices.hidden) return;
    if (state.speaker.kind === 'npc' && WORLD_NPCS[state.speaker.index].trophyGuide) {
      clearSpeech(); onAcceptTrophy(); return;
    }
    if (state.speaker.kind !== 'guide') return;
    const index = state.speaker.index;
    clearSpeech();
    onAcceptQuest(index);
  }

  function declineOffer() {
    if (!state.speaker || speechChoices.hidden) return;
    const guide = state.speaker.kind === 'guide' ? QUEST_LOCATIONS[state.speaker.index].guide : WORLD_NPCS[state.speaker.index].name;
    clearSpeech();
    say(`You can speak to ${guide} again whenever you're ready.`);
  }

  function questIsAvailable(index) {
    return isQuestAvailable(index, state.completed);
  }

  function nearbyQuest() {
    let best = null, distance = INTERACTION_RANGE;
    QUEST_LOCATIONS.forEach((quest, index) => {
      for (const [kind, point] of [['guide', quest], ['entrance', quest.entrance]]) {
        const candidate = distanceBetween(state.player, point);
        if (candidate < distance) { distance = candidate; best = { index, kind }; }
      }
    });
    return best;
  }

  function updateInteraction() {
    const nearby = nearbyQuest();
    const nearCastle = distanceBetween(state.player, CASTLE_ENTRANCE) < INTERACTION_RANGE;
    const quest = nearby ? QUEST_LOCATIONS[nearby.index] : QUEST_LOCATIONS[state.questIndex];
    const nearbyNpc = nearestNpcIndex(state.player, WORLD_NPCS);
    const npcIndex = state.npcIndex ?? (!nearby && nearbyNpc !== -1
      && (!nearCastle || distanceBetween(state.player, WORLD_NPCS[nearbyNpc]) < distanceBetween(state.player, CASTLE_ENTRANCE)) ? nearbyNpc : null);
    const npc = npcIndex === null ? null : WORLD_NPCS[npcIndex];
    const nearNpc = npc && isNearQuest(state.player, npc);
    const location = regionBlendAt(state.player).region.name;
    if (locationElement.textContent !== location) locationElement.textContent = location;
    interactButton.disabled = false;
    const buttonText = npc
      ? `${nearNpc ? 'Speak to' : 'Walk to'} ${npc.name}`
      : nearCastle ? 'Enter castle trophy room'
        : nearby ? nearby.kind === 'guide' ? `Speak to ${quest.guide}` : `Enter ${quest.entrance.name}`
        : quest ? `Walk to ${state.destinationKind === 'entrance' ? quest.entrance.name : quest.guide}` : 'Explore to find a quest giver';
    if (interactButton.textContent !== buttonText) interactButton.textContent = buttonText;
    const buttonLabel = buttonText;
    if (interactButton.getAttribute('aria-label') !== buttonLabel) interactButton.setAttribute('aria-label', buttonLabel);
    interactButton.classList.toggle('world-interact--ready', Boolean(npc ? nearNpc : nearby || nearCastle));
    const target = npc && state.npcIndex !== null ? `SPEAK TO · ${npc.name.toUpperCase()}`
      : nearCastle ? 'CASTLE TROPHY ROOM · READY'
        : nearby ? `${nearby.kind === 'guide' ? 'QUEST GUIDE' : 'ENTRANCE'} · READY`
        : quest ? `DESTINATION · ${quest.name.toUpperCase()}` : 'EXPLORE · FIND QUEST GIVERS';
    if (targetElement.textContent !== target) targetElement.textContent = target;
  }

  function resizeCanvas(canvas, ctx, callback) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!rect.width || !rect.height) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    callback(rect.width, rect.height);
  }

  function resize() {
    const rect = worldCanvas.getBoundingClientRect();
    if (rect.width && rect.height) {
      canvasWidth = rect.width;
      canvasHeight = rect.height;
      zoom = Math.max(0.65, Math.min(1, canvasWidth / 820));
      if (world3d) world3d.resize(canvasWidth, canvasHeight, zoom);
      else resizeCanvas(worldCanvas, context, () => {});
    }
    resizeCanvas(mapCanvas, mapContext, () => {});
    drawWorld();
    drawMinimap();
  }

  function drawWorld() {
    if (state.disposed || !canvasWidth || !canvasHeight) return;
    if (world3d) {
      world3d.draw(state.player, state.questIndex, state.completed,
        Boolean(state.target || state.keys.size || state.heldDirections.size), state.frame);
      updateSpeechBubble();
      return;
    }
    camera = cameraFor(state.player, canvasWidth, canvasHeight, zoom);
    const actors = QUEST_LOCATIONS.map((quest, index) => ({
      x: quest.x, y: quest.y,
      draw(ctx) {
        const selected = index === state.questIndex;
        const available = questIsAvailable(index);
        if (selected && isNearQuest(state.player, quest)) {
          ctx.strokeStyle = 'rgba(238, 210, 135, .7)';
          ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath();
          ctx.ellipse(0, 0, INTERACTION_RANGE, INTERACTION_RANGE * 0.68, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        }
        const { longHair, hair } = GUIDE_HAIRSTYLES[index % GUIDE_HAIRSTYLES.length];
        drawPerson(ctx, index === 4 ? '#765849' : '#725b46', false, state.frame, longHair, hair);
        ctx.fillStyle = available ? '#d9b866' : '#8b9692';
        ctx.strokeStyle = '#2c2920'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -80, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#233329'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(state.completed[index] ? '✓' : '!', 0, -74);
        if (selected) label(ctx, quest.guide, -101);
      }
    }));
    QUEST_LOCATIONS.forEach((quest, index) => actors.push({
      ...quest.entrance,
      draw(ctx) {
        ctx.strokeStyle = '#e6bf63'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 21, 9, 0, 0, Math.PI * 2); ctx.stroke();
        const offset = entranceLabelOffset(index);
        ctx.save(); ctx.translate(offset.x, 0);
        label(ctx, `ENTER · ${quest.entrance.name}`, offset.y);
        ctx.restore();
      }
    }));
    WORLD_NPCS.forEach((npc, index) => actors.push({
      x: npc.x, y: npc.y,
      draw(ctx) {
        const { longHair, hair } = TOWNSFOLK_HAIRSTYLES[index % TOWNSFOLK_HAIRSTYLES.length];
        drawPerson(ctx, npc.color, false, state.frame, longHair, hair);
        label(ctx, npc.name, -78);
      }
    }));
    actors.push({
      ...state.player,
      draw(ctx) {
        drawPerson(ctx, PLAYER_OUTFIT, Boolean(state.target || state.keys.size || state.heldDirections.size), state.frame, true, CHARACTER_HAIR, PLAYER_STYLE.belt);
        label(ctx, `${characterName.toUpperCase()} · ${birthdayProgress(state.completed, state.finaleCompleted).level}`, -70);
      }
    });
    art.draw(context, camera, zoom, canvasWidth, canvasHeight, actors);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vignette = context.createRadialGradient(canvasWidth / 2, canvasHeight / 2, canvasHeight * 0.2,
      canvasWidth / 2, canvasHeight / 2, Math.max(canvasWidth, canvasHeight) * 0.8);
    vignette.addColorStop(0, 'rgba(11, 18, 19, 0)');
    vignette.addColorStop(1, 'rgba(11, 18, 19, .32)');
    context.fillStyle = vignette;
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    updateSpeechBubble();
  }

  function drawMinimap() {
    if (state.disposed || !mapCanvas.width || !mapCanvas.height) return;
    const { width, height } = mapCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    mapContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    mapContext.drawImage(art.ground, 0, 0, width, height);
    const px = (x) => x / WORLD_SIZE.width * width;
    const py = (y) => y / WORLD_SIZE.height * height;
    const active = QUEST_LOCATIONS[state.questIndex];
    if (active) {
      const target = state.destinationKind === 'entrance' ? active.entrance : active;
      mapContext.beginPath(); mapContext.moveTo(px(state.player.x), py(state.player.y));
      mapContext.lineTo(px(target.x), py(target.y)); mapContext.setLineDash([4, 4]);
      mapContext.strokeStyle = 'rgba(255, 237, 177, .85)'; mapContext.lineWidth = 1.5; mapContext.stroke();
      mapContext.setLineDash([]);
    }
    const homeX = px(WORLD_SPAWN.x);
    const homeY = py(WORLD_SPAWN.y);
    mapContext.fillStyle = '#e6d3a1'; mapContext.strokeStyle = '#273c33'; mapContext.lineWidth = 1.5;
    mapContext.beginPath(); mapContext.moveTo(homeX, homeY - 7); mapContext.lineTo(homeX + 6, homeY - 2);
    mapContext.lineTo(homeX + 5, homeY + 5); mapContext.lineTo(homeX - 5, homeY + 5);
    mapContext.lineTo(homeX - 6, homeY - 2); mapContext.closePath(); mapContext.fill(); mapContext.stroke();
    QUEST_LOCATIONS.forEach((quest, index) => {
      mapContext.beginPath(); mapContext.arc(px(quest.x), py(quest.y), state.questIndex === index ? 7 : 5, 0, Math.PI * 2);
      mapContext.fillStyle = state.completed[index] ? '#9bcc86' : questIsAvailable(index) ? '#edcf82' : '#829093';
      mapContext.fill(); mapContext.strokeStyle = '#17231d'; mapContext.lineWidth = 2; mapContext.stroke();
    });
    mapContext.beginPath(); mapContext.arc(px(state.player.x), py(state.player.y), 4, 0, Math.PI * 2);
    mapContext.fillStyle = '#fff8e4'; mapContext.fill(); mapContext.strokeStyle = '#273c33'; mapContext.stroke();
  }

  function chooseQuest(index, walk = true, destinationKind = state.accepted[index] ? 'entrance' : 'guide') {
    if (!questIsAvailable(index)) {
      say('That quest destination does not exist.');
      return false;
    }
    state.questIndex = index;
    state.destinationKind = destinationKind;
    state.pendingEntrance = null;
    clearSpeech();
    state.npcIndex = null;
    const quest = QUEST_LOCATIONS[index];
    const destination = destinationKind === 'entrance' ? quest.entrance : quest;
    if (walk && !setDestination(destination)) return false;
    if (!walk) { state.target = null; state.path = []; }
    onQuestSelected?.(index);
    say(walk
      ? `Walking to ${destinationKind === 'entrance' ? quest.entrance.name : quest.guide}.`
      : `Welcome to Lumbridge Castle, ${characterName}. Find quest givers marked on the map.`);
    updateInteraction();
    return true;
  }

  function interact() {
    if (state.paused) return;
    const nearby = nearbyQuest();
    const nearCastle = distanceBetween(state.player, CASTLE_ENTRANCE) < INTERACTION_RANGE;
    const nearbyNpc = nearestNpcIndex(state.player, WORLD_NPCS);
    const npcIndex = state.npcIndex ?? (!nearby && nearbyNpc !== -1
      && (!nearCastle || distanceBetween(state.player, WORLD_NPCS[nearbyNpc]) < distanceBetween(state.player, CASTLE_ENTRANCE)) ? nearbyNpc : null);
    if (npcIndex !== null) {
      const npc = WORLD_NPCS[npcIndex];
      if (!isNearQuest(state.player, npc)) {
        clearSpeech();
        if (!setDestination(moveToward(npc, state.player, 45))) return;
        say(`Walking to ${npc.name}. Speak to them when you arrive.`);
      } else {
        state.target = null;
        if (npc.trophyGuide) { onTrophyGuide(); return; }
        const line = state.npcDialogue[npcIndex] % npc.dialogue.length;
        const words = npc.dialogue[line].replaceAll('{player}', characterName);
        speechName.textContent = npc.name;
        speechText.textContent = words;
        speechChoices.hidden = true;
        state.speaker = { kind: 'npc', index: npcIndex };
        say(`${npc.name}: ${words}`);
        state.npcDialogue[npcIndex] += 1;
        drawWorld();
      }
      return;
    }
    if (nearCastle && state.npcIndex === null) {
      state.target = null; state.pendingEntrance = null; clearSpeech();
      onCastle();
    } else if (nearby) {
      state.target = null; state.pendingEntrance = null; clearSpeech();
      state.questIndex = nearby.index;
      state.destinationKind = nearby.kind;
      onQuestSelected?.(nearby.index);
      if (nearby.kind === 'guide') onGuide(nearby.index);
      else if (!onEntrance(nearby.index)) say(`Speak to ${QUEST_LOCATIONS[nearby.index].guide} to accept the quest first.`);
    } else if (state.questIndex !== null) {
      const quest = QUEST_LOCATIONS[state.questIndex];
      const target = state.destinationKind === 'entrance' ? quest.entrance : quest;
      clearSpeech();
      if (!setDestination(target)) return;
      say(`Keep walking to ${state.destinationKind === 'entrance' ? quest.entrance.name : quest.guide}.`);
    } else {
      say('Find a quest giver marked on the world map.');
    }
  }

  function pointerWorldPosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    return canvas === mapCanvas
      ? { x: point.x / rect.width * WORLD_SIZE.width, y: point.y / rect.height * WORLD_SIZE.height }
      : world3d ? world3d.screenToWorld(point) : unprojectWorld(point, camera, zoom);
  }

  function handleWorldClick(event) {
    if (state.paused) return;
    worldCanvas.focus();
    const screen = { x: event.clientX - worldCanvas.getBoundingClientRect().left, y: event.clientY - worldCanvas.getBoundingClientRect().top };
    const entranceIndex = world3d ? world3d.entranceAt(screen) : QUEST_LOCATIONS.findIndex((quest, index) => {
      const position = projectWorld(quest.entrance, camera, zoom);
      const offset = entranceLabelOffset(index);
      return Math.abs(screen.x - (position.x + offset.x * zoom)) <= 80 * zoom
        && Math.abs(screen.y - (position.y + offset.y * zoom)) <= 16 * zoom;
    });
    if (entranceIndex !== -1) {
      const quest = QUEST_LOCATIONS[entranceIndex];
      state.questIndex = entranceIndex; state.destinationKind = 'entrance'; state.npcIndex = null;
      state.target = null; state.pendingEntrance = null; clearSpeech();
      onQuestSelected?.(entranceIndex);
      if (!state.accepted[entranceIndex]) {
        say(`Speak to ${quest.guide} to accept the quest first.`);
      } else {
        if (!setDestination(quest.entrance)) return;
        state.pendingEntrance = entranceIndex;
        say(`Walking to ${quest.entrance.name}.`);
      }
      return;
    }
    const markerIndex = world3d ? world3d.markerAt(screen) : QUEST_LOCATIONS.findIndex((quest) => {
      const position = projectWorld(quest, camera, zoom);
      return Math.hypot(screen.x - position.x, screen.y - (position.y - 65 * zoom)) <= 25 * zoom;
    });
    if (markerIndex !== -1) return void chooseQuest(markerIndex, true, 'guide');
    const npcIndex = world3d ? world3d.npcAt(screen) : WORLD_NPCS.findIndex((npc) => {
      const position = projectWorld(npc, camera, zoom);
      return Math.hypot(screen.x - position.x, screen.y - (position.y - 36 * zoom)) <= 25 * zoom;
    });
    if (npcIndex !== -1) {
      state.pendingEntrance = null;
      state.npcIndex = npcIndex;
      interact();
      updateInteraction();
      return;
    }
    const position = pointerWorldPosition(event, worldCanvas);
    if (!position) {
      say('Click the ground to set a destination.');
      return;
    }
    if (!setDestination(position)) return;
    state.pendingEntrance = null;
    clearSpeech();
    state.npcIndex = null;
    say(`Destination set. ${characterName} is on the move.`);
  }

  function handleMapClick(event) {
    if (state.paused) return;
    const rect = mapCanvas.getBoundingClientRect();
    const point = pointerWorldPosition(event, mapCanvas);
    if (Math.hypot((point.x - WORLD_SPAWN.x) / WORLD_SIZE.width * rect.width,
      (point.y - WORLD_SPAWN.y) / WORLD_SIZE.height * rect.height) <= 10) {
      if (!setDestination(CASTLE_ENTRANCE)) return;
      state.pendingEntrance = null; state.npcIndex = null;
      state.questIndex = null; clearSpeech();
      say('Walking to the castle trophy room. Investigate the entrance when you arrive.');
      return;
    }
    const markerIndex = QUEST_LOCATIONS.findIndex((quest) => Math.hypot(
      (point.x - quest.x) / WORLD_SIZE.width * rect.width, (point.y - quest.y) / WORLD_SIZE.height * rect.height
    ) <= 10);
    if (markerIndex !== -1) return void chooseQuest(markerIndex, true, 'guide');
    if (!setDestination(point)) return;
    state.pendingEntrance = null;
    clearSpeech();
    state.npcIndex = null;
    say('Destination set from the world map.');
  }

  function handleKeyDown(event) {
    if (state.paused || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape') {
      if (state.speaker) { event.preventDefault(); clearSpeech(); }
      return;
    }
    const direction = DIRECTIONS[event.key] ?? DIRECTIONS[event.key.toLowerCase()];
    if (direction && state.speaker && !speechChoices.hidden) clearSpeech();
    if (event.target instanceof Element && (
      event.target.closest('input, select, textarea, [contenteditable="true"]')
      || (event.target.closest('#worldSpeechChoices') && !direction)
      || (event.key === ' ' && event.target.closest('button'))
    )) return;
    if (direction) {
      event.preventDefault();
      state.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      state.target = null;
      state.pendingEntrance = null;
      state.npcIndex = null;
    } else if (event.key === 'e' || event.key === 'E' || event.key === ' ') {
      event.preventDefault(); interact();
    }
  }

  function handleKeyUp(event) {
    state.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  }

  function handleTouchStart(event) {
    if (state.paused) return;
    const button = event.target.closest('[data-world-direction]');
    if (!button) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    state.heldDirections.add(button.dataset.worldDirection);
    state.target = null;
    state.pendingEntrance = null;
    state.npcIndex = null;
  }

  function handleTouchEnd(event) {
    const button = event.target.closest('[data-world-direction]');
    if (button) state.heldDirections.delete(button.dataset.worldDirection);
  }

  function clearMovement() {
    state.keys.clear();
    state.heldDirections.clear();
  }

  function tick(timestamp) {
    if (state.disposed) return;
    const delta = state.lastFrame ? Math.min((timestamp - state.lastFrame) / 1000, 0.05) : 0;
    state.lastFrame = timestamp; state.frame = timestamp;
    if (!state.paused) {
      let dx = 0;
      let dy = 0;
      [...state.keys, ...state.heldDirections].forEach((key) => {
        const direction = DIRECTIONS[key] ?? DIRECTIONS[{ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[key]];
        if (direction) { dx += direction.x; dy += direction.y; }
      });
      if (dx || dy) {
        const magnitude = Math.hypot(dx, dy);
        state.player = collision.move(state.player, dx / magnitude * WALK_SPEED * delta, dy / magnitude * WALK_SPEED * delta);
      } else if (state.target) {
        const waypoint = state.path[0];
        if (waypoint) {
          const next = moveToward(state.player, waypoint, WALK_SPEED * delta);
          state.player = collision.move(state.player, next.x - state.player.x, next.y - state.player.y);
          if (distanceBetween(state.player, waypoint) <= 1) state.path.shift();
        }
        if (state.pendingEntrance !== null && isNearQuest(state.player, QUEST_LOCATIONS[state.pendingEntrance].entrance)) {
          const index = state.pendingEntrance;
          state.pendingEntrance = null; state.target = null;
          onEntrance(index);
        } else if (!state.path.length) { state.target = null; state.pendingEntrance = null; }
      }
    }
    updateInteraction(); drawWorld(); drawMinimap();
    animationFrame = window.requestAnimationFrame(tick);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(worldCanvas); resizeObserver.observe(mapCanvas);
  worldCanvas.addEventListener('click', handleWorldClick);
  mapCanvas.addEventListener('click', handleMapClick);
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  interactButton.addEventListener('click', interact);
  acceptOfferButton.addEventListener('click', acceptOffer);
  declineOfferButton.addEventListener('click', declineOffer);
  worldCanvas.parentElement.addEventListener('pointerdown', handleTouchStart);
  worldCanvas.parentElement.addEventListener('pointerup', handleTouchEnd);
  worldCanvas.parentElement.addEventListener('pointercancel', handleTouchEnd);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', clearMovement);
  resize(); updateInteraction();
  animationFrame = window.requestAnimationFrame(tick);

  return {
    setQuestStates(completed, accepted, finaleCompleted = false) {
      state.completed = [...completed];
      state.accepted = [...accepted];
      state.finaleCompleted = finaleCompleted;
      world3d?.setPlayerLevel(birthdayProgress(state.completed, state.finaleCompleted).level);
      updateInteraction(); drawWorld(); drawMinimap();
    },
    selectQuest: chooseQuest,
    showGuideSpeech,
    showTrophySpeech(words, offer) {
      clearSpeech();
      const index = WORLD_NPCS.findIndex((npc) => npc.trophyGuide);
      state.speaker = { kind: 'npc', index };
      speechName.textContent = WORLD_NPCS[index].name; speechText.textContent = words;
      speechChoices.hidden = !offer; speechBubble.setAttribute('aria-hidden', offer ? 'false' : 'true');
      say(`${WORLD_NPCS[index].name}: ${words}`); drawWorld();
      if (offer && !speechBubble.hidden) acceptOfferButton.focus();
    },
    walkToCastle() {
      state.questIndex = null; state.pendingEntrance = null; state.npcIndex = null; clearSpeech();
      if (setDestination(CASTLE_ENTRANCE)) say('Walking to the castle trophy room. Investigate the entrance when you arrive.');
    },
    clearQuestSelection(index = null) {
      if (index !== null && state.questIndex !== index) return;
      state.questIndex = null; state.target = null; state.pendingEntrance = null; state.npcIndex = null;
      clearSpeech(); updateInteraction(); drawWorld(); drawMinimap();
    },
    setPaused(paused) {
      state.paused = paused;
      if (paused) { clearMovement(); clearSpeech(); }
    },
    getPlayerPosition() { return { ...state.player }; },
    dispose() {
      state.disposed = true; window.cancelAnimationFrame(animationFrame); resizeObserver.disconnect();
      clearSpeech();
      worldCanvas.removeEventListener('click', handleWorldClick); mapCanvas.removeEventListener('click', handleMapClick);
      document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('keyup', handleKeyUp);
      interactButton.removeEventListener('click', interact);
      acceptOfferButton.removeEventListener('click', acceptOffer);
      declineOfferButton.removeEventListener('click', declineOffer);
      worldCanvas.parentElement.removeEventListener('pointerdown', handleTouchStart);
      worldCanvas.parentElement.removeEventListener('pointerup', handleTouchEnd);
      worldCanvas.parentElement.removeEventListener('pointercancel', handleTouchEnd);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', clearMovement);
      world3d?.dispose();
    }
  };
}
