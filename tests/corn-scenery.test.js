import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cornStalks, createCornGeometry, createCornTexture } from '../js/world/corn-scenery.js';
import { worldCornWalls } from '../js/world/world-collision.js';

test('corn stalks form dense staggered rows within the existing wall footprints', () => {
  const walls = worldCornWalls();
  const stalks = cornStalks(walls);
  assert.deepEqual(stalks, cornStalks(walls));
  assert.equal(stalks.length, walls.length * 31);
  walls.forEach((wall, wallIndex) => {
    const row = stalks.slice(wallIndex * 31, wallIndex * 31 + 31);
    row.slice(0, 11).forEach((stalk, i) => {
      const offset = -62 + i * 12.4;
      assert.equal(stalk.x, wall.x + (wall.vertical ? 0 : offset));
      assert.equal(stalk.z, wall.y + (wall.vertical ? offset : 0));
      const value = Math.sin((i + wall.x) * 127.1 + wall.y * 311.7) * 43758.5453;
      assert.equal(stalk.size, 0.8 + (value - Math.floor(value)) * 0.35);
      assert.ok(stalk.variant >= 0 && stalk.variant < 5);
      assert.ok(stalk.angle >= 0 && stalk.angle < Math.PI * 2);
    });
    for (const [index, depth] of [-5, 5].entries()) {
      row.slice(11 + index * 10, 21 + index * 10).forEach((stalk, i) => {
        const offset = -55.8 + i * 12.4;
        assert.ok(Math.abs(stalk.x - (wall.x + (wall.vertical ? depth : offset))) < 1e-9);
        assert.ok(Math.abs(stalk.z - (wall.y + (wall.vertical ? offset : depth))) < 1e-9);
        assert.ok(stalk.size >= 0.8 && stalk.size < 1.15);
        assert.ok(stalk.variant >= 0 && stalk.variant < 5);
        assert.ok(stalk.angle >= 0 && stalk.angle < Math.PI * 2);
      });
    }
  });
  assert.deepEqual(new Set(stalks.map((stalk) => stalk.variant)), new Set([0, 1, 2, 3, 4]));
});

test('corn geometries have bounded detailed foliage and a mobile-friendly triangle count', () => {
  const geometries = [0, 1, 2, 3, 4].map(createCornGeometry);
  try {
    for (const geometry of geometries) {
      const position = geometry.getAttribute('position');
      assert.equal(position.count, 204);
      assert.equal(geometry.getAttribute('normal').count, position.count);
      assert.equal(geometry.getAttribute('color').count, position.count);
      assert.equal(geometry.getAttribute('uv').count, position.count);
      for (const attribute of Object.values(geometry.attributes)) {
        assert.ok([...attribute.array].every(Number.isFinite));
      }
      geometry.computeBoundingBox();
      assert.ok(geometry.boundingBox.min.y === 0 && geometry.boundingBox.max.y <= 103);
      assert.ok(geometry.boundingSphere.radius < 60);
    }
    assert.notDeepEqual(geometries[0].getAttribute('position').array, geometries[1].getAttribute('position').array);
    assert.notDeepEqual(geometries[0].getAttribute('color').array, geometries[4].getAttribute('color').array);
    assert.throws(() => createCornGeometry(5), RangeError);
  } finally {
    geometries.forEach((geometry) => geometry.dispose());
  }
});

test('corn texture is repeatable and reports an unavailable canvas', () => {
  const previousDocument = globalThis.document;
  const strokes = [];
  globalThis.document = {
    createElement() {
      return { getContext: () => ({
        fillRect() {}, beginPath() {}, stroke() {},
        moveTo: (...args) => strokes.push(args), lineTo: (...args) => strokes.push(args)
      }) };
    }
  };
  try {
    const texture = createCornTexture();
    const first = strokes.slice();
    strokes.length = 0;
    const second = createCornTexture();
    assert.deepEqual(strokes, first);
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    assert.equal(texture.wrapS, THREE.RepeatWrapping);
    assert.equal(texture.wrapT, THREE.RepeatWrapping);
    texture.dispose(); second.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(createCornTexture, /Could not create the corn texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
