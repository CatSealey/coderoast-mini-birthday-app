import test from 'node:test';
import assert from 'node:assert/strict';
import { questItems } from '../js/quest-items.js';
import { newHouseState, restoreHouseState, interactHouse } from '../js/games/abigail-house.js';
import { restoreMazeState } from '../js/games/maze.js';
import { restorePoolState } from '../js/games/pool.js';
import { restoreCoasterState } from '../js/games/coaster.js';
import { restoreCanopyState } from '../js/games/canopy.js';
import { chooseAbigailRune } from '../js/games/abigail-logic.js';
import { newAdventureState, restoreAdventureState } from '../js/games/adventure-logic.js';
import { COASTER_TREATS } from '../js/games/coaster-course.js';

test('quest inventory shows only actually collected items across quests', () => {
  const saves = [null, null, null, null, null];
  assert.deepEqual(questItems(saves), []);
  saves[0] = { hasKey: true, collectedRunes: ['Star', 'Moon'], hasToken: false };
  saves[4] = { hasKey: true };
  assert.deepEqual(questItems(saves).map((item) => item.name), ['Small key', 'Star rune', 'Moon rune', 'Lantern key']);
  assert.ok(questItems(saves).every((item) => item.image.endsWith('.svg')));
  saves[0].hasToken = true;
  assert.ok(questItems(saves).some((item) => item.name === 'Escape token'));
  saves[0] = null;
  assert.deepEqual(questItems(saves).map((item) => item.name), ['Lantern key']);
});

test('Thirteen park items appear in the quest inventory and survive a save', () => {
  const state = { ...newAdventureState(2), phase: 'riding', treats: COASTER_TREATS.map((item) => item.id) };
  const names = COASTER_TREATS.map((item) => item.name);
  const items = questItems([null, null, state, null, null]);
  assert.deepEqual(items.map((item) => item.name), names);
  assert.equal(new Set(items.map((item) => item.image)).size, names.length);
  assert.ok(items.every((item) => item.image.endsWith('.svg') && item.quest === 'Thirteen'));
  const restored = restoreAdventureState(2, JSON.parse(JSON.stringify(state)));
  assert.deepEqual(questItems([null, null, restored, null, null]).map((item) => item.name), names);
  assert.deepEqual(questItems([null, null, { ...restored, complete: true }, null, null]), []);
});

test('Abigail quest progress survives serialization with inventory and location', () => {
  let state = newHouseState();
  state = { ...state, player: { x: -180, y: 145 } };
  state = interactHouse(state, 'doll');
  assert.equal(state.hasKey, true);
  state = { ...state, collectedRunes: ['Star'], diaryRead: true };
  const restored = restoreHouseState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.hasKey, true);
  assert.equal(restored.diaryRead, true);
  assert.deepEqual(restored.collectedRunes, ['Star']);
  assert.deepEqual(restored.player, state.player);
  assert.equal(restored.puzzleOpen, false);
});

test('Fright Nights restores the key and position', () => {
  const saved = { player: { x: 1, y: 5 }, hasKey: true, moves: 10 };
  assert.deepEqual(restoreMazeState(JSON.parse(JSON.stringify(saved))), { ...saved, complete: false });
  const completed = restoreMazeState({ ...saved, player: { x: 7, y: 2 }, complete: true });
  assert.equal(completed.complete, true);
  assert.deepEqual(questItems([null, null, null, null, completed]), []);
});

test('Fright Nights tools appear until their matching mechanisms are solved', () => {
  const saves = [null, null, null, null, { tools: ['disease', 'ai', 'darkness', 'chainsaws', 'bogeymen', 'claustrophobia', 'clowns'], collected: [], complete: false }];
  const before = questItems(saves);
  assert.deepEqual(before.map((item) => item.name), ['Sterile gloves', 'Access key', 'Match box', 'Heavy wrench', 'Salt lantern', 'Pry bar', 'Pin']);
  assert.equal(new Set(before.map((item) => item.image)).size, 7);
  saves[4].collected = ['disease'];
  const after = questItems(saves).map((item) => item.name);
  assert.ok(!after.includes('Sterile gloves'));
  assert.ok(after.includes('Access key'));
  assert.ok(after.includes('Remedy vial'));
  saves[4].complete = true;
  assert.deepEqual(questItems(saves), []);
});

test('items stay until used, including after a failed rune sequence and across saves', () => {
  const names = (house) => questItems([house, null, null, null, { hasKey: true }]).map((item) => item.name);
  let state = { ...newHouseState(), hasKey: true };
  assert.deepEqual(names(state), ['Small key', 'Lantern key']);
  state = { ...state, chamberUnlocked: true, collectedRunes: ['Star', 'Moon', 'Diamond'], puzzleOpen: true };
  assert.deepEqual(names(state), ['Star rune', 'Moon rune', 'Diamond rune', 'Lantern key']);
  state = chooseAbigailRune(state, 'Moon');
  assert.deepEqual(state.runeInput, []);
  assert.deepEqual(names(state), ['Star rune', 'Moon rune', 'Diamond rune', 'Lantern key']);
  for (const rune of ['Star', 'Moon', 'Diamond']) state = chooseAbigailRune(state, rune);
  assert.equal(state.wardSolved, true);
  assert.deepEqual(names(restoreHouseState(JSON.parse(JSON.stringify(state)))), ['Lantern key']);
  state = { ...state, hasToken: true };
  assert.deepEqual(names(state), ['Escape token', 'Lantern key']);
  state = { ...state, complete: true };
  const restored = restoreHouseState(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.complete, true);
  assert.deepEqual(names(restored), ['Lantern key']);
});

test('other quests restore their controls and checkpoints', () => {
  const pool = { angle: 3, power: 80, attempts: 2 };
  const coaster = { reactions: [425, 600] };
  const canopy = { checkpoint: { x: 240, y: 216 } };
  assert.deepEqual(restorePoolState(JSON.parse(JSON.stringify(pool))), pool);
  assert.deepEqual(restoreCoasterState(JSON.parse(JSON.stringify(coaster))), coaster);
  assert.deepEqual(restoreCoasterState({ reactions: [425, 600, 300], complete: true }), { reactions: [425, 600, 300] });
  assert.deepEqual(restoreCanopyState(JSON.parse(JSON.stringify(canopy))), canopy);
});
