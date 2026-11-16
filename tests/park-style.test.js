import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createParkGroundCanvas, createParkGroundTexture, drawParkCar, drawParkGround, PARK_PALETTE } from '../js/world/park-style.js';

function recordingContext() {
  const fills = [], ellipses = [];
  return {
    fills, ellipses,
    fillRect(...args) { fills.push({ color: this.fillStyle, args }); },
    beginPath() {},
    ellipse(...args) { ellipses.push({ color: this.fillStyle, args }); },
    fill() {}
  };
}

test('park ground has deterministic, varied markings within its bounds', () => {
  const first = recordingContext(), second = recordingContext();
  drawParkGround(first, 10, 20, 1000, 700);
  drawParkGround(second, 10, 20, 1000, 700);
  assert.deepEqual(first.fills, [{ color: '#3e503b', args: [10, 20, 1000, 700] }]);
  assert.deepEqual(first.ellipses, second.ellipses);
  assert.equal(first.ellipses.length, 240);
  assert.equal(new Set(first.ellipses.map(({ color }) => color)).size, 2);
  assert.ok(first.ellipses.every(({ args: [x, y, rx, ry] }) =>
    x >= 10 && x <= 1010 && y >= 20 && y <= 720 && rx > 0 && ry > 0));
});

test('park ground canvas and texture are prepared once with sRGB colors', () => {
  const previousDocument = globalThis.document;
  const ctx = recordingContext();
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const canvas = createParkGroundCanvas();
    assert.equal(canvas.width, 512);
    assert.equal(canvas.height, 512);
    assert.equal(ctx.ellipses.length, 240);
    const texture = createParkGroundTexture();
    assert.equal(texture.image.width, 512);
    assert.equal(texture.image.height, 512);
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createParkGroundCanvas(), /Could not create the park ground texture/);
    assert.throws(() => createParkGroundTexture(), /Could not create the park ground texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('illustrated park carriage has a body, two seats and brass trim', () => {
  const ctx = recordingContext();
  drawParkCar(ctx, 70, 42);
  assert.deepEqual(ctx.fills[0].args, [-35, -21, 70, 42]);
  assert.equal(ctx.fills.filter(({ color }) => color === '#493a31').length, 2);
  assert.equal(ctx.fills.filter(({ color }) => color === PARK_PALETTE.brass).length, 3);
});
