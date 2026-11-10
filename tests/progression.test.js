import test from 'node:test';
import assert from 'node:assert/strict';
import { birthdayProgress, XP_PER_QUEST } from '../js/progression.js';

test('each distinct completed quest earns 20 XP and all five reach level 30', () => {
  assert.equal(XP_PER_QUEST, 20);
  const completed = [false, false, false, false, false];
  assert.deepEqual(birthdayProgress(completed), { questsCompleted: 0, xp: 0, targetXp: 100, level: 29 });
  [3, 0, 4, 1, 2].forEach((index, i) => {
    completed[index] = true;
    assert.deepEqual(birthdayProgress(completed), {
      questsCompleted: i + 1, xp: (i + 1) * 20, targetXp: 100, level: i === 4 ? 30 : 29
    });
  });
  completed[2] = true;
  assert.equal(birthdayProgress(completed).xp, 100);
  assert.equal(birthdayProgress([false, false, false, false, false]).level, 29);
  assert.equal(birthdayProgress([]).level, 29);
});
