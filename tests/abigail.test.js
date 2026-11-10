import test from 'node:test';
import assert from 'node:assert/strict';
import { ABIGAIL_ROOMS, abigailObjective, chooseAbigailRune, interactAbigail, moveAbigail, newAbigailState } from '../js/games/abigail-logic.js';

test('Abigail escape requires the key, diary, ward and token, including a return trip', () => {
  let state = newAbigailState();
  assert.equal(interactAbigail(state, 'doll').hasKey, false);
  state = { ...state, player: { x: 5, y: 2 } };
  assert.match(interactAbigail(state, 'chamberDoor').message, /locked/);
  state = interactAbigail(state, 'doll');
  assert.equal(state.hasKey, true);
  state = interactAbigail(state, 'chamberDoor');
  assert.equal(state.room, 'chamber');
  state = { ...state, player: { x: 3, y: 2 } };
  assert.match(interactAbigail(state, 'ward').message, /clue/);
  assert.match(abigailObjective(state), /diary/);
  state = { ...state, player: { x: 1, y: 2 } };
  state = interactAbigail(state, 'returnDoor');
  state = { ...state, player: { x: 1, y: 2 } };
  state = interactAbigail(state, 'diary');
  assert.equal(state.diaryRead, true);
  state = { ...state, player: { x: 5, y: 2 } };
  state = interactAbigail(state, 'chamberDoor');
  state = { ...state, player: { x: 5, y: 2 } };
  assert.match(interactAbigail(state, 'exit').message, /token/);
  assert.match(interactAbigail(state, 'chest').message, /sealed/);
  state = { ...state, player: { x: 3, y: 2 } };
  state = interactAbigail(state, 'ward');
  state = chooseAbigailRune(state, 'Moon');
  assert.deepEqual(state.runeInput, []);
  assert.equal(state.wardSolved, false);
  for (const rune of ['Star', 'Moon', 'Diamond']) state = chooseAbigailRune(state, rune);
  assert.equal(state.wardSolved, true);
  assert.equal(state.puzzleOpen, false);
  state = { ...state, player: { x: 5, y: 2 } };
  state = interactAbigail(state, 'chest');
  assert.equal(state.hasToken, true);
  state = interactAbigail(state, 'exit');
  assert.equal(state.complete, true);
});

test('room movement stays within the room and interacts with adjacent objects', () => {
  let state = newAbigailState();
  state = moveAbigail(state, 'up');
  state = moveAbigail(state, 'up');
  assert.equal(state.diaryRead, true);
  assert.deepEqual(state.player, { x: 1, y: 2 });
  state = { ...state, player: { x: 0, y: 0 } };
  assert.deepEqual(moveAbigail(state, 'left').player, state.player);
  assert.strictEqual(moveAbigail(state, 'invalid'), state);
  assert.equal(Object.keys(ABIGAIL_ROOMS).length, 2);
});

test('a complete escape is possible using movement and puzzle choices only', () => {
  let state = newAbigailState();
  for (const direction of ['up', 'up', 'right', 'right', 'right', 'right', 'up', 'right',
    'right', 'right', 'up']) {
    state = moveAbigail(state, direction);
  }
  assert.equal(state.puzzleOpen, true);
  for (const rune of ['Star', 'Moon', 'Diamond']) state = chooseAbigailRune(state, rune);
  for (const direction of ['right', 'right', 'down', 'right']) state = moveAbigail(state, direction);
  assert.equal(state.complete, true);
});
