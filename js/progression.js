export const XP_PER_QUEST = 20;

export function birthdayProgress(completed) {
  const questsCompleted = completed.filter((quest) => quest === true).length;
  const targetXp = completed.length * XP_PER_QUEST;
  return {
    questsCompleted,
    xp: questsCompleted * XP_PER_QUEST,
    targetXp,
    level: completed.length > 0 && questsCompleted === completed.length ? 30 : 29
  };
}
