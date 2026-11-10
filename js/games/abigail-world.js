import { ABIGAIL_RUNES, chooseAbigailRune } from './abigail-logic.js';
import { HOUSE_OBJECTS, HOUSE_ROOM_NAMES, INTERACTION_DISTANCE, housePath, houseRoomAt, interactHouse, restoreHouseState, pathToHouseObject, walkHouse } from './abigail-house.js';
import { createAbigailScene } from './abigail-scene.js';

export function mountAbigailWorld(root, { characterName, onComplete, onLeave, onMessage, playSound, savedState, onProgress }) {
  let state = restoreHouseState(savedState);
  let disposed = false;
  let frame = 0, lastFrame = 0, path = [], selectedObject = null;
  let wasMoving = false;
  const keysDown = new Set(), heldDirections = new Set();
  root.innerHTML = `
    <div class="abigail-world">
      <canvas class="abigail-world__canvas" tabindex="0" aria-label="Abigail's house. Use arrow keys or WASD to walk, or click the floor or an object."></canvas>
      <div class="abigail-world__header"><strong id="abigailRoom"></strong><span id="abigailObjective"></span></div>
      <button type="button" class="rs3-btn abigail-world__leave" data-abigail-leave>Leave house</button>
      <details class="abigail-world__panel">
        <summary>Clues &amp; objects</summary>
        <p id="abigailInventory"></p>
        <p id="abigailClue"></p>
        <div class="abigail-world__objects" aria-label="Room objects" id="abigailObjects"></div>
      </details>
      <div class="world-move-pad abigail-world__pad" role="group" aria-label="Escape room movement">
        <button type="button" class="rs3-btn" data-abigail-move="up" aria-label="Move up">▲</button>
        <button type="button" class="rs3-btn" data-abigail-move="left" aria-label="Move left">◀</button>
        <button type="button" class="rs3-btn" data-abigail-move="down" aria-label="Move down">▼</button>
        <button type="button" class="rs3-btn" data-abigail-move="right" aria-label="Move right">▶</button>
      </div>
      <div class="abigail-world__dialogue" id="abigailMessage" role="status"></div>
      <div class="abigail-world__speech" id="abigailSpeech" aria-hidden="true" hidden></div>
      <section id="abigailPuzzle" class="abigail-world__puzzle" aria-labelledby="abigailPuzzleTitle" hidden>
        <strong id="abigailPuzzleTitle">Choose the runes in order</strong>
        <p id="abigailRuneProgress"></p>
        <div class="abigail-runes">
          ${ABIGAIL_RUNES.map((rune, i) => `<button type="button" class="rune-tile game-control" data-abigail-rune="${rune}"><span aria-hidden="true">${['✦', '☾', '◇'][i]}</span><small>${rune}</small></button>`).join('')}
        </div>
        <button type="button" class="rs3-btn game-control abigail-back" data-abigail-close>Step away</button>
      </section>
    </div>
  `;
  const canvas = root.querySelector('canvas');
  const objectList = root.querySelector('#abigailObjects');
  let listedRoom = '';
  const scene = createAbigailScene(canvas, select, characterName);
  function positionSpeech() {
    const bubble = root.querySelector('#abigailSpeech');
    if (bubble.hidden) return;
    const position = scene.objectPosition('mara');
    if (!position) return;
    const width = canvas.getBoundingClientRect().width;
    bubble.style.left = `${Math.max(100, Math.min(width - 100, position.x))}px`;
    bubble.style.top = `${Math.max(105, position.y)}px`;
  }
  const observer = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) { scene.resize(rect.width, rect.height); positionSpeech(); }
  });
  observer.observe(canvas);

  function render() {
    root.querySelector('#abigailRoom').textContent = `ABIGAIL · ${HOUSE_ROOM_NAMES[state.room].toUpperCase()}`;
    root.querySelector('#abigailObjective').textContent = !state.hasKey ? 'Explore the house and search for clues.'
      : !state.chamberUnlocked ? 'Use the small key on the chamber door.'
        : state.collectedRunes.length < 3 ? `Search the rooms for runes (${state.collectedRunes.length}/3).`
          : !state.diaryRead ? 'Search the vestibule for a clue to the ward.'
          : !state.wardSolved ? 'Use the diary clue to break the ward.'
            : !state.hasToken ? 'Search for the escape token.' : 'Find the exit.';
    root.querySelector('#abigailInventory').textContent = `Key: ${state.chamberUnlocked ? 'used' : state.hasKey ? 'found' : 'missing'} · Token: ${state.hasToken ? 'found' : 'missing'} · Runes: ${state.wardSolved ? 'used' : `${state.collectedRunes.length}/3${state.collectedRunes.length ? ` (${state.collectedRunes.join(', ')})` : ''}`}`;
    root.querySelector('#abigailClue').textContent = state.diaryRead ? 'Clue: star, moon, diamond.' : 'Diary clue: undiscovered';
    root.querySelector('#abigailMessage').textContent = state.message;
    const bubble = root.querySelector('#abigailSpeech');
    bubble.hidden = !state.message.startsWith('Mara: ');
    bubble.textContent = bubble.hidden ? '' : state.message.slice(6);
    root.querySelector('#abigailPuzzle').hidden = !state.puzzleOpen;
    root.querySelector('#abigailRuneProgress').textContent = `${state.runeInput.length} / 3 symbols placed`;
    if (listedRoom !== state.room) {
      objectList.replaceChildren();
      HOUSE_OBJECTS.filter((item) => item.id === 'chamberDoor'
        ? state.room === 'vestibule' || state.room === 'chamber'
        : houseRoomAt(item) === state.room).forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'abigail-world__object';
        button.dataset.abigailObject = item.id;
        button.textContent = item.name;
        objectList.append(button);
      });
      listedRoom = state.room;
    }
    scene.draw(state);
    positionSpeech();
  }

  function update(next) {
    if (disposed || next === state) return;
    const previous = state;
    state = next;
    if (state.complete) { onProgress(state); playSound('success'); onComplete(); return; }
    if (previous.player === state.player) onProgress(state);
    if (!previous.wardSolved && state.wardSolved) playSound('success');
    render();
    if (state.message !== previous.message) onMessage(state.message);
    if (!previous.puzzleOpen && state.puzzleOpen) root.querySelector('[data-abigail-rune]').focus();
    else if (previous.puzzleOpen && !state.puzzleOpen) canvas.focus();
  }

  function stopWalking() { path = []; selectedObject = null; }
  function select(selection) {
    if (state.puzzleOpen) return;
    stopWalking();
    keysDown.clear(); heldDirections.clear();
    const route = selection.objectId ? pathToHouseObject(state, selection.objectId) : housePath(state, selection);
    if (!route) {
      update({ ...state, message: 'There is no clear path to that spot.' });
      return;
    }
    path = route;
    selectedObject = selection.objectId ?? null;
    if (!path.length && selectedObject) { const id = selectedObject; stopWalking(); update(interactHouse(state, id)); }
  }

  function handleClick(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-abigail-leave')) { stopWalking(); onLeave(); }
    else if (button.dataset.abigailMove && !state.puzzleOpen) {
      const direction = vectors[button.dataset.abigailMove];
      if (direction) update(walkHouse(state, direction[0] * 210, direction[1] * 210, 0.07));
    }
    else if (button.dataset.abigailObject) select({ objectId: button.dataset.abigailObject });
    else if (button.dataset.abigailRune) update(chooseAbigailRune(state, button.dataset.abigailRune));
    else if (button.hasAttribute('data-abigail-close')) update({ ...state, puzzleOpen: false, runeInput: [], message: 'You step away from the ward.' });
  }
  const keys = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function handleKey(event) {
    const direction = keys[event.code];
    if (state.puzzleOpen || document.querySelector('[data-modal-backdrop]:not(.hidden), #removeQuestDialog[open]')
      || event.altKey || event.ctrlKey || event.metaKey
      || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
    if ((event.code === 'KeyE' || (event.code === 'Space'
      && !(event.target instanceof Element && event.target.closest('button')))) && !event.repeat) {
      event.preventDefault(); stopWalking();
      const nearby = HOUSE_OBJECTS.filter((item) => item.id !== 'chamberDoor' || !state.chamberUnlocked)
        .map((item) => ({ item, distance: Math.hypot(item.x - state.player.x, item.y - state.player.y) }))
        .filter((entry) => entry.distance <= INTERACTION_DISTANCE)
        .sort((a, b) => a.distance - b.distance)[0];
      update(nearby ? interactHouse(state, nearby.item.id) : { ...state, message: 'Move closer to something to investigate.' });
      return;
    }
    if (!direction) return;
    event.preventDefault(); stopWalking(); keysDown.add(event.code);
  }
  function handleKeyUp(event) { keysDown.delete(event.code); }
  function clearInput() { keysDown.clear(); heldDirections.clear(); }
  function handlePointerDown(event) {
    const button = event.target.closest('[data-abigail-move]');
    if (!button || state.puzzleOpen) return;
    event.preventDefault(); stopWalking();
    button.setPointerCapture?.(event.pointerId);
    heldDirections.add(button.dataset.abigailMove);
  }
  function handlePointerUp(event) {
    const button = event.target.closest('[data-abigail-move]');
    if (button) heldDirections.delete(button.dataset.abigailMove);
  }
  function tick(timestamp) {
    if (disposed) return;
    const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = timestamp;
    const position = state.player;
    if (!state.puzzleOpen && !document.querySelector('[data-modal-backdrop]:not(.hidden), #removeQuestDialog[open]')) {
      let dx = 0, dy = 0;
      [...keysDown].map((key) => keys[key]).concat([...heldDirections]).forEach((direction) => {
        if (vectors[direction]) { dx += vectors[direction][0]; dy += vectors[direction][1]; }
      });
      if (dx || dy) {
        const next = walkHouse(state, dx * 210, dy * 210, delta);
        if (next === state && dx && dy) {
          update(walkHouse(state, dx * 210, 0, delta));
          update(walkHouse(state, 0, dy * 210, delta));
        } else update(next);
      } else if (path.length) {
        const target = path[0], x = target.x - state.player.x, y = target.y - state.player.y;
        const next = walkHouse(state, x, y, delta);
        if (delta && next === state) { stopWalking(); update({ ...state, message: 'There is no clear path to that spot.' }); }
        else {
          update(next);
          if (Math.hypot(target.x - state.player.x, target.y - state.player.y) < 0.01) path.shift();
          if (!path.length && selectedObject) { const id = selectedObject; stopWalking(); update(interactHouse(state, id)); }
        }
      }
    } else clearInput();
    if (!disposed) {
      const moving = position.x !== state.player.x || position.y !== state.player.y;
      if (wasMoving && !moving) scene.draw(state);
      wasMoving = moving;
      frame = requestAnimationFrame(tick);
    }
  }
  root.addEventListener('click', handleClick);
  root.addEventListener('pointerdown', handlePointerDown);
  root.addEventListener('pointerup', handlePointerUp);
  root.addEventListener('pointercancel', handlePointerUp);
  root.addEventListener('lostpointercapture', handlePointerUp);
  window.addEventListener('keydown', handleKey);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', clearInput);
  const rect = canvas.getBoundingClientRect();
  if (rect.width && rect.height) scene.resize(rect.width, rect.height);
  render(); onMessage(state.message); canvas.focus();
  frame = requestAnimationFrame(tick);
  return () => {
    if (!disposed && !state.complete) onProgress(state);
    disposed = true; stopWalking(); clearInput(); cancelAnimationFrame(frame); observer.disconnect(); scene.dispose();
    root.removeEventListener('click', handleClick); window.removeEventListener('keydown', handleKey);
    root.removeEventListener('pointerdown', handlePointerDown);
    root.removeEventListener('pointerup', handlePointerUp);
    root.removeEventListener('pointercancel', handlePointerUp);
    root.removeEventListener('lostpointercapture', handlePointerUp);
    window.removeEventListener('keyup', handleKeyUp); window.removeEventListener('blur', clearInput);
  };
}
