import { QUEST_LOCATIONS } from './world-data.js';

export const DEAD_TREE_SPACING = 65;
export const ESCAPE_DECORATIVE_TREE = Object.freeze({
  x: QUEST_LOCATIONS[0].x + 185,
  z: QUEST_LOCATIONS[0].y - 140,
  size: 1.25
});

export function spaceDeadTrees(trees, existing = []) {
  const accepted = [...existing];
  return trees.filter((tree) => {
    if (tree.region !== 'escape') return true;
    if (accepted.some((other) => Math.hypot(tree.x - other.x, tree.z - other.z)
      < DEAD_TREE_SPACING * (tree.size + other.size))) return false;
    accepted.push(tree);
    return true;
  });
}
