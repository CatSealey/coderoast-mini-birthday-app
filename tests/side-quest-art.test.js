import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSideQuestArt, DAVID_FIGURE_SCALE, drawAbigailDoll, drawDavidGrave } from '../js/side-quest-art.js';
import { ABIGAIL_DOLL, DAVID_GRAVE } from '../js/side-quests.js';
import { createAbigailScene } from '../js/games/abigail-scene.js';
import { interactHouse, newHouseState } from '../js/games/abigail-house.js';

test('Abigail’s doll has a detailed face, braids and dress in a reusable model', () => {
  const art = createSideQuestArt();
  const doll = art.createDoll();
  for (const name of ['dress', 'apron', 'face', 'hair', 'braid--1', 'braid-1', 'eye--1', 'eye-1', 'mouth']) {
    assert.ok(doll.getObjectByName(name), name);
  }
  const bounds = new THREE.Box3().setFromObject(doll);
  assert.ok(bounds.min.y >= 0);
  assert.ok(bounds.max.y < 44);
  assert.ok(bounds.max.x - bounds.min.x < 30);
  doll.updateMatrixWorld(true);
  doll.traverse((part) => {
    if (!part.isMesh) return;
    const positions = part.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i += 1) {
      const point = part.localToWorld(new THREE.Vector3().fromBufferAttribute(positions, i));
      assert.ok(Math.hypot(point.x, point.z) <= ABIGAIL_DOLL.radius, 'doll fits its collision footprint');
    }
  });
  const second = art.createDoll();
  assert.equal(doll.getObjectByName('face').geometry, second.getObjectByName('face').geometry);
  assert.equal(doll.getObjectByName('face').material, second.getObjectByName('face').material);
  art.dispose();
});

test('adult-sized David and the dirt mound fit their collision footprints', () => {
  const art = createSideQuestArt();
  const grave = art.createDavidGrave();
  for (const name of ['grave-soil', 'david-torso', 'david-face', 'david-hair', 'david-mouth',
    'david-eye--1', 'david-eye-1', 'david-arm--1', 'david-arm-1', 'david-leg--1', 'david-leg-1']) {
    assert.ok(grave.getObjectByName(name), name);
  }
  const figure = grave.getObjectByName('david-figure');
  assert.equal(figure.scale.x, DAVID_FIGURE_SCALE);
  const figureBounds = new THREE.Box3().setFromObject(figure);
  assert.ok(figureBounds.max.x - figureBounds.min.x >= 70);
  assert.ok(figureBounds.max.x - figureBounds.min.x <= 80);
  assert.ok(figureBounds.min.x >= -DAVID_GRAVE.width / 2 && figureBounds.max.x <= DAVID_GRAVE.width / 2);
  assert.ok(figureBounds.min.z >= -DAVID_GRAVE.depth / 2 && figureBounds.max.z <= DAVID_GRAVE.depth / 2);
  const mound = grave.getObjectByName('dirt-mound');
  assert.ok(mound);
  const moundBounds = new THREE.Box3().setFromObject(mound);
  assert.ok(moundBounds.max.y >= 10);
  assert.ok(moundBounds.min.x >= -DAVID_GRAVE.mound.width / 2 && moundBounds.max.x <= DAVID_GRAVE.mound.width / 2);
  assert.ok(moundBounds.min.z >= DAVID_GRAVE.mound.offsetY - DAVID_GRAVE.mound.depth / 2);
  assert.ok(moundBounds.max.z <= DAVID_GRAVE.mound.offsetY + DAVID_GRAVE.mound.depth / 2);
  art.dispose();
});

test('illustrated side quest props draw detailed shapes without leaking canvas state', () => {
  for (const draw of [drawAbigailDoll, drawDavidGrave]) {
    const calls = [];
    const ctx = new Proxy({}, {
      get(target, property) { return target[property] ?? ((...args) => calls.push([property, ...args])); }
    });

    draw(ctx);
    assert.deepEqual(calls[0], ['save']);
    assert.deepEqual(calls.at(-1), ['restore']);
    assert.ok(calls.filter(([name]) => name === 'fill' || name === 'fillRect').length >= 5);
  }
});

test('the illustrated doll is still selectable and gives the Abigail quest key', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const context = new Proxy({}, { get: (target, property) => target[property] ?? (() => {}) });
  let click, selected;
  const canvas = {
    getContext: () => context,
    addEventListener: (type, handler) => { if (type === 'click') click = handler; },
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1060 })
  };
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  globalThis.window = { devicePixelRatio: 1, matchMedia: () => ({ matches: false }) };
  try {
    const scene = createAbigailScene(canvas, (value) => { selected = value; });
    scene.resize(1000, 1060);
    const state = { ...newHouseState(), player: { x: -115, y: 100 } };
    scene.draw(state);
    const point = scene.objectPosition('doll');
    click({ clientX: point.x, clientY: point.y });
    assert.deepEqual(selected, { objectId: 'doll' });
    assert.equal(interactHouse(state, selected.objectId).hasKey, true);
    scene.dispose();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
