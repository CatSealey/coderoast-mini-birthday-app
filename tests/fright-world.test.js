import test from 'node:test';
import assert from 'node:assert/strict';
import { FRIGHT_MAZE, FRIGHT_OBJECTS, FRIGHT_START, FRIGHT_THEMES, answerFright, frightPath, frightStage, frightWalkable, interactFright, newFrightState, restoreFrightState, walkFright } from '../js/games/fright-logic.js';
import { questItems } from '../js/quest-items.js';

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

test('maze routes reach all seven clues and mechanisms with continuous collision', () => {
  assert.equal(FRIGHT_THEMES.length, 7);
  assert.equal(new Set(FRIGHT_OBJECTS.map(({ x, y }) => `${x},${y}`)).size, 22);
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

test('each themed area has distinct content, 3 stages and unambiguous answers', () => {
  assert.deepEqual(FRIGHT_THEMES.map((theme) => theme.id), ['disease', 'ai', 'darkness', 'chainsaws', 'bogeymen', 'claustrophobia', 'clowns']);
  assert.equal(new Set(FRIGHT_THEMES.map((theme) => theme.zone)).size, 7);
  assert.equal(new Set(FRIGHT_THEMES.map((theme) => theme.tool.name)).size, 7);
  for (const theme of FRIGHT_THEMES) {
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
  assert.match(state.message, /clue first/);
  for (const theme of FRIGHT_THEMES) {
    state = visit(state, at('clue', theme));
    assert.ok(state.clues.includes(theme.id));
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

test('stepping away mid-mechanism restarts it from step one and saves never persist a puzzle', () => {
  const theme = FRIGHT_THEMES[1];
  let state = { ...newFrightState(), clues: [theme.id], tools: [theme.id] };
  state = visit({ ...state, player: { ...FRIGHT_OBJECTS.find((o) => o.id === `cache-${theme.id}`) } }, FRIGHT_OBJECTS.find((o) => o.id === `cache-${theme.id}`));
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
    for (const entry of theme.stages) assert.ok(!entry.question.includes(theme.clue), theme.id);
  }
  const theme = FRIGHT_THEMES[0];
  const cache = FRIGHT_OBJECTS.find((o) => o.id === `cache-${theme.id}`);
  let state = { ...newFrightState(), player: { x: cache.x, y: cache.y }, clues: [theme.id], tools: [theme.id] };
  state = interactFright(state, cache.id);
  state = answerFright(state, theme.stages[0].answer);
  assert.deepEqual([state.puzzle, state.stage, state.clues], [theme.id, 1, [theme.id]]);
  const wrong = answerFright(state, frightStage(state).choices.find((c) => c !== frightStage(state).answer));
  assert.deepEqual(wrong.clues, [theme.id]);
  assert.deepEqual(wrong.tools, [theme.id]);
});

test('saves from the earlier Fright Nights version keep collected items and clues', () => {
  const old = restoreFrightState({ version: 2, player: { ...FRIGHT_START }, clues: ['ai'], collected: ['disease'], legacyKey: false, complete: false });
  assert.deepEqual(old.collected, ['disease']);
  assert.deepEqual(old.clues.sort(), ['ai', 'disease']);
  assert.deepEqual(old.tools, ['disease']);
  assert.equal(restoreFrightState({ ...old, tools: ['nonsense'] }).collected.length, 0);
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
