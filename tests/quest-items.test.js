import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { questItems } from '../js/quest-items.js';
import { newHouseState, restoreHouseState, interactHouse } from '../js/games/abigail-house.js';
import { restoreMazeState } from '../js/games/maze.js';
import { restorePoolState } from '../js/games/pool.js';
import { restoreCoasterState } from '../js/games/coaster.js';
import { restoreCanopyState } from '../js/games/canopy.js';
import { chooseAbigailRune } from '../js/games/abigail-logic.js';
import { newAdventureState, restoreAdventureState } from '../js/games/adventure-logic.js';
import { COASTER_TREATS } from '../js/games/coaster-course.js';
import { FRIGHT_OBJECTS, FRIGHT_THEMES, answerFright, interactFright, newFrightState, restoreFrightState } from '../js/games/fright-logic.js';
import { createFrightInventoryIcons } from '../js/games/fright-inventory-icons.js';
import { discoveredFrightClues } from '../js/games/fright-clues.js';
import { frightMarkerVisible } from '../js/games/fright-markers.js';

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

test('Fright Nights clues enter the quest inventory on pickup and survive reload', () => {
  const clue = FRIGHT_OBJECTS.find((object) => object.id === 'clue-ai-1');
  const otherClue = FRIGHT_OBJECTS.find((object) => object.id === 'clue-ai-2');
  const inventory = (state) => questItems([null, null, null, null, state]);
  let state = { ...newFrightState(), player: clue.approach };
  assert.deepEqual(inventory(state), []);
  state = interactFright(state, clue.id);
  assert.deepEqual(inventory(state).map(({ name }) => name), [clue.name]);
  assert.ok(inventory(state)[0].image.endsWith('/fright-clue-ai.svg'));
  state = interactFright(state, clue.id);
  assert.equal(inventory(state).length, 1);
  state = restoreFrightState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(inventory(state).map(({ name }) => name), [clue.name]);
  state = interactFright({ ...state, player: otherClue.approach }, otherClue.id);
  assert.deepEqual(inventory(state).map(({ name }) => name), [clue.name, otherClue.name]);
  assert.deepEqual(inventory({ ...state, complete: true }), []);
});

test('recovering an area reward clears only its clues from the inventory', () => {
  const theme = FRIGHT_THEMES.find((entry) => entry.id === 'ai');
  const cache = FRIGHT_OBJECTS.find((object) => object.id === 'cache-ai');
  const clues = FRIGHT_OBJECTS.filter((object) => object.kind === 'clue' && object.theme === theme.id);
  const otherClue = FRIGHT_OBJECTS.find((object) => object.id === 'clue-disease-1');
  const inventory = (state) => questItems([null, null, null, null, state]).map(({ name }) => name);
  let state = { ...newFrightState(), player: cache.approach,
    clues: [...clues.map(({ id }) => id), otherClue.id], tools: [theme.id] };
  const before = inventory(state);
  assert.ok(clues.every((clue) => before.includes(clue.name)));
  assert.ok(before.includes(otherClue.name));
  state = interactFright(state, cache.id);
  const wrong = theme.stages[0].choices.find((choice) => choice !== theme.stages[0].answer);
  state = answerFright(state, wrong);
  assert.deepEqual(inventory(state), before);
  state = interactFright(state, cache.id);
  for (const stage of theme.stages) state = answerFright(state, stage.answer);
  assert.ok(clues.every((clue) => !inventory(state).includes(clue.name)));
  assert.ok(inventory(state).includes(otherClue.name));
  assert.ok(inventory(state).includes(theme.item));
  assert.ok(!inventory(state).includes(theme.tool.name));
  state = restoreFrightState(JSON.parse(JSON.stringify(state)));
  assert.ok(clues.every((clue) => state.clues.includes(clue.id) && !frightMarkerVisible(clue, state)));
  assert.equal(discoveredFrightClues(state).find((group) => group.theme.id === theme.id).clues.length, 3);
  assert.ok(clues.every((clue) => !inventory(state).includes(clue.name)));
  assert.ok(inventory(state).includes(otherClue.name));
});

test('Fright Nights inventory icons match each pickup’s theme colour', () => {
  const clues = FRIGHT_OBJECTS.filter(({ kind }) => kind === 'clue').map(({ id }) => id);
  const themes = FRIGHT_THEMES.map(({ id }) => id);
  const inventory = (state) => questItems([null, null, null, null, state]);
  const tools = inventory({ clues, tools: themes, collected: [], complete: false });
  const rewards = inventory({ clues: [], tools: [], collected: themes, complete: false });
  const clueImages = new Set();
  for (const theme of FRIGHT_THEMES) {
    const clue = FRIGHT_OBJECTS.find((object) => object.kind === 'clue' && object.theme === theme.id);
    const entries = [tools.find(({ name }) => name === clue.name),
      tools.find(({ name }) => name === theme.tool.name),
      rewards.find(({ name }) => name === theme.item)];
    assert.deepEqual(entries.map((item) => item?.frightMarker),
      [`clue:${theme.id}`, `tool:${theme.id}`, `cache:${theme.id}`]);
    for (const item of entries) {
      assert.ok(item, `inventory item for ${theme.name}`);
      const svg = readFileSync(new URL(item.image), 'utf8');
      assert.match(svg, /<svg\b/);
      assert.ok(svg.includes(theme.color), `${item.name} uses ${theme.color}`);
    }
    clueImages.add(tools.find(({ name }) => name === clue.name).image);
  }
  assert.equal(clueImages.size, FRIGHT_THEMES.length);
});

test('Fright Nights inventory uses illustrated icons when WebGL is unavailable', () => {
  const previousDocument = globalThis.document, previousWarn = console.warn;
  const warnings = [];
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  console.warn = (message) => warnings.push(message);
  try {
    assert.equal(createFrightInventoryIcons(), null);
    assert.match(warnings[0], /WebGL is unavailable/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    console.warn = previousWarn;
  }
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
