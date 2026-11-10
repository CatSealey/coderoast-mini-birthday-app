import { INTERACTION_RANGE, QUEST_LOCATIONS, WORLD_SIZE, WORLD_SPAWN } from './world-data.js';
import { cameraFor, createWorldArt, projectWorld, unprojectWorld } from './world-art.js';
import { constrainToWorld, distanceBetween, isNearQuest, isQuestAvailable, moveToward } from './world-logic.js';

const WALK_SPEED = 220;
const PLAYER_RADIUS = 12;
const DIRECTIONS = {
  ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }
};

function drawPerson(ctx, color, moving, time) {
  const stride = moving ? Math.sin(time / 120) * 5 : 0;
  ctx.fillStyle = 'rgba(10, 20, 15, .38)';
  ctx.beginPath(); ctx.ellipse(4, 2, 19, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#36362e'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-4, -18); ctx.lineTo(-6 + stride, -2);
  ctx.moveTo(4, -18); ctx.lineTo(6 - stride, -2); ctx.stroke();
  ctx.fillStyle = '#392d25'; ctx.fillRect(-12 + stride, -4, 10, 5); ctx.fillRect(2 - stride, -4, 10, 5);
  ctx.fillStyle = '#d2bd86'; ctx.beginPath(); ctx.moveTo(-9, -42); ctx.lineTo(9, -42);
  ctx.lineTo(13, -17); ctx.lineTo(-12, -17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-11, -41); ctx.lineTo(0, -36); ctx.lineTo(11, -41);
  ctx.lineTo(9, -16); ctx.lineTo(-10, -16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#dbbd79'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -36); ctx.lineTo(0, -19); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-10, -37); ctx.lineTo(-15, -23);
  ctx.moveTo(10, -37); ctx.lineTo(15, -23); ctx.stroke();
  ctx.fillStyle = '#e1b58d'; ctx.beginPath(); ctx.arc(0, -50, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#46342a'; ctx.beginPath(); ctx.arc(0, -54, 8, Math.PI, 0); ctx.lineTo(8, -51); ctx.lineTo(-8, -51); ctx.fill();
}

function label(ctx, text, y, color = '#f2e3b1') {
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  const width = ctx.measureText(text).width + 16;
  ctx.fillStyle = 'rgba(12, 20, 22, .88)';
  ctx.beginPath(); ctx.roundRect(-width / 2, y - 14, width, 19, 3); ctx.fill();
  ctx.fillStyle = color; ctx.fillText(text, 0, y);
}

export function mountOverworld({ worldCanvas, mapCanvas, interactButton, messageElement, locationElement, targetElement, onInteract, onMessage, onQuestSelected }) {
  const context = worldCanvas.getContext('2d');
  const mapContext = mapCanvas.getContext('2d');
  if (!context || !mapContext) throw new Error('The browser could not initialize the game world canvas.');
  const art = createWorldArt();
  const state = {
    player: { ...WORLD_SPAWN }, target: null, questIndex: 0,
    completed: Array(QUEST_LOCATIONS.length).fill(false), paused: false,
    frame: 0, lastFrame: 0, keys: new Set(), heldDirections: new Set(), disposed: false
  };
  let canvasWidth = 0;
  let canvasHeight = 0;
  let zoom = 1;
  let camera = { x: 0, y: 0 };
  let animationFrame = 0;

  function say(message) {
    if (messageElement) messageElement.textContent = message;
    onMessage?.(message);
  }

  function questIsAvailable(index) {
    return isQuestAvailable(index, state.completed);
  }

  function updateInteraction() {
    const quest = QUEST_LOCATIONS[state.questIndex];
    const nearby = isNearQuest(state.player, quest);
    const nearest = QUEST_LOCATIONS.map((item) => ({ item, distance: distanceBetween(state.player, item) }))
      .sort((a, b) => a.distance - b.distance)[0];
    const location = nearest.distance < 420 ? nearest.item.region : 'GIELINOR · THE OPEN ROAD';
    if (locationElement.textContent !== location) locationElement.textContent = location;
    interactButton.disabled = false;
    const buttonText = nearby
      ? `${state.completed[state.questIndex] ? 'Replay' : 'Speak to'} ${quest.guide}`
      : `Walk to ${quest.name}`;
    if (interactButton.textContent !== buttonText) interactButton.textContent = buttonText;
    const buttonLabel = nearby
      ? `${state.completed[state.questIndex] ? 'Replay' : 'Speak to'} ${quest.guide} at ${quest.name}`
      : `Walk to ${quest.name}`;
    if (interactButton.getAttribute('aria-label') !== buttonLabel) interactButton.setAttribute('aria-label', buttonLabel);
    interactButton.classList.toggle('world-interact--ready', nearby);
    const target = nearby ? 'QUEST LOCATION · READY' : `DESTINATION · ${quest.name.toUpperCase()}`;
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
    resizeCanvas(worldCanvas, context, (width, height) => {
      canvasWidth = width;
      canvasHeight = height;
      zoom = Math.max(0.65, Math.min(1, width / 820));
    });
    resizeCanvas(mapCanvas, mapContext, () => {});
    drawWorld();
    drawMinimap();
  }

  function drawWorld() {
    if (state.disposed || !canvasWidth || !canvasHeight) return;
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
        drawPerson(ctx, index === 4 ? '#765849' : '#725b46', false, state.frame);
        ctx.fillStyle = available ? '#d9b866' : '#8b9692';
        ctx.strokeStyle = '#2c2920'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -80, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#233329'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(state.completed[index] ? '✓' : '!', 0, -74);
        if (selected) label(ctx, quest.name, -101);
      }
    }));
    actors.push({
      ...state.player,
      draw(ctx) {
        drawPerson(ctx, '#315a49', Boolean(state.target || state.keys.size || state.heldDirections.size), state.frame);
        label(ctx, 'DANWELL · 30', -70);
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
    mapContext.beginPath(); mapContext.moveTo(px(state.player.x), py(state.player.y));
    mapContext.lineTo(px(active.x), py(active.y)); mapContext.setLineDash([4, 4]);
    mapContext.strokeStyle = 'rgba(255, 237, 177, .85)'; mapContext.lineWidth = 1.5; mapContext.stroke();
    mapContext.setLineDash([]);
    QUEST_LOCATIONS.forEach((quest, index) => {
      mapContext.beginPath(); mapContext.arc(px(quest.x), py(quest.y), state.questIndex === index ? 7 : 5, 0, Math.PI * 2);
      mapContext.fillStyle = state.completed[index] ? '#9bcc86' : questIsAvailable(index) ? '#edcf82' : '#829093';
      mapContext.fill(); mapContext.strokeStyle = '#17231d'; mapContext.lineWidth = 2; mapContext.stroke();
    });
    mapContext.beginPath(); mapContext.arc(px(state.player.x), py(state.player.y), 4, 0, Math.PI * 2);
    mapContext.fillStyle = '#fff8e4'; mapContext.fill(); mapContext.strokeStyle = '#273c33'; mapContext.stroke();
  }

  function chooseQuest(index) {
    if (!questIsAvailable(index)) {
      say('That quest is still locked. Complete the previous chapter first.');
      return false;
    }
    state.questIndex = index;
    const quest = QUEST_LOCATIONS[index];
    state.target = { x: quest.x, y: quest.y };
    onQuestSelected?.(index);
    say(`Walking to ${quest.name}. Use the arrows or WASD to move, or click a place in the world.`);
    updateInteraction();
    return true;
  }

  function interact() {
    const quest = QUEST_LOCATIONS[state.questIndex];
    if (!questIsAvailable(state.questIndex)) {
      say('That quest is still locked. Complete the previous chapter first.');
    } else if (!isNearQuest(state.player, quest)) {
      state.target = { x: quest.x, y: quest.y };
      say(`Keep walking to ${quest.name} to meet ${quest.guide}.`);
    } else {
      state.target = null;
      onInteract(state.questIndex, state.completed[state.questIndex]);
    }
  }

  function pointerWorldPosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    return canvas === mapCanvas
      ? { x: point.x / rect.width * WORLD_SIZE.width, y: point.y / rect.height * WORLD_SIZE.height }
      : unprojectWorld(point, camera, zoom);
  }

  function handleWorldClick(event) {
    worldCanvas.focus();
    const screen = { x: event.clientX - worldCanvas.getBoundingClientRect().left, y: event.clientY - worldCanvas.getBoundingClientRect().top };
    const markerIndex = QUEST_LOCATIONS.findIndex((quest) => {
      const position = projectWorld(quest, camera, zoom);
      return Math.hypot(screen.x - position.x, screen.y - (position.y - 65 * zoom)) <= 25 * zoom;
    });
    if (markerIndex !== -1) return void chooseQuest(markerIndex);
    state.target = constrainToWorld(pointerWorldPosition(event, worldCanvas), PLAYER_RADIUS);
    say('Destination set. Danwell is on the move.');
  }

  function handleMapClick(event) {
    const rect = mapCanvas.getBoundingClientRect();
    const point = pointerWorldPosition(event, mapCanvas);
    const markerIndex = QUEST_LOCATIONS.findIndex((quest) => Math.hypot(
      (point.x - quest.x) / WORLD_SIZE.width * rect.width, (point.y - quest.y) / WORLD_SIZE.height * rect.height
    ) <= 10);
    if (markerIndex !== -1) return void chooseQuest(markerIndex);
    state.target = constrainToWorld(point, PLAYER_RADIUS);
    say('Destination set from the world map.');
  }

  function handleKeyDown(event) {
    if (state.paused || event.altKey || event.ctrlKey || event.metaKey || event.key === 'Escape') return;
    if (event.target instanceof Element && (
      event.target.closest('input, select, textarea, [contenteditable="true"]')
      || (event.key === ' ' && event.target.closest('button'))
    )) return;
    const direction = DIRECTIONS[event.key] ?? DIRECTIONS[event.key.toLowerCase()];
    if (direction) {
      event.preventDefault();
      state.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
      state.target = null;
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
        state.player = constrainToWorld({ x: state.player.x + dx / magnitude * WALK_SPEED * delta,
          y: state.player.y + dy / magnitude * WALK_SPEED * delta }, PLAYER_RADIUS);
      } else if (state.target) {
        state.player = moveToward(state.player, state.target, WALK_SPEED * delta);
        if (distanceBetween(state.player, state.target) <= 1) state.target = null;
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
  worldCanvas.parentElement.addEventListener('pointerdown', handleTouchStart);
  worldCanvas.parentElement.addEventListener('pointerup', handleTouchEnd);
  worldCanvas.parentElement.addEventListener('pointercancel', handleTouchEnd);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', clearMovement);
  resize(); updateInteraction();
  animationFrame = window.requestAnimationFrame(tick);

  return {
    setQuestStates(completed) { state.completed = [...completed]; updateInteraction(); drawWorld(); drawMinimap(); },
    selectQuest: chooseQuest,
    setPaused(paused) {
      state.paused = paused;
      if (paused) clearMovement();
    },
    getPlayerPosition() { return { ...state.player }; },
    dispose() {
      state.disposed = true; window.cancelAnimationFrame(animationFrame); resizeObserver.disconnect();
      worldCanvas.removeEventListener('click', handleWorldClick); mapCanvas.removeEventListener('click', handleMapClick);
      document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('keyup', handleKeyUp);
      interactButton.removeEventListener('click', interact);
      worldCanvas.parentElement.removeEventListener('pointerdown', handleTouchStart);
      worldCanvas.parentElement.removeEventListener('pointerup', handleTouchEnd);
      worldCanvas.parentElement.removeEventListener('pointercancel', handleTouchEnd);
      window.removeEventListener('resize', resize);
      window.removeEventListener('blur', clearMovement);
    }
  };
}
