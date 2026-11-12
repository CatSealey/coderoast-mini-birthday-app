import test from 'node:test';
import assert from 'node:assert/strict';
import { ABIGAIL_RUNES, ABIGAIL_RUNE_OPTIONS, ABIGAIL_SOLUTION, chooseAbigailRune } from '../js/games/abigail-logic.js';
import { HOUSE_OBJECTS, HOUSE_ROOM_NAMES, housePath, interactHouse, newHouseState, pathToHouseObject, restoreHouseState, walkHouse } from '../js/games/abigail-house.js';
import { questItems } from '../js/quest-items.js';

function follow(state, path) {
  assert.ok(path);
  for (const point of path) {
    let remaining = 100;
    while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.001 && remaining-- > 0) {
      const next = walkHouse(state, point.x - state.player.x, point.y - state.player.y, 0.05);
      assert.notStrictEqual(next, state, 'route must remain walkable');
      state = next;
    }
    assert.ok(remaining > 0);
  }
  return state;
}

function visit(state, id) {
  return interactHouse(follow(state, pathToHouseObject(state, id)), id);
}

function inventory(state) {
  return questItems([state, null, null, null, null]).map((item) => item.name);
}

test('continuous walking respects furniture and a locked doorway', () => {
  let state = newHouseState();
  state = walkHouse(state, 100, 50, 0.05);
  assert.ok(state.player.x > -400 && state.player.y > 120);
  assert.notEqual(state.player.x % 1, 0);
  assert.equal(housePath(state, { x: 200, y: 0 }), null);
  assert.equal(pathToHouseObject(state, 'moonCache'), null, 'the new rooms must not bypass the locked chamber');
  const diary = HOUSE_OBJECTS.find((item) => item.id === 'diary');
  assert.equal(housePath(state, diary), null);
  state = visit(state, 'chamberDoor');
  assert.match(state.message, /locked/);
});

test('Mara is solid and remains reachable for conversation', () => {
  const mara = HOUSE_OBJECTS.find((item) => item.id === 'mara');
  const state = newHouseState();
  const start = { ...state, player: { x: mara.x, y: mara.y + 80 } };
  const moved = walkHouse(start, 0, -160, 1);
  assert.ok(moved.player.y > mara.y);
  const reached = follow(state, pathToHouseObject(state, 'mara'));
  assert.notDeepEqual(reached.player, { x: mara.x, y: mara.y });
  assert.match(interactHouse(reached, 'mara').message, /Mara|ward|key/i);
});

test('connected rooms can be walked between and the quest completed', () => {
  let state = newHouseState();
  state = visit(state, 'doll');
  assert.equal(state.hasKey, true);
  assert.deepEqual(inventory(state), ['Small key']);
  state = visit(state, 'chamberDoor');
  assert.equal(state.chamberUnlocked, true);
  assert.deepEqual(inventory(state), []);
  const before = state.player;
  assert.ok(before.x < 0, 'unlocking does not teleport the player');
  state = visit(state, 'ward');
  assert.equal(state.room, 'chamber');
  assert.match(state.message, /0 of 3/);
  assert.equal(state.puzzleOpen, false);
  state = visit(state, 'diary');
  assert.equal(state.room, 'vestibule');
  assert.equal(state.diaryRead, true);
  state = visit(state, 'starCache');
  assert.equal(state.room, 'study');
  assert.deepEqual(state.collectedRunes, ['Star']);
  state = visit(state, 'starCache');
  assert.deepEqual(state.collectedRunes, ['Star'], 'revisiting does not duplicate runes');
  state = visit(state, 'ward');
  assert.match(state.message, /1 of 3/);
  assert.equal(state.puzzleOpen, false, 'the diary alone must not open the puzzle');
  state = visit(state, 'moonCache');
  assert.equal(state.room, 'bedroom');
  state = visit(state, 'diamondCache');
  assert.equal(state.room, 'archive');
  assert.deepEqual(state.collectedRunes, ['Star', 'Moon', 'Diamond']);
  state = visit(state, 'ward');
  assert.equal(state.puzzleOpen, true);
  state = chooseAbigailRune(state, 'Moon');
  assert.deepEqual(state.runeInput, []);
  assert.equal(inventory(state).length, 3);
  for (const rune of ['Star', 'Moon', 'Diamond']) state = chooseAbigailRune(state, rune);
  assert.deepEqual(inventory(state), []);
  state = visit(state, 'chest');
  assert.equal(state.hasToken, true);
  assert.deepEqual(inventory(state), ['Escape token']);
  state = visit(state, 'exit');
  assert.equal(state.complete, true);
  assert.deepEqual(inventory(state), []);
});

test('only three rune options exist and missing diary still prevents the ward', () => {
  assert.deepEqual(ABIGAIL_RUNES, ['Star', 'Moon', 'Diamond']);
  assert.deepEqual(ABIGAIL_RUNE_OPTIONS, [
    { name: 'Moon', symbol: '☾' }, { name: 'Diamond', symbol: '◇' }, { name: 'Star', symbol: '✦' }
  ]);
  assert.deepEqual(ABIGAIL_SOLUTION, ['Star', 'Moon', 'Diamond']);
  assert.deepEqual([...ABIGAIL_RUNE_OPTIONS.map((rune) => rune.name)].sort(), [...ABIGAIL_RUNES].sort());
  assert.equal(Object.keys(HOUSE_ROOM_NAMES).length, 5);
  let state = newHouseState();
  state = visit(state, 'doll');
  state = visit(state, 'chamberDoor');
  for (const id of ['diamondCache', 'starCache', 'moonCache']) state = visit(state, id);
  state = visit(state, 'ward');
  assert.equal(state.puzzleOpen, false);
  assert.match(state.message, /clue/);
  state = visit(state, 'diary');
  state = visit(state, 'ward');
  assert.equal(state.puzzleOpen, true);
});

test('furniture can be searched without revealing which pieces hide runes', () => {
  let state = visit(visit(newHouseState(), 'doll'), 'chamberDoor');
  for (const id of ['fireplace', 'studyDesk', 'studyBookcase', 'cot', 'jewelleryBox', 'archiveCabinet', 'archiveDesk', 'archiveBox']) {
    state = visit(state, id);
    assert.ok(state.message.length > 0, `${id} has a response`);
    assert.deepEqual(state.collectedRunes, [], `${id} does not give away a rune`);
  }
  for (const id of ['starCache', 'moonCache', 'diamondCache']) {
    const item = HOUSE_OBJECTS.find((object) => object.id === id);
    assert.ok(!item.name.toLowerCase().includes('rune'));
    state = visit(state, id);
  }
  assert.deepEqual(state.collectedRunes, ['Star', 'Moon', 'Diamond']);
  const restored = restoreHouseState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.collectedRunes, state.collectedRunes);
  assert.equal(visit(restored, 'diamondCache').collectedRunes.length, 3);
});

test('new freestanding furniture blocks walking but remains reachable', () => {
  const state = { ...newHouseState(), chamberUnlocked: true };
  for (const id of ['fireplace', 'starCache', 'moonCache']) {
    const item = HOUSE_OBJECTS.find((object) => object.id === id);
    assert.equal(housePath(state, item), null, `${id} is solid`);
    const reached = follow(state, pathToHouseObject(state, id));
    assert.ok(Math.hypot(reached.player.x - item.x, reached.player.y - item.y) <= 85);
  }
});
