import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { HALL_CENTER, HALL_EXIT_MAT, HALL_WIDTH, isOnHallExitMat, nearTrophyExit, placeKeepsake, presentAvailable, restoreBirthdayGuests, restoreDisplays, restoreTrophyQuest, TROPHY_EXIT } from '../js/games/trophy-logic.js';
import { createTrophyModel } from '../js/games/trophy-models.js';
import { createCollision, findWorldPath } from '../js/world/world-collision.js';
import { HALL_BOOKCASE_WIDTH, HALL_BOOKCASE_X, HALL_BOOKCASE_Z } from '../js/games/castle-interior-art.js';

test('earned keepsakes must be placed individually before the present appears', () => {
  const completed = [true, true, true, true, true];
  let displays = restoreDisplays(null, completed);
  assert.deepEqual(displays, [false, false, false, false, false]);
  for (let index = 0; index < 5; index += 1) {
    assert.equal(presentAvailable(displays, completed), false);
    displays = placeKeepsake(displays, completed, index);
  }
  assert.equal(presentAvailable(displays, completed), true);
  assert.deepEqual(restoreDisplays(JSON.parse(JSON.stringify(displays)), completed), displays);
});

test('unearned, removed and invalid keepsakes cannot unlock the present', () => {
  const completed = [true, false, true, true, true];
  const displays = restoreDisplays([true, true, true, true, true], completed);
  assert.deepEqual(displays, [true, false, true, true, true]);
  assert.deepEqual(placeKeepsake(displays, completed, 1), displays);
  assert.deepEqual(placeKeepsake(displays, completed, 5), displays);
  assert.equal(presentAvailable(displays, completed), false);
  assert.equal(presentAvailable([true], [true]), false);
  const replayed = [true, true, true, true, true];
  assert.equal(presentAvailable(displays, replayed), false);
  assert.equal(presentAvailable(placeKeepsake(displays, replayed, 1), replayed), true);
});

test('old displayed keepsakes retain access while new players must accept the hall quest', () => {
  assert.deepEqual(restoreTrophyQuest(null, [false, false, false, false, false]), { accepted: false, completed: false });
  assert.deepEqual(restoreTrophyQuest(null, [true, false, false, false, false]), { accepted: true, completed: false });
  assert.deepEqual(restoreTrophyQuest({ accepted: false, completed: true }, []), { accepted: true, completed: true });
});

test('family presence restores only for a valid completed hall and supports legacy saves', () => {
  const completed = Array(5).fill(true), displays = Array(5).fill(true);
  const quest = { accepted: true, completed: true };
  assert.equal(restoreBirthdayGuests(true, quest, displays, completed), true);
  assert.equal(restoreBirthdayGuests(false, quest, displays, completed), false);
  assert.equal(restoreBirthdayGuests(undefined, quest, displays, completed), true);
  assert.equal(restoreBirthdayGuests(null, quest, displays, completed), false);
  assert.equal(restoreBirthdayGuests(true, { accepted: true, completed: false }, displays, completed), false);
  assert.equal(restoreBirthdayGuests(true, quest, [false, ...displays.slice(1)], completed), false);
  assert.equal(restoreBirthdayGuests(true, quest, displays, [false, ...completed.slice(1)]), false);
});

test('all five keepsakes have distinct physical models', () => {
  const material = new THREE.MeshBasicMaterial();
  const vertexColorRequests = [];
  const models = Array.from({ length: 5 }, (_, index) => createTrophyModel(index, (color, emissive, vertexColors) => {
    if (vertexColors) vertexColorRequests.push({ index, color, emissive });
    return material;
  }));
  assert.ok(models.every((model) => model.children.length >= 4
    && model.children.every((part) => part.isMesh && part.geometry.isBufferGeometry)));
  assert.notDeepEqual(models.map((model) => model.children.length), Array(5).fill(models[0].children.length));
  assert.ok(models.every((model) => model.children.length >= 15), 'each keepsake has layered decorative details');
  const pumpkin = models[4].children.find((part) => part.geometry.getAttribute('color'));
  assert.ok(pumpkin, 'the pumpkin reuses the ribbed, vertex-colored harvest geometry');
  assert.equal(pumpkin.geometry.getAttribute('position').count, 833);
  assert.deepEqual(vertexColorRequests, [{ index: 4, color: '#ffffff', emissive: false }]);
  for (const model of models) {
    const bounds = new THREE.Box3().setFromObject(model);
    assert.ok(bounds.min.x > -34 && bounds.max.x < 34 && bounds.min.y >= 75 && bounds.max.y <= 158,
      'the embellished keepsake stays inside its display');
  }
  assert.throws(() => createTrophyModel(5, () => material), RangeError);
  models.forEach((model) => model.children.forEach((part) => part.geometry.dispose()));
  material.dispose();
});

test('the hall exit is reachable from inside without walking through its wall', () => {
  const collision = createCollision([
    ...HALL_BOOKCASE_X.flatMap((x) => HALL_BOOKCASE_Z.map((z) => ({ x, y: z + 3, width: HALL_BOOKCASE_WIDTH, depth: 24 }))),
    { x: 205, y: 330, width: 76, depth: 50 },
    { x: HALL_CENTER, y: 0, width: HALL_WIDTH, depth: 120 },
    { x: HALL_CENTER, y: 600, width: HALL_WIDTH, depth: 50 },
    { x: 0, y: 300, width: 50, depth: 600 },
    { x: HALL_WIDTH, y: 300, width: 50, depth: 600 }
  ], 10);
  assert.equal(HALL_WIDTH, 1040);
  assert.equal(TROPHY_EXIT.x, HALL_CENTER);
  assert.equal(HALL_EXIT_MAT.x, HALL_CENTER);
  assert.equal(HALL_EXIT_MAT.z + HALL_EXIT_MAT.depth / 2, 596);
  assert.ok(isOnHallExitMat(HALL_CENTER, HALL_EXIT_MAT.z));
  assert.ok(!isOnHallExitMat(HALL_CENTER + HALL_EXIT_MAT.width / 2, HALL_EXIT_MAT.z));
  assert.ok(!isOnHallExitMat(HALL_CENTER, HALL_EXIT_MAT.z + HALL_EXIT_MAT.depth));
  const start = { x: HALL_CENTER, y: 490 }, approach = { x: TROPHY_EXIT.x, y: TROPHY_EXIT.z - 55 };
  const path = findWorldPath(start, approach, collision);
  assert.ok(path);
  const end = path.at(-1);
  assert.equal(nearTrophyExit({ x: end.x, z: end.y }), true);
  assert.equal(nearTrophyExit({ x: HALL_CENTER, z: 490 }), false);
  assert.equal(collision.blocked({ x: HALL_EXIT_MAT.x, y: HALL_EXIT_MAT.z }), false, 'the exit mat is walkable');
  assert.equal(collision.blocked({ x: TROPHY_EXIT.x, y: TROPHY_EXIT.z }), true);
  for (const x of [130, HALL_WIDTH - 130]) {
    const destination = { x, y: 300 };
    const route = findWorldPath(start, destination, collision);
    assert.ok(route);
    assert.deepEqual(route.at(-1), destination, 'the widened side of the hall is reachable');
  }
  for (const x of HALL_BOOKCASE_X) for (const z of HALL_BOOKCASE_Z) {
    assert.equal(collision.blocked({ x, y: z + 3 }), true);
  }
});
