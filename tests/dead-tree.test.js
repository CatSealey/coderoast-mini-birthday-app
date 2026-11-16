import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeadTreeGeometry } from '../js/world/dead-tree.js';
import { worldObstacles } from '../js/world/world-collision.js';

test('dead trees have deterministic, branching, shaded geometry', () => {
  const geometries = [0, 1, 2].map(createDeadTreeGeometry);
  for (const geometry of geometries) {
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const color = geometry.getAttribute('color');
    const uv = geometry.getAttribute('uv');
    assert.ok(position.count > 500);
    assert.equal(normal.count, position.count);
    assert.equal(color.count, position.count);
    assert.equal(uv.count, position.count);
    for (const attribute of [position, normal, color, uv]) {
      assert.ok(attribute.array.every(Number.isFinite));
    }
    geometry.computeBoundingBox();
    assert.ok(geometry.boundingBox.max.y > 130);
    assert.ok(geometry.boundingBox.max.x - geometry.boundingBox.min.x > 85);
    assert.ok(geometry.boundingBox.max.z - geometry.boundingBox.min.z > 30);
    assert.ok(new Set(color.array).size > 10);
  }
  const repeated = createDeadTreeGeometry(0);
  assert.deepEqual(geometries[0].getAttribute('position').array, repeated.getAttribute('position').array);
  assert.notDeepEqual(geometries[0].getAttribute('position').array, geometries[1].getAttribute('position').array);
  assert.throws(() => createDeadTreeGeometry(3), RangeError);
  geometries.forEach((geometry) => geometry.dispose());
  repeated.dispose();
});

test('dead tree roots are included in world collisions', () => {
  const tree = { x: 1800, z: 1800, region: 'escape', size: 1.5, variant: 1 };
  const obstacles = worldObstacles([tree]);
  assert.ok(obstacles.some((obstacle) => obstacle.x === tree.x && obstacle.y === tree.z
    && obstacle.radius === 30));
});
