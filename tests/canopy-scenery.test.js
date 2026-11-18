import test from 'node:test';
import assert from 'node:assert/strict';
import { CANOPY_EDGE_TREES, CANOPY_FOREST_TREES } from '../js/games/canopy-scenery.js';
import { createCanopyRopes, drawCanopyCrossing, drawCanopyRope } from '../js/games/canopy-rope.js';
import { CANOPY_LIGHT_COLORS, canopyLanternColor, canopyPlatformLightColor, drawCanopyLight } from '../js/games/canopy-lights.js';
import { CANOPY_FOREST_LIGHT_COLORS, CANOPY_FOREST_LIGHTS, createCanopyForestLights, drawCanopyForest } from '../js/games/canopy-tree-lights.js';
import * as THREE from 'three';
import { createFirCanopy, createPlatformFirTrunk } from '../js/world/fir-tree.js';
import { createTreeBarkTexture } from '../js/world/tree-geometry.js';
import { createCanopyDeckTexture, drawCanopyDeck, drawCanopyPlatformFace } from '../js/world/canopy-platform.js';
import { CANOPY_COURSE_LENGTH, CANOPY_CROSSINGS, CANOPY_PLATFORMS } from '../js/games/adventure-logic.js';

test('quest firs cover the extended forest and line the course platforms', () => {
  const expectedForest = [];
  for (let x = 25; x < CANOPY_COURSE_LENGTH; x += 80) for (let z = 35; z < 700; z += 90) expectedForest.push([x, z]);
  const expectedEdge = [];
  for (const x of [100, 270, ...CANOPY_PLATFORMS.slice(1).map((platform) => (platform.left + platform.right) / 2)]) {
    for (const z of [70, 620]) expectedEdge.push([x, z]);
  }
  assert.deepEqual(CANOPY_FOREST_TREES.map(({ x, z }) => [x, z]), expectedForest);
  assert.deepEqual(CANOPY_EDGE_TREES.map(({ x, z }) => [x, z]), expectedEdge);
  for (let variant = 0; variant < 3; variant += 1) {
    const canopy = createFirCanopy(variant), trunk = createPlatformFirTrunk(variant);
    canopy.computeBoundingBox(); trunk.computeBoundingBox();
    const height = variant === 1 ? 1.08 : 1;
    assert.ok(35 + canopy.boundingBox.min.y * 1.15 / height > 80);
    assert.ok(35 + canopy.boundingBox.max.y * 1.15 / height < 245);
    assert.ok(-100 + trunk.boundingBox.max.y * 260 / (165 * (1 + (variant - 1) * 0.025)) >= 155);
    canopy.dispose(); trunk.dispose();
  }
});

test('shared bark texture is generated and reports canvas failures', () => {
  const previousDocument = globalThis.document;
  let strokes = 0;
  try {
    globalThis.document = { createElement: () => ({ getContext: () => ({
      fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { strokes += 1; }
    }) }) };
    const texture = createTreeBarkTexture();
    assert.equal(texture.image.width, 256);
    assert.equal(texture.image.height, 512);
    assert.equal(strokes, 120);
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createTreeBarkTexture(), /tree bark texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('canopy decks share detailed planks while retaining distinct locked and varied tones', () => {
  const rectangles = [], strokes = [];
  const ctx = {
    fillRect(...rect) { rectangles.push({ rect, color: this.fillStyle }); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() { strokes.push(this.strokeStyle); }
  };
  drawCanopyDeck(ctx, 10, 20, 140, 170);
  assert.equal(strokes.length, 21);
  const boardColors = rectangles.filter(({ rect }) => rect[2] === 20 && rect[3] === 170).map(({ color }) => color);
  assert.equal(boardColors.length, 7);
  assert.ok(new Set(boardColors).size > 1);
  assert.ok(rectangles.every(({ rect: [x, y, w, h] }) => x >= 10 && y >= 20 && x + w <= 150 && y + h <= 190));
  rectangles.length = 0;
  drawCanopyDeck(ctx, 10, 20, 140, 170, { variant: 1, tone: 'locked' });
  assert.notEqual(rectangles[0].color, boardColors[0]);
  assert.throws(() => drawCanopyDeck(ctx, 0, 0, 10, 10, { tone: 'unknown' }), /Unknown canopy deck tone/);
  rectangles.length = 0;
  drawCanopyPlatformFace(ctx, 0, 0, 98, 11);
  assert.ok(rectangles.length > 10);
});

test('canopy deck texture is created and reports canvas failures', () => {
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { createElement: () => ({ getContext: () => ({
      fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}
    }) }) };
    const texture = createCanopyDeckTexture();
    assert.equal(texture.image.width, 512);
    assert.equal(texture.image.height, 512);
    assert.equal(texture.colorSpace, 'srgb');
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createCanopyDeckTexture(), /canopy deck texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('canopy ropes are round, textured, aligned and dispose their shared resources', () => {
  const previousDocument = globalThis.document;
  const strokes = [];
  try {
    globalThis.document = { createElement: () => ({ getContext: () => ({
      fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { strokes.push(this.strokeStyle); }
    }) }) };
    const scene = new THREE.Scene(), ropes = createCanopyRopes(scene, 8);
    const first = ropes.add([0, 0, 0], [100, 50, 0], 5);
    const second = ropes.add([0, 0, 4], [100, 50, 4], 5);
    assert.ok(first.geometry instanceof THREE.CylinderGeometry);
    assert.equal(first.geometry, second.geometry);
    assert.equal(first.material, second.material);
    assert.equal(first.material.map.wrapS, THREE.RepeatWrapping);
    assert.equal(first.material.map.wrapT, THREE.RepeatWrapping);
    assert.equal(first.material.map.colorSpace, THREE.SRGBColorSpace);
    assert.ok(new Set(strokes).size >= 3);
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(first.quaternion);
    assert.ok(axis.distanceTo(new THREE.Vector3(100, 50, 0).normalize()) < 1e-10);
    assert.deepEqual(first.position.toArray(), [50, 25, 0]);
    assert.ok(Math.max(...first.geometry.attributes.uv.array) > 1, 'rope twists repeat along its length');
    let disposed = 0;
    for (const resource of [first.geometry, first.material, first.material.map]) resource.addEventListener('dispose', () => { disposed += 1; });
    ropes.dispose();
    assert.equal(disposed, 3);
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createCanopyRopes(scene, 1), /canopy rope texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('illustrated crossings use layered, twisted ropes for their net and bridge', () => {
  const strokes = [];
  const ctx = {
    beginPath() {}, moveTo() {}, lineTo() {},
    stroke() { strokes.push({ color: this.strokeStyle, width: this.lineWidth }); }
  };
  drawCanopyRope(ctx, 0, 0, 100, 0, 5);
  assert.deepEqual(strokes.map(({ color }) => color), ['#76583c', '#c5a474', '#ead0a0']);
  for (const crossing of Object.values(CANOPY_CROSSINGS)) {
    strokes.length = 0;
    drawCanopyCrossing(ctx, crossing, (x) => x, (y) => y, 1);
    assert.ok(strokes.filter(({ color }) => color === '#ead0a0').length >= 5);
    assert.ok(strokes.some(({ width }) => width >= 4));
  }
});

test('canopy lights use varied colours and keep unlit lanterns distinct', () => {
  const platformColors = CANOPY_PLATFORMS.map((_, index) => canopyPlatformLightColor(index));
  assert.ok(new Set(platformColors).size >= 5);
  assert.equal(canopyPlatformLightColor(CANOPY_LIGHT_COLORS.length), CANOPY_LIGHT_COLORS[0]);
  const ids = ['lantern-1', 'lantern-2', 'lantern-3'];
  assert.equal(new Set(ids.map((id) => canopyLanternColor(id, true))).size, 3);
  for (const id of ids) assert.equal(canopyLanternColor(id, false), '#8a7959');
  assert.throws(() => canopyLanternColor('missing', true), /Unknown canopy lantern/);
  const fills = [];
  const ctx = { beginPath() {}, arc() {}, fill() { fills.push(this.fillStyle); } };
  drawCanopyLight(ctx, 10, 20, 6, canopyLanternColor(ids[0], true));
  assert.ok(fills.includes(canopyLanternColor(ids[0], true)));
  assert.ok(fills.includes('rgba(255, 255, 240, 0.7)'));
  fills.length = 0;
  drawCanopyLight(ctx, 10, 20, 6, canopyLanternColor(ids[0], false), false);
  assert.deepEqual(fills, ['#58432f', '#8a7959']);
});

test('forest fairy lights sit in the trees below the course and share a single 3D draw object', () => {
  assert.ok(CANOPY_FOREST_LIGHTS.length > CANOPY_FOREST_TREES.length);
  assert.deepEqual(new Set(CANOPY_FOREST_LIGHTS.map(({ color }) => color)), new Set(CANOPY_FOREST_LIGHT_COLORS));
  for (const light of CANOPY_FOREST_LIGHTS) {
    const tree = CANOPY_FOREST_TREES[light.treeIndex];
    assert.ok(Math.hypot(light.x - tree.x, light.z - tree.z) < 40);
    assert.ok(light.y < 0 && light.y > -100);
  }
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { createElement: () => ({ getContext: () => ({
      createRadialGradient: () => ({ addColorStop() {} }), fillRect() {}
    }) }) };
    const lights = createCanopyForestLights();
    assert.ok(lights instanceof THREE.Points);
    assert.equal(lights.geometry.attributes.position.count, CANOPY_FOREST_LIGHTS.length);
    assert.equal(lights.geometry.attributes.color.count, CANOPY_FOREST_LIGHTS.length);
    assert.equal(lights.material.depthWrite, false);
    lights.geometry.dispose(); lights.material.map.dispose(); lights.material.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createCanopyForestLights(), /canopy forest lights/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('illustrated forest draws trees and coloured lights behind the course', () => {
  const colors = [], ctx = {
    beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() { colors.push(this.fillStyle); }
  };
  drawCanopyForest(ctx, (x) => x, (y) => y, 1, 1000, 700);
  for (const color of CANOPY_FOREST_LIGHT_COLORS) assert.ok(colors.includes(color));
  assert.ok(colors.includes('#1b372d'));
  colors.length = 0;
  drawCanopyForest(ctx, (x) => x + 10000, (y) => y + 10000, 1, 1000, 700);
  assert.equal(colors.length, 0);
});
