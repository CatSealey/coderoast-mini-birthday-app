import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { nearTrophyExit, placeKeepsake, presentAvailable, restoreDisplays, restoreTrophyQuest, TROPHY_EXIT } from '../js/games/trophy-logic.js';
import { createTrophyModel } from '../js/games/trophy-models.js';
import { createCollision, findWorldPath } from '../js/world/world-collision.js';

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

test('all five keepsakes have distinct physical models', () => {
  const material = new THREE.MeshBasicMaterial();
  const models = Array.from({ length: 5 }, (_, index) => createTrophyModel(index, () => material));
  assert.ok(models.every((model) => model.children.length >= 4
    && model.children.every((part) => part.isMesh && part.geometry.isBufferGeometry)));
  assert.notDeepEqual(models.map((model) => model.children.length), Array(5).fill(models[0].children.length));
  assert.throws(() => createTrophyModel(5, () => material), RangeError);
  models.forEach((model) => model.children.forEach((part) => part.geometry.dispose()));
  material.dispose();
});

test('the hall exit is reachable from inside without walking through its wall', () => {
  const collision = createCollision([
    { x: TROPHY_EXIT.x, y: TROPHY_EXIT.z, width: 94, depth: 14 },
    { x: 115, y: 250, width: 52, depth: 52 },
    { x: 85, y: 330, width: 76, depth: 50 }
  ], 10);
  const start = { x: 400, y: 490 }, approach = { x: TROPHY_EXIT.x, y: TROPHY_EXIT.z - 55 };
  const path = findWorldPath(start, approach, collision);
  assert.ok(path);
  const end = path.at(-1);
  assert.equal(nearTrophyExit({ x: end.x, z: end.y }), true);
  assert.equal(nearTrophyExit({ x: 400, z: 490 }), false);
  assert.equal(collision.blocked({ x: TROPHY_EXIT.x, y: TROPHY_EXIT.z }), true);
});
