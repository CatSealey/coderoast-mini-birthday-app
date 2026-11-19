import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterLegs, createFootSupportSurface, createPlayerLegs, supportCharacterFeet, swingCharacterLegs } from '../js/games/character-legs.js';
import { createCharacterLimbGeometry, createCharacterSkinGeometry } from '../js/character-body.js';
import { HALL_EXIT_MAT, hallExitMatIntersectsFoot } from '../js/games/trophy-logic.js';
import { createHallExitMatGeometry } from '../js/games/castle-interior-art.js';
import { createBirthdayDogModel } from '../js/games/birthday-dog.js';

test('each foot rests on raised surfaces without changing the walking or accumulating lift', () => {
  const cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth); owner.add(part); return part;
  };
  for (const player of [false, true]) {
    for (const scale of [0.7, 1]) {
      const scene = new THREE.Group(), character = new THREE.Group(), surfaceParent = new THREE.Group();
      scene.add(character, surfaceParent); character.scale.setScalar(scale);
      const legs = player
        ? createPlayerLegs(character, box, { offset: 7, height: 31, width: 9, depth: 10,
          shoeColor: '#594336', shortsColor: '#141619', skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin })
        : createCharacterLegs(character, box, 7, '#594336', '#263d30', limb, { height: 31 });
      const platform = box(10, 2.75, 0, 20, 5.5, 100, '#888888', surfaceParent);
      const surface = createFootSupportSurface(platform);
      for (const yaw of [0, Math.PI / 4, Math.PI / 2]) {
        character.rotation.y = yaw;
        for (const x of [-25, -10, 0, 10, 25]) {
          character.position.x = x;
          for (const phase of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
            swingCharacterLegs(legs, phase, true);
            scene.updateMatrixWorld(true);
            const before = legs.map((leg) => new THREE.Box3().setFromObject(leg.userData.foot));
            const animated = legs.map((leg) => leg.position.y);
            supportCharacterFeet(legs, [surface]);
            scene.updateMatrixWorld(true);
            const supported = legs.map((leg) => new THREE.Box3().setFromObject(leg.userData.foot));
            for (let i = 0; i < legs.length; i += 1) {
              const over = before[i].max.x >= surface.bounds.min.x && before[i].min.x <= surface.bounds.max.x
                && before[i].max.z >= surface.bounds.min.z && before[i].min.z <= surface.bounds.max.z;
              const expected = over ? Math.max(before[i].min.y, 5.5) : before[i].min.y;
              assert.ok(Math.abs(supported[i].min.y - expected) < 1e-8);
              assert.ok(Math.abs(legs[i].position.y - animated[i] - (expected - before[i].min.y) / scale) < 1e-8);
            }
            const lifted = legs.map((leg) => leg.position.y);
            supportCharacterFeet(legs, [surface]);
            assert.ok(legs.every((leg, index) => Math.abs(leg.position.y - lifted[index]) < 1e-8));
          }
        }
      }
      surfaceParent.visible = false;
      swingCharacterLegs(legs, 0, false);
      supportCharacterFeet(legs, [surface]);
      assert.ok(legs.every((leg) => leg.userData.surfaceLift === 0), 'hidden mats do not support feet');
    }
  }
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});

test('hall exit support follows the curved mat rather than its bounding rectangle', () => {
  const geometry = createHallExitMatGeometry(), material = new THREE.MeshBasicMaterial();
  const mat = new THREE.Mesh(geometry, material);
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(HALL_EXIT_MAT.x, 2.8, HALL_EXIT_MAT.z);
  const surface = createFootSupportSurface(mat, hallExitMatIntersectsFoot);
  assert.ok(Math.abs(surface.bounds.max.y - 2.8) < 1e-8);
  const foot = (x, z) => new THREE.Box3(new THREE.Vector3(x - 2, 0, z - 2), new THREE.Vector3(x + 2, 2, z + 2));
  assert.equal(hallExitMatIntersectsFoot(foot(HALL_EXIT_MAT.x, HALL_EXIT_MAT.z)), true);
  assert.equal(hallExitMatIntersectsFoot(foot(HALL_EXIT_MAT.x + 73, HALL_EXIT_MAT.z - 34)), false);
  assert.equal(hallExitMatIntersectsFoot(foot(HALL_EXIT_MAT.x, HALL_EXIT_MAT.z + 42)), false);
  assert.equal(hallExitMatIntersectsFoot(foot(HALL_EXIT_MAT.x + 76, HALL_EXIT_MAT.z + 34)), true);
  geometry.dispose(); material.dispose();
});

test('dog paws and overlapping surfaces use the highest visible support and release it on exit', () => {
  const cube = new THREE.BoxGeometry(), orb = new THREE.SphereGeometry(0.5), material = new THREE.MeshBasicMaterial();
  const part = (geometry, x, y, z, width, height, depth, color, owner) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.scale.set(width, height, depth); owner.add(mesh); return mesh;
  };
  const box = (x, y, z, width, height, depth, color, owner) => part(cube, x, y, z, width, height, depth, color, owner);
  const scene = new THREE.Group(), lower = new THREE.Group(), upper = new THREE.Group();
  scene.add(lower, upper);
  const surfaces = [
    createFootSupportSurface(box(0, 1, 0, 100, 2, 100, '#fff', lower)),
    createFootSupportSurface(box(0, 2, 0, 100, 4, 100, '#fff', upper))
  ];
  const { model, legs } = createBirthdayDogModel(box, part, orb);
  scene.add(model); model.scale.setScalar(0.8);
  supportCharacterFeet(legs, surfaces);
  scene.updateMatrixWorld(true);
  for (const leg of legs) assert.ok(Math.abs(new THREE.Box3().setFromObject(leg.userData.foot).min.y - 4) < 1e-8);
  upper.visible = false;
  supportCharacterFeet(legs, surfaces);
  scene.updateMatrixWorld(true);
  for (const leg of legs) assert.ok(Math.abs(new THREE.Box3().setFromObject(leg.userData.foot).min.y - 2) < 1e-8);
  model.position.x = 200;
  supportCharacterFeet(legs, surfaces);
  assert.ok(legs.every((leg) => Math.abs(leg.position.y - 15) < 1e-8));
  cube.dispose(); orb.dispose(); material.dispose();
});
