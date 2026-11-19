import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { FRIGHT_OBJECTS, FRIGHT_THEMES, interactFright, newFrightState, restoreFrightState } from '../js/games/fright-logic.js';
import { createFrightMarker, createFrightMarkerGeometries, createFrightMaterial, frightMarkerVisible } from '../js/games/fright-markers.js';

test('markers disappear only after their matching pickup, including after reload', () => {
  const clue = FRIGHT_OBJECTS.find((object) => object.id === 'clue-ai-1');
  const otherClue = FRIGHT_OBJECTS.find((object) => object.id === 'clue-ai-2');
  const tool = FRIGHT_OBJECTS.find((object) => object.id === 'tool-ai');
  const cache = FRIGHT_OBJECTS.find((object) => object.id === 'cache-ai');
  let state = { ...newFrightState(), player: clue.approach };
  assert.ok(frightMarkerVisible(clue, state));
  state = interactFright(state, clue.id);
  assert.equal(frightMarkerVisible(clue, state), false);
  assert.ok(frightMarkerVisible(otherClue, state));
  assert.ok(frightMarkerVisible(tool, state));
  assert.ok(frightMarkerVisible(cache, state));
  state = restoreFrightState(JSON.parse(JSON.stringify(state)));
  assert.equal(frightMarkerVisible(clue, state), false);
  assert.ok(frightMarkerVisible(otherClue, state));
  state = { ...state, tools: ['ai'] };
  assert.equal(frightMarkerVisible(tool, state), false);
  assert.ok(frightMarkerVisible(cache, state));
  state = { ...state, tools: [], collected: ['ai'] };
  assert.equal(frightMarkerVisible(tool, state), false);
  assert.equal(frightMarkerVisible(cache, state), false);
  assert.ok(frightMarkerVisible(FRIGHT_OBJECTS[0], state));
});

test('every clue, tool and reward has a glowing, selectable object marker', () => {
  const geometries = createFrightMarkerGeometries();
  const materials = new Map();
  const material = (color, glow, opacity = 1) => {
    const key = `${color}:${glow}:${opacity}`;
    if (!materials.has(key)) materials.set(key, createFrightMaterial(color, glow, opacity));
    return materials.get(key);
  };
  try {
    const signatures = { tool: new Set(), cache: new Set() };
    for (const object of FRIGHT_OBJECTS.filter(({ theme }) => theme)) {
      const color = FRIGHT_THEMES.find((theme) => theme.id === object.theme).color;
      const marker = createFrightMarker(object, color, geometries, material);
      const hitbox = marker.userData.hitbox;
      const parts = marker.children.filter((child) => child !== hitbox);
      assert.equal(marker.userData.objectId, object.id);
      assert.ok(parts.length >= 4, `${object.id} has recognizable details`);
      assert.ok(parts.some((part) => part.material.emissive.equals(new THREE.Color(color))));
      assert.equal(hitbox.material.opacity, 0);
      assert.deepEqual(hitbox.scale.toArray(), [34, 44, 24]);
      marker.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(new THREE.Vector3(0, 0, 100), new THREE.Vector3(0, 0, -1));
      assert.equal(ray.intersectObject(hitbox)[0]?.object.userData.objectId, object.id);
      const bounds = new THREE.Box3().setFromObject(marker);
      assert.ok(bounds.min.x >= -17 && bounds.max.x <= 17, object.id);
      assert.ok(bounds.min.y >= -22 && bounds.max.y <= 22, object.id);
      if (object.kind !== 'clue') {
        signatures[object.kind].add(JSON.stringify(parts.map((part) => [
          part.geometry.type, ...part.position.toArray(), ...part.scale.toArray()
        ])));
      }
    }
    assert.equal(signatures.tool.size, FRIGHT_THEMES.length);
    assert.equal(signatures.cache.size, FRIGHT_THEMES.length);
  } finally {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    materials.forEach((entry) => entry.dispose());
  }
});
