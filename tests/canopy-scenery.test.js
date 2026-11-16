import test from 'node:test';
import assert from 'node:assert/strict';
import { CANOPY_EDGE_TREES, CANOPY_FOREST_TREES } from '../js/games/canopy-scenery.js';
import { createFirCanopy, createPlatformFirTrunk } from '../js/world/fir-tree.js';
import { createTreeBarkTexture } from '../js/world/tree-geometry.js';
import { createCanopyDeckTexture, drawCanopyDeck, drawCanopyPlatformFace } from '../js/world/canopy-platform.js';
import { CANOPY_COURSE_LENGTH, CANOPY_PLATFORMS } from '../js/games/adventure-logic.js';

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
