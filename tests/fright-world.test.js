import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, FRIGHT_CLUES, FRIGHT_MAZE, FRIGHT_OBJECTS, FRIGHT_OBSTACLES, FRIGHT_PLAYER_RADIUS, FRIGHT_SCENERY, FRIGHT_START, FRIGHT_THEMES, SIZE, answerFright, frightExitReady, frightPath, frightStage, frightTeleportPosition, frightThemeCluesFound, frightWalkable, interactFright, newFrightState, restoreFrightState, teleportFright, walkFright } from '../js/games/fright-logic.js';
import { createFrightScene } from '../js/games/fright-scene.js';
import { questItems } from '../js/quest-items.js';
import { discoveredFrightClues } from '../js/games/fright-clues.js';

function visit(state, object) {
  const path = frightPath(state.player, object);
  assert.ok(path, `route to ${object.name}`);
  for (const point of path) {
    let remaining = 100;
    while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.001 && remaining-- > 0) {
      const next = walkFright(state, point.x - state.player.x, point.y - state.player.y, 0.05);
      assert.notStrictEqual(next, state, `walkable route to ${object.name}`);
      state = next;
    }
    assert.ok(remaining > 0);
  }
  return interactFright(state, object.id);
}

test('maze walking stride follows distance instead of frame rate and rests when stopped', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const shoes = [];
  const context = {
    setTransform() {}, fillRect(x, y) { if (this.fillStyle === '#594336') shoes.push({ x, y }); },
    strokeRect() {}, fillText() {}, beginPath() {}, ellipse() {}, arc() {}, fill() {}
  };
  const canvas = { getContext: () => context, addEventListener() {}, removeEventListener() {} };
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.cancelAnimationFrame = () => {};
  try {
    for (const frames of [30, 60, 120]) {
      const scene = createFrightScene(canvas, () => {});
      scene.resize(650, 650);
      const state = newFrightState();
      scene.draw(state);
      for (let frame = 1; frame <= frames; frame += 1) {
        shoes.length = 0;
        scene.draw({ ...state, player: { ...state.player, x: state.player.x + 175 * frame / frames } });
      }
      assert.equal(shoes.length, 2);
      const stride = (shoes[0].y - shoes[1].y) / 4;
      assert.ok(Math.abs(stride - Math.sin(175 * 0.04) * 0.4) < 1e-10);
      shoes.length = 0;
      scene.draw({ ...state, player: { ...state.player, x: state.player.x + 175 } });
      assert.equal(shoes[0].y, shoes[1].y);
      scene.dispose();
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCancelAnimationFrame === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
  }
});

test('maze routes reach all seven clues and mechanisms with continuous collision', () => {
  assert.equal(FRIGHT_THEMES.length, 7);
  assert.ok(SIZE >= 25);
  assert.equal(new Set(FRIGHT_OBJECTS.map(({ x, y }) => `${x},${y}`)).size, 36);
  assert.ok(FRIGHT_MAZE.some((row) => row.includes('#')));
  const state = newFrightState();
  let atWall = state;
  for (let i = 0; i < 10; i += 1) atWall = walkFright(atWall, -1000, 0, 1);
  assert.strictEqual(walkFright(atWall, -1000, 0, 1), atWall, 'boundary walls block walking');
  for (const object of FRIGHT_OBJECTS) {
    const reached = visit(state, object);
    assert.equal(frightWalkable(reached.player), true);
  }
});

test('side objects and scenery are solid while every walkway keeps central clearance', () => {
  assert.ok(FRIGHT_SCENERY.length > 0);
  for (const object of [...FRIGHT_OBJECTS.filter(({ kind }) => kind !== 'exit'), ...FRIGHT_SCENERY]) {
    const obstacle = FRIGHT_OBSTACLES.find((entry) => entry.x === object.x && entry.y === object.y);
    assert.ok(obstacle);
    const dx = (object.x - object.approach.x) / (CELL / 2);
    const dy = (object.y - object.approach.y) / (CELL / 2);
    assert.equal(Math.abs(dx) + Math.abs(dy), 1);
    const cellX = Math.floor(object.approach.x / CELL), cellY = Math.floor(object.approach.y / CELL);
    assert.equal(FRIGHT_MAZE[cellY + dy][cellX + dx], '#');
    assert.ok(frightWalkable(object.approach));
    const inside = obstacle.halfSize + FRIGHT_PLAYER_RADIUS - 1;
    assert.equal(frightWalkable({ x: object.x - dx * inside, y: object.y - dy * inside }), false);
    let state = { ...newFrightState(), player: { ...object.approach } };
    for (let i = 0; i < 20; i += 1) state = walkFright(state, dx, dy, 0.05);
    assert.ok(Math.hypot(state.player.x - object.x, state.player.y - object.y) >= obstacle.halfSize + FRIGHT_PLAYER_RADIUS);
  }
  for (let y = 0; y < SIZE; y += 1) for (let x = 0; x < SIZE; x += 1) {
    if (FRIGHT_MAZE[y][x] !== '.') continue;
    const center = { x: (x + 0.5) * CELL, y: (y + 0.5) * CELL };
    assert.ok(frightPath(FRIGHT_START, center), `route to ${x},${y}`);
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (FRIGHT_MAZE[y + dy]?.[x + dx] !== '.') continue;
      for (let step = 0; step <= 22; step += 1) for (const offset of [-8, 0, 8]) {
        const player = { x: center.x + dx * step * 5 + dy * offset, y: center.y + dy * step * 5 + dx * offset };
        assert.ok(frightWalkable(player), `clearance along ${x},${y} to ${x + dx},${y + dy}`);
      }
    }
  }
});

test('older saves inside a new obstacle keep their progress and move to a safe position', () => {
  const object = FRIGHT_OBJECTS.find(({ kind }) => kind === 'cache');
  const dx = (object.x - object.approach.x) / (CELL / 2), dy = (object.y - object.approach.y) / (CELL / 2);
  const oldPosition = { x: object.approach.x + dx * 20, y: object.approach.y + dy * 20 };
  assert.equal(frightWalkable(oldPosition), false);
  const saved = { ...newFrightState(), player: oldPosition, clues: ['clue-ai-1'], tools: ['ai'] };
  const restored = restoreFrightState(saved);
  assert.deepEqual(restored.player, object.approach);
  assert.deepEqual(restored.clues, saved.clues);
  assert.deepEqual(restored.tools, saved.tools);
  assert.match(restored.message, /moved to a clear place/);
  assert.ok(frightWalkable(restored.player));
});

test('collected clues and completed objects remain as muted solid bases in the illustrated fallback', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const rectangles = [];
  const context = {
    setTransform() {}, fillRect(x, y, width, height) { rectangles.push({ color: this.fillStyle, x, y, width, height }); },
    strokeRect() {}, fillText() {}, beginPath() {}, ellipse() {}, arc() {}, fill() {}
  };
  const canvas = { getContext: () => context, addEventListener() {}, removeEventListener() {} };
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.cancelAnimationFrame = () => {};
  try {
    const object = FRIGHT_OBJECTS.find(({ kind }) => kind === 'cache');
    const clue = FRIGHT_OBJECTS.find(({ kind }) => kind === 'clue');
    const scene = createFrightScene(canvas, () => {});
    scene.resize(650, 650);
    scene.draw({ ...newFrightState(), player: object.approach, clues: [clue.id], collected: [object.theme] });
    const x = 325 + object.x - object.approach.x, y = 325 + object.y - object.approach.y;
    assert.ok(rectangles.some((rect) => rect.color === '#4a4335'
      && rect.x === x - 27 && rect.y === y - 27 && rect.width === 54 && rect.height === 54));
    const clueX = 325 + clue.x - object.approach.x, clueY = 325 + clue.y - object.approach.y;
    assert.ok(rectangles.some((rect) => rect.color === '#4a4335'
      && rect.x === clueX - 17 && rect.y === clueY - 17 && rect.width === 34 && rect.height === 34));
    scene.dispose();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCancelAnimationFrame === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
  }
});

test('each themed area has distinct content, 3 stages and unambiguous answers', () => {
  assert.deepEqual(FRIGHT_THEMES.map((theme) => theme.id), ['disease', 'ai', 'darkness', 'chainsaws', 'bogeymen', 'claustrophobia', 'clowns']);
  assert.equal(new Set(FRIGHT_THEMES.map((theme) => theme.zone)).size, 7);
  assert.equal(new Set(FRIGHT_THEMES.map((theme) => theme.tool.name)).size, 7);
  for (const theme of FRIGHT_THEMES) {
    assert.equal(FRIGHT_CLUES[theme.id].length, 3);
    const clues = FRIGHT_OBJECTS.filter((object) => object.kind === 'clue' && object.theme === theme.id);
    assert.equal(clues.length, 3);
    assert.equal(new Set(clues.map((clue) => clue.text)).size, 3);
    assert.equal(theme.stages.length, 3);
    for (const entry of theme.stages) {
      assert.ok(entry.choices.includes(entry.answer));
      assert.equal(new Set(entry.choices).size, entry.choices.length);
    }
  }
});

test('clue, tool and mechanism must be done in order; mistakes reset steps but keep items', () => {
  let state = newFrightState();
  state = interactFright(state, 'exit');
  assert.equal(state.complete, false);
  assert.match(state.message, /0 of 7/);
  const first = FRIGHT_THEMES[0];
  const at = (kind, theme) => FRIGHT_OBJECTS.find((object) => object.id === `${kind}-${theme.id}`);
  state = visit(state, at('cache', first));
  assert.match(state.message, /mystery/);
  state = visit(state, at('tool', first));
  assert.equal(state.tools.length, 0);
  assert.match(state.message, /clues first/);
  for (const theme of FRIGHT_THEMES) {
    const clues = FRIGHT_OBJECTS.filter((object) => object.kind === 'clue' && object.theme === theme.id);
    for (const [index, clue] of clues.entries()) {
      state = visit(state, clue);
      assert.equal(frightThemeCluesFound(state, theme.id), index + 1);
      assert.ok(state.clues.includes(clue.id));
      if (index === 0) {
        state = visit(state, at('tool', theme));
        assert.ok(!state.tools.includes(theme.id));
      }
    }
    state = visit(state, at('cache', theme));
    assert.match(state.message, /needs the/);
    assert.ok(!state.puzzle);
    state = visit(state, at('tool', theme));
    assert.ok(state.tools.includes(theme.id));
    state = restoreFrightState(JSON.parse(JSON.stringify(state)));
    assert.ok(state.tools.includes(theme.id));
    state = visit(state, at('cache', theme));
    assert.equal(state.puzzle, theme.id);
    const count = state.collected.length;
    state = answerFright(state, theme.stages[0].answer);
    assert.equal(frightStage(state).index, 1);
    const wrong = frightStage(state).choices.find((choice) => choice !== frightStage(state).answer);
    state = answerFright(state, wrong);
    assert.equal(state.collected.length, count);
    assert.equal(state.stage, 0);
    assert.equal(state.scares, 1 + count);
    assert.equal(state.puzzle, null);
    state = interactFright(state, `cache-${theme.id}`);
    for (const entry of theme.stages) {
      assert.equal(state.collected.length, count);
      state = answerFright(state, entry.answer);
    }
    assert.equal(state.collected.length, count + 1);
    assert.equal(questItems([null, null, null, null, state]).length, count + 1);
    state = interactFright(state, `cache-${theme.id}`);
    assert.equal(state.collected.length, count + 1);
  }
  state = restoreFrightState(JSON.parse(JSON.stringify(state)));
  assert.equal(state.collected.length, 7);
  state = visit(state, FRIGHT_OBJECTS[0]);
  assert.equal(state.complete, true);
  assert.equal(questItems([null, null, null, null, state]).length, 0);
  const restored = restoreFrightState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.complete, true);
  assert.equal(restored.collected.length, 7);
});

test('escape teleport unlocks after the final object and completes from anywhere, including after reload', () => {
  const last = FRIGHT_THEMES.at(-1);
  const cache = FRIGHT_OBJECTS.find((object) => object.id === `cache-${last.id}`);
  const clues = FRIGHT_OBJECTS.filter((object) => object.kind === 'clue' && object.theme === last.id).map((object) => object.id);
  let state = { ...newFrightState(), player: { ...cache.approach }, clues, tools: [last.id],
    collected: FRIGHT_THEMES.slice(0, -1).map((theme) => theme.id) };
  assert.equal(frightExitReady(state), false);
  const blocked = teleportFright(state);
  assert.equal(blocked.complete, false);
  assert.match(blocked.message, /all seven/);
  state = interactFright(state, cache.id);
  for (const stage of last.stages) state = answerFright(state, stage.answer);
  assert.equal(frightExitReady(state), true);
  assert.match(state.message, /teleport is ready/);
  state = restoreFrightState(JSON.parse(JSON.stringify(state)));
  assert.equal(frightExitReady(state), true);
  assert.notDeepEqual(state.player, FRIGHT_START);
  assert.equal(teleportFright({ ...state, puzzle: last.id }).complete, false);
  const escaped = teleportFright(state);
  assert.equal(escaped.complete, true);
  assert.deepEqual(escaped.player, state.player);
  assert.equal(questItems([null, null, null, null, escaped]).length, 0);
  assert.equal(frightExitReady(escaped), false);
  assert.strictEqual(teleportFright(escaped), escaped);
  assert.equal(restoreFrightState(JSON.parse(JSON.stringify(escaped))).complete, true);
});

test('a nearby teleport circle is placed on a reachable walkway at every final mechanism', () => {
  for (const object of FRIGHT_OBJECTS.filter(({ kind }) => kind === 'cache')) {
    const players = [object.approach];
    for (let dx = -60; dx <= 60; dx += 10) for (let dy = -60; dy <= 60; dy += 10) {
      const player = { x: object.x + dx, y: object.y + dy };
      if (Math.hypot(dx, dy) <= 65 && frightWalkable(player)) players.push(player);
    }
    for (const player of players) {
      const position = frightTeleportPosition(player);
      const distance = Math.hypot(position.x - player.x, position.y - player.y);
      assert.ok(distance >= 24 && distance <= 40.001, object.id);
      assert.ok(frightWalkable(position), object.id);
      for (const fraction of [0.25, 0.5, 0.75, 1]) {
        assert.ok(frightWalkable({
          x: player.x + (position.x - player.x) * fraction,
          y: player.y + (position.y - player.y) * fraction
        }), object.id);
      }
    }
  }
});

test('fallback maze objects have no labels and remain selectable', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const texts = [], selections = [];
  let click;
  const context = {
    setTransform() {}, fillRect() {}, strokeRect() {}, fillText(text) { texts.push(text); },
    beginPath() {}, ellipse() {}, arc() {}, fill() {}
  };
  const canvas = {
    getContext: () => context,
    addEventListener(type, handler) { if (type === 'click') click = handler; },
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 650, height: 650 })
  };
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.cancelAnimationFrame = () => {};
  try {
    const scene = createFrightScene(canvas, (selection) => selections.push(selection), 'Player');
    scene.resize(650, 650);
    for (const kind of ['clue', 'tool', 'cache']) {
      const object = FRIGHT_OBJECTS.find((entry) => entry.kind === kind);
      scene.draw({ ...newFrightState(), player: object.approach });
      click({ clientX: 325 + object.x - object.approach.x, clientY: 325 + object.y - object.approach.y });
      assert.deepEqual(selections.at(-1), { objectId: object.id });
    }
    assert.deepEqual(texts, []);
    scene.dispose();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCancelAnimationFrame === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
  }
});

test('fallback teleport circle appears and is clickable only after all objects are recovered', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const arcs = [], selections = [];
  let click;
  const context = {
    setTransform() {}, fillRect() {}, strokeRect() {}, fillText() {}, beginPath() {},
    ellipse() {}, arc(x, y, radius) { arcs.push({ x, y, radius, color: this.fillStyle }); },
    fill() {}, stroke() {}
  };
  const canvas = {
    getContext: () => context,
    addEventListener(type, handler) { if (type === 'click') click = handler; },
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 650, height: 650 })
  };
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  globalThis.window = { devicePixelRatio: 1 };
  globalThis.cancelAnimationFrame = () => {};
  try {
    const object = FRIGHT_OBJECTS.find((entry) => entry.id === 'cache-clowns');
    const state = { ...newFrightState(), player: object.approach };
    const position = frightTeleportPosition(state.player);
    const point = { clientX: 325 + position.x - state.player.x, clientY: 325 + position.y - state.player.y };
    const scene = createFrightScene(canvas, (selection) => selections.push(selection));
    scene.resize(650, 650);
    scene.draw(state);
    click(point);
    assert.notEqual(selections.at(-1)?.teleport, true);
    assert.ok(!arcs.some((arc) => arc.color === 'rgba(98,216,239,0.3)'));
    const ready = { ...state, collected: FRIGHT_THEMES.map(({ id }) => id) };
    scene.draw(ready);
    assert.ok(arcs.some((arc) => arc.color === 'rgba(98,216,239,0.3)'
      && arc.x === point.clientX && arc.y === point.clientY && arc.radius === 21));
    click(point);
    assert.deepEqual(selections.at(-1), { teleport: true });
    const moved = { ...ready, player: { x: state.player.x + 10, y: state.player.y } };
    scene.draw(moved);
    click({ clientX: point.clientX - 10, clientY: point.clientY });
    assert.deepEqual(selections.at(-1), { teleport: true });
    scene.draw({ ...ready, puzzle: 'clowns' });
    click(point);
    assert.notEqual(selections.at(-1)?.teleport, true);
    scene.draw({ ...ready, complete: true });
    click(point);
    assert.notEqual(selections.at(-1)?.teleport, true);
    scene.dispose();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousCancelAnimationFrame === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
  }
});

test('stepping away mid-mechanism restarts it from step one and saves never persist a puzzle', () => {
  const theme = FRIGHT_THEMES[1];
  let state = { ...newFrightState(), clues: FRIGHT_OBJECTS.filter((o) => o.kind === 'clue' && o.theme === theme.id).map((o) => o.id), tools: [theme.id] };
  const cache = FRIGHT_OBJECTS.find((o) => o.id === `cache-${theme.id}`);
  state = visit({ ...state, player: { ...cache.approach } }, cache);
  state = answerFright(state, theme.stages[0].answer);
  assert.equal(state.stage, 1);
  state = interactFright({ ...state, puzzle: null }, `cache-${theme.id}`);
  assert.equal(frightStage(state).index, 0);
  const restored = restoreFrightState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.puzzle, undefined);
  assert.equal(restored.stage, 0);
});

test('puzzle questions do not repeat the clue and discovered clues survive mechanism progress', () => {
  for (const theme of FRIGHT_THEMES) {
    for (const entry of theme.stages) for (const clue of FRIGHT_CLUES[theme.id]) assert.ok(!entry.question.includes(clue), theme.id);
  }
  const theme = FRIGHT_THEMES[0];
  const cache = FRIGHT_OBJECTS.find((o) => o.id === `cache-${theme.id}`);
  const clues = FRIGHT_OBJECTS.filter((o) => o.kind === 'clue' && o.theme === theme.id).map((o) => o.id);
  let state = { ...newFrightState(), player: { ...cache.approach }, clues, tools: [theme.id] };
  state = interactFright(state, cache.id);
  state = answerFright(state, theme.stages[0].answer);
  assert.deepEqual([state.puzzle, state.stage, state.clues], [theme.id, 1, clues]);
  const wrong = answerFright(state, frightStage(state).choices.find((c) => c !== frightStage(state).answer));
  assert.deepEqual(wrong.clues, clues);
  assert.deepEqual(wrong.tools, [theme.id]);
});

test('saves from the earlier Fright Nights version keep collected items and clues', () => {
  const old = restoreFrightState({ version: 2, player: { ...FRIGHT_START }, clues: ['ai'], collected: ['disease'], legacyKey: false, complete: false });
  assert.deepEqual(old.collected, ['disease']);
  assert.equal(frightThemeCluesFound(old, 'ai'), 3);
  assert.equal(frightThemeCluesFound(old, 'disease'), 3);
  assert.deepEqual(old.player, FRIGHT_START);
  assert.deepEqual(old.tools, ['disease']);
  assert.equal(restoreFrightState({ ...old, tools: ['nonsense'] }).collected.length, 0);
});

test('individual clues and position survive new saves without revealing undiscovered clues', () => {
  const first = FRIGHT_OBJECTS.find((object) => object.id === 'clue-ai-1');
  const second = FRIGHT_OBJECTS.find((object) => object.id === 'clue-ai-2');
  const state = interactFright({ ...newFrightState(), player: { ...first.approach } }, first.id);
  const restored = restoreFrightState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.clues, [first.id]);
  assert.deepEqual(restored.player, first.approach);
  assert.ok(!restored.clues.includes(second.id));
  assert.match(restored.message, /three separate clues/);
});

test('journal groups only discovered clues and retains earlier discoveries across saves', () => {
  const first = FRIGHT_OBJECTS.find((object) => object.id === 'clue-ai-1');
  const second = FRIGHT_OBJECTS.find((object) => object.id === 'clue-ai-2');
  const third = FRIGHT_OBJECTS.find((object) => object.id === 'clue-disease-3');
  let state = newFrightState();
  assert.deepEqual(discoveredFrightClues(state), []);
  for (const clue of [first, third, second]) {
    state = interactFright({ ...state, player: { ...clue.approach } }, clue.id);
  }
  state = restoreFrightState(JSON.parse(JSON.stringify(state)));
  const groups = discoveredFrightClues(state);
  assert.deepEqual(groups.map((group) => group.theme.id), ['disease', 'ai']);
  assert.deepEqual(groups.map((group) => group.clues.map((clue) => clue.id)), [[third.id], [first.id, second.id]]);
  assert.equal(groups[1].hasTool, false);
  assert.equal(discoveredFrightClues({ ...state, tools: ['ai'] })[1].hasTool, true);
  assert.deepEqual(discoveredFrightClues(null), []);
});

test('legacy maze saves keep a held lantern key and completed saves remain complete', () => {
  const legacy = restoreFrightState({ player: { x: 1, y: 5 }, hasKey: true, moves: 10 });
  assert.deepEqual(legacy.player, FRIGHT_START);
  assert.equal(legacy.legacyKey, true);
  assert.deepEqual(questItems([null, null, null, null, legacy]).map((item) => item.name), ['Lantern key']);
  const completed = restoreFrightState({ player: { x: 7, y: 2 }, hasKey: true, moves: 10, complete: true });
  assert.equal(completed.complete, true);
  assert.equal(questItems([null, null, null, null, completed]).length, 0);
});
