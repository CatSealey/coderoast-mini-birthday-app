import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRoofTileGeometry, createTownTexture, drawRoofTiles } from '../js/world/town-textures.js';

test('roof tile UVs run along the building and down each pitched slope', () => {
  for (const side of [-1, 1]) {
    const geometry = createRoofTileGeometry(132, 108, 48, side);
    try {
      const positions = geometry.getAttribute('position');
      const uvs = geometry.getAttribute('uv');
      const normals = geometry.getAttribute('normal');
      assert.equal(positions.count, 4);
      assert.deepEqual([positions.getX(0), positions.getZ(0)], [0, -54]);
      assert.deepEqual([positions.getX(1), positions.getZ(1)], [0, 54]);
      assert.deepEqual([positions.getX(2), positions.getZ(2)], [side * 66, -54]);
      assert.deepEqual([uvs.getX(0), uvs.getY(0)], [0, 1]);
      assert.deepEqual([uvs.getX(1), uvs.getY(1)], [1, 1]);
      assert.deepEqual([uvs.getX(2), uvs.getY(2)], [0, 0]);
      assert.ok(normals.getY(0) > 0, 'both slopes face upwards');
      assert.ok(positions.getY(0) > 48 && positions.getY(2) > 0, 'tiles sit above the roof');
    } finally {
      geometry.dispose();
    }
  }
});

test('illustrated roof tiles have staggered courses within the roof', () => {
  const paths = [];
  const ctx = {
    beginPath() { paths.push([]); },
    moveTo(x, y) { paths.at(-1).push(['move', x, y]); },
    lineTo(x, y) { paths.at(-1).push(['line', x, y]); },
    stroke() {}
  };
  drawRoofTiles(ctx, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }], 6, 5);
  const courses = paths[0];
  assert.deepEqual(courses.slice(0, 4), [['move', 0, 10], ['line', 100, 10], ['move', 10, 0], ['line', 10, 10]]);
  assert.ok(courses.some(([op, x, y]) => op === 'move' && x === 20 && y === 10), 'alternate rows offset their seams');
  for (const [, x, y] of paths.flat()) assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 60);
});

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
      if (kind === 'roof') {
        assert.ok(initial.some((event) => event.join(',') === 'fillRect,0,1,1.5,30'));
        assert.ok(initial.some((event) => event.join(',') === 'fillRect,16,33,1.5,30'),
          'successive tile courses have staggered joints');
      }
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
