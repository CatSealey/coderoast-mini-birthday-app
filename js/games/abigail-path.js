import { ABIGAIL_ROOMS } from './abigail-logic.js';

export function abigailPath(state, target, adjacent = false) {
  const blocked = new Set(ABIGAIL_ROOMS[state.room].objects.map((item) => `${item.x},${item.y}`));
  const queue = [{ ...state.player, path: [] }];
  const seen = new Set([`${state.player.x},${state.player.y}`]);
  const directions = [['up', 0, -1], ['down', 0, 1], ['left', -1, 0], ['right', 1, 0]];
  while (queue.length) {
    const current = queue.shift();
    const distance = Math.abs(current.x - target.x) + Math.abs(current.y - target.y);
    if (adjacent ? distance === 1 : distance === 0) return current.path;
    for (const [direction, dx, dy] of directions) {
      const x = current.x + dx, y = current.y + dy, key = `${x},${y}`;
      if (x < 0 || x >= 7 || y < 0 || y >= 5 || blocked.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push({ x, y, path: [...current.path, direction] });
    }
  }
  return null;
}
