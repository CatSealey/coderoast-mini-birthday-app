import test from 'node:test';
import assert from 'node:assert/strict';
import { CHIMYCHOMPS, carriedKeepsakes, explodeChomp, recoverStatue, restoreEncounters } from '../js/world/chimychomps.js';
import { CHOMPY_CONTACT_RADIUS, CHOMPY_DETECTION_RADIUS, CHOMPY_ESCAPE_RADIUS, CHOMPY_RADIUS, CHOMPY_SCALE, CHOMPY_SPEED, PLAYER_WALK_SPEED, STATUE_RADIUS, chompyContact, createChompyStates, encounterCollision, safeRespawn, stepChompy } from '../js/world/chimy-chase.js';
import { createCollision, findWorldPath, worldObstacles } from '../js/world/world-collision.js';
import { WORLD_REGIONS, regionBlendAt } from '../js/world/world-regions.js';
import { CASTLE_ENTRANCE, QUEST_LOCATIONS, WORLD_SPAWN } from '../js/world/world-data.js';
import { WORLD_NPCS } from '../js/world/world-npcs.js';

test('three creatures occupy each region in reachable, clear and safe locations', () => {
  const obstacles = worldObstacles();
  const creatureClearance = createCollision(obstacles, 60);
  const playerCollision = createCollision(obstacles, 12);
  for (const region of WORLD_REGIONS) {
    const creatures = CHIMYCHOMPS.filter((creature) => creature.region === region.id);
    assert.equal(creatures.length, 3);
    for (const creature of creatures) {
      assert.equal(regionBlendAt(creature).region.id, region.id);
      assert.equal(creatureClearance.blocked(creature), false);
      assert.ok(Math.hypot(creature.x - WORLD_SPAWN.x, creature.y - WORLD_SPAWN.y) >= 400);
      assert.ok(Math.hypot(creature.x - CASTLE_ENTRANCE.x, creature.y - CASTLE_ENTRANCE.y) >= 350);
      for (const point of [...QUEST_LOCATIONS, ...QUEST_LOCATIONS.map((quest) => quest.entrance), ...WORLD_NPCS]) {
        assert.ok(Math.hypot(creature.x - point.x, creature.y - point.y) >= 180);
      }
      const path = findWorldPath(WORLD_SPAWN, creature, playerCollision);
      assert.ok(path);
      assert.equal(path.at(-1).x, creature.x);
      assert.equal(path.at(-1).y, creature.y);
    }
  }
});

test('contact checks swept motion of both the player and a moving creature', () => {
  assert.equal(chompyContact({ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 100, y: 0 }, { x: 40, y: 0 }), true);
  assert.equal(chompyContact({ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 100, y: 100 }, { x: 40, y: 100 }), false);
});

test('a smaller chomp detects, chases faster than the player, then returns after escape', () => {
  assert.ok(CHOMPY_SCALE <= 0.6);
  assert.ok(CHOMPY_SPEED > PLAYER_WALK_SPEED);
  assert.ok(CHOMPY_ESCAPE_RADIUS > CHOMPY_DETECTION_RADIUS);
  const collision = createCollision([], CHOMPY_RADIUS);
  const chomp = createChompyStates()[0];
  const player = { x: chomp.x + CHOMPY_DETECTION_RADIUS - 10, y: chomp.y };
  const start = chomp.x;
  stepChompy(chomp, player, 0.1, 1000, collision);
  assert.equal(chomp.mode, 'chase');
  assert.ok(Math.abs(chomp.x - start - CHOMPY_SPEED * 0.1) < 1e-6);
  stepChompy(chomp, { x: chomp.x + CHOMPY_ESCAPE_RADIUS + 1, y: chomp.y }, 0.1, 1700, collision);
  assert.equal(chomp.mode, 'return');
  assert.ok(chomp.x < start + CHOMPY_SPEED * 0.1);
  for (let i = 0; i < 10; i += 1) {
    stepChompy(chomp, { x: start + 1000, y: chomp.y }, 0.1, 2400 + 100 * i, collision);
  }
  assert.equal(chomp.mode, 'idle');
  assert.equal(chomp.x, start);
});

test('chomp pursues around scenery without crossing it or passing through the player', () => {
  const collision = createCollision([{ x: 590, y: 500, width: 30, depth: 100 }], CHOMPY_RADIUS);
  const chomp = { id: 'test', x: 500, y: 500, home: { x: 500, y: 500 }, mode: 'idle', path: [], nextPlan: 0, facing: 0 };
  const player = { x: 680, y: 500 };
  for (let i = 0; i < 100; i += 1) {
    const before = { ...chomp };
    stepChompy(chomp, player, 0.05, i * 50 + 1, collision);
    assert.ok(collision.clearSegment(before, chomp));
    assert.ok(Math.hypot(chomp.x - player.x, chomp.y - player.y) >= CHOMPY_CONTACT_RADIUS - 1e-6);
    if (chompyContact(player, player, before, chomp)) break;
  }
  assert.ok(Math.hypot(chomp.x - player.x, chomp.y - player.y) <= CHOMPY_CONTACT_RADIUS + 1e-6);
});

test('statues and creatures block player movement and castle respawn avoids occupied space', () => {
  const base = createCollision([], 12);
  const creature = { x: 200, y: 200 };
  const statue = { x: 300, y: 200 };
  const collision = encounterCollision(base, [creature], [statue], 12);
  assert.ok(collision.blocked(creature));
  assert.ok(collision.blocked(statue));
  assert.equal(collision.clearSegment({ x: 150, y: 200 }, { x: 250, y: 200 }), false);
  assert.equal(collision.clearSegment({ x: 250, y: 200 }, { x: 350, y: 200 }), false);
  assert.ok(STATUE_RADIUS > 0);
  const spawn = safeRespawn(statue, collision);
  assert.equal(collision.blocked(spawn), false);
});

test('active creatures leave safe routes to all quest guides and entrances', () => {
  const collision = createCollision([
    ...worldObstacles(),
    ...CHIMYCHOMPS.map(({ x, y }) => ({ x, y, radius: CHOMPY_RADIUS }))
  ], 12);
  for (const quest of QUEST_LOCATIONS) {
    for (const target of [quest, quest.entrance]) {
      const path = findWorldPath(WORLD_SPAWN, target, collision);
      assert.ok(path, `No safe route to ${quest.name}`);
      const endpoint = path.at(-1);
      assert.ok(Math.hypot(endpoint.x - target.x, endpoint.y - target.y) < 74);
    }
  }
  for (const [index, creature] of CHIMYCHOMPS.entries()) {
    for (const other of CHIMYCHOMPS.slice(index + 1)) {
      assert.ok(Math.hypot(creature.x - other.x, creature.y - other.y) > 4 * CHOMPY_CONTACT_RADIUS);
    }
  }
});

test('deaths drop only carried keepsakes and preserve multiple statues until recovered', () => {
  const completed = [true, true, false, false, false];
  const displays = [true, false, false, false, false];
  const position = { x: 2000, y: 2050 };
  let state = explodeChomp({ defeated: [], statues: [] }, CHIMYCHOMPS[0], position, completed, displays);
  assert.deepEqual(state.statues, [{ ...position, keepsakes: [1] }]);
  assert.deepEqual(carriedKeepsakes(completed, displays, state), [false, false, false, false, false]);
  completed[2] = true;
  state = explodeChomp(state, CHIMYCHOMPS[1], { x: 2640, y: 2450 }, completed, displays);
  assert.deepEqual(state.statues.map((statue) => statue.keepsakes), [[1], [2]]);
  state = recoverStatue(state, 0);
  assert.deepEqual(carriedKeepsakes(completed, displays, state), [false, true, false, false, false]);
  state = explodeChomp(state, CHIMYCHOMPS[2], position, completed, displays);
  assert.deepEqual(state.statues.map((statue) => statue.keepsakes), [[2], [1]]);
  assert.throws(() => explodeChomp(state, CHIMYCHOMPS[0], position, completed, displays), RangeError);
});

test('a death without carried keepsakes creates no empty statue', () => {
  const state = explodeChomp({ defeated: [], statues: [] }, CHIMYCHOMPS[0], WORLD_SPAWN,
    [true, false], [true, false]);
  assert.deepEqual(state.statues, []);
  assert.deepEqual(state.defeated, [CHIMYCHOMPS[0].id]);
});

test('restore validates saved encounters, removes duplicates and prunes removed or displayed quests', () => {
  const saved = {
    defeated: [CHIMYCHOMPS[0].id, CHIMYCHOMPS[0].id, 'invalid'],
    statues: [
      { x: 100, y: 200, keepsakes: [0, 1, 1, 2, 4, -1] },
      { x: 200, y: 300, keepsakes: [1, 3] },
      { x: -1, y: 0, keepsakes: [3] }
    ]
  };
  const restored = restoreEncounters(saved, [true, true, true, true, false], [true, false, false, false, false]);
  assert.deepEqual(restored, {
    defeated: [CHIMYCHOMPS[0].id],
    statues: [{ x: 100, y: 200, keepsakes: [1, 2] }, { x: 200, y: 300, keepsakes: [3] }]
  });
  assert.deepEqual(restoreEncounters(restored, [true, false, true, true, false], [true, false, false, false, false]).statues,
    [{ x: 100, y: 200, keepsakes: [2] }, { x: 200, y: 300, keepsakes: [3] }]);
});
