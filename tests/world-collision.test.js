import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollision, findCharacterApproach, findWorldPath, MAZE_REGION_CLEARANCE, smoothWorldPath, worldCornWalls, worldObstacles, worldTrees } from '../js/world/world-collision.js';
import { CASTLE_BARREL_COLLISION_RADIUS, CASTLE_CRATE_COLLISION_SIZE, CASTLE_ENTRANCE, CASTLE_EXTERIOR_SUPPLIES, CASTLE_LAYOUT, CASTLE_TOWERS, INTERACTION_RANGE, QUEST_LOCATIONS, WORLD_ROUTES, WORLD_SCALE, WORLD_SIZE, WORLD_SPAWN } from '../js/world/world-data.js';
import { moveToward } from '../js/world/world-logic.js';
import { WORLD_NPCS } from '../js/world/world-npcs.js';
import { CANOPY_ILLUSTRATIONS, CANOPY_OFFSET, CANOPY_PLATFORMS, COASTER_TRACKS, harvestPumpkins, placeQuestDecorations } from '../js/world/world-scenery-data.js';
import { regionBlendAt } from '../js/world/world-regions.js';
import { roadDistance } from '../js/world/world-art.js';
import { isTownPlaza, TOWN_BENCHES, TOWN_CHURCH, TOWN_LAMPS, TOWN_TABLES, TOWN_VENUES } from '../js/world/town-scenery.js';
import { WORLD_SUPPLIES } from '../js/world/world-supplies.js';
import { castleSupplyStyle } from '../js/world/castle-scenery.js';
import { FRIGHT_MARQUEE } from '../js/world/fright-marquee.js';
import { WORLD_LAMPS } from '../js/world/world-lamps.js';
import { PARK_BANNERS, PARK_MAIN_COASTER, PARK_RELOCATED_STALL, PARK_RIDES, PARK_WHEEL } from '../js/world/park-scenery.js';
import { CatmullRomCurve3, Vector3 } from 'three';

function coasterSupportPositions(ride, trackType, rotation = 0) {
  const curve = new CatmullRomCurve3(COASTER_TRACKS[trackType].map((point) => new Vector3(...point)), true, 'centripetal');
  const frames = curve.computeFrenetFrames(320, true);
  const sides = Math.abs(frames.normals[0].y) < Math.abs(frames.binormals[0].y) ? frames.normals : frames.binormals;
  const supports = [];
  for (let i = 0; i < 72; i += 6) {
    const t = i / 72, point = curve.getPointAt(t), across = sides[Math.round(t * 320)];
    for (const side of [-13, 13]) {
      const support = point.clone().addScaledVector(across, side);
      supports.push({
        x: ride.x + ride.size * (support.x * Math.cos(rotation) + support.z * Math.sin(rotation)),
        y: ride.y + ride.size * (-support.x * Math.sin(rotation) + support.z * Math.cos(rotation))
      });
    }
  }
  return supports;
}

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

test('lamps stay clear of quest entrances, building doors and their approaches', () => {
  const park = QUEST_LOCATIONS[2];
  const doors = [
    { ...CASTLE_ENTRANCE, name: 'castle', direction: 1 },
    ...QUEST_LOCATIONS.map(({ entrance }) => ({ ...entrance, direction: 1 })),
    ...TOWN_VENUES.map((venue) => ({ x: venue.x, y: venue.y + venue.depth / 2, name: venue.name, direction: 1 })),
    { x: TOWN_CHURCH.x, y: TOWN_CHURCH.y - TOWN_CHURCH.depth / 2, name: 'church', direction: -1 },
    { x: WORLD_SPAWN.x - 205, y: WORLD_SPAWN.y - 95 + 42, name: 'home', direction: 1 },
    { x: park.x - 475, y: park.y + 350, name: 'park gate', direction: 1 }
  ];
  const lampCollision = createCollision(WORLD_LAMPS);
  for (const door of doors) {
    for (const lamp of WORLD_LAMPS) {
      assert.ok(Math.hypot(lamp.x - door.x, lamp.y - door.y) >= 90, `${door.name} has space around its entrance`);
    }
    assert.ok(lampCollision.clearSegment(door, { x: door.x, y: door.y + door.direction * 100 }),
      `${door.name} has an approach clear of lamps`);
  }
  const obstacles = worldObstacles();
  for (const lamp of WORLD_LAMPS) {
    assert.ok(obstacles.some((item) => item.x === lamp.x && item.y === lamp.y && item.radius === lamp.radius));
  }
  const escape = QUEST_LOCATIONS[0];
  const moved = WORLD_LAMPS.find((lamp) => lamp.x === escape.x - 180 && lamp.y === escape.y - 50);
  assert.ok(moved);
  assert.ok(!createCollision(obstacles.filter((item) => item.x !== moved.x || item.y !== moved.y), 20).blocked(moved),
    'the relocated lamp does not overlap other scenery');
  assert.ok(!obstacles.some((item) => item.x === escape.x - 75 && item.y === escape.y - 50 && item.radius === 7),
    'the old lamp has no invisible collision');
});

test('the relocated park wheel keeps its collision and clears existing scenery', () => {
  const obstacles = worldObstacles();
  const wheel = obstacles.find((item) => item.x === PARK_WHEEL.x && item.y === PARK_WHEEL.y
    && item.width === 10 && item.depth === 12);
  assert.ok(wheel);
  assert.ok(createCollision(obstacles).blocked(PARK_WHEEL));
  assert.ok(!createCollision(obstacles.filter((item) => item !== wheel), 75).blocked(PARK_WHEEL));
  const park = QUEST_LOCATIONS[2];
  assert.ok(!obstacles.some((item) => item.x === park.x + 320 && item.y === park.y - 260
    && item.width === 10 && item.depth === 12));
});

test('the drop tower moves left with its collision and stays clear of scenery and roads', () => {
  const park = QUEST_LOCATIONS[2], tower = PARK_RIDES.find((ride) => ride.type === 'dropTower');
  assert.ok(tower);
  assert.equal(tower.x, park.x - 650);
  assert.equal(tower.y, park.y + 500);
  assert.equal(regionBlendAt(tower).region.id, 'park');
  assert.ok(roadDistance(tower) > 75);
  const obstacles = worldObstacles();
  const footprint = obstacles.find((item) => item.x === tower.x && item.y === tower.y
    && item.width === 34 && item.depth === 34);
  assert.ok(footprint);
  assert.ok(createCollision(obstacles).blocked(tower));
  assert.ok(!createCollision(obstacles.filter((item) => item !== footprint), 45).blocked(tower));
  assert.ok(!obstacles.some((item) => item.x === park.x - 450 && item.y === park.y + 500
    && item.width === 34 && item.depth === 34));
});

test('park banners leave the paths and solid scenery clear', () => {
  const collision = createCollision(worldObstacles(), 15);
  for (const banner of PARK_BANNERS) {
    assert.ok(roadDistance(banner) > 40);
    assert.ok(!collision.blocked(banner));
  }
});

test('the enlarged Thirteen coaster supports clear the entrance', () => {
  const entrance = QUEST_LOCATIONS[2].entrance;
  for (const support of coasterSupportPositions(PARK_MAIN_COASTER, 'thirteen')) {
    assert.ok(Math.hypot(support.x - entrance.x, support.y - entrance.y) >= 60);
  }
});

test('the relocated blue coaster and stall clear GoApe and the road', () => {
  const ride = PARK_RIDES.find((item) => item.trackType === 'twistingCoaster');
  assert.ok(ride);
  const forest = QUEST_LOCATIONS[3], obstacles = worldObstacles();
  const collision = createCollision(obstacles);
  const curve = new CatmullRomCurve3(COASTER_TRACKS[ride.trackType].map((point) => new Vector3(...point)),
    true, 'centripetal');
  for (let i = 0; i < 500; i += 1) {
    const point = curve.getPointAt(i / 500);
    const x = ride.x + ride.size * (point.x * Math.cos(ride.rotation) + point.z * Math.sin(ride.rotation));
    const y = ride.y + ride.size * (-point.x * Math.sin(ride.rotation) + point.z * Math.cos(ride.rotation));
    for (const platform of CANOPY_PLATFORMS) {
      assert.ok(Math.hypot(x - forest.x - CANOPY_OFFSET.x - platform.x,
        y - forest.y - CANOPY_OFFSET.z - platform.z) >= platform.size / 2 + 300);
    }
  }
  for (const support of coasterSupportPositions(ride, ride.trackType, ride.rotation)) {
    assert.ok(roadDistance(support) > 75);
    assert.ok(!collision.blocked(support));
  }
  assert.ok(obstacles.some((item) => item.x === PARK_RELOCATED_STALL.x && item.y === PARK_RELOCATED_STALL.y
    && item.width === 82 && item.depth === 45));
  assert.ok(WORLD_SUPPLIES.some((item) => item.kind === 'crate'
    && item.x === PARK_RELOCATED_STALL.x + 60 && item.y === PARK_RELOCATED_STALL.y + 10));
  const otherObstacles = obstacles.filter((item) =>
    !(item.x === PARK_RELOCATED_STALL.x && item.y === PARK_RELOCATED_STALL.y)
    && !(item.x === PARK_RELOCATED_STALL.x + 60 && item.y === PARK_RELOCATED_STALL.y + 10));
  assert.ok(!createCollision(otherObstacles, 45).blocked(PARK_RELOCATED_STALL));
  const park = QUEST_LOCATIONS[2];
  assert.ok(!obstacles.some((item) => item.x === park.x + 350 && item.y === park.y + 300
    && item.width === 82 && item.depth === 45));
  assert.ok(!WORLD_SUPPLIES.some((item) => item.kind === 'crate' && item.x === park.x + 410 && item.y === park.y + 310));
  assert.ok(roadDistance(PARK_RELOCATED_STALL) > 100);
});

test('the enlarged castle covers every corner tower and keeps trees and rocks clear', () => {
  const trees = worldTrees();
  const obstacles = worldObstacles(trees);
  const collision = createCollision(obstacles);
  for (const tower of CASTLE_TOWERS) {
    assert.ok(collision.blocked({ x: CASTLE_LAYOUT.x + tower.x, y: CASTLE_LAYOUT.y + tower.z }));
  }
  for (const item of CASTLE_EXTERIOR_SUPPLIES) {
    assert.ok(collision.blocked({ x: CASTLE_LAYOUT.x + item.x, y: CASTLE_LAYOUT.y + item.z }),
      `exterior ${item.kind} is solid`);
    const obstacle = obstacles.find((entry) => entry.x === CASTLE_LAYOUT.x + item.x && entry.y === CASTLE_LAYOUT.y + item.z);
    assert.ok(obstacle);
    if (item.kind === 'barrel') assert.equal(obstacle.radius, CASTLE_BARREL_COLLISION_RADIUS * item.size);
    else {
      const extent = CASTLE_CRATE_COLLISION_SIZE * item.size * (Math.abs(Math.cos(item.rotation)) + Math.abs(Math.sin(item.rotation)));
      assert.equal(obstacle.width, extent);
      assert.equal(obstacle.depth, extent);
    }
  }
  for (const tree of trees) {
    for (const [x, y] of [[tree.x, tree.z], ...(tree.variant === 0 ? [[tree.x + 48, tree.z + 18]] : [])]) {
      assert.ok(Math.abs(x - CASTLE_LAYOUT.x) >= CASTLE_LAYOUT.width / 2
        || Math.abs(y - CASTLE_LAYOUT.y - CASTLE_LAYOUT.centerOffset) >= CASTLE_LAYOUT.depth / 2);
    }
  }
  const path = findWorldPath(WORLD_SPAWN, CASTLE_ENTRANCE, collision);
  assert.ok(path);
  const endpoint = path.at(-1) || WORLD_SPAWN;
  assert.ok(Math.hypot(endpoint.x - CASTLE_ENTRANCE.x, endpoint.y - CASTLE_ENTRANCE.y) < INTERACTION_RANGE);
});

test('scattered supplies are varied, solid and clear of existing scenery', () => {
  const obstacles = worldObstacles();
  const otherObstacles = obstacles.filter((obstacle) =>
    !WORLD_SUPPLIES.some((item) => item.x === obstacle.x && item.y === obstacle.y));
  assert.ok(WORLD_SUPPLIES.length >= 10);
  for (const kind of ['barrel', 'crate']) {
    const items = WORLD_SUPPLIES.filter((item) => item.kind === kind);
    assert.ok(items.length >= 4);
    assert.ok(new Set(items.map((item) => castleSupplyStyle(kind, item.variant).wood)).size >= 3);
    assert.ok(new Set(items.map((item) => item.size)).size >= 3);
  }
  for (const [index, item] of WORLD_SUPPLIES.entries()) {
    const obstacle = obstacles.find((entry) => entry.x === item.x && entry.y === item.y);
    assert.ok(obstacle, `${item.kind} has a collision footprint`);
    const halfExtent = item.kind === 'barrel' ? CASTLE_BARREL_COLLISION_RADIUS * item.size
      : CASTLE_CRATE_COLLISION_SIZE * item.size
        * (Math.abs(Math.cos(item.rotation)) + Math.abs(Math.sin(item.rotation))) / 2;
    if (item.kind === 'barrel') assert.equal(obstacle.radius, halfExtent);
    else assert.equal(obstacle.width, halfExtent * 2);
    assert.ok(!createCollision(otherObstacles, halfExtent + 2).blocked(item), `${item.kind} clears existing scenery`);
    for (const other of WORLD_SUPPLIES.slice(index + 1)) {
      const otherObstacle = obstacles.find((entry) => entry.x === other.x && entry.y === other.y);
      assert.ok(!createCollision([otherObstacle], halfExtent + 2).blocked(item), 'supplies do not overlap');
    }
  }
});

test('town storefronts have varied groups of supplies', () => {
  for (const venue of TOWN_VENUES) {
    const items = WORLD_SUPPLIES.filter((item) => Math.abs(item.x - venue.x) < venue.width / 2 + 28
      && item.y > venue.y + venue.depth / 2 && item.y <= venue.y + 155);
    assert.ok(items.length >= (venue.kind === 'games' ? 3 : 2), `${venue.name} has a group`);
    assert.ok(items.some((item) => item.kind === 'barrel'));
    assert.ok(items.some((item) => item.kind === 'crate'));
    assert.ok(new Set(items.map((item) => item.size)).size > 1);
    assert.ok(items.every((item) => items.some((other) => other !== item
      && Math.hypot(item.x - other.x, item.y - other.y) <= 35)), `${venue.name} supplies form a cluster`);
    assert.ok(Math.max(...items.map((item) => item.x)) - Math.min(...items.map((item) => item.x)) >= 24,
      `${venue.name} supplies spread sideways instead of forming a line`);
    if (items.length >= 3) {
      const [a, b, c] = items;
      assert.ok(Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) >= 200,
        `${venue.name} supplies form an irregular group`);
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

test('smoothed castle-to-Thirteen routes reduce turns and stay walkable to the same destination', () => {
  const obstacles = worldObstacles();
  const collision = createCollision(obstacles, 12), clearance = createCollision(obstacles, 14);
  const quest = QUEST_LOCATIONS[2];
  const castlePosition = findWorldPath(WORLD_SPAWN, CASTLE_ENTRANCE, collision).at(-1);
  for (const start of [WORLD_SPAWN, castlePosition]) for (const raw of [
    findCharacterApproach(start, quest, collision),
    findWorldPath(start, quest.entrance, collision)
  ]) {
    assert.ok(raw?.length);
    const smooth = smoothWorldPath(start, raw, collision, clearance);
    assert.ok(smooth.length <= 8 && smooth.length < raw.length / 2);
    assert.deepEqual(smooth.at(-1), raw.at(-1));
    let position = start;
    for (const waypoint of smooth) {
      assert.ok(collision.clearSegment(position, waypoint));
      let steps = 2000;
      while ((position.x !== waypoint.x || position.y !== waypoint.y) && steps-- > 0) {
        const next = moveToward(position, waypoint, 3.52);
        const moved = collision.move(position, next.x - position.x, next.y - position.y);
        assert.ok(Math.hypot(moved.x - next.x, moved.y - next.y) < 1e-8, 'movement does not catch on scenery');
        position = moved;
      }
      assert.ok(steps > 0, 'the waypoint is reached');
    }
  }
});

test('smoothed overworld routes remain walkable to every guide and entrance', () => {
  const obstacles = worldObstacles();
  const collision = createCollision(obstacles, 12), clearance = createCollision(obstacles, 14);
  for (const quest of QUEST_LOCATIONS) {
    for (const raw of [
      findCharacterApproach(WORLD_SPAWN, quest, collision),
      findWorldPath(WORLD_SPAWN, quest.entrance, collision)
    ]) {
      assert.ok(raw?.length, `route to ${quest.name}`);
      const smooth = smoothWorldPath(WORLD_SPAWN, raw, collision, clearance);
      assert.deepEqual(smooth.at(-1), raw.at(-1));
      let position = WORLD_SPAWN;
      for (const waypoint of smooth) {
        let steps = 2000;
        while ((position.x !== waypoint.x || position.y !== waypoint.y) && steps-- > 0) {
          const next = moveToward(position, waypoint, 3.52);
          const moved = collision.move(position, next.x - position.x, next.y - position.y);
          assert.ok(Math.hypot(moved.x - next.x, moved.y - next.y) < 1e-8, `${quest.name} route catches on scenery`);
          position = moved;
        }
        assert.ok(steps > 0, `${quest.name} waypoint is reached`);
      }
    }
  }
});

test('path smoothing retains endpoints and never shortcuts through obstacles', () => {
  const collision = createCollision([{ x: 200, y: 200, width: 100, depth: 140 }]);
  const start = { x: 100, y: 200 }, destination = { x: 300, y: 200 };
  const raw = findWorldPath(start, destination, collision);
  const smooth = smoothWorldPath(start, raw, collision);
  assert.ok(smooth.length > 1 && smooth.length < raw.length);
  assert.deepEqual(smooth.at(-1), destination);
  let position = start;
  for (const waypoint of smooth) {
    assert.ok(collision.clearSegment(position, waypoint));
    position = waypoint;
  }
  assert.deepEqual(smoothWorldPath(start, [], collision), []);
  const blockedDestination = findWorldPath(start, { x: 200, y: 200 }, collision);
  assert.deepEqual(smoothWorldPath(start, blockedDestination, collision).at(-1), blockedDestination.at(-1));
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

test('Fright Nights marquee clears the corn and leaves a walkable entrance', () => {
  const entrance = QUEST_LOCATIONS[4].entrance;
  const { halfWidth, back, front } = FRIGHT_MARQUEE.clearance;
  const obstacles = worldObstacles();
  for (const wall of worldCornWalls()) {
    const halfWallWidth = wall.vertical ? 12 : 75;
    const halfWallDepth = wall.vertical ? 75 : 12;
    assert.ok(Math.abs(wall.x - entrance.x) >= halfWidth + halfWallWidth
      || wall.y - halfWallDepth >= entrance.y + front
      || wall.y + halfWallDepth <= entrance.y - back);
  }
  const collision = createCollision(obstacles);
  for (const side of [-1, 1]) {
    assert.ok(collision.blocked({ x: entrance.x + side * FRIGHT_MARQUEE.postOffset, y: entrance.y }));
  }
  assert.ok(collision.clearSegment({ x: entrance.x, y: entrance.y + front },
    { x: entrance.x, y: entrance.y - 90 }));
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

test('a tree-lined transition separates the moved GoApe canopy from Thirteen', () => {
  const forest = QUEST_LOCATIONS[3], obstacles = worldObstacles(), trees = worldTrees();
  assert.equal(forest.y, 3060);
  assert.deepEqual(WORLD_ROUTES[3].at(-1).map((coordinate) => coordinate * WORLD_SCALE), [forest.x, forest.y]);
  const edgeTrees = trees.filter((tree) => tree.region === 'forest' && Math.abs(tree.x - forest.x) < 620
    && tree.z > forest.y + CANOPY_OFFSET.z - 680 && tree.z < forest.y + CANOPY_OFFSET.z - 500);
  assert.ok(edgeTrees.length >= 6);
  assert.ok(edgeTrees.some((tree) => tree.x < forest.x - 100));
  assert.ok(edgeTrees.some((tree) => tree.x > forest.x + 100));
  for (const tree of edgeTrees) {
    assert.ok(roadDistance({ x: tree.x, y: tree.z }) >= 120);
    assert.ok(obstacles.some((item) => item.x === tree.x && item.y === tree.z && item.radius === 10 * tree.size));
  }
  const cameraLength = Math.hypot(650, 970);
  const depthFactor = 650 / cameraLength, heightFactor = 970 / cameraLength;
  const canopyTop = Math.min(...CANOPY_PLATFORMS.map((platform) =>
    (forest.y + CANOPY_OFFSET.z + platform.z) * depthFactor
      - (platform.height + 33 + 177 * 0.6 * 1.08) * heightFactor));
  const rides = [
    { ...PARK_MAIN_COASTER, trackType: 'thirteen', rotation: 0 },
    ...PARK_RIDES.filter((ride) => ride.trackType)
  ];
  for (const ride of rides) {
    const curve = new CatmullRomCurve3(COASTER_TRACKS[ride.trackType].map((point) => new Vector3(...point)),
      true, 'centripetal');
    let bottom = -Infinity;
    for (let i = 0; i < 500; i += 1) {
      const point = curve.getPointAt(i / 500);
      const z = ride.y + ride.size * (-point.x * Math.sin(ride.rotation) + point.z * Math.cos(ride.rotation));
      bottom = Math.max(bottom, z * depthFactor - point.y * ride.size * heightFactor);
    }
    assert.ok(canopyTop - bottom >= 180, `${ride.trackType} remains visually clear of the canopy`);
  }
});

test('forest terrain covers GoApe platforms in both world views without swallowing park rides', () => {
  const forest = QUEST_LOCATIONS[3];
  for (const platform of CANOPY_PLATFORMS) {
    for (const dx of [-platform.size / 2, 0, platform.size / 2]) {
      for (const dz of [-platform.size / 2, 0, platform.size / 2]) {
        const x = forest.x + CANOPY_OFFSET.x + platform.x + dx;
        const y = forest.y + CANOPY_OFFSET.z + platform.z + dz;
        assert.equal(regionBlendAt({ x, y }).region.id, 'forest');
        assert.equal(regionBlendAt({ x, y: y - (platform.height + 44) * 970 / 650 }).region.id, 'forest',
          'raised decks and lanterns project over forest terrain');
      }
    }
  }
  for (const group of CANOPY_ILLUSTRATIONS) {
    for (const dx of [-189, 0, 189]) for (const height of [0, 105, 145]) {
      const x = forest.x + CANOPY_OFFSET.x + group.x + dx * group.size;
      const y = forest.y + CANOPY_OFFSET.z + group.z - height * group.size / 0.68;
      assert.equal(regionBlendAt({ x, y }).region.id, 'forest', 'illustrated platforms project over forest terrain');
    }
  }
  for (const ride of PARK_RIDES) assert.equal(regionBlendAt(ride).region.id, 'park');
  assert.equal(regionBlendAt(PARK_RELOCATED_STALL).region.id, 'park');
  assert.ok(worldTrees().every((tree) =>
    Math.hypot(tree.x - PARK_RELOCATED_STALL.x, tree.z - PARK_RELOCATED_STALL.y) >= 250),
  'new forest trees leave the park stall visible');
});

test('forest reaches the canopy while receding from the park drop tower', () => {
  const forest = QUEST_LOCATIONS[3], tower = PARK_RIDES.find((ride) => ride.type === 'dropTower');
  assert.ok(tower);
  assert.equal(regionBlendAt({ x: forest.x - 85, y: forest.y + CANOPY_OFFSET.z - 880 }).region.id, 'forest',
    'forest extends north of the canopy');
  for (const dx of [-100, 0, 100]) for (const dy of [100, 180, 240]) {
    assert.equal(regionBlendAt({ x: tower.x + dx, y: tower.y + dy }).region.id, 'park',
      'the area immediately behind the drop tower remains park terrain');
  }
  assert.ok(worldTrees().every((tree) => tree.region !== 'forest'
    || Math.abs(tree.x - tower.x) >= 200
    || tree.z <= tower.y || tree.z >= tower.y + 340),
  'forest trees do not crowd the drop tower');
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
