export const XP_PER_QUEST = 15;
export const FINALE_XP = 25;
export const KEEPSAKE_QUEST_COUNT = 5;
export const BIRTHDAY_XP_TARGET = KEEPSAKE_QUEST_COUNT * XP_PER_QUEST + FINALE_XP;

export function birthdayProgress(completed, finaleCompleted = false) {
  const questsCompleted = completed.filter((quest) => quest === true).length;
  const finaleEarned = completed.length === KEEPSAKE_QUEST_COUNT
    && questsCompleted === KEEPSAKE_QUEST_COUNT && finaleCompleted === true;
  return {
    questsCompleted,
    xp: questsCompleted * XP_PER_QUEST + (finaleEarned ? FINALE_XP : 0),
    targetXp: BIRTHDAY_XP_TARGET,
    level: finaleEarned ? 30 : 29
  };
}
