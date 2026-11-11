export const TROPHY_COUNT = 5;
export const TROPHY_EXIT = Object.freeze({ x: 210, z: 575, range: 75 });

export function nearTrophyExit(player) {
  return Math.hypot(player.x - TROPHY_EXIT.x, player.z - TROPHY_EXIT.z) <= TROPHY_EXIT.range;
}

export function restoreTrophyQuest(saved, displays) {
  const completed = saved?.completed === true;
  return { accepted: saved?.accepted === true || completed || displays.some(Boolean), completed };
}

export function restoreDisplays(saved, completed) {
  return Array.from({ length: TROPHY_COUNT }, (_, index) =>
    completed[index] === true && Array.isArray(saved) && saved[index] === true);
}

export function placeKeepsake(displays, completed, index) {
  if (!Number.isInteger(index) || index < 0 || index >= TROPHY_COUNT || !completed[index]) return displays;
  return displays.map((displayed, slot) => slot === index ? true : displayed);
}

export function presentAvailable(displays, completed) {
  return displays.length === TROPHY_COUNT && displays.every(Boolean)
    && completed.length === TROPHY_COUNT && completed.every(Boolean);
}
