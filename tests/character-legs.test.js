import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterLegs } from '../js/games/character-legs.js';

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
