import test from 'node:test';
import assert from 'node:assert/strict';
import { ABIGAIL_RUNES, chooseAbigailRune } from '../js/games/abigail-logic.js';
import { HOUSE_OBJECTS, HOUSE_ROOM_NAMES, housePath, interactHouse, newHouseState, pathToHouseObject, walkHouse } from '../js/games/abigail-house.js';
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
