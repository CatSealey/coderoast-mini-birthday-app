import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoliageTexture, createLeafyBranches, createLeafyCanopy } from '../js/world/leafy-tree.js';

test('leafy trees have detailed, deterministic branches and varied foliage', () => {
  const canopies = [0, 1, 2].map(createLeafyCanopy);
  const branches = [0, 1, 2].map(createLeafyBranches);
  for (const geometry of [...canopies, ...branches]) {
    const position = geometry.getAttribute('position');
    assert.ok(position.count > 500);
    for (const name of ['position', 'normal', 'color', 'uv']) {
      const attribute = geometry.getAttribute(name);
      assert.equal(attribute.count, position.count);
      assert.ok(attribute.array.every(Number.isFinite));
    }
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox.max.y > 95);
  }
  assert.notDeepEqual(canopies[0].getAttribute('position').array, canopies[1].getAttribute('position').array);
  const repeated = createLeafyCanopy(0);
  assert.deepEqual(canopies[0].getAttribute('position').array, repeated.getAttribute('position').array);
  assert.throws(() => createLeafyCanopy(3), RangeError);
  assert.throws(() => createLeafyBranches(-1), RangeError);
  [...canopies, ...branches, repeated].forEach((geometry) => geometry.dispose());
});

test('foliage texture draws detailed leaves and reports canvas failures', () => {
  const previousDocument = globalThis.document;
  let leaves = 0;
  try {
    globalThis.document = {
      createElement: () => ({
        getContext: () => ({
          fillRect() {},
          beginPath() {},
          ellipse() { leaves += 1; },
          fill() {}
        })
      })
    };
    const texture = createFoliageTexture();
    assert.equal(texture.image.width, 512);
    assert.equal(texture.image.height, 512);
    assert.equal(leaves, 1600);
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createFoliageTexture(), /foliage texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
