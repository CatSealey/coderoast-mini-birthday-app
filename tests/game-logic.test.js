import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTER_MAPS, renderChapterMap } from '../js/chapter-maps.js';
import { createRuneSequence, evaluatePoolShot, moveMazePlayer } from '../js/games/logic.js';
import { MAZE } from '../js/games/maze.js';
import { QUEST_LOCATIONS, WORLD_ROUTES, WORLD_SCALE, WORLD_SIZE, WORLD_SPAWN } from '../js/world/world-data.js';
import { areAllQuestsComplete, constrainToWorld, distanceBetween, isNearQuest, isQuestAvailable, moveToward, nearestNpcIndex } from '../js/world/world-logic.js';
import { WORLD_NPCS } from '../js/world/world-npcs.js';
import { cameraFor, projectWorld, roadDistance, unprojectWorld } from '../js/world/world-art.js';
import { createMazeWalls } from '../js/world/maze-scenery.js';
import { regionBlendAt, WORLD_REGIONS } from '../js/world/world-regions.js';
import { PARK_RIDES } from '../js/world/park-scenery.js';
import { CatmullRomCurve3, OrthographicCamera, Vector3 } from 'three';
import { configureWorldCamera, groundPointAt } from '../js/world/world-3d.js';
import { CANOPY_LINKS, CANOPY_PLATFORMS, COASTER_TRACKS, placeQuestDecorations, scatterScenery } from '../js/world/world-scenery-data.js';

test('rune sequence generation returns valid rune indexes and validates length', () => {
  assert.deepEqual(createRuneSequence(4, () => 0.6), [2, 2, 2, 2]);
  assert.throws(() => createRuneSequence(0), RangeError);
});

test('pool shot scoring rewards a close aim and controlled power', () => {
  assert.equal(evaluatePoolShot(2, 80).success, true);
  assert.equal(evaluatePoolShot(4, 72).success, false);
  assert.equal(evaluatePoolShot(0, 95).success, false);
});

test('maze movement allows open cells and blocks walls and invalid directions', () => {
  const grid = ['#####', '#...#', '#####'];
  const start = { x: 1, y: 1 };
  assert.strictEqual(moveMazePlayer(start, 'up', grid), start);
  assert.deepEqual(moveMazePlayer(start, 'sideways', grid), start);
  assert.strictEqual(moveMazePlayer(start, 'left', grid), start);
  assert.deepEqual(moveMazePlayer(start, 'right', grid), { x: 2, y: 1 });
});

test('Fright Nights maze has a route from the start to both the key and exit', () => {
  const start = { x: 1, y: 1 };
  const key = { x: 1, y: 5 };
  const exit = { x: 7, y: 2 };
  const directions = ['up', 'down', 'left', 'right'];
  const queue = [start];
  const visited = new Set([`${start.x},${start.y}`]);

  while (queue.length) {
    const position = queue.shift();
    for (const direction of directions) {
      const next = moveMazePlayer(position, direction, MAZE);
      const keyForPosition = `${next.x},${next.y}`;
      if (next === position || visited.has(keyForPosition)) continue;
      visited.add(keyForPosition);
      queue.push(next);
    }
  }

  assert.equal(visited.has(`${key.x},${key.y}`), true);
  assert.equal(visited.has(`${exit.x},${exit.y}`), true);
});

test('every quest chapter has an accessible map with its own location details', () => {
  assert.equal(CHAPTER_MAPS.length, 5);
  CHAPTER_MAPS.forEach((map, index) => {
    const markup = renderChapterMap(index);
    assert.match(markup, /<svg[^>]+role="img"/);
    assert.match(markup, /Quest route/);
    assert.match(markup, new RegExp(map.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  assert.throws(() => renderChapterMap(5), RangeError);
});

test('all five quests are available regardless of completion order', () => {
  assert.equal(QUEST_LOCATIONS.length, 5);
  for (const completed of [[false, false, false, false, false], [false, true, false, false, true], [true, true, true, true, true]]) {
    QUEST_LOCATIONS.forEach((_, index) => assert.equal(isQuestAvailable(index, completed), true));
    for (const index of [-1, 5, 1.5, NaN]) assert.equal(isQuestAvailable(index, completed), false);
  }
});

test('birthday reward requires all quests regardless of the final quest', () => {
  assert.equal(areAllQuestsComplete([]), false);
  assert.equal(areAllQuestsComplete([false, false, false, false, true]), false);
  assert.equal(areAllQuestsComplete([true, true, false, true, true]), false);
  assert.equal(areAllQuestsComplete([true, true, true, true, true]), true);
});

test('quest destinations are far enough apart for meaningful travel', () => {
  assert.equal(WORLD_SIZE.width, 5400);
  assert.equal(WORLD_SIZE.height, 3600);
  assert.equal(WORLD_SCALE, 3);
  assert.ok(distanceBetween(WORLD_SPAWN, QUEST_LOCATIONS[0]) > 1200);
  assert.ok(distanceBetween(WORLD_SPAWN, QUEST_LOCATIONS[1]) > 1250, 'the town is further from the castle home');
  assert.equal(WORLD_ROUTES.length, QUEST_LOCATIONS.length);
  WORLD_ROUTES.forEach((route, index) => {
    const [x, y] = route.at(-1);
    assert.equal(x * WORLD_SCALE, QUEST_LOCATIONS[index].x);
    assert.equal(y * WORLD_SCALE, QUEST_LOCATIONS[index].y);
  });
  for (let index = 1; index < QUEST_LOCATIONS.length; index += 1) {
    assert.ok(distanceBetween(QUEST_LOCATIONS[index - 1], QUEST_LOCATIONS[index]) > 1100);
  }
});

test('world movement advances toward a destination without overshooting', () => {
  assert.deepEqual(moveToward({ x: 10, y: 20 }, { x: 110, y: 20 }, 30), { x: 40, y: 20 });
  assert.deepEqual(moveToward({ x: 10, y: 20 }, { x: 25, y: 20 }, 30), { x: 25, y: 20 });
  assert.equal(distanceBetween({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('world boundaries constrain movement and quest markers have an interaction radius', () => {
  assert.deepEqual(constrainToWorld({ x: -40, y: WORLD_SIZE.height + 30 }), { x: 12, y: WORLD_SIZE.height - 12 });
  const quest = QUEST_LOCATIONS[0];
  assert.equal(isNearQuest({ x: quest.x, y: quest.y }, quest), true);
  assert.equal(isNearQuest({ x: quest.x + 120, y: quest.y }, quest), false);
});

test('local characters and side quest encounters have valid positions and dialogue', () => {
  assert.ok(WORLD_NPCS.length >= 6);
  const locals = WORLD_NPCS.filter((npc) => npc.sideQuest === undefined);
  assert.equal(new Set(locals.map((npc) => npc.name)).size, locals.length);
  WORLD_NPCS.forEach((npc, index) => {
    assert.ok(npc.dialogue.length >= (npc.sideQuest === undefined ? 2 : 1) && npc.dialogue.every((line) => line.length > 0));
    assert.deepEqual(constrainToWorld(npc), { x: npc.x, y: npc.y });
    assert.equal(nearestNpcIndex(npc, WORLD_NPCS), index);
    assert.ok(QUEST_LOCATIONS.every((quest) => distanceBetween(npc, quest) > 74));
  });
  assert.equal(nearestNpcIndex({ x: 0, y: 0 }, WORLD_NPCS), -1);
  assert.equal(nearestNpcIndex({ x: 10, y: 0 }, [{ x: 60, y: 0 }, { x: 20, y: 0 }]), 1);
  assert.equal(nearestNpcIndex({ x: 0, y: 0 }, [{ x: 74, y: 0 }]), 0);
});

test('angled world projection and pointer mapping round-trip at different zoom levels', () => {
  const position = { x: 3456, y: 1702 };
  const camera = { x: 1020, y: 440 };
  for (const zoom of [0.65, 1, 1.5]) {
    const restored = unprojectWorld(projectWorld(position, camera, zoom), camera, zoom);
    assert.ok(Math.abs(restored.x - position.x) < 1e-9);
    assert.ok(Math.abs(restored.y - position.y) < 1e-9);
  }
});

test('3D camera ground picking round-trips world points at desktop and mobile sizes', () => {
  for (const [width, height, zoom] of [[1000, 600, 1], [360, 460, 0.65]]) {
    const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 6000);
    configureWorldCamera(camera, width, height, zoom, WORLD_SPAWN);
    for (const offset of [{ x: 0, y: 0 }, { x: 80, y: -100 }, { x: -110, y: 90 }]) {
      const world = { x: WORLD_SPAWN.x + offset.x, y: WORLD_SPAWN.y + offset.y };
      const projected = new Vector3(world.x, 0, world.y).project(camera);
      const screen = { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
      const restored = groundPointAt(camera, width, height, screen);
      assert.ok(restored);
      assert.ok(Math.abs(restored.x - world.x) < 1e-8);
      assert.ok(Math.abs(restored.y - world.y) < 1e-8);
    }
  }
});

test('3D canopy has a connected, varied network of platforms and crossings', () => {
  assert.ok(CANOPY_PLATFORMS.length >= 7);
  assert.ok(new Set(CANOPY_PLATFORMS.map((platform) => platform.height)).size >= 4);
  assert.deepEqual(new Set(CANOPY_LINKS.map((link) => link.type)), new Set(['bridge', 'rope', 'zipline']));
  const reached = new Set([0]);
  for (let pass = 0; pass < CANOPY_PLATFORMS.length; pass += 1) {
    for (const { from, to } of CANOPY_LINKS) {
      assert.ok(from >= 0 && from < CANOPY_PLATFORMS.length);
      assert.ok(to >= 0 && to < CANOPY_PLATFORMS.length);
      assert.notEqual(from, to);
      if (reached.has(from)) reached.add(to);
      if (reached.has(to)) reached.add(from);
    }
  }
  assert.equal(reached.size, CANOPY_PLATFORMS.length);
});

test('3D coaster designs form distinct closed three-dimensional circuits', () => {
  assert.equal(Object.keys(COASTER_TRACKS).length, 4);
  assert.equal(new Set(Object.values(COASTER_TRACKS).map(JSON.stringify)).size, 4);
  for (const points of Object.values(COASTER_TRACKS)) {
    assert.ok(points.length >= 10);
    assert.ok(Math.max(...points.map((point) => point[2])) - Math.min(...points.map((point) => point[2])) >= 120);
    const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)), true, 'centripetal');
    assert.ok(curve.getPoint(0).distanceTo(curve.getPoint(1)) < 1e-8);
    for (let i = 0; i < 100; i += 1) assert.ok(curve.getPoint(i / 100).y > 10);
  }
});

test('scattered decorations are deterministic, separated and respect placement restrictions', () => {
  const options = {
    center: { x: 1000, y: 1000 }, count: 25, radius: 400, seed: 33,
    accept: (point) => point.x > 850 && Math.hypot(point.x - 1000, point.y - 1000) > 80
  };
  const items = scatterScenery(options);
  assert.deepEqual(items, scatterScenery(options));
  assert.equal(items.length, 25);
  assert.equal(new Set(items.map((item) => item.variant)).size, 3);
  items.forEach((item, index) => {
    assert.ok(options.accept(item));
    assert.ok(Math.hypot(item.x - 1000, item.y - 1000) <= options.radius);
    items.slice(index + 1).forEach((other) => assert.ok(Math.hypot(item.x - other.x, item.y - other.y) >= 38));
  });
});

test('graveyard and pumpkin decorations stay in their regions and clear of routes and guides', () => {
  for (const [quest, region, count, radius, seed] of [
    [QUEST_LOCATIONS[0], 'escape', 22, 560, 12],
    [QUEST_LOCATIONS[4], 'harvest', 35, 760, 48]
  ]) {
    const items = placeQuestDecorations(quest, region, count, radius, seed);
    assert.equal(items.length, count);
    for (const item of items) {
      assert.equal(regionBlendAt(item).region.id, region);
      assert.ok(roadDistance(item) > 85);
      assert.ok(distanceBetween(item, quest) > 120);
    }
  }
});

test('camera stays within the world or centers a viewport larger than the world', () => {
  const topLeft = cameraFor({ x: 0, y: 0 }, 800, 600, 1);
  assert.deepEqual(topLeft, { x: 0, y: 0 });
  const bottomRight = cameraFor({ x: WORLD_SIZE.width, y: WORLD_SIZE.height }, 800, 600, 1);
  assert.equal(bottomRight.x, WORLD_SIZE.width - 800);
  assert.ok(Math.abs(bottomRight.y - (WORLD_SIZE.height - 600 / 0.68)) < 1e-9);
  const wide = cameraFor(WORLD_SPAWN, 6000, 3000, 1);
  assert.equal(wide.x, -300);
  assert.ok(Math.abs(wide.y - (WORLD_SIZE.height - 3000 / 0.68) / 2) < 1e-9);
});

test('adjoining regions cover the whole world and retain their quest landmarks', () => {
  assert.equal(regionBlendAt(WORLD_SPAWN).region.id, 'home');
  assert.equal(regionBlendAt(WORLD_SPAWN).region.name, 'LUMBRIDGE CASTLE · GIELINOR');
  const expected = ['escape', 'town', 'park', 'forest', 'harvest'];
  QUEST_LOCATIONS.forEach((quest, index) => {
    assert.equal(regionBlendAt(quest).region.id, expected[index]);
  });
  const seen = new Set();
  let transitions = 0;
  for (let y = 0; y <= WORLD_SIZE.height; y += 100) {
    for (let x = 0; x <= WORLD_SIZE.width; x += 100) {
      const { region, neighbor, blend } = regionBlendAt({ x, y });
      assert.ok(WORLD_REGIONS.includes(region));
      assert.ok(WORLD_REGIONS.includes(neighbor));
      assert.ok(blend >= 0 && blend <= 0.5);
      seen.add(region.id);
      if (blend > 0) transitions += 1;
    }
  }
  assert.equal(seen.size, WORLD_REGIONS.length);
  assert.ok(transitions > 0);
});

test('additional park rides are distributed within the park and clear of the quest guide', () => {
  const park = QUEST_LOCATIONS[2];
  assert.ok(PARK_RIDES.filter((ride) => ride.type.includes('Coaster')).length >= 3);
  for (const ride of PARK_RIDES) {
    assert.equal(regionBlendAt(ride).region.id, 'park');
    assert.ok(ride.x > 250 && ride.x < WORLD_SIZE.width - 250);
    assert.ok(ride.y > 250 && ride.y < WORLD_SIZE.height - 250);
    assert.ok(distanceBetween(ride, park) > 500);
  }
});

test('Halloween scenery maze has connected cells and deterministic walls', () => {
  const width = 8;
  const height = 8;
  const walls = createMazeWalls(width, height);
  assert.deepEqual(walls, createMazeWalls(width, height));
  assert.throws(() => createMazeWalls(0, height), RangeError);
  const wallKeys = new Set(walls.map(({ x, y, vertical }) => `${x},${y},${vertical}`));
  const visited = new Set(['0,0']);
  const queue = [[0, 0]];
  while (queue.length) {
    const [x, y] = queue.shift();
    const options = [
      [x - 1, y, `${x},${y},true`], [x + 1, y, `${x + 1},${y},true`],
      [x, y - 1, `${x},${y},false`], [x, y + 1, `${x},${y + 1},false`]
    ];
    for (const [nextX, nextY, wall] of options) {
      const key = `${nextX},${nextY}`;
      if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height || wallKeys.has(wall) || visited.has(key)) continue;
      visited.add(key);
      queue.push([nextX, nextY]);
    }
  }
  assert.equal(visited.size, width * height);
});
