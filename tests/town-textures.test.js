import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTownTexture } from '../js/world/town-textures.js';

test('town surface textures are deterministic and use sRGB colors', () => {
  const previousDocument = globalThis.document;
  const events = [];
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return {
        getContext: () => ({
          fillRect: (...args) => events.push(['fillRect', ...args]),
          beginPath: () => {},
          moveTo: (...args) => events.push(['moveTo', ...args]),
          lineTo: (...args) => events.push(['lineTo', ...args]),
          bezierCurveTo: (...args) => events.push(['bezierCurveTo', ...args]),
          stroke: () => {}
        })
      };
    }
  };
  try {
    for (const kind of ['wood', 'plaster', 'roof']) {
      events.length = 0;
      const first = createTownTexture(kind);
      const initial = events.slice();
      events.length = 0;
      const second = createTownTexture(kind);
      assert.deepEqual(events, initial);
      assert.ok(initial.length > 10);
      assert.equal(first.colorSpace, THREE.SRGBColorSpace);
      assert.equal(first.image.width, 256);
      assert.equal(first.image.height, 256);
      first.dispose();
      second.dispose();
    }
    assert.throws(() => createTownTexture('unknown'), RangeError);
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createTownTexture('wood'), /Could not create the wood texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
