import test from 'node:test';
import assert from 'node:assert/strict';
import { worldTrees } from '../js/world/world-collision.js';
import { surroundingTrees } from '../js/world/world-surroundings.js';
import { DEAD_TREE_SPACING, ESCAPE_DECORATIVE_TREE, spaceDeadTrees } from '../js/world/tree-spacing.js';

test('dead trees leave size-aware space throughout the world and its surroundings', () => {
  const world = worldTrees();
  const surroundings = surroundingTrees();
  assert.deepEqual(world, worldTrees());
  assert.deepEqual(surroundings, surroundingTrees());
  const deadTrees = [...world, ...surroundings].filter((tree) => tree.region === 'escape');
  assert.ok(deadTrees.length > 200, 'the escape region remains wooded');
  deadTrees.push(ESCAPE_DECORATIVE_TREE);
  for (let i = 0; i < deadTrees.length; i += 1) {
    for (let j = i + 1; j < deadTrees.length; j += 1) {
      const first = deadTrees[i], second = deadTrees[j];
      assert.ok(Math.hypot(first.x - second.x, first.z - second.z)
        >= DEAD_TREE_SPACING * (first.size + second.size), `dead trees ${i} and ${j} overlap`);
    }
  }
});

test('spacing preserves other tree types and keeps the first eligible dead tree', () => {
  const first = { x: 0, z: 0, size: 1, region: 'escape' };
  const crowded = { x: 100, z: 0, size: 1, region: 'escape' };
  const distant = { x: 130, z: 0, size: 1, region: 'escape' };
  const leafy = { x: 0, z: 0, size: 1, region: 'home' };
  assert.deepEqual(spaceDeadTrees([first, leafy, crowded, distant]), [first, leafy, distant]);
});
