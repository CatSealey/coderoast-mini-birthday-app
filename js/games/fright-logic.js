export const CELL = 110;
export const SIZE = 13;
const stage = (question, choices, answer) => ({ question, choices, answer });
export const FRIGHT_THEMES = Object.freeze([
  { id: 'disease', name: 'Disease', item: 'Remedy vial', color: '#83c86c', zone: 'Quarantine Ward',
    clue: 'Infirmary notes: a feverish patient needs the green tonic first. The red salt goes in second, once the tonic settles. Sealing wax always goes last. Three cots are infected and each needs a fresh pair of gloves.',
    tool: { name: 'Sterile gloves', action: 'You pull on a sterile pair of gloves from the quarantine cart.' },
    scare: 'A cough echoes and green mist rolls over the cots.',
    stages: [stage('Pour the first ingredient into the remedy. Which?', ['Red salt', 'Green tonic', 'Sealing wax'], 'Green tonic'),
      stage('The tonic has settled. What goes in second?', ['Sealing wax', 'Green tonic', 'Red salt'], 'Red salt'),
      stage('You hold one pair of gloves. How many more pairs do the cots need?', ['3', '2', '1'], '2')] },
  { id: 'ai', name: 'AI', item: 'Memory chip', color: '#60d3dd', zone: 'Server Vault',
    clue: 'Core log: the machine doubles each number it remembers: 2, 4, 8… Its panels unlock red, then green, then blue. Its backup code is the next number read backwards.',
    tool: { name: 'Access key', action: 'You slot the stolen access key into the terminal and it hums awake.' },
    scare: 'The screens flash red and a cold synthetic voice says: ACCESS DENIED.',
    stages: [stage('Type the next number in the machine\'s sequence.', ['12', '16', '32'], '16'),
      stage('Which panel do you unlock last?', ['Blue', 'Red', 'Green'], 'Blue'),
      stage('Enter the backup code: that number read backwards.', ['16', '32', '61'], '61')] },
  { id: 'darkness', name: 'Darkness', item: 'Starlight lens', color: '#9a91df', zone: 'Blackout Hall',
    clue: 'Scratched on the wall: the star is left of the moon, and the sun is right of the moon. Three candles remain: the tall one burns 9 minutes, the medium 6 and the short 3.',
    tool: { name: 'Match box', action: 'You strike a match. A small flame pushes the dark back.' },
    scare: 'Your match gutters out and something moves in the black.',
    stages: [stage('Which light sits in the middle of the carved row?', ['Sun', 'Moon', 'Star'], 'Moon'),
      stage('Which candle will keep burning longest?', ['Short', 'Tall', 'Medium'], 'Tall'),
      stage('The medium and short candles burn one after the other. How many minutes of light is that?', ['9', '6', '12'], '9')] },
  { id: 'chainsaws', name: 'Chainsaws', item: 'Safety cog', color: '#ec9b59', zone: 'Sawmill Yard',
    clue: 'Workshop rules: three linked gears turn in alternating directions and the first turns clockwise. Each saw needs 4 seconds to spin down and the guard stays open for 12. Never reach in until the blade stops.',
    tool: { name: 'Heavy wrench', action: 'You lift the heavy wrench from the workbench.' },
    scare: 'A saw roars to life and sawdust sprays across the yard.',
    stages: [stage('Which way does the third gear turn?', ['Anticlockwise', 'Clockwise', 'Neither'], 'Clockwise'),
      stage('How many saw spin-downs fit in the 12-second guard window?', ['4', '3', '2'], '3'),
      stage('The blade still spins. What do you do?', ['Wait for it to stop', 'Reach for the cog', 'Hit it with the wrench'], 'Wait for it to stop')] },
  { id: 'bogeymen', name: 'Bogeymen', item: 'Dream catcher', color: '#bda2ca', zone: 'Nursery of Shadows',
    clue: 'A child\'s rhyme: the bogeyman hides before midnight, then sleeps for eight hours. It visits three hiding places in a row. The closet is not first, the bed is not last, and the window comes between them.',
    tool: { name: 'Salt lantern', action: 'You light the salt lantern. Shadows shrink back from its glow.' },
    scare: 'Two pale eyes open in the wardrobe, then vanish.',
    stages: [stage('If it falls asleep at midnight, when does it wake?', ['10 AM', '6 AM', '8 AM'], '8 AM'),
      stage('Which hiding place does it visit first?', ['Closet', 'Bed', 'Window'], 'Bed'),
      stage('Which hiding place does it visit last?', ['Window', 'Closet', 'Bed'], 'Closet')] },
  { id: 'claustrophobia', name: 'Claustrophobia', item: 'Air charm', color: '#85bcae', zone: 'Crawlspace Tunnels',
    clue: 'Vent notes: the dial turns one step clockwise each time: north, east, south… The crawlway is 12 steps long and you can cover 3 steps per breath.',
    tool: { name: 'Pry bar', action: 'You wedge the pry bar into your pocket. The tunnel feels narrower.' },
    scare: 'The walls groan and the tunnel seems to squeeze tighter.',
    stages: [stage('Which direction does the vent dial turn to next?', ['North', 'West', 'East'], 'West'),
      stage('How many breaths to crawl the whole way?', ['3', '5', '4'], '4'),
      stage('After four more clockwise turns from north, where does the dial point?', ['South', 'North', 'West'], 'North')] },
  { id: 'clowns', name: 'Clowns', item: 'Carnival mask', color: '#e493a6', zone: 'Big Top Funhouse',
    clue: 'Three balloons are red, blue and yellow, one of each: spotted, plain and striped. Spotted is not red. Plain is blue. Striped is not yellow. The clown honks twice for every balloon you pop.',
    tool: { name: 'Pin', action: 'You borrow a sharp pin from a juggler\'s prop table.' },
    scare: 'A horn honks right behind you. Nobody is there.',
    stages: [stage('Which balloon is red?', ['Spotted', 'Plain', 'Striped'], 'Striped'),
      stage('Which balloon is yellow?', ['Plain', 'Spotted', 'Striped'], 'Spotted'),
      stage('You pop the red and yellow balloons. How many honks follow?', ['2', '6', '4'], '4')] }
]);

function makeMaze() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill('#'));
  const visited = new Set(['1,1']);
  const stack = [[1, 1]];
  let seed = 7941;
  grid[1][1] = '.';
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const options = [[0, -2], [2, 0], [0, 2], [-2, 0]]
      .map(([dx, dy]) => [x + dx, y + dy, dx, dy])
      .filter(([nx, ny]) => nx > 0 && ny > 0 && nx < SIZE - 1 && ny < SIZE - 1 && !visited.has(`${nx},${ny}`));
    if (!options.length) { stack.pop(); continue; }
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const [nx, ny, dx, dy] = options[seed % options.length];
    grid[y + dy / 2][x + dx / 2] = '.';
    grid[ny][nx] = '.';
    visited.add(`${nx},${ny}`);
    stack.push([nx, ny]);
  }
  return grid.map((row) => row.join(''));
}

export const FRIGHT_MAZE = Object.freeze(makeMaze());
export const FRIGHT_START = Object.freeze({ x: CELL * 1.5, y: CELL * 1.5 });

function openNeighbours(x, y) {
  return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]
    .filter(([nx, ny]) => FRIGHT_MAZE[ny]?.[nx] === '.');
}

function distances(start) {
  const queue = [start];
  const found = new Map([[`${start[0]},${start[1]}`, 0]]);
  for (let i = 0; i < queue.length; i += 1) {
    const [x, y] = queue[i];
    for (const [nx, ny] of openNeighbours(x, y)) {
      const key = `${nx},${ny}`;
      if (!found.has(key)) { found.set(key, found.get(`${x},${y}`) + 1); queue.push([nx, ny]); }
    }
  }
  return found;
}

const startDistances = distances([1, 1]);
const nodes = [];
for (let y = 1; y < SIZE - 1; y += 2) for (let x = 1; x < SIZE - 1; x += 2) {
  if (x !== 1 || y !== 1) nodes.push({ x, y, distance: startDistances.get(`${x},${y}`) });
}
nodes.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x);
const chunked = nodes.filter((_, index) => index % 5 < 3).slice(0, FRIGHT_THEMES.length * 3);
const point = (node) => ({ x: (node.x + 0.5) * CELL, y: (node.y + 0.5) * CELL });
export const FRIGHT_OBJECTS = Object.freeze([
  { id: 'exit', name: 'Escape gate', ...FRIGHT_START, kind: 'exit' },
  ...FRIGHT_THEMES.flatMap((theme, index) => [
    { id: `clue-${theme.id}`, name: `${theme.name} clue`, kind: 'clue', theme: theme.id, ...point(chunked[index * 3]) },
    { id: `tool-${theme.id}`, name: theme.tool.name, kind: 'tool', theme: theme.id, ...point(chunked[index * 3 + 1]) },
    { id: `cache-${theme.id}`, name: `${theme.name} mechanism`, kind: 'cache', theme: theme.id, ...point(chunked[index * 3 + 2]) }
  ])
]);

export function newFrightState() {
  return { version: 2, player: { ...FRIGHT_START }, clues: [], tools: [], collected: [], stage: 0, scares: 0, legacyKey: false, complete: false,
    message: 'Explore the seven fears: read each clue, take its tool, then work its mechanism to open the escape gate.' };
}

export function frightWalkable(player) {
  if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) return false;
  const radius = 15;
  return [[-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius]]
    .every(([dx, dy]) => FRIGHT_MAZE[Math.floor((player.y + dy) / CELL)]?.[Math.floor((player.x + dx) / CELL)] === '.');
}

export function restoreFrightState(saved) {
  const fresh = newFrightState();
  if (!saved) return fresh;
  if (saved.version === undefined && saved.player && Number.isInteger(saved.player.x)
    && Number.isInteger(saved.player.y) && typeof saved.hasKey === 'boolean'
    && Number.isSafeInteger(saved.moves) && saved.moves >= 0) {
    return { ...fresh, legacyKey: saved.hasKey === true, complete: saved.complete === true };
  }
  const validIds = (ids) => Array.isArray(ids) && ids.every((id) => FRIGHT_THEMES.some((theme) => theme.id === id))
    && new Set(ids).size === ids.length;
  if (saved.version !== 2 || !frightWalkable(saved.player) || !validIds(saved.clues) || !validIds(saved.collected)
    || typeof saved.legacyKey !== 'boolean' || typeof saved.complete !== 'boolean') {
    console.warn('Invalid saved Fright Nights progress; starting the maze again.');
    return fresh;
  }
  const tools = saved.tools === undefined ? [] : saved.tools;
  if (!validIds(tools)) return fresh;
  const scares = Number.isSafeInteger(saved.scares) && saved.scares >= 0 ? saved.scares : 0;
  return { ...fresh, player: { ...saved.player }, clues: [...new Set([...saved.clues, ...saved.collected])],
    tools: [...new Set([...tools, ...saved.collected])], collected: [...saved.collected], scares,
    legacyKey: saved.legacyKey, complete: saved.complete };
}

export function walkFright(state, dx, dy, seconds) {
  if (state.complete || !Number.isFinite(seconds) || seconds <= 0) return state;
  const length = Math.hypot(dx, dy);
  if (!length) return state;
  const distance = Math.min(length, 175 * seconds, 15);
  const player = { x: state.player.x + dx / length * distance, y: state.player.y + dy / length * distance };
  return frightWalkable(player) ? { ...state, player } : state;
}

export function frightPath(start, destination) {
  const from = [Math.floor(start.x / CELL), Math.floor(start.y / CELL)];
  const to = [Math.floor(destination.x / CELL), Math.floor(destination.y / CELL)];
  if (!frightWalkable(start) || !frightWalkable(destination)) return null;
  const queue = [from], previous = new Map([[from.join(','), null]]);
  for (let index = 0; index < queue.length; index += 1) {
    const [x, y] = queue[index];
    if (x === to[0] && y === to[1]) break;
    for (const [nx, ny] of openNeighbours(x, y)) {
      const key = `${nx},${ny}`;
      if (!previous.has(key)) { previous.set(key, `${x},${y}`); queue.push([nx, ny]); }
    }
  }
  let key = to.join(',');
  if (!previous.has(key)) return null;
  const cells = [];
  while (key !== null) {
    const [x, y] = key.split(',').map(Number);
    cells.unshift({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL });
    key = previous.get(key);
  }
  return [...cells, destination];
}

export function interactFright(state, id) {
  const object = FRIGHT_OBJECTS.find((entry) => entry.id === id);
  if (!object || state.complete) return state;
  if (Math.hypot(state.player.x - object.x, state.player.y - object.y) > 65) {
    return { ...state, message: `Move closer to ${object.name}.` };
  }
  if (object.kind === 'exit') {
    if (state.collected.length < FRIGHT_THEMES.length) return { ...state, message: `The gate needs all seven objects. You have ${state.collected.length} of 7.` };
    return { ...state, complete: true, message: 'The seven objects open the gate. You escaped Fright Nights!' };
  }
  const theme = FRIGHT_THEMES.find((entry) => entry.id === object.theme);
  if (object.kind === 'clue') {
    return { ...state, clues: state.clues.includes(theme.id) ? state.clues : [...state.clues, theme.id],
      message: `${theme.zone} clue: ${theme.clue}` };
  }
  if (object.kind === 'tool') {
    if (state.tools.includes(theme.id)) return { ...state, message: `You already carry the ${theme.tool.name.toLowerCase()}.` };
    if (!state.clues.includes(theme.id)) return { ...state, message: `You are not sure what the ${theme.tool.name.toLowerCase()} is for. Read the ${theme.name} clue first.` };
    return { ...state, tools: [...state.tools, theme.id], message: `${theme.tool.action} Take it to the ${theme.name} mechanism.` };
  }
  if (state.collected.includes(theme.id)) return { ...state, message: `You already recovered the ${theme.item.toLowerCase()}.` };
  if (!state.clues.includes(theme.id)) return { ...state, message: `The ${theme.name} mechanism is a mystery. Search the ${theme.zone} for its clue.` };
  if (!state.tools.includes(theme.id)) return { ...state, message: `The mechanism needs the ${theme.tool.name.toLowerCase()}. Search the ${theme.zone}.` };
  return { ...state, puzzle: theme.id, stage: 0, message: `Work the ${theme.name} mechanism using what you learned from the clue.` };
}

export function frightStage(state) {
  const theme = FRIGHT_THEMES.find((entry) => entry.id === state.puzzle);
  if (!theme) return null;
  const index = Math.min(state.stage || 0, theme.stages.length - 1);
  return { theme, index, total: theme.stages.length, ...theme.stages[index] };
}

export function answerFright(state, answer) {
  const current = frightStage(state);
  if (!current || !current.choices.includes(answer) || state.complete) return state;
  const { theme, index, total } = current;
  if (answer !== current.answer) {
    return { ...state, puzzle: null, stage: 0, scares: (state.scares || 0) + 1,
      message: `${theme.scare} The mechanism resets. Re-read the clue and try again.` };
  }
  if (index + 1 < total) return { ...state, stage: index + 1, message: `Step ${index + 1} of ${total} done. The mechanism clicks forward.` };
  return { ...state, puzzle: null, stage: 0, collected: [...state.collected, theme.id], message: `You recovered the ${theme.item.toLowerCase()}!` };
}
