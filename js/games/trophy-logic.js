export const TROPHY_COUNT = 5;
export const HALL_WIDTH = 1040;
export const HALL_CENTER = HALL_WIDTH / 2;
export const TROPHY_EXIT = Object.freeze({ x: HALL_CENTER, z: 575, range: 75 });
export const HALL_EXIT_MAT = Object.freeze({ x: HALL_CENTER, z: 558.5, width: 150, depth: 75 });

export function isOnHallExitMat(x, z) {
  const { x: center, z: midpoint, width, depth } = HALL_EXIT_MAT;
  const edge = midpoint + depth / 2;
  const dx = (x - center) / (width / 2), dz = (z - edge) / depth;
  return dz >= -1 && dz <= 0 && dx * dx + dz * dz <= 1;
}

export function hallExitMatIntersectsFoot(bounds) {
  const { x, z, depth } = HALL_EXIT_MAT;
  const edge = z + depth / 2;
  if (bounds.min.z > edge) return false;
  const closestX = Math.max(bounds.min.x, Math.min(bounds.max.x, x));
  const closestZ = Math.max(bounds.min.z, Math.min(bounds.max.z, edge));
  return isOnHallExitMat(closestX, closestZ);
}

export function nearTrophyExit(player) {
  return Math.hypot(player.x - TROPHY_EXIT.x, player.z - TROPHY_EXIT.z) <= TROPHY_EXIT.range;
}

export function restoreTrophyQuest(saved, displays) {
  const completed = saved?.completed === true;
  return { accepted: saved?.accepted === true || completed || displays.some(Boolean), completed };
}

export function restoreBirthdayGuests(saved, trophyQuest, displays, completed) {
  return trophyQuest.completed && presentAvailable(displays, completed)
    && (saved === undefined || saved === true);
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
