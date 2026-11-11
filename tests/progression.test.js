import test from 'node:test';
import assert from 'node:assert/strict';
import { birthdayProgress, BIRTHDAY_XP_TARGET, FINALE_XP, XP_PER_QUEST } from '../js/progression.js';

test('five keepsakes earn 15 XP each; only the castle finale awards level 30', () => {
  assert.equal(XP_PER_QUEST, 15);
  assert.equal(FINALE_XP, 25);
  assert.equal(BIRTHDAY_XP_TARGET, 100);
  const completed = [false, false, false, false, false];
  assert.deepEqual(birthdayProgress(completed), { questsCompleted: 0, xp: 0, targetXp: 100, level: 29 });
  [3, 0, 4, 1, 2].forEach((index, i) => {
    completed[index] = true;
    assert.deepEqual(birthdayProgress(completed), {
      questsCompleted: i + 1, xp: (i + 1) * 15, targetXp: 100, level: 29
    });
  });
  assert.deepEqual(birthdayProgress(completed, true), { questsCompleted: 5, xp: 100, targetXp: 100, level: 30 });
  completed[0] = false;
  assert.deepEqual(birthdayProgress(completed, true), { questsCompleted: 4, xp: 60, targetXp: 100, level: 29 });
  assert.equal(birthdayProgress([], true).level, 29);
  assert.equal(birthdayProgress([true], true).level, 29);
});
