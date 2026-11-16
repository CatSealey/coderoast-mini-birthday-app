import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { TOWN_VENUES } from '../js/world/town-scenery.js';
import { createVenueSignTexture, drawVenueSign, ESCAPE_SIGN } from '../js/world/venue-sign.js';

test('every venue has a framed name sign with its own motif', () => {
  const previousDocument = globalThis.document;
  const labels = [], fills = [];
  const ctx = {
    fillRect: (...args) => fills.push(args),
    strokeRect() {}, beginPath() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {},
    arc() {}, quadraticCurveTo() {}, closePath() {}, save() {}, restore() {}, translate() {},
    fillText: (...args) => labels.push(args)
  };
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    assert.equal(new Set(TOWN_VENUES.map(({ motif }) => motif)).size, TOWN_VENUES.length);
    for (const venue of TOWN_VENUES) {
      labels.length = 0;
      fills.length = 0;
      const texture = createVenueSignTexture(venue.name, venue.motif);
      assert.equal(texture.image.width, 512);
      assert.equal(texture.image.height, 80);
      assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
      assert.ok(fills.length >= 3);
      assert.ok(labels.some(([text, x, y, maxWidth]) =>
        text === venue.name && x === 256 && y === 41 && maxWidth === 360));
      texture.dispose();
    }
    labels.length = 0;
    fills.length = 0;
    const escape = createVenueSignTexture(ESCAPE_SIGN.name, ESCAPE_SIGN.motif);
    assert.ok(fills.length >= 3, 'escape sign has the same framed construction');
    assert.ok(labels.some(([text]) => text === 'ESCAPE ROOM'));
    escape.dispose();
    labels.length = 0;
    const ride = createVenueSignTexture('THIRTEEN', 'ride');
    assert.ok(labels.some(([text]) => text === 'THIRTEEN'));
    ride.dispose();
    assert.throws(() => drawVenueSign(ctx, 'Unknown', 'unknown'), RangeError);
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createVenueSignTexture('Example', 'leaf'), /Could not create the venue sign/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
