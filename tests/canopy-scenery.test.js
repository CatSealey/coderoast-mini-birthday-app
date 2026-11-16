import test from 'node:test';
import assert from 'node:assert/strict';
import { CANOPY_EDGE_TREES, CANOPY_FOREST_TREES } from '../js/games/canopy-scenery.js';
import { createFirCanopy, createPlatformFirTrunk } from '../js/world/fir-tree.js';
import { createTreeBarkTexture } from '../js/world/tree-geometry.js';

test('quest firs retain the existing forest and course-edge positions', () => {
  const expectedForest = [];
  for (let x = 25; x < 2320; x += 80) for (let z = 35; z < 700; z += 90) expectedForest.push([x, z]);
  const expectedEdge = [];
  for (const x of [100, 270, 460, 660, 850, 1050, 1250, 1450, 1650, 1820]) {
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
