import { CANOPY_CROSSINGS, COASTER_JOIN_POINT, OBJECTS, PUB_JOIN_POINT, advanceCanopy, adventureObjectDistance, adventureObjectInRange, canopyMeter, canopyObjectAvailable, canopyTarget, coasterCouplePath, coasterPath, controlCoaster, finishCoasterExit, finishCoasterGoodbye, finishPubExit, finishPubGoodbye, interactAdventure, jumpCanopy, pubCouplePath, pubPath, restoreAdventureState, takePoolShot, tickCanopy, tickCoaster, unlockBallCase, walkAdventure, walkCoasterCouple, walkPubCouple } from './adventure-logic.js';
import { COASTER_GOAL, COASTER_TREATS } from './coaster-course.js';
import { createAdventureScene } from './adventure-scene.js';

const TITLES = { 1: 'LUCKY CHUCKS · POOL NIGHT', 2: 'THIRTEEN · THE RIDE', 3: 'GOAPE · THE NIGHT CANOPY' };
const keys = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const PUB_SPEECH_SECONDS = 4;

function objective(index, state) {
  if (index === 1) {
    if (state.pubEnding === 'dialogue') return 'Talk with Cat.';
    if (state.pubEnding === 'ready') return 'Leave Lucky Chucks together.';
    if (!state.drinksPlaced) return 'Collect drinks from the bar and put them on the drinks table.';
    if (!state.cuesPlaced || !state.ballsPlaced) return 'Find the cues and balls and put them on the pool table.';
    if (!state.ballLost) return 'Investigate the pool table and line up your break.';
    if (!state.ballFound) return state.hook ? 'Use the retrieval hook at the cabinet.' : 'Find a way to retrieve the eight-ball from under the cabinet.';
    return 'Give the eight-ball to Cat.';
  }
  if (index === 2) {
    if (state.rideEnding === 'dialogue') return 'Talk with Cat.';
    if (state.rideEnding === 'ready') return 'Leave Thirteen together.';
    if (state.phase === 'boarding') return 'Find the carriage and board with Cat.';
    if (state.phase === 'riding') return 'Hold left or right to collect all park items.';
    if (state.phase === 'dropping') return 'The track is dropping!';
    if (state.phase === 'returning') return state.progress >= 0.65 ? 'Climbing back to the station.' : 'Riding backwards on the lower track.';
    return state.bags ? 'Give the bags to Cat.' : 'Find the bags in the locker.';
  }
  if (state.collected.length < 4) return `Find four forest treasures (${state.collected.length}/4) and follow the lit course.`;
  if (state.checkpoint < 4) return 'Cross the high rope bridge to reach the first lantern.';
  if (state.lanterns.length < 1) return 'Light the first lantern on this platform.';
  if (state.checkpoint < 5) return 'Jump across the gap to the second lantern platform.';
  if (state.lanterns.length < 2) return 'Light the second lantern before climbing the summit net.';
  if (state.checkpoint < 6) return 'Climb the summit net.';
  if (state.checkpoint < 7) return 'Cross the summit rope bridge.';
  if (state.lanterns.length < 3) return 'Light the final lantern.';
  return 'All treasures found and lanterns lit. Reach the zip-wire.';
}

export function mountAdventureWorld(root, { index, characterName, savedState, onProgress, onComplete, onLeave, onMessage, playSound }) {
  let state = restoreAdventureState(index, savedState);
  let disposed = false, frame = 0, lastFrame = 0, saveTime = 0, target = null, path = [], selected = null, objectSignature = '';
  let exitPhase = null, exitPath = [], couplePath = [], exitFailed = false, goodbyeTime = 0;
  const held = new Set(), keyHeld = new Set(), rideKeys = new Map(), ridePointers = new Map();
  root.innerHTML = `
    <div class="abigail-world adventure-world">
      <canvas class="abigail-world__canvas" tabindex="0" aria-label="${TITLES[index]}. Walk with WASD or arrow keys; press E to investigate."></canvas>
      <div class="abigail-world__header"><strong>${TITLES[index]}</strong><span id="adventureObjective"></span></div>
      <button type="button" class="rs3-btn abigail-world__leave" data-adventure-leave>Leave quest</button>
      <details class="abigail-world__panel"><summary>Nearby objects</summary>
        <div class="abigail-world__objects" id="adventureObjects"></div>
      </details>
      <div class="world-move-pad abigail-world__pad adventure-world__pad" role="group" aria-label="Quest movement">
        <button type="button" class="rs3-btn" data-adventure-move="up" aria-label="Move up">▲</button>
        <button type="button" class="rs3-btn" data-adventure-move="left" aria-label="Move left">◀</button>
        <button type="button" class="rs3-btn" data-adventure-move="down" aria-label="Move down">▼</button>
        <button type="button" class="rs3-btn" data-adventure-move="right" aria-label="Move right">▶</button>
      </div>
      <div class="adventure-world__actions">
        <button type="button" class="rs3-btn" data-adventure-interact>Investigate</button>
        ${index === 1 || index === 2 ? '<button type="button" class="rs3-btn" data-couple-exit hidden>Leave together</button>' : ''}
        ${index === 3 ? '<button type="button" class="rs3-btn" data-adventure-jump>Jump</button>' : ''}
      </div>
      <div class="abigail-world__dialogue" id="adventureMessage" role="status"></div>
      <div class="abigail-world__speech" id="adventureSpeech" aria-hidden="true" hidden></div>
      ${index === 1 ? `<section id="casePuzzle" class="abigail-world__puzzle" aria-labelledby="casePuzzleTitle" hidden>
        <strong id="casePuzzleTitle">Unlock the ball case</strong>
        <p>Half the table pockets, then one cue each for you and Cat, then the eight-ball. Which code is correct?</p>
        <div class="abigail-runes">
          <button type="button" class="rune-tile game-control" data-case-code="321">321</button>
          <button type="button" class="rune-tile game-control" data-case-code="312">312</button>
          <button type="button" class="rune-tile game-control" data-case-code="231">231</button>
        </div><button type="button" class="rs3-btn game-control" data-case-close>Step away</button>
      </section>
      <section id="poolShot" class="adventure-world__shot" aria-label="Pool break controls" hidden>
        <strong>LINE UP THE BREAK</strong>
        <span>Align the white guide with the rack, then use a controlled amount of power.</span>
        <label>Aim <input id="poolAim" type="range" min="-35" max="35" value="-20" step="1"></label>
        <label>Power <input id="poolPower" type="range" min="0" max="100" value="35" step="1"></label>
        <div class="adventure-world__power" aria-hidden="true"><span></span><i id="poolPowerMarker"></i></div>
        <div><button type="button" class="rs3-btn" data-pool-shoot>Break</button>
        <button type="button" class="rs3-btn" data-pool-close>Step away</button></div>
      </section>` : ''}
      ${index === 2 ? `<section class="adventure-world__ride" id="rideControls" aria-label="Coaster challenge" hidden>
        <strong id="rideStatus" role="status"></strong>
        <div id="rideSteering">
          <div class="adventure-world__ride-next" id="rideNext"></div>
          <div class="adventure-world__ride-buttons" role="group" aria-label="Steer the carriage">
            <button type="button" class="rs3-btn" data-ride="left">◀ Hold left</button>
            <button type="button" class="rs3-btn" data-ride="right">Hold right ▶</button>
          </div>
        </div>
      </section>` : ''}
      ${index === 3 ? `<section class="adventure-world__crossing" id="crossingControls" aria-label="Crossing timing" hidden>
        <strong id="crossingStatus"></strong>
        <p>The green zone moves and changes size. Press Space or Move when the marker is inside it; let the marker leave before the next move.</p>
        <div class="adventure-world__crossing-meter"><span id="crossingTarget"></span><i id="crossingMarker"></i></div>
        <button type="button" class="rs3-btn" data-crossing-move>Move</button>
      </section>` : ''}
    </div>`;
  const canvas = root.querySelector('canvas'), scene = createAdventureScene(canvas, index, select, characterName);
  const observer = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) scene.resize(rect.width, rect.height);
  });
  observer.observe(canvas);

  function render(dt = 0) {
    root.querySelector('#adventureObjective').textContent = objective(index, state);
    const status = root.querySelector('#adventureMessage');
    if (status.textContent !== state.message) status.textContent = state.message;
    if (index === 1) {
      root.querySelector('#casePuzzle').hidden = !state.puzzle;
      root.querySelector('#poolShot').hidden = !state.shot;
      root.querySelector('#poolPowerMarker').style.left = `${root.querySelector('#poolPower').value}%`;
      root.querySelector('.adventure-world__actions').hidden = state.puzzle || state.shot || Boolean(exitPhase) || state.pubEnding === 'dialogue';
      root.querySelector('.adventure-world__pad').hidden = state.puzzle || state.shot || state.pubEnding === 'dialogue' || Boolean(exitPhase);
      root.querySelector('.abigail-world__panel').hidden = Boolean(state.pubEnding);
      root.querySelector('[data-adventure-interact]').hidden = Boolean(state.pubEnding);
      root.querySelector('[data-couple-exit]').hidden = state.pubEnding !== 'ready' || !exitFailed;
    }
    const speech = root.querySelector('#adventureSpeech');
    const speaker = state.message.startsWith('Cat: ') ? 'love' : state.message.startsWith('Cat: ') ? 'amor' : null;
    speech.hidden = !speaker;
    if (!speech.hidden) {
      const text = state.message.slice(state.message.indexOf(':') + 2);
      if (speech.textContent !== text) speech.textContent = text;
      const position = scene.objectPosition(speaker);
      const margin = speech.offsetWidth / 2 + 8;
      speech.style.left = `${Math.max(margin, Math.min(canvas.clientWidth - margin, position.x))}px`;
      speech.style.top = `${Math.max(105, position.y)}px`;
    }
    const nearby = OBJECTS[index].filter((object) => (index !== 3 || canopyObjectAvailable(state, object))
      && adventureObjectDistance(index, state.player, object) < 180
      && Math.abs(state.player.height - (object.height || 0)) < 30);
    const signature = nearby.map((object) => object.id).join(',');
    if (signature !== objectSignature) {
      objectSignature = signature;
      const list = root.querySelector('#adventureObjects'); list.replaceChildren();
      nearby.forEach((object) => {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'abigail-world__object';
        button.dataset.adventureObject = object.id; button.textContent = object.name; list.append(button);
      });
    }
    if (index === 2) {
      const controls = root.querySelector('#rideControls');
      controls.hidden = !['riding', 'dropping', 'returning'].includes(state.phase);
      const ending = Boolean(state.rideEnding) && !exitFailed;
      root.querySelector('.adventure-world__actions').hidden = !controls.hidden || ending;
      root.querySelector('.adventure-world__pad').hidden = !controls.hidden || ending;
      root.querySelector('.abigail-world__panel').hidden = !controls.hidden || Boolean(state.rideEnding);
      root.querySelector('[data-adventure-interact]').hidden = Boolean(state.rideEnding);
      root.querySelector('[data-couple-exit]').hidden = state.rideEnding !== 'ready' || !exitFailed;
      const riding = state.phase === 'riding';
      root.querySelector('#rideStatus').textContent = state.phase === 'riding'
        ? `Park items: ${Math.min(state.treats.length, COASTER_GOAL)}/${COASTER_GOAL}`
        : state.phase === 'dropping' ? 'The drop!' : state.progress >= 0.65 ? 'Climbing back!' : 'Going backwards!';
      root.querySelector('#rideSteering').hidden = !riding;
      if (riding) {
        const next = COASTER_TREATS.find((treat) => treat.progress > state.progress && !state.treats.includes(treat.id));
        root.querySelector('#rideNext').textContent = next ? `Next: ${next.name} · ${next.lane < 0 ? 'LEFT ◀' : 'RIGHT ▶'}`
          : state.treats.length >= COASTER_GOAL ? 'Goal reached!' : 'More items on the next lap!';
        root.querySelectorAll('[data-ride]').forEach((button) => {
          const selected = (button.dataset.ride === 'left' ? -1 : 1) === state.lane;
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
      }
    }
    if (index === 3) {
      root.querySelector('#crossingControls').hidden = !state.traversal;
      root.querySelector('.adventure-world__actions').hidden = Boolean(state.traversal);
      root.querySelector('.adventure-world__pad').hidden = Boolean(state.traversal);
      if (state.traversal) {
        const crossing = CANOPY_CROSSINGS[state.traversal.crossingId || state.traversal.kind];
        const target = canopyTarget(state.traversal);
        root.querySelector('#crossingStatus').textContent = `${state.traversal.kind === 'net' ? 'Climbing net' : 'Rope crossing'} · ${Math.round(state.traversal.progress * crossing.moves)}/${crossing.moves} moves`;
        root.querySelector('#crossingTarget').style.left = `${target.start * 100}%`;
        root.querySelector('#crossingTarget').style.width = `${(target.end - target.start) * 100}%`;
        root.querySelector('#crossingMarker').style.left = `${canopyMeter(state.traversal.elapsed) * 100}%`;
      }
    }
    scene.draw(index === 1 || index === 2 ? { ...state, pubTogether: exitPhase === 'walking' } : state,
      dt, index === 1 ? Number(root.querySelector('#poolAim').value) : 0);
  }
  function update(next, persist = true, renderNow = true) {
    if (disposed || next === state) return;
    const previous = state; state = next;
    if (state.complete) { onProgress(state); playSound('success'); onComplete(); return; }
    if (persist) onProgress(state);
    if (state.message !== previous.message) onMessage(state.message);
    if (index === 2 && state.treats.length > previous.treats.length) playSound('success');
    if (renderNow) render();
    if (index === 1 && !previous.puzzle && state.puzzle) root.querySelector('[data-case-code]').focus();
    else if (index === 1 && previous.puzzle && !state.puzzle) canvas.focus();
    else if (index === 1 && !previous.shot && state.shot) root.querySelector('#poolAim').focus();
    else if (index === 1 && previous.shot && !state.shot) canvas.focus();
    else if (index === 1 && previous.pubEnding !== state.pubEnding && state.pubEnding === 'dialogue') {
      stopWalking(); clearInput(); goodbyeTime = 0;
    }
    if (index === 2 && previous.rideEnding !== state.rideEnding && state.rideEnding === 'dialogue') {
      stopWalking(); clearInput(); goodbyeTime = 0;
    }
    if (index === 2 && state.phase === 'riding' && previous.phase !== 'riding') { stopWalking(); clearInput(); }
  }
  function stopWalking() { target = null; path = []; selected = null; }
  function select(selection) {
    if (state.puzzle || state.shot || state.pubEnding === 'dialogue' || (state.rideEnding && !exitFailed) || exitPhase
      || (index === 2 && state.phase !== 'boarding' && state.phase !== 'platform')) return;
    if (index === 3) {
      update({ ...state, message: 'Use the movement controls and jump to follow the lit course.' }); return;
    }
    const object = OBJECTS[index].find((item) => item.id === selection.objectId);
    if ((state.pubEnding || state.rideEnding) && object) return;
    stopWalking();
    held.clear(); keyHeld.clear();
    if ((index === 1 || index === 2) && object && adventureObjectInRange(index, state.player, object)) {
      update(interactAdventure(index, state, object.id));
      return;
    }
    const destination = object ? { x: object.x, y: object.y } : selection;
    if (index === 1 || index === 2) {
      const bounded = { x: Math.max(40, Math.min(960, destination.x)), y: Math.max(40, Math.min(660, destination.y)) };
      path = (index === 1 ? pubPath(state.player, bounded, object) : coasterPath(state.player, bounded, object)) || [];
      if (!path.length) {
        update({ ...state, message: 'There is no clear route there. Choose another spot.' });
        return;
      }
      target = path[0];
    } else target = destination;
    selected = object?.id || null;
  }
  function investigate() {
    if (state.pubEnding || state.rideEnding) return;
    stopWalking();
    const object = OBJECTS[index].map((item) => ({ item, distance: adventureObjectDistance(index, state.player, item) }))
      .filter(({ item }) => (index !== 3 || canopyObjectAvailable(state, item)) && adventureObjectInRange(index, state.player, item))
      .sort((a, b) => a.distance - b.distance)[0];
    update(object ? interactAdventure(index, state, object.item.id) : { ...state, message: 'Move closer to an object to investigate.' });
  }
  function startPubExit() {
    const joining = pubPath(state.player, PUB_JOIN_POINT), leaving = pubCouplePath(PUB_JOIN_POINT);
    if (!joining?.length || !leaving?.length) {
      exitFailed = true;
      update({ ...state, message: 'There is no clear route to leave together. Move to another spot and try again.' });
      return;
    }
    stopWalking(); clearInput(); exitFailed = false;
    exitPhase = 'joining'; exitPath = joining; couplePath = leaving;
    update({ ...state, message: 'You join Cat and take her hand.' });
  }
  function startCoasterExit() {
    const joining = coasterPath(state.player, COASTER_JOIN_POINT), leaving = coasterCouplePath(COASTER_JOIN_POINT);
    if (!joining?.length || !leaving?.length) {
      exitFailed = true;
      update({ ...state, message: 'There is no clear route to leave together. Move to another spot and try again.' });
      return;
    }
    stopWalking(); clearInput(); exitFailed = false;
    exitPhase = 'joining'; exitPath = joining; couplePath = leaving;
    update({ ...state, message: 'You join Cat and take her hand.' });
  }
  function click(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-adventure-leave')) onLeave();
    else if (button.hasAttribute('data-couple-exit') && (state.pubEnding === 'ready' || state.rideEnding === 'ready') && !exitPhase) {
      if (index === 2) startCoasterExit(); else startPubExit();
    }
    else if (button.dataset.caseCode) update(unlockBallCase(state, button.dataset.caseCode));
    else if (button.hasAttribute('data-case-close')) update({ ...state, puzzle: false, message: 'You step away from the ball case.' });
    else if (button.hasAttribute('data-pool-shoot')) update(takePoolShot(state, Number(root.querySelector('#poolAim').value), Number(root.querySelector('#poolPower').value)));
    else if (button.hasAttribute('data-pool-close')) update({ ...state, shot: false, message: 'You step away from the pool table.' });
    else if (state.puzzle || state.shot) return;
    else if (button.hasAttribute('data-adventure-interact')) investigate();
    else if (button.hasAttribute('data-crossing-move')) update(advanceCanopy(state));
    else if (button.hasAttribute('data-adventure-jump')) update(jumpCanopy(state));
    else if (button.dataset.adventureObject) {
      if (index === 3) update(interactAdventure(index, state, button.dataset.adventureObject));
      else select({ objectId: button.dataset.adventureObject });
    } else if (button.dataset.adventureMove) {
      const direction = vectors[button.dataset.adventureMove];
      update(walkAdventure(index, state, direction[0] * 175, direction[1] * 175, 0.07), false);
    }
  }
  function keyDown(event) {
    if (state.puzzle || state.shot || exitPhase || document.querySelector('[data-modal-backdrop]:not(.hidden), #removeQuestDialog[open]')
      || event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement) return;
    if (state.pubEnding === 'dialogue' || state.rideEnding === 'dialogue') return;
    if (index === 2 && ['riding', 'dropping', 'returning'].includes(state.phase)) {
      const focusedButton = event.target.closest?.('[data-ride]');
      const direction = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[event.code]
        || (['Space', 'Enter'].includes(event.code) ? focusedButton?.dataset.ride : null);
      if (direction) {
        event.preventDefault();
        if (state.phase === 'riding' && !event.repeat) { rideKeys.set(event.code, direction); syncRideInput(); }
      } else if (keys[event.code]) event.preventDefault();
      return;
    }
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); investigate(); return; }
    if (index === 3 && event.code === 'Space' && !event.repeat) {
      event.preventDefault(); update(state.traversal ? advanceCanopy(state) : jumpCanopy(state)); return;
    }
    if (!keys[event.code]) return;
    event.preventDefault(); stopWalking(); keyHeld.add(event.code);
  }
  function keyUp(event) {
    keyHeld.delete(event.code);
    if (rideKeys.delete(event.code)) syncRideInput();
  }
  function syncRideInput() {
    const directions = new Set([...rideKeys.values(), ...ridePointers.values()]);
    update(controlCoaster(state, directions.size === 1 ? [...directions][0] : 'neutral'), false);
  }
  function clearInput() {
    keyHeld.clear(); held.clear(); rideKeys.clear(); ridePointers.clear();
    if (index === 2) syncRideInput();
  }
  function pointerDown(event) {
    const rideButton = event.target.closest('[data-ride]');
    if (rideButton && index === 2 && state.phase === 'riding') {
      event.preventDefault(); rideButton.setPointerCapture?.(event.pointerId);
      ridePointers.set(event.pointerId, rideButton.dataset.ride); syncRideInput();
      return;
    }
    const button = event.target.closest('[data-adventure-move]');
    if (!button || state.puzzle || state.shot || state.pubEnding === 'dialogue' || (state.rideEnding && !exitFailed) || exitPhase) return;
    event.preventDefault(); stopWalking(); button.setPointerCapture?.(event.pointerId); held.add(button.dataset.adventureMove);
  }
  function pointerUp(event) {
    if (ridePointers.delete(event.pointerId)) syncRideInput();
    const button = event.target.closest('[data-adventure-move]');
    if (button) held.delete(button.dataset.adventureMove);
  }
  function tick(timestamp) {
    if (disposed) return;
    const dt = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = timestamp;
    if (!state.puzzle && !state.shot && !document.querySelector('[data-modal-backdrop]:not(.hidden), #removeQuestDialog[open]')) {
      let dx = 0, dy = 0;
      [...keyHeld].map((key) => keys[key]).concat([...held]).forEach((direction) => {
        if (vectors[direction]) { dx += vectors[direction][0]; dy += vectors[direction][1]; }
      });
      if (state.pubEnding === 'dialogue' || state.rideEnding === 'dialogue') {
        goodbyeTime += dt;
        if (goodbyeTime >= (index === 2 ? 6 : PUB_SPEECH_SECONDS)) {
          if (index === 2) { update(finishCoasterGoodbye(state)); startCoasterExit(); }
          else { update(finishPubGoodbye(state)); startPubExit(); }
        }
      } else if (exitPhase) {
        const point = exitPath[0];
        const distance = Math.hypot(point.x - state.player.x, point.y - state.player.y);
        if (distance < 0.01) {
          exitPath.shift();
          if (!exitPath.length && exitPhase === 'joining') {
            exitPhase = 'walking'; exitPath = couplePath;
            update({ ...state, message: `Hand in hand, you leave ${index === 2 ? 'Thirteen' : 'Lucky Chucks'} together.` });
          } else if (!exitPath.length) {
            exitPhase = null;
            update(index === 2 ? finishCoasterExit(state) : finishPubExit(state));
          }
        } else {
          const next = exitPhase === 'joining'
            ? walkAdventure(index, state, point.x - state.player.x, point.y - state.player.y, dt)
            : index === 2 ? walkCoasterCouple(state, point, dt) : walkPubCouple(state, point, dt);
          if (dt && next === state) {
            exitPhase = null; exitPath = []; couplePath = []; exitFailed = true;
            update({ ...state, message: 'The way is blocked. Move to another spot and try leaving together again.' });
          } else update(next, false, false);
        }
      } else if (dx || dy) {
        let next = walkAdventure(index, state, dx * 175, dy * 175, dt);
        if (next === state && dx && dy) next = walkAdventure(index, state, dx * 175, 0, dt);
        update(next, false, false);
      } else if (target) {
        const x = target.x - state.player.x, y = target.y - state.player.y, distance = Math.hypot(x, y);
        if (distance <= (index === 1 || index === 2 ? 1 : selected ? 65 : 1)) {
          if (index === 1 || index === 2) { path.shift(); target = path[0] || null; }
          else target = null;
          if (!target) {
            const id = selected; stopWalking(); if (id) update(interactAdventure(index, state, id));
          }
        } else {
          const next = walkAdventure(index, state, x, y, dt);
          if (dt && next === state) {
            stopWalking();
            update({ ...state, message: 'Furniture blocks the route. Choose another spot.' });
          } else update(next, false, false);
        }
      }
      if (index === 3 && (state.flight || state.zipline || state.traversal)) {
        const before = state; const next = tickCanopy(state, dt);
        saveTime += dt;
        const persist = Boolean(before.flight && !next.flight) || Boolean(before.traversal && !next.traversal)
          || ((state.zipline || state.traversal) && saveTime >= 1);
        if (persist) saveTime = 0;
        update(next, persist, false);
      }
      if (index === 2 && ['riding', 'dropping', 'returning'].includes(state.phase)) {
        const before = state, next = tickCoaster(state, dt);
        saveTime += dt;
        const persist = before.phase !== next.phase || before.message !== next.message
          || before.treats.length !== next.treats.length || saveTime >= 1;
        if (persist) saveTime = 0;
        update(next, persist, false);
      }
    } else clearInput();
    if (!disposed) { render(dt); frame = requestAnimationFrame(tick); }
  }
  function visibilityChange() { if (document.hidden) clearInput(); }
  root.addEventListener('click', click); root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointerup', pointerUp); root.addEventListener('pointercancel', pointerUp);
  root.addEventListener('lostpointercapture', pointerUp);
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', visibilityChange);
  const rect = canvas.getBoundingClientRect();
  if (rect.width && rect.height) scene.resize(rect.width, rect.height);
  render(); onMessage(state.message); canvas.focus();
  if (index === 1 && state.pubEnding === 'ready' && !state.complete) startPubExit();
  if (index === 2 && state.rideEnding === 'ready' && !state.complete) startCoasterExit();
  frame = requestAnimationFrame(tick);
  return () => {
    if (!disposed && !state.complete) {
      if (index === 3 && state.flight) {
        const restored = restoreAdventureState(index, { ...state, player: { ...state.player, height: Math.max(0, state.player.height) } });
        onProgress(restored);
      } else onProgress(state);
    }
    disposed = true; stopWalking(); clearInput(); cancelAnimationFrame(frame); observer.disconnect(); scene.dispose();
    root.removeEventListener('click', click); root.removeEventListener('pointerdown', pointerDown);
    root.removeEventListener('pointerup', pointerUp); root.removeEventListener('pointercancel', pointerUp);
    root.removeEventListener('lostpointercapture', pointerUp);
    window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', clearInput);
    document.removeEventListener('visibilitychange', visibilityChange);
  };
}
