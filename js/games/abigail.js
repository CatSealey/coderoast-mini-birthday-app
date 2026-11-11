import { ABIGAIL_ROOMS, ABIGAIL_RUNE_OPTIONS, abigailObjective, chooseAbigailRune, interactAbigail, moveAbigail, newAbigailState } from './abigail-logic.js';

const DIRECTIONS = [
  ['up', '↑', 'Move up'],
  ['left', '←', 'Move left'],
  ['down', '↓', 'Move down'],
  ['right', '→', 'Move right']
];

export function mountAbigailGame(root, onComplete, playSound) {
  let state = newAbigailState();
  let disposed = false;
  root.innerHTML = `
    <section class="mini-game abigail-game">
      <header class="mini-game__header">
        <p class="eyebrow">Kettering · Abigail Escape</p>
        <h3>The Wardkeeper’s Escape</h3>
        <p>Explore the rooms, examine objects and use the clues to escape.</p>
      </header>
      <div class="abigail-journal">
        <strong id="abigailRoom"></strong>
        <span id="abigailObjective"></span>
      </div>
      <div class="abigail-layout">
        <div class="abigail-grid" id="abigailGrid" role="group" aria-label="Escape room: move next to an object to inspect it"></div>
        <aside class="abigail-notes">
          <strong>Inventory &amp; clues</strong>
          <p id="abigailInventory"></p>
          <p id="abigailClue"></p>
        </aside>
      </div>
      <div class="maze-pad" role="group" aria-label="Escape room movement controls">
        ${DIRECTIONS.map(([direction, glyph, label]) => `
          <button type="button" class="rs3-btn game-control" data-abigail-move="${direction}" aria-label="${label}">${glyph}</button>
        `).join('')}
      </div>
      <section id="abigailPuzzle" class="abigail-puzzle" aria-labelledby="abigailPuzzleTitle" hidden>
        <strong id="abigailPuzzleTitle">Choose the runes in order</strong>
        <p id="abigailRuneProgress"></p>
        <div class="abigail-runes">
          ${ABIGAIL_RUNE_OPTIONS.map(({ name, symbol }) => `<button type="button" class="rune-tile game-control" data-abigail-rune="${name}"><span aria-hidden="true">${symbol}</span><small>${name}</small></button>`).join('')}
        </div>
        <button type="button" class="rs3-btn game-control abigail-back" data-abigail-close>Step away from the ward</button>
      </section>
      <p class="game-status" id="abigailMessage" role="status"></p>
      <p class="game-hint">Use WASD, arrow keys or the movement buttons. Tap a neighbouring tile or walk into an object to inspect it.</p>
    </section>
  `;
  const grid = root.querySelector('#abigailGrid');
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 7; x += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'abigail-cell';
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      grid.append(cell);
    }
  }

  function render() {
    const room = ABIGAIL_ROOMS[state.room];
    root.querySelector('#abigailRoom').textContent = room.name;
    root.querySelector('#abigailObjective').textContent = abigailObjective(state);
    root.querySelector('#abigailInventory').textContent = `Small key: ${state.hasKey ? 'found' : 'missing'} · Escape token: ${state.hasToken ? 'found' : 'missing'}`;
    root.querySelector('#abigailClue').textContent = state.diaryRead
      ? 'Diary clue: first a star, then the moon, then a diamond.'
      : 'Diary clue: not discovered yet.';
    root.querySelector('#abigailMessage').textContent = state.message;
    root.querySelector('#abigailPuzzle').hidden = !state.puzzleOpen;
    root.querySelector('#abigailRuneProgress').textContent = `${state.runeInput.length} / 3 symbols placed`;
    grid.querySelectorAll('.abigail-cell').forEach((cell) => {
      const x = Number(cell.dataset.x), y = Number(cell.dataset.y);
      const object = room.objects.find((item) => item.x === x && item.y === y);
      const player = state.player.x === x && state.player.y === y;
      cell.textContent = player ? '🧙' : object?.icon ?? '';
      cell.classList.toggle('abigail-cell--player', player);
      cell.classList.toggle('abigail-cell--object', Boolean(object));
      cell.setAttribute('aria-label', player ? `Your character, column ${x + 1}, row ${y + 1}`
        : object ? `${object.name}, column ${x + 1}, row ${y + 1}` : `Floor, column ${x + 1}, row ${y + 1}`);
      cell.disabled = state.puzzleOpen;
    });
  }

  function update(next) {
    if (disposed || next === state) return;
    const solved = !state.wardSolved && next.wardSolved;
    const openedPuzzle = !state.puzzleOpen && next.puzzleOpen;
    const closedPuzzle = state.puzzleOpen && !next.puzzleOpen;
    state = next;
    if (state.complete) {
      playSound('success');
      onComplete();
      return;
    }
    if (solved) playSound('success');
    render();
    if (openedPuzzle) root.querySelector('[data-abigail-rune]').focus();
    else if (closedPuzzle) grid.querySelector('[data-x="3"][data-y="1"]').focus();
  }

  function handleClick(event) {
    const target = event.target.closest('button');
    if (!target || !root.contains(target)) return;
    if (target.dataset.abigailMove) update(moveAbigail(state, target.dataset.abigailMove));
    else if (target.dataset.abigailRune) update(chooseAbigailRune(state, target.dataset.abigailRune));
    else if (target.hasAttribute('data-abigail-close')) update({ ...state, puzzleOpen: false, runeInput: [], message: 'You step away from the ward.' });
    else if (target.classList.contains('abigail-cell')) {
      const x = Number(target.dataset.x), y = Number(target.dataset.y);
      const object = ABIGAIL_ROOMS[state.room].objects.find((item) => item.x === x && item.y === y);
      if (object) update(interactAbigail(state, object.id));
      else {
        const dx = x - state.player.x, dy = y - state.player.y;
        if (Math.abs(dx) + Math.abs(dy) === 1) update(moveAbigail(state, dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up'));
        else if (dx || dy) update({ ...state, message: 'Tap a neighbouring tile or use the movement controls to explore.' });
      }
    }
  }
  const keyDirections = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  function handleKey(event) {
    const direction = keyDirections[event.code];
    if (!direction || !root.isConnected || state.puzzleOpen || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    update(moveAbigail(state, direction));
  }
  root.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKey);
  render();
  return () => {
    disposed = true;
    root.removeEventListener('click', handleClick);
    window.removeEventListener('keydown', handleKey);
  };
}
