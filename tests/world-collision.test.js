import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollision, findWorldPath, worldObstacles, worldTrees } from '../js/world/world-collision.js';
import { CASTLE_ENTRANCE, QUEST_LOCATIONS, WORLD_SPAWN } from '../js/world/world-data.js';
import { WORLD_NPCS } from '../js/world/world-npcs.js';
import { CANOPY_OFFSET, CANOPY_PLATFORMS } from '../js/world/world-scenery-data.js';

test('castle, buildings and tree trunks are solid without blocking nearby entrances', () => {
  const trees = worldTrees(), collision = createCollision(worldObstacles(trees));
  assert.equal(collision.blocked({ x: WORLD_SPAWN.x + 50, y: WORLD_SPAWN.y - 250 }), true);
  assert.equal(collision.blocked({ x: QUEST_LOCATIONS[0].x - 70, y: QUEST_LOCATIONS[0].y - 185 }), true);
  assert.equal(collision.blocked({ x: trees[0].x, y: trees[0].z }), true);
  const before = { x: WORLD_SPAWN.x + 50, y: WORLD_SPAWN.y - 145 };
  const after = collision.move(before, 0, -100);
  assert.notDeepEqual(after, { x: before.x, y: before.y - 100 });
  for (const destination of [CASTLE_ENTRANCE, ...QUEST_LOCATIONS.flatMap((quest) => [quest, quest.entrance]), WORLD_NPCS[0]]) {
    const path = findWorldPath(WORLD_SPAWN, destination, collision);
    assert.ok(path, `No path to ${destination.name || 'castle'}`);
    const endpoint = path.at(-1) || WORLD_SPAWN;
    assert.ok(Math.hypot(endpoint.x - destination.x, endpoint.y - destination.y) < 74);
    let position = WORLD_SPAWN;
    for (const waypoint of path) {
      assert.equal(collision.clearSegment(position, waypoint), true);
      position = waypoint;
    }
  }
});

test('routes go around obstacles without crossing them', () => {
  const collision = createCollision([{ x: 200, y: 200, width: 100, depth: 140 }]);
  const from = { x: 100, y: 200 }, to = { x: 300, y: 200 };
  assert.equal(collision.clearSegment(from, to), false);
  const path = findWorldPath(from, to, collision);
  assert.ok(path.length > 1);
  assert.deepEqual(path.at(-1), to);
  let position = from;
  for (const waypoint of path) {
    assert.equal(collision.clearSegment(position, waypoint), true);
    position = waypoint;
  }
});

test('tree rocks use the original collision footprint', () => {
  const tree = { x: 100, z: 200, size: 1, variant: 0 };
  assert.ok(worldObstacles([tree]).some((obstacle) =>
    obstacle.x === 148 && obstacle.y === 218 && obstacle.radius === 13));
});

test('GoApe canopy stays behind the entrance and its platform trees have clearance', () => {
  const forest = QUEST_LOCATIONS[3];
  const trees = worldTrees();
  for (const platform of CANOPY_PLATFORMS) {
    const x = forest.x + CANOPY_OFFSET.x + platform.x;
    const y = forest.y + CANOPY_OFFSET.z + platform.z;
    const sceneryRadius = Math.max(platform.size / 2, 49);
    assert.ok(y + sceneryRadius < forest.entrance.y, 'Canopy must stay behind the entrance');
    assert.ok(trees.every((tree) => Math.hypot(tree.x - x, tree.z - y) >= 75),
      'Generated trees must not overlap a canopy platform');
  }
});

test('GoApe guide, entrance and ranger remain reachable from one another', () => {
  const forest = QUEST_LOCATIONS[3];
  const ranger = WORLD_NPCS.find((npc) => npc.name === 'Fern the Ranger');
  assert.ok(ranger);
  const collision = createCollision(worldObstacles());
  for (const from of [forest, forest.entrance, ranger]) {
    for (const destination of [forest, forest.entrance, ranger]) {
      if (from === destination) continue;
      const path = findWorldPath(from, destination, collision);
      assert.ok(path, `No path from ${from.name} to ${destination.name}`);
      const endpoint = path.at(-1) || from;
      assert.ok(Math.hypot(endpoint.x - destination.x, endpoint.y - destination.y) < 74);
      let position = from;
      for (const waypoint of path) {
        assert.ok(collision.clearSegment(position, waypoint));
        position = waypoint;
      }
    }
  }
});
