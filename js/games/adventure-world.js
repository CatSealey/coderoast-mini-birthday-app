import { OBJECTS, advanceCanopy, canopyMeter, controlCoaster, interactAdventure, jumpCanopy, restoreAdventureState, takePoolShot, tickCanopy, tickCoaster, unlockBallCase, walkAdventure } from './adventure-logic.js';
import { createAdventureScene } from './adventure-scene.js';

const TITLES = { 1: 'LUCKY CHUCKS · POOL NIGHT', 2: 'THIRTEEN · THE RIDE', 3: 'GOAPE · THE NIGHT CANOPY' };
const keys = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function objective(index, state) {
  if (index === 1) {
    if (!state.drinksPlaced) return 'Collect drinks from the bar and put them on the drinks table.';
    if (!state.cuesPlaced || !state.ballsPlaced) return 'Find the cues and balls and put them on the pool table.';
    if (!state.ballLost) return 'Investigate the pool table and line up your break.';
    if (!state.ballFound) return state.hook ? 'Use the retrieval hook at the cabinet.' : 'Find a way to retrieve the eight-ball from under the cabinet.';
    return 'Give the eight-ball to My Love.';
  }
  if (index === 2) {
    if (state.phase === 'boarding') return 'Find the carriage and board with Meu Amor.';
    if (state.phase === 'riding') return 'Clear both speed signals, then stop in the drop zone.';
    if (state.phase === 'dropping') return 'The track is dropping!';
    if (state.phase === 'returning') return 'Returning to the dock with Meu Amor.';
    return state.bags ? 'Give the bags to Meu Amor.' : 'Find the bags in the locker.';
  }
  return state.collected.length === 4 ? 'All four treasures found. Reach the zip-wire.' : `Follow the light and find four forest treasures (${state.collected.length}/4).`;
}

export function mountAdventureWorld(root, { index, characterName, savedState, onProgress, onComplete, onLeave, onMessage, playSound }) {
  let state = restoreAdventureState(index, savedState);
  let disposed = false, frame = 0, lastFrame = 0, saveTime = 0, target = null, selected = null, objectSignature = '';
  const held = new Set(), keyHeld = new Set();
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
        ${index === 3 ? '<button type="button" class="rs3-btn" data-adventure-jump>Jump</button>' : ''}
      </div>
      <div class="abigail-world__dialogue" id="adventureMessage" role="status"></div>
      <div class="abigail-world__speech" id="adventureSpeech" aria-hidden="true" hidden></div>
      ${index === 1 ? `<section id="casePuzzle" class="abigail-world__puzzle" aria-labelledby="casePuzzleTitle" hidden>
        <strong id="casePuzzleTitle">Unlock the ball case</strong>
        <p>Half the table pockets, then one cue each for you and My Love, then the eight-ball. Which code is correct?</p>
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
      ${index === 2 ? `<section class="adventure-world__ride" id="rideControls" aria-label="Coaster controls" hidden>
        <strong id="rideStatus"></strong><div class="adventure-world__track"><span></span><b class="ride-signal ride-signal--one"></b><b class="ride-signal ride-signal--two"></b><i id="ridePosition"></i></div>
        <div class="adventure-world__ride-buttons">
          <button type="button" class="rs3-btn" data-ride="slower">Slower −</button>
          <button type="button" class="rs3-btn" data-ride="faster">Faster +</button>
          <button type="button" class="rs3-btn" data-ride="stop">Stop in zone</button>
        </div><small>Signal 1 at 22%: speed 55–80% · Signal 2 at 48%: speed 24–40%. Stop at 64–72% and at 35% speed or less. Below 20% for 3 seconds resets the lap.</small>
      </section>` : ''}
      ${index === 3 ? `<section class="adventure-world__crossing" id="crossingControls" aria-label="Crossing timing" hidden>
        <strong id="crossingStatus"></strong>
        <p>Press Space or Move when the marker is in the green zone. Wait for it to leave before the next move.</p>
        <div class="adventure-world__crossing-meter"><span></span><i id="crossingMarker"></i></div>
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
    root.querySelector('#adventureMessage').textContent = state.message;
    if (index === 1) {
      root.querySelector('#casePuzzle').hidden = !state.puzzle;
      root.querySelector('#poolShot').hidden = !state.shot;
      root.querySelector('#poolPowerMarker').style.left = `${root.querySelector('#poolPower').value}%`;
      root.querySelector('.adventure-world__actions').hidden = state.puzzle || state.shot;
      root.querySelector('.adventure-world__pad').hidden = state.puzzle || state.shot;
    }
    const speech = root.querySelector('#adventureSpeech');
    const speaker = state.message.startsWith('My Love: ') ? 'love' : state.message.startsWith('Meu Amor: ') ? 'amor' : null;
    speech.hidden = !speaker;
    if (speaker) {
      speech.textContent = state.message.slice(state.message.indexOf(':') + 2);
      const position = scene.objectPosition(speaker);
      speech.style.left = `${Math.max(90, Math.min(canvas.clientWidth - 90, position.x))}px`;
      speech.style.top = `${Math.max(105, position.y)}px`;
    }
    const nearby = OBJECTS[index].filter((object) => Math.hypot(object.x - state.player.x, object.y - state.player.y) < 180
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
      root.querySelector('.adventure-world__actions').hidden = !controls.hidden;
      root.querySelector('.adventure-world__pad').hidden = !controls.hidden;
      root.querySelector('#rideStatus').textContent = state.phase === 'riding'
        ? `Speed ${Math.round(state.speed * 100)}% · Track ${Math.round(state.progress * 100)}% · Signals ${state.signals}/2`
        : state.phase === 'dropping' ? 'Dropping to the lower track…' : 'Returning to the dock…';
      root.querySelector('#ridePosition').style.left = `${state.progress * 100}%`;
      controls.querySelectorAll('button').forEach((button) => { button.disabled = state.phase !== 'riding'; });
    }
    if (index === 3) {
      root.querySelector('#crossingControls').hidden = !state.traversal;
      root.querySelector('.adventure-world__actions').hidden = Boolean(state.traversal);
      root.querySelector('.adventure-world__pad').hidden = Boolean(state.traversal);
      if (state.traversal) {
        root.querySelector('#crossingStatus').textContent = `${state.traversal.kind === 'net' ? 'Climbing net' : 'Rope crossing'} · ${Math.round(state.traversal.progress * 3)}/3 moves`;
        root.querySelector('#crossingMarker').style.left = `${canopyMeter(state.traversal.elapsed) * 100}%`;
      }
    }
    scene.draw(state, dt, index === 1 ? Number(root.querySelector('#poolAim').value) : 0);
  }
  function update(next, persist = true, renderNow = true) {
    if (disposed || next === state) return;
    const previous = state; state = next;
    if (state.complete) { onProgress(state); playSound('success'); onComplete(); return; }
    if (persist) onProgress(state);
    if (state.message !== previous.message) onMessage(state.message);
    if (renderNow) render();
    if (index === 1 && !previous.puzzle && state.puzzle) root.querySelector('[data-case-code]').focus();
    else if (index === 1 && previous.puzzle && !state.puzzle) canvas.focus();
    else if (index === 1 && !previous.shot && state.shot) root.querySelector('#poolAim').focus();
    else if (index === 1 && previous.shot && !state.shot) canvas.focus();
  }
  function stopWalking() { target = null; selected = null; }
  function select(selection) {
    if (state.puzzle || state.shot || (index === 2 && state.phase !== 'boarding' && state.phase !== 'platform')) return;
    if (index === 3) {
      update({ ...state, message: 'Use the movement controls and jump to follow the lit course.' }); return;
    }
    const object = OBJECTS[index].find((item) => item.id === selection.objectId);
    target = object ? { x: object.x, y: object.y + (index === 1 && object.id === 'pool-table' ? 80 : 0) } : selection;
    selected = object?.id || null;
    held.clear(); keyHeld.clear();
  }
  function investigate() {
    stopWalking();
    const object = OBJECTS[index].map((item) => ({ item, distance: Math.hypot(item.x - state.player.x, item.y - state.player.y) }))
      .filter(({ item, distance }) => distance <= 85 && Math.abs(state.player.height - (item.height || 0)) <= 25)
      .sort((a, b) => a.distance - b.distance)[0];
    update(object ? interactAdventure(index, state, object.item.id) : { ...state, message: 'Move closer to an object to investigate.' });
  }
  function click(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-adventure-leave')) onLeave();
    else if (button.dataset.caseCode) update(unlockBallCase(state, button.dataset.caseCode));
    else if (button.hasAttribute('data-case-close')) update({ ...state, puzzle: false, message: 'You step away from the ball case.' });
    else if (button.hasAttribute('data-pool-shoot')) update(takePoolShot(state, Number(root.querySelector('#poolAim').value), Number(root.querySelector('#poolPower').value)));
    else if (button.hasAttribute('data-pool-close')) update({ ...state, shot: false, message: 'You step away from the pool table.' });
    else if (state.puzzle || state.shot) return;
    else if (button.hasAttribute('data-adventure-interact')) investigate();
    else if (button.hasAttribute('data-crossing-move')) update(advanceCanopy(state));
    else if (button.hasAttribute('data-adventure-jump')) update(jumpCanopy(state));
    else if (button.dataset.ride) update(controlCoaster(state, button.dataset.ride));
    else if (button.dataset.adventureObject) {
      if (index === 3) update(interactAdventure(index, state, button.dataset.adventureObject));
      else select({ objectId: button.dataset.adventureObject });
    } else if (button.dataset.adventureMove) {
      const direction = vectors[button.dataset.adventureMove];
      update(walkAdventure(index, state, direction[0] * 175, direction[1] * 175, 0.07), false);
    }
  }
  function keyDown(event) {
    if (state.puzzle || state.shot || document.querySelector('[data-modal-backdrop]:not(.hidden), #removeQuestDialog[open]')
      || event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement) return;
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); investigate(); return; }
    if (index === 3 && event.code === 'Space' && !event.repeat) {
      event.preventDefault(); update(state.traversal ? advanceCanopy(state) : jumpCanopy(state)); return;
    }
    if (index === 2 && state.phase === 'riding') {
      const action = { ArrowUp: 'faster', ArrowDown: 'slower', Space: 'stop' }[event.code];
      if (action && !event.repeat) { event.preventDefault(); update(controlCoaster(state, action)); }
      return;
    }
    if (!keys[event.code]) return;
    event.preventDefault(); stopWalking(); keyHeld.add(event.code);
  }
  function keyUp(event) { keyHeld.delete(event.code); }
  function clearInput() { keyHeld.clear(); held.clear(); }
  function pointerDown(event) {
    const button = event.target.closest('[data-adventure-move]');
    if (!button || state.puzzle || state.shot) return;
    event.preventDefault(); stopWalking(); button.setPointerCapture?.(event.pointerId); held.add(button.dataset.adventureMove);
  }
  function pointerUp(event) {
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
      if (dx || dy) {
        let next = walkAdventure(index, state, dx * 175, dy * 175, dt);
        if (next === state && dx && dy) next = walkAdventure(index, state, dx * 175, 0, dt);
        update(next, false, false);
      } else if (target) {
        const x = target.x - state.player.x, y = target.y - state.player.y, distance = Math.hypot(x, y);
        if (distance <= (selected === 'pool-table' && index === 1 ? 2 : selected ? 65 : 1)) {
          const id = selected; stopWalking(); if (id) update(interactAdventure(index, state, id));
        } else update(walkAdventure(index, state, x, y, dt), false, false);
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
        const persist = before.phase !== next.phase || before.message !== next.message || saveTime >= 1;
        if (persist) saveTime = 0;
        update(next, persist, false);
      }
    } else clearInput();
    if (!disposed) { render(dt); frame = requestAnimationFrame(tick); }
  }
  root.addEventListener('click', click); root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointerup', pointerUp); root.addEventListener('pointercancel', pointerUp);
  root.addEventListener('lostpointercapture', pointerUp);
  window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('blur', clearInput);
  const rect = canvas.getBoundingClientRect();
  if (rect.width && rect.height) scene.resize(rect.width, rect.height);
  render(); onMessage(state.message); canvas.focus(); frame = requestAnimationFrame(tick);
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
  };
}
