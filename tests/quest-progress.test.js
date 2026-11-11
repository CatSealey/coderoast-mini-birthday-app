import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuestProgress, questGuideSpeech, removeQuestProgress } from '../js/quest-progress.js';
import { birthdayProgress } from '../js/progression.js';
import { areAllQuestsComplete } from '../js/world/world-logic.js';
import { INTERACTION_RANGE, QUEST_LOCATIONS, WORLD_SIZE } from '../js/world/world-data.js';
import { distanceBetween } from '../js/world/world-logic.js';

test('new progress starts with an empty journal', () => {
  assert.deepEqual(normalizeQuestProgress(null, 5), {
    completed: [false, false, false, false, false],
    accepted: [false, false, false, false, false]
  });
});

test('legacy completions remain accepted and acceptance survives reload', () => {
  const completed = [false, true, false, false, true];
  assert.deepEqual(normalizeQuestProgress({ completed }, 5), { completed, accepted: completed });
  assert.deepEqual(normalizeQuestProgress({ completed, accepted: [true, false, false, true, false] }, 5), {
    completed, accepted: [true, true, false, true, true]
  });
});

test('each quest has a distinct entrance within the world, separate from its guide', () => {
  assert.equal(QUEST_LOCATIONS.length, 5);
  for (const quest of QUEST_LOCATIONS) {
    assert.ok(quest.entrance.name);
    assert.ok(quest.entrance.x > 0 && quest.entrance.x < WORLD_SIZE.width);
    assert.ok(quest.entrance.y > 0 && quest.entrance.y < WORLD_SIZE.height);
    assert.ok(distanceBetween(quest, quest.entrance) > INTERACTION_RANGE);
  }
});

test('quest guides offer new quests and give entrance guidance for accepted and completed quests', () => {
  for (const quest of QUEST_LOCATIONS) {
    const offer = questGuideSpeech(quest, quest.name, false, false);
    assert.equal(offer.offer, true);
    assert.ok(offer.text.includes(quest.introduction));
    assert.ok(offer.text.includes(quest.name));
    assert.match(offer.text, /Will you accept it\?/);
    for (const [accepted, completed] of [[true, false], [true, true], [false, true]]) {
      const speech = questGuideSpeech(quest, quest.name, accepted, completed);
      assert.equal(speech.offer, false);
      if (completed) assert.match(speech.text, /remove it from your journal/);
      else assert.ok(speech.text.includes(quest.entrance.name));
    }
  }
});

test('removing a quest resets only its acceptance and completion and updates derived rewards', () => {
  const progress = { accepted: [true, true, true, true, true], completed: [true, true, true, true, true] };
  for (let index = 0; index < 5; index += 1) {
    const result = removeQuestProgress(progress, index);
    assert.equal(result.accepted[index], false);
    assert.equal(result.completed[index], false);
    assert.equal(result.completed.filter(Boolean).length, 4);
    assert.equal(result.accepted.filter(Boolean).length, 4);
    assert.equal(birthdayProgress(result.completed).xp, 60);
    assert.equal(birthdayProgress(result.completed).level, 29);
    assert.equal(areAllQuestsComplete(result.completed), false);
    assert.deepEqual(normalizeQuestProgress(result, 5), result);
  }
  assert.ok(progress.completed.every(Boolean));
  assert.ok(progress.accepted.every(Boolean));
  const unfinished = removeQuestProgress({ accepted: [true, true], completed: [false, true] }, 0);
  assert.deepEqual(unfinished, { accepted: [false, true], completed: [false, true] });
  assert.equal(questGuideSpeech(QUEST_LOCATIONS[0], 'Abigail Escape', unfinished.accepted[0], unfinished.completed[0]).offer, true);
  assert.throws(() => removeQuestProgress(progress, 5), RangeError);
});
