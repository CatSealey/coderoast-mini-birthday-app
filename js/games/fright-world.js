import { FRIGHT_OBJECTS, answerFright, frightExitReady, frightPath, frightStage, interactFright, restoreFrightState, teleportFright, walkFright } from './fright-logic.js';
import { renderFrightClues } from './fright-clues.js';
import { createFrightScene } from './fright-scene.js';

export function mountFrightWorld(root, { characterName, savedState, onProgress, onComplete, onLeave, onMessage, playSound }) {
  let state = restoreFrightState(savedState);
  let disposed = false, frame = 0, lastFrame = 0, path = [], selectedObject = null, listedObjects = '', clueSignature = null;
  const keysDown = new Set(), held = new Set();
  const keys = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  root.innerHTML = `
    <div class="abigail-world fright-world">
      <canvas class="abigail-world__canvas" tabindex="0" aria-label="Fright Nights maze. Use arrow keys or WASD to walk, and E to investigate nearby objects."></canvas>
      <div class="abigail-world__header"><strong>FRIGHT NIGHTS · THE MAZE</strong><span id="frightObjective"></span></div>
      <button type="button" class="rs3-btn abigail-world__leave" data-fright-leave>Leave maze</button>
      <details class="abigail-world__panel" style="z-index:4">
        <summary>Clues &amp; nearby objects</summary>
        <div id="frightClues"></div>
        <div class="abigail-world__objects" aria-label="Nearby objects" id="frightObjects"></div>
      </details>
      <div class="world-move-pad abigail-world__pad" role="group" aria-label="Maze movement">
        <button type="button" class="rs3-btn" data-fright-move="up" aria-label="Move up">▲</button>
        <button type="button" class="rs3-btn" data-fright-move="left" aria-label="Move left">◀</button>
        <button type="button" class="rs3-btn" data-fright-move="down" aria-label="Move down">▼</button>
        <button type="button" class="rs3-btn" data-fright-move="right" aria-label="Move right">▶</button>
      </div>
      <div class="fright-world__actions">
        <button type="button" class="rs3-btn fright-world__teleport" data-fright-teleport hidden>✦ Teleport out</button>
        <button type="button" class="rs3-btn" data-fright-interact>Investigate</button>
      </div>
      <div class="abigail-world__dialogue" id="frightMessage" role="status"></div>
      <section id="frightPuzzle" class="abigail-world__puzzle" aria-labelledby="frightPuzzleTitle" hidden>
        <strong id="frightPuzzleTitle"></strong>
        <p id="frightQuestion"></p>
        <div class="fright-world__choices" id="frightChoices"></div>
        <button type="button" class="rs3-btn game-control abigail-back" data-fright-close>Step away</button>
      </section>
    </div>`;
  const canvas = root.querySelector('canvas');
  const scene = createFrightScene(canvas, select, characterName);
  const observer = new ResizeObserver(() => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width && rect.height) scene.resize(rect.width, rect.height);
  });
  observer.observe(canvas);

  function render() {
    root.querySelector('#frightObjective').textContent = frightExitReady(state)
      ? 'All seven objects found. Use the escape teleport or the entrance gate.'
      : `Find 3 clues in each area, take its tool and solve its mechanism (${state.collected.length}/7 objects).`;
    root.querySelector('[data-fright-teleport]').hidden = !frightExitReady(state) || Boolean(state.puzzle);
    root.querySelector('#frightMessage').textContent = state.message;
    const signatureClues = JSON.stringify([state.clues, state.tools]);
    if (signatureClues !== clueSignature) {
      renderFrightClues(root.querySelector('#frightClues'), state);
      clueSignature = signatureClues;
    }
    const objects = FRIGHT_OBJECTS.filter((object) => Math.hypot(object.x - state.player.x, object.y - state.player.y) < 150);
    const signature = objects.map((object) => object.id).join(',');
    if (signature !== listedObjects) {
      listedObjects = signature;
      const list = root.querySelector('#frightObjects');
      list.replaceChildren();
      objects.forEach((object) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'abigail-world__object';
        button.dataset.frightObject = object.id; button.textContent = object.name;
        list.append(button);
      });
    }
    const puzzle = root.querySelector('#frightPuzzle');
    puzzle.hidden = !state.puzzle;
    if (state.puzzle) {
      const current = frightStage(state);
      const theme = current.theme;
      root.querySelector('#frightPuzzleTitle').textContent = `${theme.name} mechanism · step ${current.index + 1} of ${current.total}`;
      root.querySelector('#frightQuestion').textContent = current.question;
      const choices = root.querySelector('#frightChoices');
      if (choices.dataset.theme !== `${theme.id}:${current.index}`) {
        choices.dataset.theme = `${theme.id}:${current.index}`;
        choices.replaceChildren();
        current.choices.forEach((choice) => {
          const button = document.createElement('button');
          button.type = 'button'; button.className = 'rs3-btn game-control fright-world__choice';
          button.dataset.frightAnswer = choice; button.textContent = choice;
          choices.append(button);
        });
      }
    }
    scene.draw(state);
  }
  function update(next) {
    if (disposed || next === state) return;
    const previous = state;
    state = next;
    if (state.complete) { onProgress(state); playSound('success'); onComplete(); return; }
    if (previous.player === state.player) onProgress(state);
    if (state.collected.length > previous.collected.length) playSound('success');
    render();
    if (state.message !== previous.message) onMessage(state.message);
    if (state.puzzle && (!previous.puzzle || previous.stage !== state.stage)) root.querySelector('[data-fright-answer]').focus();
    else if (previous.puzzle && !state.puzzle) canvas.focus();
  }
  function stopWalking() { path = []; selectedObject = null; }
  function select(selection) {
    if (state.puzzle) return;
    stopWalking(); keysDown.clear(); held.clear();
    const object = FRIGHT_OBJECTS.find((entry) => entry.id === selection.objectId);
    const destination = object || selection;
    const route = frightPath(state.player, destination);
    if (!route) { update({ ...state, message: 'The maze wall blocks that route.' }); return; }
    path = route;
    selectedObject = object?.id || null;
  }
  function investigate() {
    stopWalking();
    const object = FRIGHT_OBJECTS.map((item) => ({ item, distance: Math.hypot(item.x - state.player.x, item.y - state.player.y) }))
      .filter((entry) => entry.distance <= 65).sort((a, b) => a.distance - b.distance)[0];
    update(object ? interactFright(state, object.item.id) : { ...state, message: 'Move closer to a sign, tool, mechanism or gate to investigate.' });
  }
  function handleClick(event) {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.hasAttribute('data-fright-leave')) { stopWalking(); onLeave(); }
    else if (button.hasAttribute('data-fright-teleport')) { stopWalking(); clearInput(); update(teleportFright(state)); }
    else if (button.hasAttribute('data-fright-interact') && !state.puzzle) investigate();
    else if (button.dataset.frightMove && !state.puzzle) {
      const direction = vectors[button.dataset.frightMove];
      if (direction) update(walkFright(state, direction[0] * 175, direction[1] * 175, 0.07));
    } else if (button.dataset.frightObject) select({ objectId: button.dataset.frightObject });
    else if (button.dataset.frightAnswer) update(answerFright(state, button.dataset.frightAnswer));
    else if (button.hasAttribute('data-fright-close')) update({ ...state, puzzle: null, stage: 0, message: 'You step away from the mechanism.' });
  }
  function keyDown(event) {
    if (state.puzzle || document.querySelector('[data-modal-backdrop]:not(.hidden), [data-game-modal][open]')
      || event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLInputElement) return;
    if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); investigate(); return; }
    if (!keys[event.code]) return;
    event.preventDefault(); stopWalking(); keysDown.add(event.code);
  }
  function keyUp(event) { keysDown.delete(event.code); }
  function clearInput() { keysDown.clear(); held.clear(); }
  function pointerDown(event) {
    const button = event.target.closest('[data-fright-move]');
    if (!button || state.puzzle) return;
    event.preventDefault(); stopWalking(); button.setPointerCapture?.(event.pointerId); held.add(button.dataset.frightMove);
  }
  function pointerUp(event) {
    const button = event.target.closest('[data-fright-move]');
    if (button) held.delete(button.dataset.frightMove);
  }
  function tick(timestamp) {
    if (disposed) return;
    const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.05) : 0;
    lastFrame = timestamp;
    if (!state.puzzle && !document.querySelector('[data-modal-backdrop]:not(.hidden), [data-game-modal][open]')) {
      let dx = 0, dy = 0;
      [...keysDown].map((key) => keys[key]).concat([...held]).forEach((direction) => {
        if (vectors[direction]) { dx += vectors[direction][0]; dy += vectors[direction][1]; }
      });
      if (dx || dy) {
        const next = walkFright(state, dx * 175, dy * 175, delta);
        if (next === state && dx && dy) { update(walkFright(state, dx * 175, 0, delta)); update(walkFright(state, 0, dy * 175, delta)); }
        else update(next);
      } else if (path.length) {
        const target = path[0], x = target.x - state.player.x, y = target.y - state.player.y;
        if (Math.hypot(x, y) < 0.01) path.shift();
        else {
          const next = walkFright(state, x, y, delta);
          if (delta && next === state) { stopWalking(); update({ ...state, message: 'The maze wall blocks that route.' }); }
          else update(next);
        }
        if (!path.length && selectedObject) { const id = selectedObject; stopWalking(); update(interactFright(state, id)); }
      }
    } else clearInput();
    if (!disposed) frame = requestAnimationFrame(tick);
  }
  root.addEventListener('click', handleClick);
  root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointerup', pointerUp);
  root.addEventListener('pointercancel', pointerUp);
  root.addEventListener('lostpointercapture', pointerUp);
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', clearInput);
  const rect = canvas.getBoundingClientRect();
  if (rect.width && rect.height) scene.resize(rect.width, rect.height);
  render(); onMessage(state.message); canvas.focus();
  frame = requestAnimationFrame(tick);
  return () => {
    if (!disposed && !state.complete) onProgress(state);
    disposed = true; stopWalking(); clearInput(); cancelAnimationFrame(frame); observer.disconnect(); scene.dispose();
    root.removeEventListener('click', handleClick);
    root.removeEventListener('pointerdown', pointerDown);
    root.removeEventListener('pointerup', pointerUp);
    root.removeEventListener('pointercancel', pointerUp);
    root.removeEventListener('lostpointercapture', pointerUp);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', clearInput);
  };
}
