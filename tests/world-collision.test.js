import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollision, findCharacterApproach, findWorldPath, MAZE_REGION_CLEARANCE, worldCornWalls, worldObstacles, worldTrees } from '../js/world/world-collision.js';
import { CASTLE_ENTRANCE, INTERACTION_RANGE, QUEST_LOCATIONS, WORLD_SIZE, WORLD_SPAWN } from '../js/world/world-data.js';
import { WORLD_NPCS } from '../js/world/world-npcs.js';
import { CANOPY_OFFSET, CANOPY_PLATFORMS, harvestPumpkins, placeQuestDecorations } from '../js/world/world-scenery-data.js';
import { regionBlendAt } from '../js/world/world-regions.js';
import { roadDistance } from '../js/world/world-art.js';
import { isTownPlaza, TOWN_BENCHES, TOWN_CHURCH, TOWN_LAMPS, TOWN_TABLES, TOWN_VENUES } from '../js/world/town-scenery.js';

test('castle, buildings and tree trunks are solid without blocking nearby entrances', () => {
  const trees = worldTrees(), collision = createCollision(worldObstacles(trees));
  assert.equal(collision.blocked({ x: WORLD_SPAWN.x + 50, y: WORLD_SPAWN.y - 250 }), true);
  assert.equal(collision.blocked({ x: QUEST_LOCATIONS[0].x - 70, y: QUEST_LOCATIONS[0].y - 185 }), true);
  assert.equal(collision.blocked({ x: trees[0].x, y: trees[0].z }), true);
  const before = { x: WORLD_SPAWN.x + 50, y: WORLD_SPAWN.y - 145 };
  const after = collision.move(before, 0, -100);
  assert.notDeepEqual(after, { x: before.x, y: before.y - 100 });
  for (const destination of [CASTLE_ENTRANCE, ...QUEST_LOCATIONS.map((quest) => quest.entrance)]) {
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

test('every guide and town character is solid and can still be approached', () => {
  const collision = createCollision(worldObstacles());
  for (const character of [...QUEST_LOCATIONS, ...WORLD_NPCS]) {
    const name = character.guide || character.name;
    assert.ok(collision.blocked(character), `${name} is solid`);
    const path = findCharacterApproach(WORLD_SPAWN, character, collision);
    assert.ok(path, `No approach to ${name}`);
    const endpoint = path.at(-1) || WORLD_SPAWN;
    assert.ok(Math.hypot(endpoint.x - character.x, endpoint.y - character.y) <= INTERACTION_RANGE, `${name} is in range`);
    assert.ok(!collision.blocked(endpoint), `${name} has a clear approach`);
    let position = WORLD_SPAWN;
    for (const waypoint of path) {
      assert.ok(collision.clearSegment(position, waypoint), `Route to ${name} is clear`);
      position = waypoint;
    }
    assert.ok(!collision.clearSegment(endpoint, character), `Cannot walk through ${name}`);
    const moved = collision.move(endpoint, character.x - endpoint.x, character.y - endpoint.y);
    assert.ok(Math.hypot(moved.x - character.x, moved.y - character.y) >= 28, `Movement stops at ${name}`);
  }
});

test('town venues form a row opposite the church with clear doors and a walkable street', () => {
  const town = QUEST_LOCATIONS[1], collision = createCollision(worldObstacles());
  assert.equal(TOWN_VENUES.filter((venue) => venue.kind === 'games').length, 1);
  assert.equal(TOWN_VENUES.filter((venue) => venue.kind === 'restaurant').length, 2);
  assert.equal(TOWN_VENUES.filter((venue) => venue.kind === 'bar').length, 2);
  for (const venue of TOWN_VENUES) {
    assert.ok(isTownPlaza(venue));
    assert.equal(venue.y, TOWN_VENUES[0].y, 'all venues share the same frontage');
    assert.ok(collision.blocked(venue), `${venue.name} blocks walking`);
    const from = { x: venue.x, y: venue.y + venue.depth / 2 + 13 };
    assert.ok(!collision.clearSegment(from, venue), `${venue.name} blocks a swept step`);
    assert.ok(!collision.blocked(from), `${venue.name} door is accessible`);
    assert.ok(collision.clearSegment(from, { x: venue.x, y: town.y + 60 }), `${venue.name} has an unobstructed approach`);
  }
  const sorted = [...TOWN_VENUES].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i += 1) {
    const left = sorted[i - 1], right = sorted[i];
    const leftEdge = left.x + left.width / 2, rightEdge = right.x - right.width / 2;
    assert.ok(rightEdge - leftEdge >= 70, `space between ${left.name} and ${right.name}`);
    for (const offset of [-12, 0, 12]) {
      const x = (leftEdge + rightEdge) / 2 + offset;
      const start = { x, y: town.y - 255 }, end = { x, y: town.y - 75 };
      assert.ok(!collision.blocked(start) && !collision.blocked(end));
      assert.ok(collision.clearSegment(start, end), `walk between ${left.name} and ${right.name}`);
      assert.deepEqual(collision.move(start, 0, end.y - start.y), end);
      assert.deepEqual(findWorldPath(start, end, collision), [end], 'click-to-walk reaches the other side');
      assert.deepEqual(findWorldPath(end, start, collision), [start], 'the gap works in both directions');
    }
  }
  assert.ok(isTownPlaza(TOWN_CHURCH));
  assert.ok(collision.blocked(TOWN_CHURCH), 'church blocks walking');
  assert.ok(worldTrees().every((tree) => Math.hypot(tree.x - TOWN_CHURCH.x, tree.z - TOWN_CHURCH.y) >= 300),
    'trees leave the church visible');
  const churchDoor = { x: TOWN_CHURCH.x, y: TOWN_CHURCH.y - TOWN_CHURCH.depth / 2 - 13 };
  assert.ok(!collision.blocked(churchDoor));
  assert.ok(collision.clearSegment(churchDoor, { x: churchDoor.x, y: town.y + 60 }), 'church door faces the clear street');
  assert.ok(collision.clearSegment({ x: town.x - 400, y: town.y + 60 }, { x: town.x + 350, y: town.y + 60 }),
    'the walkway between the church and row stays unobstructed');
  for (const table of TOWN_TABLES) {
    assert.ok(isTownPlaza(table));
    assert.ok(collision.blocked(table));
  }
  for (const item of [...TOWN_BENCHES, ...TOWN_LAMPS]) {
    assert.ok(isTownPlaza(item));
    assert.ok(collision.blocked(item), 'street furniture is solid');
  }
  assert.ok(!collision.blocked({ x: town.x - 200, y: town.y + 110 }), 'removed stall leaves no invisible obstacle');
  const starts = [WORLD_SPAWN, ...[[-400, 200], [350, 200], [-400, -240], [350, -240]]
    .map(([dx, dy]) => ({ x: town.x + dx, y: town.y + dy }))];
  for (const start of starts) {
    assert.ok(!collision.blocked(start));
    const guidePath = findCharacterApproach(start, town, collision);
    assert.ok(guidePath?.length);
    const guidePosition = guidePath.at(-1);
    assert.ok(Math.hypot(guidePosition.x - town.x, guidePosition.y - town.y) < INTERACTION_RANGE);
    const entrancePath = findWorldPath(guidePosition, town.entrance, collision);
    assert.ok(entrancePath?.length);
    const entrancePosition = entrancePath.at(-1);
    assert.ok(Math.hypot(entrancePosition.x - town.entrance.x, entrancePosition.y - town.entrance.y) < INTERACTION_RANGE);
    let position = start;
    for (const waypoint of [...guidePath, ...entrancePath]) {
      assert.ok(collision.clearSegment(position, waypoint), 'the quest route avoids town scenery');
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

test('the harvest maze stays within its region with clear space around every wall', () => {
  const walls = worldCornWalls();
  const obstacles = worldObstacles();
  assert.equal(MAZE_REGION_CLEARANCE, 80);
  assert.ok(walls.length >= 60, 'the maze retains its structure');
  assert.deepEqual(walls, worldCornWalls());
  for (const wall of walls) {
    assert.ok(obstacles.some((item) => item.x === wall.x && item.y === wall.y
      && item.width === (wall.vertical ? 14 : 135) && item.depth === (wall.vertical ? 135 : 14)),
    'the rendered wall has a matching collision obstacle');
    const halfWidth = (wall.vertical ? 12 : 75) + MAZE_REGION_CLEARANCE;
    const halfHeight = (wall.vertical ? 75 : 12) + MAZE_REGION_CLEARANCE;
    const xSteps = Math.ceil(halfWidth * 2 / 7);
    const ySteps = Math.ceil(halfHeight * 2 / 7);
    for (let x = 0; x <= xSteps; x += 1) {
      for (let y = 0; y <= ySteps; y += 1) {
        const point = {
          x: wall.x - halfWidth + 2 * halfWidth * x / xSteps,
          y: wall.y - halfHeight + 2 * halfHeight * y / ySteps
        };
        assert.ok(point.x >= 0 && point.x <= WORLD_SIZE.width && point.y >= 0 && point.y <= WORLD_SIZE.height);
        assert.equal(regionBlendAt(point).region.id, 'harvest', `maze wall at ${wall.x}, ${wall.y}`);
      }
    }
  }
});

test('pumpkins can cross the blended border without losing the original harvest decorations', () => {
  const pumpkins = harvestPumpkins();
  const original = placeQuestDecorations(QUEST_LOCATIONS[4], 'harvest', 35, 760, 48);
  assert.deepEqual(pumpkins.slice(0, original.length), original);
  assert.deepEqual(pumpkins, harvestPumpkins());
  const transition = pumpkins.slice(original.length);
  assert.equal(transition.length, 3);
  const obstacles = worldObstacles();
  const graves = placeQuestDecorations(QUEST_LOCATIONS[0], 'escape', 22, 560, 12);
  for (const [index, pumpkin] of transition.entries()) {
    const { region, neighbor, blend } = regionBlendAt(pumpkin);
    assert.equal(region.id, 'escape');
    assert.equal(neighbor.id, 'harvest');
    assert.ok(blend > 0);
    assert.ok(roadDistance(pumpkin) > 85);
    assert.ok([...QUEST_LOCATIONS, ...WORLD_NPCS].every((npc) => Math.hypot(pumpkin.x - npc.x, pumpkin.y - npc.y) > 100));
    assert.ok([...original, ...graves].every((item) => Math.hypot(pumpkin.x - item.x, pumpkin.y - item.y) > 50));
    assert.ok(transition.slice(0, index).every((item) => Math.hypot(pumpkin.x - item.x, pumpkin.y - item.y) >= 38));
    assert.ok(obstacles.some((item) => item.x === pumpkin.x && item.y === pumpkin.y && item.radius === 15 * pumpkin.scale),
      'the rendered pumpkin has a matching collision obstacle');
  }
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
  const approach = (character) => findCharacterApproach(WORLD_SPAWN, character, collision)?.at(-1);
  const positions = [approach(forest), forest.entrance, approach(ranger)];
  assert.ok(positions.every(Boolean));
  for (const from of positions) {
    for (const destination of [forest, forest.entrance, ranger]) {
      const path = destination === forest.entrance
        ? findWorldPath(from, destination, collision) : findCharacterApproach(from, destination, collision);
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
