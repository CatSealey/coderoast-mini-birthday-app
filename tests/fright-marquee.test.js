import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFrightMarqueeTexture, drawFrightMarqueeSign } from '../js/world/fright-marquee.js';

test('marquee sign has matching artwork and a correctly sized color texture', () => {
  const events = [];
  const ctx = {
    fillRect: (...args) => events.push(['rect', ...args]),
    strokeRect: (...args) => events.push(['border', ...args]),
    beginPath() {},
    arc: (...args) => events.push(['bulb', ...args]),
    fill() {},
    fillText: (...args) => events.push(['text', ...args])
  };
  drawFrightMarqueeSign(ctx);
  assert.ok(events.some((event) => event[0] === 'text' && event[1] === 'FRIGHT NIGHTS'));
  assert.ok(events.some((event) => event[0] === 'text' && event[1] === 'THE CORN MAZE'));
  assert.equal(events.filter((event) => event[0] === 'bulb').length, 30);
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const texture = createFrightMarqueeTexture();
    assert.equal(texture.image.width, 512);
    assert.equal(texture.image.height, 160);
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(createFrightMarqueeTexture, /Could not create the Fright Nights marquee/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
