import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterLegs, createPlayerLegs } from '../js/games/character-legs.js';
import { CHARACTER_RISE, createCharacterLimbGeometry, createCharacterSkinGeometry, createCharacterTorsoGeometry } from '../js/character-body.js';

test('character shoes keep their intended size and move with their legs', () => {
  const parent = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, container) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    container.add(mesh);
    return mesh;
  };
  for (const offset of [6, 7]) {
    const legs = createCharacterLegs(parent, box, offset, '#594336');
    assert.equal(legs.length, 2);
    for (const leg of legs) {
      const shoe = leg.children[1];
      parent.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(shoe);
      const size = bounds.getSize(new THREE.Vector3());
      assert.deepEqual(size.toArray(), [10, 4, 13]);
      assert.equal(bounds.min.y, 0);
      leg.rotation.x = 0.45;
      parent.updateMatrixWorld(true);
      assert.ok(new THREE.Box3().setFromObject(shoe).min.y > -4);
      leg.rotation.x = -Math.PI / 2;
      parent.updateMatrixWorld(true);
      assert.ok(new THREE.Box3().setFromObject(shoe).min.y > 0);
    }
    legs.forEach((leg) => parent.remove(leg));
  }
  geometry.dispose();
  material.dispose();
});

test('longer legs keep fitted boots grounded and attached to the walking limbs', () => {
  const parent = new THREE.Group(), cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry();
  const material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, container) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth); part.userData.color = color;
    container.add(part); return part;
  };
  const height = 22 + CHARACTER_RISE;
  const legs = createCharacterLegs(parent, box, 7, '#594336', '#263d30', limb, { height });
  for (const leg of legs) {
    const shoe = leg.children[1], boot = leg.children.find((part, index) => index > 1 && part.userData.color === '#594336');
    assert.equal(leg.position.y, height);
    assert.equal(boot.geometry, limb);
    assert.equal(boot.userData.color, '#594336');
    assert.ok(boot.position.y > shoe.position.y);
    parent.updateMatrixWorld(true);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(shoe).min.y) < 1e-8);
    const shoeSize = new THREE.Box3().setFromObject(shoe).getSize(new THREE.Vector3());
    assert.ok(shoeSize.z > shoeSize.x && shoeSize.y < shoeSize.x);
    leg.rotation.x = 0.4;
    assert.equal(boot.parent, leg);
  }
  cube.dispose(); limb.dispose(); material.dispose();
});

test('pelvis joins the torso to both legs while the legs remain animated', () => {
  const parent = new THREE.Group(), cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry();
  const torsoGeometry = createCharacterTorsoGeometry(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const box = (x, y, z, width, height, depth, color, container) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth); container.add(part); return part;
  };
  const height = 22 + CHARACTER_RISE;
  const torso = new THREE.Mesh(torsoGeometry, material);
  torso.position.y = 39 + CHARACTER_RISE; torso.scale.set(26, 38, 17); parent.add(torso);
  const legs = createCharacterLegs(parent, box, 7, '#594336', '#263d30', limb, { height });
  const hips = parent.children.find((part) => part.isMesh && part.geometry === limb);
  parent.updateMatrixWorld(true);
  assert.ok(new THREE.Box3().setFromObject(hips).intersectsBox(new THREE.Box3().setFromObject(torso)));
  for (const leg of legs) {
    const ray = new THREE.Raycaster(new THREE.Vector3(leg.position.x, height - 1, 100), new THREE.Vector3(0, 0, -1));
    assert.ok(ray.intersectObject(hips).length && ray.intersectObject(leg.children[0]).length);
    leg.rotation.x = 0.4;
    assert.equal(hips.parent, parent);
    assert.equal(leg.children[0].parent, leg);
  }
  cube.dispose(); limb.dispose(); torsoGeometry.dispose(); material.dispose();
});

test('player knees and ankles stay connected and shoes have an instep and heel', () => {
  const cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const material = new THREE.MeshBasicMaterial();
  for (const [height, width, depth] of [[30, 9, 10], [31, 9, 10], [32, 7, 8], [33, 9, 10]]) {
    const parent = new THREE.Group();
    const box = (x, y, z, w, h, d, color, owner) => {
      const part = new THREE.Mesh(cube, material); part.position.set(x, y, z); part.scale.set(w, h, d);
      part.userData.color = color; owner.add(part); return part;
    };
    const legs = createPlayerLegs(parent, box, { offset: 6, height, width, depth,
      shoeColor: '#594336', shortsColor: '#141619', skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin });
    for (const leg of legs) {
      const [shorts, , knee, calf, ankle] = leg.children;
      const shoe = leg.children.find((part) => part.userData.color === '#594336');
      const instep = leg.children.find((part) => part !== shoe && part.userData.color === '#594336');
      const heel = leg.children.find((part) => part.userData.color === '#302925');
      parent.updateMatrixWorld(true);
      const bounds = (part) => new THREE.Box3().setFromObject(part);
      assert.ok(bounds(knee).intersectsBox(bounds(shorts)) && bounds(knee).intersectsBox(bounds(calf)));
      assert.ok(bounds(ankle).intersectsBox(bounds(calf)) && bounds(ankle).intersectsBox(bounds(instep)));
      assert.ok(bounds(knee).max.z > bounds(calf).max.z && ankle.scale.x < calf.scale.x);
      assert.ok(bounds(heel).intersectsBox(bounds(shoe)) && bounds(instep).intersectsBox(bounds(shoe)));
      assert.ok(Math.abs(bounds(shoe).min.y) < 1e-8);
    }
  }
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});
