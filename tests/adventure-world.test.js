import test from 'node:test';
import assert from 'node:assert/strict';
import { OBJECTS, advanceCanopy, controlCoaster, interactAdventure, jumpCanopy, newAdventureState, restoreAdventureState, takePoolShot, tickCanopy, tickCoaster, unlockBallCase, walkAdventure } from '../js/games/adventure-logic.js';
import { questItems } from '../js/quest-items.js';

function visit(index, state, id) {
  const object = OBJECTS[index].find((item) => item.id === id);
  return interactAdventure(index, { ...state, player: { x: object.x, y: object.y, height: object.height || 0 } }, id);
}
function inventory(index, state) {
  const saves = [null, null, null, null, null]; saves[index] = state;
  return questItems(saves).map((item) => item.name);
}
function runCanopy(state, seconds) {
  for (let t = 0; t < seconds * 20; t += 1) state = tickCanopy(state, 0.05);
  return state;
}

test('Lucky Chucks requires drinks, equipment and the recovered ball before speaking to My Love', () => {
  let state = newAdventureState(1);
  assert.equal(visit(1, state, 'love').complete, false);
  state = visit(1, state, 'bar');
  assert.deepEqual(inventory(1, state), ['Drinks']);
  state = visit(1, state, 'drinks-table');
  assert.equal(state.drinksPlaced, true);
  assert.deepEqual(inventory(1, state), []);
  state = visit(1, state, 'cue-rack');
  state = visit(1, state, 'pool-table');
  assert.equal(state.cuesPlaced, true);
  assert.equal(state.ballLost, false);
  state = visit(1, state, 'ball-box');
  assert.equal(state.puzzle, false);
  assert.deepEqual(inventory(1, state), []);
  state = visit(1, state, 'rack-note');
  state = visit(1, state, 'ball-box');
  assert.equal(state.puzzle, true);
  state = unlockBallCase(state, '312');
  assert.equal(state.balls, false);
  state = visit(1, state, 'ball-box');
  state = unlockBallCase(state, '321');
  assert.deepEqual(inventory(1, state), ['Pool balls']);
  state = visit(1, state, 'pool-table');
  assert.equal(state.ballsPlaced, true);
  assert.equal(state.ballLost, false);
  state = visit(1, state, 'pool-table');
  assert.equal(state.shot, true);
  assert.equal(takePoolShot(state, 20, 65).ballLost, false);
  assert.equal(takePoolShot(state, 0, 40).ballLost, false);
  assert.equal(takePoolShot(state, 0, 90).ballLost, false);
  assert.equal(takePoolShot(state, 7, 55).ballLost, true);
  assert.equal(takePoolShot(state, -7, 75).ballLost, true);
  state = takePoolShot(state, 0, 65);
  assert.equal(state.ballLost, true);
  state = restoreAdventureState(1, JSON.parse(JSON.stringify(state)));
  assert.equal(visit(1, state, 'love').complete, false);
  state = visit(1, state, 'cabinet');
  assert.equal(state.ballFound, false);
  state = visit(1, state, 'tool-rack');
  assert.deepEqual(inventory(1, state), ['Retrieval hook']);
  state = restoreAdventureState(1, JSON.parse(JSON.stringify(state)));
  assert.deepEqual(inventory(1, state), ['Retrieval hook']);
  state = visit(1, state, 'cabinet');
  assert.deepEqual(inventory(1, state), ['Eight-ball']);
  state = visit(1, state, 'love');
  assert.equal(state.complete, true);
  assert.deepEqual(inventory(1, state), []);
});

test('opening pool controls is resumable and old in-progress saves retain their equipment', () => {
  let state = { ...newAdventureState(1), cuesPlaced: true, ballsPlaced: true };
  state = visit(1, state, 'pool-table');
  assert.equal(state.shot, true);
  state = restoreAdventureState(1, JSON.parse(JSON.stringify(state)));
  assert.equal(state.shot, false);
  assert.equal(state.cuesPlaced, true);
  assert.equal(state.ballsPlaced, true);
  assert.equal(visit(1, state, 'pool-table').shot, true);
  const { hook, shot, ...old } = state;
  void hook; void shot;
  assert.equal(restoreAdventureState(1, old).ballsPlaced, true);
});

test('existing version 3 pub saves retain progress when the case puzzle is introduced', () => {
  const { noteRead, caseUnlocked, puzzle, ...previous } = newAdventureState(1);
  void noteRead; void caseUnlocked; void puzzle;
  const saved = { ...previous, drinks: true, balls: true };
  const restored = restoreAdventureState(1, saved);
  assert.equal(restored.drinks, true);
  assert.equal(restored.balls, true);
  assert.equal(restored.caseUnlocked, true);
  assert.equal(restored.puzzle, false);
});

test('Thirteen enforces speed and precise stop, drops, returns, and gives a ticket after bags', () => {
  let state = newAdventureState(2);
  assert.equal(visit(2, state, 'locker').bags, false);
  state = visit(2, state, 'carriage');
  assert.equal(state.phase, 'riding');
  state = controlCoaster(state, 'stop');
  assert.equal(state.phase, 'riding');
  assert.match(state.message, /Missed/);
  state = controlCoaster(state, 'slower'); state = controlCoaster(state, 'slower');
  state = tickCoaster(state, 3.01);
  assert.match(state.message, /Too slow/);
  assert.match(tickCoaster({ ...state, progress: 0.21, speed: 0.35 }, 1).message, /Signal 1 missed/);
  state = tickCoaster({ ...state, progress: 0.21, speed: 0.59 }, 1);
  assert.equal(state.signals, 1);
  assert.match(tickCoaster({ ...state, progress: 0.47, speed: 0.75 }, 1).message, /Signal 2 missed/);
  state = tickCoaster({ ...state, progress: 0.47, speed: 0.35 }, 1);
  assert.equal(state.signals, 2);
  state = restoreAdventureState(2, JSON.parse(JSON.stringify(state)));
  assert.equal(state.signals, 2);
  state = { ...state, progress: 0.68, speed: 0.6 };
  assert.equal(controlCoaster(state, 'stop').phase, 'riding');
  state = { ...state, progress: 0.68, speed: 0.3 };
  state = controlCoaster(state, 'stop');
  assert.equal(state.phase, 'dropping');
  state = restoreAdventureState(2, JSON.parse(JSON.stringify(state)));
  state = tickCoaster(state, 3);
  assert.equal(state.phase, 'returning');
  state = tickCoaster(state, 5);
  assert.equal(state.phase, 'platform');
  assert.equal(visit(2, state, 'amor').complete, false);
  state = visit(2, state, 'locker');
  assert.deepEqual(inventory(2, state), ['Bags']);
  state = visit(2, state, 'amor');
  assert.equal(state.complete, true);
  assert.deepEqual(inventory(2, state), ['Exit ticket']);
  assert.deepEqual(inventory(2, { ...state, ticket: false }), []);
});

function crossCanopy(state) {
  for (let i = 0; i < 3; i += 1) {
    if (i > 0) state = tickCanopy(state, 0.5);
    state = tickCanopy(state, 0.5);
    state = advanceCanopy(state);
  }
  return state;
}

test('GoApe requires climbing, rope crossing, a real jump and all four treasures for the zip-wire', () => {
  let state = newAdventureState(3);
  assert.equal(visit(3, state, 'zipline').complete, false);
  state = visit(3, state, 'leaf');
  state = visit(3, state, 'net');
  assert.equal(state.traversal.kind, 'net');
  assert.equal(advanceCanopy(state).traversal, null);
  state = visit(3, state, 'net');
  state = tickCanopy(state, 0.5);
  state = advanceCanopy(state);
  assert.equal(state.traversal.progress, 1 / 3);
  assert.equal(advanceCanopy(state).traversal.progress, 1 / 3);
  state = restoreAdventureState(3, JSON.parse(JSON.stringify(state)));
  state = tickCanopy(state, 0.5);
  state = tickCanopy(state, 0.5);
  state = advanceCanopy(state);
  state = tickCanopy(state, 0.5);
  state = tickCanopy(state, 0.5);
  state = advanceCanopy(state);
  assert.equal(state.player.height, 80);
  assert.equal(state.checkpoint, 1);
  state = visit(3, state, 'feather');
  state = visit(3, state, 'rope');
  state = crossCanopy(state);
  assert.equal(state.player.height, 130);
  state = visit(3, state, 'acorn');
  state = { ...state, player: { x: 725, y: 350, height: 130 } };
  assert.strictEqual(walkAdventure(3, state, 100, 0, 0.1), state);
  state = jumpCanopy(state);
  for (let i = 0; i < 21; i += 1) {
    state = walkAdventure(3, state, 100, 0, 0.05);
    state = tickCanopy(state, 0.05);
  }
  assert.equal(state.flight, null);
  assert.equal(state.checkpoint, 3);
  state = visit(3, state, 'star');
  assert.equal(inventory(3, state).length, 4);
  const saves = [null, null, null, state, null];
  assert.equal(new Set(questItems(saves).map((item) => item.image)).size, 4);
  state = visit(3, state, 'zipline');
  assert.equal(state.complete, false);
  assert.equal(state.zipline, true);
  assert.equal(inventory(3, state).length, 0);
  state = restoreAdventureState(3, JSON.parse(JSON.stringify(state)));
  state = runCanopy(state, 3.1);
  assert.equal(state.complete, true);
});

test('coaster and canopy migrate earlier saves without losing progress', () => {
  const { signals, ...oldRide } = { ...newAdventureState(2), phase: 'riding', progress: 0.3 };
  void signals;
  assert.equal(restoreAdventureState(2, oldRide).signals, 1);
  assert.equal(restoreAdventureState(2, { ...oldRide, progress: 0.65 }).signals, 2);
  const oldCanopy = { ...newAdventureState(3), collected: ['leaf'], traversal: { kind: 'net', progress: 0.5 } };
  const restored = restoreAdventureState(3, oldCanopy);
  assert.deepEqual(restored.collected, ['leaf']);
  assert.equal(restored.traversal.progress, 1 / 3);
  assert.equal(restored.traversal.armed, true);
});

test('older unfinished saves remain preserved while redesigned quests start at the entrance', () => {
  for (const index of [1, 2, 3]) {
    const old = { checkpoint: 3, complete: false };
    const restored = restoreAdventureState(index, old);
    assert.deepEqual(restored.legacyProgress, old);
    assert.equal(restored.complete, false);
    assert.equal(restoreAdventureState(index, { ...old, complete: true }).complete, true);
  }
});
