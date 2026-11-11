import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollision, findWorldPath, worldObstacles, worldTrees } from '../js/world/world-collision.js';
import { CASTLE_ENTRANCE, QUEST_LOCATIONS, WORLD_SPAWN } from '../js/world/world-data.js';
import { WORLD_NPCS } from '../js/world/world-npcs.js';

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
