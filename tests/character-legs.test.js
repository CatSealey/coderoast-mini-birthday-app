import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterLegs } from '../js/games/character-legs.js';
import { CHARACTER_RISE, createCharacterLimbGeometry } from '../js/character-body.js';

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
    const shoe = leg.children[1], boot = leg.children[3];
    assert.equal(leg.position.y, height);
    assert.equal(boot.geometry, limb);
    assert.equal(boot.userData.color, '#594336');
    assert.ok(boot.position.y > shoe.position.y);
    parent.updateMatrixWorld(true);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(shoe).min.y) < 1e-8);
    leg.rotation.x = 0.4;
    assert.equal(boot.parent, leg);
  }
  cube.dispose(); limb.dispose(); material.dispose();
});
