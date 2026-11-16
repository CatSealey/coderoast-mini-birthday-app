import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirCanopy, createFirTrunk, createNeedleTexture, createPlatformFirTrunk, platformFirLayout } from '../js/world/fir-tree.js';
import { CANOPY_PLATFORMS } from '../js/world/world-scenery-data.js';

test('fir trees have deterministic, varied and bounded geometry', () => {
  const canopies = [0, 1, 2].map(createFirCanopy);
  const trunks = [0, 1, 2].map(createFirTrunk);
  const repeated = createFirCanopy(0);
  for (const geometry of [...canopies, ...trunks]) {
    const position = geometry.getAttribute('position');
    assert.ok(position.count > 200);
    for (const name of ['position', 'normal', 'color', 'uv']) {
      const attribute = geometry.getAttribute(name);
      assert.equal(attribute.count, position.count);
      assert.ok(attribute.array.every(Number.isFinite));
    }
    assert.ok(canopies[0].getAttribute('position').count / 3 < 600);
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox.max.y > 150);
    assert.ok(geometry.boundingBox.max.x < 55);
    assert.ok(geometry.boundingBox.min.x > -55);
  }
  assert.notDeepEqual(canopies[0].getAttribute('position').array, canopies[1].getAttribute('position').array);
  assert.deepEqual(canopies[0].getAttribute('position').array, repeated.getAttribute('position').array);
  assert.throws(() => createFirCanopy(3), RangeError);
  assert.throws(() => createFirTrunk(-1), RangeError);
  [...canopies, ...trunks, repeated].forEach((geometry) => geometry.dispose());
});

test('platform firs retain their supports and keep foliage above the platforms', () => {
  CANOPY_PLATFORMS.forEach((platform, index) => {
    const layout = platformFirLayout(platform, index);
    const trunk = createPlatformFirTrunk(layout.variant);
    const canopy = createFirCanopy(layout.variant);
    trunk.computeBoundingBox();
    canopy.computeBoundingBox();
    assert.equal(layout.x, platform.x);
    assert.equal(layout.z, platform.z);
    assert.ok(trunk.boundingBox.max.y * layout.trunkHeight >= platform.height + 65);
    assert.ok(layout.canopyBase + canopy.boundingBox.min.y * layout.canopyHeight > platform.height + 45);
    assert.ok(layout.canopyBase + canopy.boundingBox.max.y * layout.canopyHeight < platform.height + 155);
    assert.ok(Math.max(Math.abs(canopy.boundingBox.min.x), canopy.boundingBox.max.x) * layout.canopyWidth < 55);
    trunk.dispose();
    canopy.dispose();
  });
  assert.throws(() => createPlatformFirTrunk(3), RangeError);
});

test('needle texture draws detailed strokes and reports canvas failures', () => {
  const previousDocument = globalThis.document;
  let strokes = 0;
  try {
    globalThis.document = {
      createElement: () => ({
        getContext: () => ({
          fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { strokes += 1; }
        })
      })
    };
    const texture = createNeedleTexture();
    assert.equal(texture.image.width, 512);
    assert.equal(texture.image.height, 512);
    assert.equal(strokes, 1800);
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createNeedleTexture(), /needle texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
