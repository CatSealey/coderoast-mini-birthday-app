import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDeathAngelArt, DEATH_ANGEL_BASE_DEPTH, DEATH_ANGEL_BASE_WIDTH, DEATH_ANGEL_HEIGHT } from '../js/world/death-angel.js';
import { STATUE_RADIUS } from '../js/world/chimy-chase.js';
import { createChimychompArt } from '../js/world/chimychomp-art.js';
import { configureWorldCamera } from '../js/world/world-3d.js';

test('death angel has a hooded stone figure behind a carved grave marker', () => {
  const art = createDeathAngelArt();
  const model = art.createModel();
  const hood = model.getObjectByName('hood');
  const grave = model.getObjectByName('grave-marker');
  const base = model.getObjectByName('stone-base');
  assert.ok(hood && grave && base);
  assert.ok(hood.position.y > grave.position.y + 43);
  assert.ok(hood.position.z < grave.position.z);
  assert.equal(grave.geometry.type, 'ExtrudeGeometry');
  assert.ok(model.children.some((mesh) => mesh.material.map?.isDataTexture));
  assert.ok(model.children.filter((mesh) => mesh.geometry.type === 'CylinderGeometry').length > 10);
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(bounds.max.y <= DEATH_ANGEL_HEIGHT + 0.1);
  assert.ok(Math.hypot(DEATH_ANGEL_BASE_WIDTH / 2, DEATH_ANGEL_BASE_DEPTH / 2) <= STATUE_RADIUS);
  assert.ok(bounds.max.x <= DEATH_ANGEL_BASE_WIDTH / 2);
  assert.ok(bounds.min.x >= -DEATH_ANGEL_BASE_WIDTH / 2);
  art.dispose();
});

test('the 3D statue is clickable from its stone base to the top of its hood', () => {
  const scene = new THREE.Scene();
  const art = createChimychompArt(scene);
  const position = { x: 2500, y: 2000 };
  art.update({ defeated: [], statues: [{ ...position, keepsakes: [0] }] }, null, 0);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  const width = 800, height = 500;
  configureWorldCamera(camera, width, height, 1, position);
  for (const heightOfPoint of [0, 35, DEATH_ANGEL_HEIGHT]) {
    const projected = new THREE.Vector3(position.x, heightOfPoint, position.y).project(camera);
    const point = { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
    assert.equal(art.statueAt(point, camera, width, height), 0);
  }
  assert.equal(art.statueAt({ x: 0, y: 0 }, camera, width, height), -1);
  art.dispose();
});
