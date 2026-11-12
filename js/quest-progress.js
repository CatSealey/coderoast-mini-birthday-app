export function normalizeQuestProgress(saved, count) {
  const valid = (value) => Array.isArray(value) && value.length === count
    && value.every((entry) => typeof entry === 'boolean');
  const completed = valid(saved?.completed) ? [...saved.completed] : Array(count).fill(false);
  const accepted = valid(saved?.accepted) ? [...saved.accepted] : Array(count).fill(false);
  return { completed, accepted: accepted.map((value, index) => value || completed[index]) };
}

export function freshGameProgress(count) {
  return {
    ...normalizeQuestProgress(null, count),
    gameSaves: Array(count).fill(null),
    trophyDisplays: Array(count).fill(false),
    trophyQuest: { accepted: false, completed: false },
    sideQuestCompleted: restoreSideQuestProgress(null)
  };
}

export function removeQuestProgress(progress, index) {
  if (!Number.isInteger(index) || index < 0 || index >= progress.completed.length
    || progress.accepted.length !== progress.completed.length) {
    throw new RangeError('Invalid quest index or progress.');
  }
  const completed = [...progress.completed];
  const accepted = [...progress.accepted];
  completed[index] = false;
  accepted[index] = false;
  return { completed, accepted };
}

export function questGuideSpeech(quest, title, accepted, completed) {
  if (completed) return {
    text: `You've completed ${title}! To start it again, remove it from your journal first.`,
    offer: false
  };
  if (accepted) return {
    text: `Thank you for accepting ${title}. Head to ${quest.entrance.name} when you're ready.`,
    offer: false
  };
  return {
    text: `${quest.introduction} I have a quest for you: ${title}. Will you accept it?`,
    offer: true
  };
}
import { restoreSideQuestProgress } from './side-quests.js';
