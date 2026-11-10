import { moveMazePlayer } from './logic.js';

const MAZE = [
  '#########',
  '#S..#...#',
  '##..#.#E#',
  '#...#.#.#',
  '#.###...#',
  '#K......#',
  '#########'
];
const START = { x: 1, y: 1 };
const KEY = { x: 1, y: 5 };
const EXIT = { x: 7, y: 2 };
const DIRECTIONS = [
  ['up', '↑', 'Move up'],
  ['left', '←', 'Move left'],
  ['down', '↓', 'Move down'],
  ['right', '→', 'Move right']
];
const GHOST_ROUTE = [
  { x: 5, y: 5 },
  { x: 6, y: 5 },
  { x: 7, y: 5 },
  { x: 7, y: 4 },
  { x: 7, y: 3 },
  { x: 7, y: 2 },
  { x: 7, y: 3 },
  { x: 7, y: 4 },
  { x: 7, y: 5 },
  { x: 6, y: 5 }
];

export function restoreMazeState(saved) {
  if (!saved) return { player: { ...START }, hasKey: false, moves: 0 };
  const { player, hasKey, moves } = saved;
  if (!player || !Number.isInteger(player.x) || !Number.isInteger(player.y)
    || !MAZE[player.y]?.[player.x] || MAZE[player.y][player.x] === '#'
    || typeof hasKey !== 'boolean' || !Number.isSafeInteger(moves) || moves < 0) {
    console.warn('Invalid saved Fright Nights progress; starting the quest again.');
    return { player: { ...START }, hasKey: false, moves: 0 };
  }
  return { player: { ...player }, hasKey, moves, complete: saved.complete === true };
}

export function mountMazeGame(root, onComplete, playSound, { savedState, onProgress } = {}) {
  const saved = restoreMazeState(savedState);
  let player = saved.player;
  let ghostIndex = 0;
  let ghost = GHOST_ROUTE[ghostIndex];
  let hasKey = saved.hasKey;
  let moves = saved.moves;
  let disposed = false;
  let ghostTimer = 0;

  root.innerHTML = `
    <section class="mini-game maze-game">
      <header class="mini-game__header">
        <p class="eyebrow">Earls Barton · Fright Nights</p>
        <h3>Find your way through the dark</h3>
        <p>Find the lantern key, then reach the exit. A restless ghost patrols the far passage.</p>
      </header>
      <div class="maze-status-row">
        <span id="mazeKeyStatus">🗝️ Lantern key: missing</span>
        <span id="mazeMoveCount">Steps: 0</span>
      </div>
      <div class="maze-grid" id="mazeGrid" role="grid" aria-label="Fright Nights maze"></div>
      <div class="maze-pad" role="group" aria-label="Maze movement controls">
        ${DIRECTIONS.map(([direction, glyph, label]) => `
          <button type="button" class="rs3-btn game-control" data-move="${direction}" aria-label="${label}">${glyph}</button>
        `).join('')}
      </div>
      <p class="game-status" id="mazeMessage" aria-live="polite">Use the arrow keys, WASD, or the buttons to explore.</p>
      <p class="game-hint">The lantern key is hidden in the lower-left corridor. The exit is at the far right.</p>
    </section>
  `;

  const gridElement = root.querySelector('#mazeGrid');
  const keyStatus = root.querySelector('#mazeKeyStatus');
  const moveCount = root.querySelector('#mazeMoveCount');
  const message = root.querySelector('#mazeMessage');

  function renderMaze() {
    if (disposed) return;
    gridElement.innerHTML = '';
    MAZE.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        const cell = document.createElement('div');
        const isPlayer = player.x === x && player.y === y;
        const isStart = tile === 'S';
        const isExit = tile === 'E';
        const isKey = x === KEY.x && y === KEY.y && !hasKey;
        const isGhost = ghost.x === x && ghost.y === y;
        cell.className = `maze-cell ${tile === '#' ? 'maze-cell--wall' : 'maze-cell--path'}`;
        cell.setAttribute('role', 'gridcell');
        if (isPlayer) {
          cell.textContent = '🧙';
          cell.setAttribute('aria-label', 'Your adventurer');
        } else if (isGhost) {
          cell.textContent = '👻';
          cell.setAttribute('aria-label', 'Roaming ghost');
        } else if (isKey) {
          cell.textContent = '✨';
          cell.setAttribute('aria-label', 'A glimmer in the corn');
        } else if (isExit) {
          cell.textContent = hasKey ? '🚪' : '🔒';
          cell.setAttribute('aria-label', hasKey ? 'Unlocked exit' : 'Locked exit');
        } else if (isStart) {
          cell.textContent = '🏕️';
          cell.setAttribute('aria-label', 'Starting point');
        } else if (tile === '#') {
          cell.setAttribute('aria-label', 'Corn wall');
        }
        gridElement.appendChild(cell);
      });
    });
    keyStatus.textContent = hasKey ? '🗝️ Lantern key: found!' : '🗝️ Lantern key: missing';
    moveCount.textContent = `Steps: ${moves}`;
  }

  function move(direction) {
    if (disposed) return;
    const next = moveMazePlayer(player, direction, MAZE);
    if (next === player) {
      message.textContent = 'The corn is too thick that way. Try another path.';
      return;
    }

    player = next;
    moves += 1;
    playSound('click');
    const metGhost = player.x === ghost.x && player.y === ghost.y;
    if (metGhost && !hasKey) {
      sendBackToCheckpoint();
      message.textContent = 'The ghost caught you! Your key is safe — try the passage again.';
      onProgress?.({ player, hasKey, moves });
      renderMaze();
      return;
    }
    if (metGhost) {
      playSound('error');
      message.textContent = 'The lantern wards off the ghost! Keep going.';
    }
    if (player.x === KEY.x && player.y === KEY.y && !hasKey) {
      hasKey = true;
      message.textContent = 'You found the lantern key! Now find the locked gate.';
      playSound('success');
    } else if (player.x === EXIT.x && player.y === EXIT.y) {
      if (!hasKey) {
        message.textContent = 'The gate is locked. Find the lantern key first.';
      } else {
        message.textContent = `You found the way out in ${moves} steps. Happy Fright Nights!`;
        onProgress?.({ player, hasKey, moves, complete: true });
        playSound('success');
        renderMaze();
        onComplete();
        return;
      }
    } else if (!metGhost) {
      message.textContent = hasKey ? 'Key in hand — find the exit!' : 'Keep exploring. Look for a glimmer in the corn.';
    }
    onProgress?.({ player, hasKey, moves });
    renderMaze();
  }

  function sendBackToCheckpoint() {
    player = { ...(hasKey ? KEY : START) };
    playSound('error');
  }

  function moveGhost() {
    if (disposed) return;
    ghostIndex = (ghostIndex + 1) % GHOST_ROUTE.length;
    ghost = GHOST_ROUTE[ghostIndex];
    if (player.x === ghost.x && player.y === ghost.y) {
      if (hasKey) {
        playSound('error');
        message.textContent = 'The lantern wards off the ghost! Keep going.';
      } else {
        sendBackToCheckpoint();
        message.textContent = 'The ghost swept through the passage! Try another run.';
      }
      onProgress?.({ player, hasKey, moves });
    }
    renderMaze();
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-move]');
    if (button) move(button.dataset.move);
  });

  const keyDirections = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };
  const onKeyDown = (event) => {
    const direction = keyDirections[event.code];
    if (!direction || !root.isConnected) return;
    if (event.target instanceof HTMLInputElement) return;
    event.preventDefault();
    move(direction);
  };
  window.addEventListener('keydown', onKeyDown);

  renderMaze();
  ghostTimer = window.setInterval(moveGhost, 2200);
  return () => {
    disposed = true;
    window.clearInterval(ghostTimer);
    window.removeEventListener('keydown', onKeyDown);
  };
}

export { MAZE };
