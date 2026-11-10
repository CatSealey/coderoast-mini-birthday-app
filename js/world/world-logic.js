import { INTERACTION_RANGE, WORLD_SIZE } from './world-data.js';

export function isQuestAvailable(index, completed) {
  return Number.isInteger(index)
    && index >= 0
    && index < completed.length;
}

export function areAllQuestsComplete(completed) {
  return completed.length > 0 && completed.every((quest) => quest === true);
}

export function distanceBetween(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function moveToward(position, target, distance) {
  const remaining = distanceBetween(position, target);
  if (remaining <= distance || remaining === 0) return { ...target };
  const scale = distance / remaining;
  return {
    x: position.x + (target.x - position.x) * scale,
    y: position.y + (target.y - position.y) * scale
  };
}

export function isNearQuest(position, quest) {
  return distanceBetween(position, quest) <= INTERACTION_RANGE;
}

export function nearestNpcIndex(position, npcs) {
  let nearest = -1;
  let distance = INTERACTION_RANGE;
  npcs.forEach((npc, index) => {
    const candidate = distanceBetween(position, npc);
    if (candidate <= distance) { nearest = index; distance = candidate; }
  });
  return nearest;
}

export function constrainToWorld(position, radius = 12) {
  return {
    x: Math.max(radius, Math.min(WORLD_SIZE.width - radius, position.x)),
    y: Math.max(radius, Math.min(WORLD_SIZE.height - radius, position.y))
  };
}
