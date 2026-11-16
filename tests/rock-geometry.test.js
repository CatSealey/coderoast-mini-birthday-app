import test from 'node:test';
import assert from 'node:assert/strict';
import { createRockGeometry, createRockTexture } from '../js/world/rock-geometry.js';
import { rockVariant } from '../js/world/rock-style.js';

test('rock variants are deterministic, detailed and stay within the original footprint', () => {
  const rocks = [0, 1, 2].map(createRockGeometry);
  const repeated = createRockGeometry(0);
  for (const rock of rocks) {
    const position = rock.getAttribute('position');
    assert.equal(position.count / 3, 80);
    for (const name of ['position', 'normal', 'color', 'uv']) {
      const attribute = rock.getAttribute(name);
      assert.equal(attribute.count, position.count);
      assert.ok(attribute.array.every(Number.isFinite));
    }
    rock.computeBoundingBox();
    assert.ok(rock.boundingBox.min.x >= -16.9 && rock.boundingBox.max.x <= 16.9);
    assert.ok(rock.boundingBox.min.z >= -13 && rock.boundingBox.max.z <= 13);
    assert.ok(rock.boundingBox.min.y >= -6 && rock.boundingBox.max.y <= 7.8);
  }
  assert.notDeepEqual(rocks[0].getAttribute('position').array, rocks[1].getAttribute('position').array);
  assert.deepEqual(rocks[0].getAttribute('position').array, repeated.getAttribute('position').array);
  assert.throws(() => createRockGeometry(3), RangeError);
  assert.equal(rockVariant(100, 200), rockVariant(100, 200));
  assert.deepEqual(new Set(Array.from({ length: 30 }, (_, i) => rockVariant(i * 43, i * 19))), new Set([0, 1, 2]));
  [...rocks, repeated].forEach((rock) => rock.dispose());
});

test('rock texture draws stone grain and reports canvas failures', () => {
  const previousDocument = globalThis.document;
  let fills = 0, strokes = 0;
  try {
    globalThis.document = { createElement: () => ({ getContext: () => ({
      fillRect() { fills += 1; }, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { strokes += 1; }
    }) }) };
    const texture = createRockTexture();
    assert.equal(texture.image.width, 512);
    assert.equal(texture.image.height, 512);
    assert.equal(fills, 1801);
    assert.equal(strokes, 40);
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createRockTexture(), /rock texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
