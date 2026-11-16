import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGamesSignTexture } from '../js/world/games-sign.js';

test('games sign has a framed, legible label and recognizable game emblems', () => {
  const previousDocument = globalThis.document;
  const text = [], arcs = [], rectangles = [];
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return { getContext: () => ({
        fillRect: (...args) => rectangles.push(args),
        strokeRect() {}, beginPath() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {},
        arc: (...args) => arcs.push(args),
        fillText: (...args) => text.push(args)
      }) };
    }
  };
  try {
    const texture = createGamesSignTexture();
    assert.equal(texture.image.width, 512);
    assert.equal(texture.image.height, 80);
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    assert.ok(rectangles.length >= 3);
    assert.ok(arcs.length >= 5);
    assert.deepEqual(text.map(([label]) => label), ['8', 'POOL · DARTS · GAMES']);
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(createGamesSignTexture, /Could not create the games sign/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
