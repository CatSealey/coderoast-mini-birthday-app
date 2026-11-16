import test from 'node:test';
import assert from 'node:assert/strict';
import { createPumpkinGeometry, pumpkinHasFace } from '../js/world/pumpkin-scenery.js';

test('pumpkin geometry has a ribbed, colored surface in three harvest shades', () => {
  const geometries = [0, 1, 2].map(createPumpkinGeometry);
  try {
    for (const geometry of geometries) {
      const position = geometry.getAttribute('position');
      assert.equal(position.count, 833);
      assert.equal(geometry.getAttribute('normal').count, position.count);
      assert.equal(geometry.getAttribute('color').count, position.count);
      assert.ok([...position.array, ...geometry.getAttribute('color').array].every(Number.isFinite));
      geometry.computeBoundingBox();
      assert.ok(geometry.boundingBox.min.y >= -11.1);
      assert.ok(geometry.boundingBox.max.y <= 11.1);
      assert.ok(geometry.boundingBox.min.x < -16 && geometry.boundingBox.max.x > 16);
    }
    assert.notDeepEqual(
      geometries[0].getAttribute('color').array,
      geometries[1].getAttribute('color').array
    );
    assert.throws(() => createPumpkinGeometry(3), RangeError);
  } finally {
    geometries.forEach((geometry) => geometry.dispose());
  }
});

test('only one pumpkin variant receives a carved face', () => {
  assert.deepEqual([0, 1, 2].map(pumpkinHasFace), [true, false, false]);
});
