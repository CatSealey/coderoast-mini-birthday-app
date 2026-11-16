import test from 'node:test';
import assert from 'node:assert/strict';
import { STOREFRONT_AWNINGS, TOWN_VENUES } from '../js/world/town-scenery.js';

test('storefront window awnings and their stripes leave the full doorway clear', () => {
  const doorHalfWidth = 15;
  assert.equal(STOREFRONT_AWNINGS.length, 2);
  assert.deepEqual(STOREFRONT_AWNINGS.map(({ x }) => x), [-37, 37]);
  for (const { x, width, stripeOffsets, stripeWidth } of STOREFRONT_AWNINGS) {
    const left = x - width / 2;
    const right = x + width / 2;
    assert.ok(right < -doorHalfWidth || left > doorHalfWidth);
    for (const offset of stripeOffsets) {
      assert.ok(x + offset - stripeWidth / 2 >= left);
      assert.ok(x + offset + stripeWidth / 2 <= right);
    }
  }
  assert.equal(TOWN_VENUES.filter(({ kind }) => kind !== 'games').length, 4);
});
