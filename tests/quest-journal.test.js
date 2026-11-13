import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { questJournalSteps, trophyJournalSteps } from '../js/quest-journal.js';
import { newHouseState } from '../js/games/abigail-house.js';
import { newAdventureState } from '../js/games/adventure-logic.js';
import { newFrightState, restoreFrightState, FRIGHT_OBJECTS, FRIGHT_THEMES } from '../js/games/fright-logic.js';

const done = (steps, phrase) => {
  const found = steps.find((entry) => entry.text.includes(phrase));
  assert.ok(found, `Missing step: ${phrase}`);
  return found.done;
};

test('each quest heading expands its own steps and keeps travel as a separate action', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const entries = [...html.matchAll(/<details class="quest-steps">([\s\S]*?)<\/details>/g)];
  assert.equal(entries.length, 6);
  entries.forEach(([, content], index) => {
    const heading = content.match(/<summary\b([^>]*)>[\s\S]*?<\/summary>/);
    assert.ok(heading, 'the quest heading is a native expandable summary');
    assert.match(heading[1], new RegExp(`id="${index === 5 ? 'trophyQuestButton' : `qbtn-${index + 1}`}"`));
    assert.doesNotMatch(heading[1], /data-(?:level|action)=/);
    assert.doesNotMatch(heading[0], /<button\b/);
    assert.ok(content.includes(`id="${index === 5 ? 'trophySteps' : `questSteps-${index + 1}`}"`));
    assert.doesNotMatch(content.match(/<ol\b[^>]*class="quest-steps__list"[^>]*>/)[0], /tabindex=/);
    assert.ok(content.includes(index === 5 ? 'data-action="trophy-quest"' : `data-level="${index + 1}"`));
  });
});

test('all quests start with actionable steps and legacy completions remain complete', () => {
  for (let index = 0; index < 5; index += 1) {
    const steps = questJournalSteps(index, null);
    assert.ok(steps.length > 1);
    assert.ok(steps.every((entry) => !entry.done));
    assert.ok(questJournalSteps(index, null, true).every((entry) => entry.done));
  }
  assert.throws(() => questJournalSteps(5, null), RangeError);
});

test('Abigail journal records independent clues, runes and unlocked door', () => {
  const state = { ...newHouseState(), diaryRead: true, chamberUnlocked: true, collectedRunes: ['Moon'] };
  const steps = questJournalSteps(0, state);
  assert.equal(done(steps, 'small key'), true);
  assert.equal(done(steps, 'diary'), true);
  assert.equal(done(steps, 'Moon rune'), true);
  assert.equal(done(steps, 'Star rune'), false);
  assert.equal(done(steps, 'break the ward'), false);
});

test('Lucky Chucks keeps used items checked after placement and completion', () => {
  const state = { ...newAdventureState(1), drinksPlaced: true, cuesPlaced: true, ballsPlaced: true,
    caseUnlocked: true, ballLost: true, ballFound: true };
  let steps = questJournalSteps(1, state);
  for (const phrase of ['Collect drinks', 'pool cues', 'collect the balls', 'retrieval hook', 'Retrieve the eight-ball']) {
    assert.equal(done(steps, phrase), true);
  }
  assert.equal(done(steps, 'Give the eight-ball'), false);
  steps = questJournalSteps(1, { ...state, ballFound: false, pubEnding: 'ready' });
  assert.equal(done(steps, 'Retrieve the eight-ball'), true);
  assert.equal(done(steps, 'Give the eight-ball'), true);
  assert.equal(done(steps, 'Leave Lucky Chucks'), false);
  steps = questJournalSteps(1, { ...state, ballFound: false, complete: true });
  assert.ok(steps.every((entry) => entry.done));
});

test('Thirteen journal tracks treats, retries, and later phases', () => {
  const state = { ...newAdventureState(2), phase: 'riding', treats: ['sweet-1'] };
  assert.equal(done(questJournalSteps(2, state), 'Collect all park items'), false);
  assert.equal(done(questJournalSteps(2, { ...state, phase: 'returning' }), 'Collect all park items'), false);
  assert.equal(done(questJournalSteps(2, { ...state, treats: ['sweet-1', 'sweet-2', 'sweet-3', 'sweet-4', 'sweet-6', 'sweet-7', 'sweet-8'] }), 'Collect all park items'), false);
  assert.equal(done(questJournalSteps(2, { ...state, treats: ['sweet-1', 'sweet-2', 'sweet-3', 'sweet-4', 'sweet-5'] }), 'Collect all park items'), true);
  assert.equal(done(questJournalSteps(2, { phase: 'returning' }), 'Collect all park items'), true);
  const platform = questJournalSteps(2, { ...state, phase: 'platform', bags: true });
  assert.equal(done(platform, 'Climb back'), true);
  assert.equal(done(platform, 'Collect the bags'), true);
  assert.equal(done(platform, 'Give the bags'), false);
  const ending = questJournalSteps(2, { ...state, phase: 'platform', rideEnding: 'dialogue' });
  assert.equal(done(ending, 'Collect the bags'), true);
  assert.equal(done(ending, 'Give the bags'), true);
  assert.equal(done(ending, 'Leave Thirteen'), false);
  assert.ok(questJournalSteps(2, { complete: true }).every((entry) => entry.done));
});

test('GoApe steps track treasures, crossings and zip-wire completion', () => {
  const state = { ...newAdventureState(3), collected: ['leaf', 'feather'], checkpoint: 1 };
  const steps = questJournalSteps(3, state);
  assert.equal(done(steps, 'glowing leaf'), true);
  assert.equal(done(steps, 'Climb the net'), true);
  assert.equal(done(steps, 'Cross the rope'), false);
  assert.equal(done(steps, 'silver acorn'), false);
  const extended = questJournalSteps(3, { ...state, checkpoint: 5, lanterns: ['lantern-1'] });
  assert.equal(done(extended, 'high rope bridge'), true);
  assert.equal(done(extended, 'Light the first lantern'), true);
  assert.equal(done(extended, 'Light the second lantern'), false);
  assert.equal(done(extended, 'summit net'), false);
  assert.ok(questJournalSteps(3, { ...state, treasuresUsed: true, complete: true }).every((entry) => entry.done));
});

test('Fright Nights steps track each area and discovered clue progress', () => {
  const clue = FRIGHT_OBJECTS.find((object) => object.kind === 'clue' && object.theme === 'disease');
  const state = { ...newFrightState(), clues: [clue.id], tools: ['disease'], collected: ['ai'] };
  const steps = questJournalSteps(4, state);
  assert.match(steps[0].text, /1\/3 clues, tool found/);
  assert.equal(done(steps, 'Disease:'), false);
  assert.equal(done(steps, 'AI:'), true);
  assert.equal(done(steps, 'escape gate'), false);
  assert.ok(questJournalSteps(4, { ...state, complete: true }).every((entry) => entry.done));
  assert.equal(steps[0].substeps.length, 3);
  assert.deepEqual(steps[0].substeps[0], { text: `${clue.name}: ${clue.text}`, done: true });
  assert.equal(steps[0].substeps[1].done, false);
  assert.match(steps[0].substeps[1].text, /Find Disease clue 2/);
  assert.ok(!JSON.stringify(steps).includes(FRIGHT_OBJECTS.find((object) => object.id === 'clue-disease-2').text));
});

test('Fright Nights subtasks follow restored discoveries without revealing other clues', () => {
  const clues = FRIGHT_OBJECTS.filter((object) => object.kind === 'clue');
  const saved = { ...newFrightState(), clues: [clues[2].id, clues[12].id] };
  const steps = questJournalSteps(4, restoreFrightState(saved));
  assert.equal(steps.slice(0, 7).length, FRIGHT_THEMES.length);
  assert.equal(steps.flatMap((entry) => entry.substeps || []).length, 21);
  assert.equal(steps[0].substeps[2].done, true);
  assert.equal(steps[0].substeps[0].done, false);
  assert.equal(steps[4].substeps[0].done, true);
  assert.ok(questJournalSteps(4, null).flatMap((entry) => entry.substeps || []).every((clue) => !clue.done));
  const legacy = questJournalSteps(4, null, true);
  assert.equal(legacy[0].done, true);
  assert.equal(legacy[0].substeps[0].status, 'Not recorded');
  assert.equal(legacy[0].substeps[0].done, false);
});

test('hall steps follow each displayed keepsake and claiming the present', () => {
  const steps = trophyJournalSteps([true, false, true, false, false]);
  assert.equal(done(steps, 'Abigail'), true);
  assert.equal(done(steps, 'Lucky Chucks'), false);
  assert.equal(done(steps, 'Thirteen'), true);
  assert.equal(done(steps, 'birthday present'), false);
  assert.ok(trophyJournalSteps([true, true, true, true, true], true).every((entry) => entry.done));
});
