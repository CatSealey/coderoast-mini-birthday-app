import test from 'node:test';
import assert from 'node:assert/strict';
import { OrthographicCamera } from 'three';
import { configureWorldCamera, groundPointAt } from '../js/world/world-3d.js';
import { WORLD_SIZE } from '../js/world/world-data.js';
import { constrainToWorld } from '../js/world/world-logic.js';
import { regionBlendAt } from '../js/world/world-regions.js';
import { createSurroundingTerrain, SURROUNDINGS_BOUNDS, SURROUNDINGS_MARGIN, surroundingTrees, treeType } from '../js/world/world-surroundings.js';

test('decorative trees surround the world without entering the playable area', () => {
  const trees = surroundingTrees();
  assert.deepEqual(trees, surroundingTrees());
  assert.ok(trees.length > 1000);
  for (const tree of trees) {
    assert.ok(tree.x >= SURROUNDINGS_BOUNDS.left && tree.x <= SURROUNDINGS_BOUNDS.right);
    assert.ok(tree.z >= SURROUNDINGS_BOUNDS.top && tree.z <= SURROUNDINGS_BOUNDS.bottom);
    assert.ok(tree.x < -100 || tree.x > WORLD_SIZE.width + 100
      || tree.z < -100 || tree.z > WORLD_SIZE.height + 100);
    assert.equal(tree.region, regionBlendAt({ x: tree.x, y: tree.z }).region.id);
  }
  assert.ok(trees.some((tree) => tree.x < 0));
  assert.ok(trees.some((tree) => tree.x > WORLD_SIZE.width));
  assert.ok(trees.some((tree) => tree.z < 0));
  assert.ok(trees.some((tree) => tree.z > WORLD_SIZE.height));
  assert.deepEqual(constrainToWorld({ x: -SURROUNDINGS_MARGIN, y: WORLD_SIZE.height + SURROUNDINGS_MARGIN }),
    { x: 12, y: WORLD_SIZE.height - 12 });
});

test('the non-playable edge mixes pine and leafy trees while retaining escape dead trees', () => {
  const trees = surroundingTrees();
  for (const edge of [
    (t) => t.x < -100 && t.x > -900 && t.z >= 0 && t.z <= WORLD_SIZE.height,
    (t) => t.x > WORLD_SIZE.width + 100 && t.x < WORLD_SIZE.width + 900 && t.z >= 0 && t.z <= WORLD_SIZE.height,
    (t) => t.z < -100 && t.z > -900 && t.x >= 0 && t.x <= WORLD_SIZE.width,
    (t) => t.z > WORLD_SIZE.height + 100 && t.z < WORLD_SIZE.height + 900 && t.x >= 0 && t.x <= WORLD_SIZE.width
  ]) {
    const types = new Set(trees.filter(edge).map(treeType));
    assert.ok(types.has('pine') && types.has('tree'));
  }
  const escape = trees.filter((tree) => tree.region === 'escape');
  assert.deepEqual(new Set(escape.map(treeType)), new Set(['deadTree', 'pine', 'tree']));
  for (let i = 0; i < trees.length; i += 1) {
    for (let j = 0; j < i; j += 1) {
      assert.ok(Math.hypot(trees[i].x - trees[j].x, trees[i].z - trees[j].z)
        >= 45 * (trees[i].size + trees[j].size), 'surrounding tree crowns should not overlap');
    }
  }
  assert.equal(treeType({ region: 'forest' }), 'pine');
  assert.equal(treeType({ region: 'escape' }), 'deadTree');
  assert.equal(treeType({ region: 'park' }), 'tree');
});

test('surrounding terrain follows the existing region colors on both sides of each world edge', () => {
  const previousDocument = globalThis.document;
  let pixels;
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return {
        width: 0, height: 0,
        getContext: () => ({
          createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
          putImageData: (image) => { pixels = image.data; },
          drawImage: () => {},
          scale: () => {},
          beginPath: () => {},
          ellipse: () => {},
          fill: () => {}
        })
      };
    }
  };
  try {
    const terrain = createSurroundingTerrain();
    assert.equal(terrain.width * 10, WORLD_SIZE.width + 2 * SURROUNDINGS_MARGIN);
    assert.equal(terrain.height * 10, WORLD_SIZE.height + 2 * SURROUNDINGS_MARGIN);
    for (const point of [
      { x: -10, y: 1790 }, { x: 10, y: 1790 },
      { x: WORLD_SIZE.width - 10, y: 1790 }, { x: WORLD_SIZE.width + 10, y: 1790 },
      { x: 2690, y: -10 }, { x: 2690, y: 10 },
      { x: 2690, y: WORLD_SIZE.height - 10 }, { x: 2690, y: WORLD_SIZE.height + 10 }
    ]) {
      const x = (point.x - SURROUNDINGS_BOUNDS.left - 10) / 20;
      const y = (point.y - SURROUNDINGS_BOUNDS.top - 10) / 20;
      const offset = (y * (terrain.width / 2) + x) * 4;
      const { region, neighbor, blend } = regionBlendAt(point);
      for (let channel = 0; channel < 3; channel += 1) {
        assert.ok(Math.abs(pixels[offset + channel]
          - (region.color[channel] * (1 - blend) + neighbor.color[channel] * blend)) <= 0.5);
      }
      assert.equal(pixels[offset + 3], 255);
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test('3D ground covers the viewport at every playable corner on desktop and mobile', () => {
  for (const [width, height, zoom] of [[360, 580, 0.65], [1920, 780, 1], [3840, 780, 1]]) {
    for (const position of [
      { x: 12, y: 12 }, { x: WORLD_SIZE.width - 12, y: 12 },
      { x: 12, y: WORLD_SIZE.height - 12 }, { x: WORLD_SIZE.width - 12, y: WORLD_SIZE.height - 12 }
    ]) {
      const camera = new OrthographicCamera(-1, 1, 1, -1, 1, 6000);
      configureWorldCamera(camera, width, height, zoom, position);
      for (const point of [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: 0, y: height }, { x: width, y: height }]) {
        const hit = groundPointAt(camera, width, height, point);
        assert.ok(hit && hit.x >= SURROUNDINGS_BOUNDS.left && hit.x <= SURROUNDINGS_BOUNDS.right
          && hit.y >= SURROUNDINGS_BOUNDS.top && hit.y <= SURROUNDINGS_BOUNDS.bottom,
        `Viewport extends beyond scenery at ${width}x${height}, position ${JSON.stringify(position)}.`);
      }
    }
  }
});
