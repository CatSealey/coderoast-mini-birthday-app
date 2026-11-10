import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTER_MAPS, renderChapterMap } from '../js/chapter-maps.js';
import { createRuneSequence, evaluatePoolShot, moveMazePlayer } from '../js/games/logic.js';
import { MAZE } from '../js/games/maze.js';
import { QUEST_LOCATIONS, WORLD_ROUTES, WORLD_SCALE, WORLD_SIZE, WORLD_SPAWN } from '../js/world/world-data.js';
import { constrainToWorld, distanceBetween, isNearQuest, isQuestAvailable, moveToward } from '../js/world/world-logic.js';
import { cameraFor, projectWorld, unprojectWorld } from '../js/world/world-art.js';
import { createMazeWalls } from '../js/world/maze-scenery.js';
import { regionBlendAt, WORLD_REGIONS } from '../js/world/world-regions.js';
import { PARK_RIDES } from '../js/world/park-scenery.js';

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

test('Fright Night maze has a route from the start to both the key and exit', () => {
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

test('quest locations correspond to all five chapters and stay locked in sequence', () => {
  assert.equal(QUEST_LOCATIONS.length, 5);
  const completed = [false, false, false, false, false];
  assert.equal(isQuestAvailable(0, completed), true);
  assert.equal(isQuestAvailable(1, completed), false);
  completed[0] = true;
  assert.equal(isQuestAvailable(1, completed), true);
  assert.equal(isQuestAvailable(5, completed), false);
});

test('quest destinations are far enough apart for meaningful travel', () => {
  assert.equal(WORLD_SIZE.width, 5400);
  assert.equal(WORLD_SIZE.height, 3600);
  assert.equal(WORLD_SCALE, 3);
  assert.ok(distanceBetween(WORLD_SPAWN, QUEST_LOCATIONS[0]) > 1200);
  assert.ok(distanceBetween(WORLD_SPAWN, QUEST_LOCATIONS[1]) > 900, 'the town is separate from the castle home');
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

test('angled world projection and pointer mapping round-trip at different zoom levels', () => {
  const position = { x: 3456, y: 1702 };
  const camera = { x: 1020, y: 440 };
  for (const zoom of [0.65, 1, 1.5]) {
    const restored = unprojectWorld(projectWorld(position, camera, zoom), camera, zoom);
    assert.ok(Math.abs(restored.x - position.x) < 1e-9);
    assert.ok(Math.abs(restored.y - position.y) < 1e-9);
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
