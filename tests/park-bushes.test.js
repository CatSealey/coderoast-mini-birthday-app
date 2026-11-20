import test from 'node:test';
import assert from 'node:assert/strict';
import { CatmullRomCurve3, Vector3 } from 'three';
import { createParkBushLeavesGeometry, drawParkBush, PARK_BUSH_SHAPES, parkBushes, parkBushObstacles } from '../js/world/park-bushes.js';
import { PARK_BANNERS, PARK_MAIN_COASTER, PARK_RIDES, PARK_WHEEL } from '../js/world/park-scenery.js';
import { COASTER_TRACKS } from '../js/world/world-scenery-data.js';
import { WORLD_SIZE } from '../js/world/world-data.js';
import { createCollision, worldBaseObstacles, worldObstacles } from '../js/world/world-collision.js';
import { roadDistance, scatteredParkBanners } from '../js/world/world-art.js';
import { regionBlendAt } from '../js/world/world-regions.js';

test('park bushes are varied, deterministic and clear of routes and scenery', () => {
  const bushes = parkBushes(), collision = createCollision(worldBaseObstacles(), 45);
  assert.deepEqual(bushes, parkBushes());
  assert.equal(bushes.length, 45);
  assert.deepEqual(new Set(bushes.map((bush) => bush.variant)), new Set([0, 1, 2]));
  assert.deepEqual(new Set(bushes.map((bush) => bush.shape)),
    new Set(PARK_BUSH_SHAPES.map((_, index) => index)));
  assert.deepEqual(new Set(bushes.map((bush) => PARK_BUSH_SHAPES[bush.shape].length)), new Set([1, 2, 3, 4, 5]));
  assert.ok(bushes.some((bush) => bush.flowering) && bushes.some((bush) => !bush.flowering));
  assert.ok(Math.max(...bushes.map((bush) => bush.scale)) - Math.min(...bushes.map((bush) => bush.scale)) > 0.4);
  const banners = [...PARK_BANNERS, ...scatteredParkBanners()];
  for (const [index, bush] of bushes.entries()) {
    assert.equal(regionBlendAt(bush).region.id, 'park');
    assert.ok(roadDistance(bush) > 105);
    assert.ok(!collision.blocked(bush));
    assert.ok(Math.hypot(bush.x - PARK_WHEEL.x, bush.y - PARK_WHEEL.y) > 145);
    assert.ok(banners.every((banner) => Math.hypot(bush.x - banner.x, bush.y - banner.y) > 80));
    assert.ok(bushes.slice(0, index).every((other) => Math.hypot(bush.x - other.x, bush.y - other.y) >= 75));
  }
});

test('every park hedge has solid collision following its scaled and rotated lobes', () => {
  const bushes = parkBushes(), obstacles = worldObstacles();
  for (const bush of bushes) {
    const footprints = parkBushObstacles([bush]);
    assert.equal(footprints.length, PARK_BUSH_SHAPES[bush.shape].length);
    for (const [index, footprint] of footprints.entries()) {
      const lobe = PARK_BUSH_SHAPES[bush.shape][index];
      assert.equal(footprint.x, bush.x + (lobe.x * Math.cos(bush.rotation) + lobe.z * Math.sin(bush.rotation)) * bush.scale);
      assert.equal(footprint.y, bush.y + (-lobe.x * Math.sin(bush.rotation) + lobe.z * Math.cos(bush.rotation)) * bush.scale);
      assert.equal(footprint.radius, lobe.width * 44 * bush.scale);
      assert.ok(obstacles.some((item) => item.x === footprint.x && item.y === footprint.y && item.radius === footprint.radius));
      const lobeCollision = createCollision([footprint], 12);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const distance = footprint.radius + 22;
        const start = { x: footprint.x + dx * distance, y: footprint.y + dy * distance };
        if (start.x < 12 || start.y < 12 || start.x > WORLD_SIZE.width - 12 || start.y > WORLD_SIZE.height - 12) continue;
        assert.equal(lobeCollision.blocked(start), false);
        assert.equal(lobeCollision.clearSegment(start, footprint), false);
        assert.notDeepEqual(lobeCollision.move(start, -dx * distance, -dy * distance),
          { x: footprint.x, y: footprint.y });
      }
    }
    const collision = createCollision(footprints, 12);
    assert.equal(collision.blocked(bush), true);
    const start = { x: bush.x - 100, y: bush.y };
    assert.equal(collision.blocked(start), false);
    assert.equal(collision.clearSegment(start, bush), false);
    assert.notDeepEqual(collision.move(start, 100, 0), { x: bush.x, y: bush.y });
  }
});

test('park bushes keep clearance from the full coaster tracks', () => {
  const rides = [
    { ...PARK_MAIN_COASTER, trackType: 'thirteen', rotation: 0 },
    ...PARK_RIDES.filter((ride) => ride.trackType)
  ];
  const bushes = parkBushes();
  for (const ride of rides) {
    const curve = new CatmullRomCurve3(COASTER_TRACKS[ride.trackType].map((point) => new Vector3(...point)),
      true, 'centripetal');
    for (let index = 0; index < 500; index += 1) {
      const point = curve.getPointAt(index / 500);
      const x = ride.x + ride.size * (point.x * Math.cos(ride.rotation) + point.z * Math.sin(ride.rotation));
      const y = ride.y + ride.size * (-point.x * Math.sin(ride.rotation) + point.z * Math.cos(ride.rotation));
      assert.ok(bushes.every((bush) => Math.hypot(bush.x - x, bush.y - y) > 70));
    }
  }
});

test('illustrated bushes have varied shapes, individual leaves and occasional flowers', () => {
  for (let shape = 0; shape < PARK_BUSH_SHAPES.length; shape += 1) {
    const ellipses = [], fills = [];
    const ctx = {
      beginPath() {}, moveTo() {}, quadraticCurveTo() {},
      fill() { fills.push(this.fillStyle); },
      ellipse(...args) { ellipses.push({ color: this.fillStyle, args }); }
    };
    drawParkBush(ctx, shape % 3, shape, true);
    assert.equal(ellipses.length, 1 + PARK_BUSH_SHAPES[shape].length + 20);
    assert.match(ellipses[0].color, /rgba/);
    assert.equal(fills.length, 1 + PARK_BUSH_SHAPES[shape].length + 38 + 20);
    assert.ok(new Set(fills).size >= 6);
  }
  assert.throws(() => drawParkBush({}, 3), RangeError);
  assert.throws(() => drawParkBush({}, 0, PARK_BUSH_SHAPES.length), RangeError);
});

test('3D bushes have bounded, individually shaded leaves and optional blossoms', () => {
  const styles = [];
  for (let shape = 0; shape < PARK_BUSH_SHAPES.length; shape += 1) {
    const plain = createParkBushLeavesGeometry(shape % 3, shape, false);
    const flowering = createParkBushLeavesGeometry(shape % 3, shape, true);
    const repeat = createParkBushLeavesGeometry(shape % 3, shape, false);
    try {
      assert.equal(plain.getAttribute('position').count, 38 * 12);
      assert.equal(flowering.getAttribute('position').count, 38 * 12 + 4 * 5 * 3);
      assert.equal(plain.getAttribute('color').count, plain.getAttribute('position').count);
      assert.deepEqual(plain.getAttribute('position').array, repeat.getAttribute('position').array);
      assert.deepEqual(plain.getAttribute('color').array, repeat.getAttribute('color').array);
      assert.ok([...plain.getAttribute('normal').array].every(Number.isFinite));
      assert.ok(new Set(plain.getAttribute('color').array).size > 3);
      assert.ok(plain.boundingBox.min.x > -36 && plain.boundingBox.max.x < 36);
      assert.ok(plain.boundingBox.min.z > -22 && plain.boundingBox.max.z < 22);
      assert.ok(plain.boundingBox.min.y > 0 && plain.boundingBox.max.y < 35);
      assert.ok(PARK_BUSH_SHAPES[shape].every((lobe) => lobe.width > 0 && lobe.height > 0 && lobe.y > 0));
      assert.ok(PARK_BUSH_SHAPES[shape].every((lobe) => Math.abs(lobe.x) + lobe.width * 53 <= 36),
        'bush bodies stay within the original clearance footprint');
      styles.push([...plain.getAttribute('position').array.slice(0, 6)]);
    } finally {
      plain.dispose(); flowering.dispose(); repeat.dispose();
    }
  }
  assert.equal(new Set(styles.map((style) => style.join(','))).size, PARK_BUSH_SHAPES.length);
  assert.throws(() => createParkBushLeavesGeometry(0, PARK_BUSH_SHAPES.length, false), RangeError);
  assert.throws(() => createParkBushLeavesGeometry(3, 0, false), RangeError);
});
