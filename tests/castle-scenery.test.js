import test from 'node:test';
import assert from 'node:assert/strict';
import { CASTLE_GATE_PLANKS, CASTLE_PALETTE, CASTLE_TOWER_WINDOWS, castleSupplyStyle, createCastleArchGeometry, createCastleBannerGeometry, createCastleFlagGeometry, drawCastle, drawCastleSupply } from '../js/world/castle-scenery.js';
import { CASTLE_EXTERIOR_SUPPLIES, CASTLE_FRONT_WINDOWS, CASTLE_LAYOUT, CASTLE_ROOF_SUPPLIES, CASTLE_SIDE_BATTLEMENT_Z, CASTLE_TOWERS, CASTLE_WINDOW_LEVELS, CASTLE_WINDOW_WIDTH_SCALE } from '../js/world/world-data.js';

test('castle arches and banners have predictable front-facing dimensions', () => {
  const arch = createCastleArchGeometry(70, 52, 83);
  const gate = createCastleArchGeometry(52, 49, 73);
  const banner = createCastleBannerGeometry();
  const flag = createCastleFlagGeometry();
  try {
    assert.deepEqual(arch.boundingBox.min.toArray(), [-35, 0, 0]);
    assert.deepEqual(arch.boundingBox.max.toArray(), [35, 83, 0]);
    assert.deepEqual(gate.boundingBox.min.toArray(), [-26, 0, 0]);
    assert.deepEqual(gate.boundingBox.max.toArray(), [26, 73, 0]);
    assert.deepEqual(banner.boundingBox.min.toArray(), [-10, -6, 0]);
    assert.deepEqual(banner.boundingBox.max.toArray(), [10, 34, 0]);
    assert.deepEqual(flag.boundingBox.min.toArray(), [0, 0, 0]);
    assert.deepEqual(flag.boundingBox.max.toArray(), [32, 18, 0]);
    for (const geometry of [arch, gate, banner, flag]) {
      assert.ok(geometry.index.count > 0);
      assert.ok(geometry.attributes.normal.getZ(0) > 0);
    }
    for (const dimensions of [[0, 5, 10], [10, 10, 10], [10, -1, 10], [NaN, 5, 10]]) {
      assert.throws(() => createCastleArchGeometry(...dimensions), RangeError);
    }
  } finally {
    arch.dispose(); gate.dispose(); banner.dispose(); flag.dispose();
  }
});

test('four distinct towers occupy the corners of the enlarged castle footprint', () => {
  assert.equal(CASTLE_TOWERS.length, 4);
  assert.ok(CASTLE_LAYOUT.width > 231 && CASTLE_LAYOUT.depth > 155);
  assert.equal(CASTLE_LAYOUT.centerOffset + CASTLE_LAYOUT.depth / 2, 77.5);
  const corners = new Set();
  for (const { x, z, height, hasBanner } of CASTLE_TOWERS) {
    corners.add(`${Math.sign(x)},${Math.sign(z - CASTLE_LAYOUT.centerOffset)}`);
    assert.equal(Math.abs(x) + CASTLE_LAYOUT.towerSize / 2, CASTLE_LAYOUT.width / 2);
    assert.equal(Math.abs(z - CASTLE_LAYOUT.centerOffset) + CASTLE_LAYOUT.towerSize / 2, CASTLE_LAYOUT.depth / 2);
    assert.equal(height, CASTLE_LAYOUT.towerHeight);
    assert.equal(hasBanner, z > CASTLE_LAYOUT.centerOffset, 'only front towers have banners');
  }
  assert.equal(corners.size, 4);
});

test('front windows fit between the gate and towers without overlapping', () => {
  const towerInnerEdge = CASTLE_LAYOUT.width / 2 - CASTLE_LAYOUT.towerSize;
  const halfWidth = 29 * CASTLE_WINDOW_WIDTH_SCALE / 2;
  assert.equal(CASTLE_WINDOW_LEVELS.length, 2);
  assert.ok(CASTLE_WINDOW_LEVELS[1] - CASTLE_WINDOW_LEVELS[0] > 30);
  for (let i = 0; i < CASTLE_FRONT_WINDOWS.length; i += 1) {
    const x = CASTLE_FRONT_WINDOWS[i];
    assert.ok(Math.abs(x) + halfWidth < towerInnerEdge);
    assert.ok(Math.abs(x) - halfWidth > 35, 'both levels clear the full width of the gate');
    if (i) assert.ok(x - CASTLE_FRONT_WINDOWS[i - 1] > 2 * halfWidth);
  }
});

test('arched tower windows clear the roof, battlements and banners', () => {
  const { upper, lower, rear } = CASTLE_TOWER_WINDOWS;
  for (const spec of [upper, lower, rear]) {
    assert.ok(spec.innerWidth < spec.width);
    assert.ok(spec.innerHeight + 2 < spec.height);
    const surround = createCastleArchGeometry(spec.width, spec.spring, spec.height);
    const pane = createCastleArchGeometry(spec.innerWidth, spec.innerSpring, spec.innerHeight);
    try {
      assert.equal(surround.boundingBox.max.y, spec.height);
      assert.equal(pane.boundingBox.max.y, spec.innerHeight);
    } finally {
      surround.dispose(); pane.dispose();
    }
  }
  assert.ok(CASTLE_LAYOUT.towerHeight + rear.bottomOffset < 174, 'rear windows sit below the roofline');
  const towerX = (CASTLE_LAYOUT.width - CASTLE_LAYOUT.towerSize) / 2;
  assert.ok(towerX + rear.outwardOffset - (rear.width + 4) / 2 > 124, 'rear windows and sills clear the keep');
  assert.ok(rear.outwardOffset + (rear.width + 4) / 2 < CASTLE_LAYOUT.towerSize / 2, 'rear windows stay within the towers');
  assert.ok(rear.bottomOffset + rear.height < -8, 'rear arch clears the parapet');
  assert.ok(lower.bottomOffset + lower.height < upper.bottomOffset, 'front windows do not overlap');
  assert.ok(upper.bottomOffset + upper.height < -48 - 6 * 1.05, 'upper window clears the banner');
  assert.ok(CASTLE_SIDE_BATTLEMENT_Z.length > 0);
  for (const z of CASTLE_SIDE_BATTLEMENT_Z) for (const tower of CASTLE_TOWERS) {
    assert.ok(Math.abs(z - tower.z) >= CASTLE_LAYOUT.towerSize / 2 + 6,
      'side battlements do not intersect either tower or its windows');
  }
});

test('gate planks and ironwork stay inside the arched opening', () => {
  assert.equal(CASTLE_GATE_PLANKS.length, 5);
  for (const plank of CASTLE_GATE_PLANKS) {
    const outerEdge = Math.abs(plank.x) + 4.6;
    const t = Math.sqrt(1 - outerEdge / 26);
    const openingTop = 57 + 24 * (2 * t - t * t);
    assert.ok(plank.top <= openingTop);
  }
});

test('castle supplies vary in size, finish and arrangement on the roof and exterior', () => {
  for (const supplies of [CASTLE_ROOF_SUPPLIES, CASTLE_EXTERIOR_SUPPLIES]) {
    assert.ok(supplies.length >= 6);
    assert.ok(new Set(supplies.map((item) => item.size)).size >= 3);
    assert.ok(new Set(supplies.map((item) => item.rotation)).size >= 3);
    for (const kind of ['barrel', 'crate']) {
      const items = supplies.filter((item) => item.kind === kind);
      assert.ok(new Set(items.map((item) => castleSupplyStyle(kind, item.variant).wood)).size >= 2);
    }
  }
  for (let i = 0; i < CASTLE_ROOF_SUPPLIES.length; i += 1) {
    const item = CASTLE_ROOF_SUPPLIES[i];
    const radius = (item.kind === 'barrel' ? 9.2 : Math.SQRT2 * 10) * item.size;
    assert.ok(Math.abs(item.x) + radius < 108);
    assert.ok(Math.abs(item.z - CASTLE_LAYOUT.centerOffset) + radius < 94);
    for (const other of CASTLE_ROOF_SUPPLIES.slice(i + 1)) {
      const otherRadius = (other.kind === 'barrel' ? 9.2 : Math.SQRT2 * 10) * other.size;
      assert.ok(Math.hypot(item.x - other.x, item.z - other.z) > radius + otherRadius);
    }
  }
  assert.throws(() => castleSupplyStyle('crate', 99), RangeError);
});

test('illustrated castle has four towers, heraldic banners and a layered arched gate', () => {
  const rectangles = [], fills = [], curves = [];
  const ctx = new Proxy({
    fillRect: (...args) => rectangles.push({ color: ctx.fillStyle, args }),
    fill: () => fills.push(ctx.fillStyle),
    quadraticCurveTo: (...args) => curves.push(args)
  }, { get: (target, key) => target[key] || (() => {}) });
  drawCastle(ctx);
  for (const [x, top, height] of [[-103, -247, 175], [103, -247, 175], [-85, -175, 175], [85, -175, 175]]) {
    assert.ok(rectangles.some(({ color, args }) => color === CASTLE_PALETTE.tower
      && args[0] === x - 22 && args[1] === top && args[2] === 44 && args[3] === height));
  }
  assert.equal(fills.filter((color) => color === CASTLE_PALETTE.royalBlue).length, 6,
    'four blue flags and two front banners, with no banners on the rear towers');
  assert.ok(rectangles.some(({ color, args }) => color === CASTLE_PALETTE.roof
    && args[0] === -90 && args[1] === -180 && args[2] === 180 && args[3] === 52), 'the keep has a flat stone roof');
  assert.ok(!rectangles.some(({ color, args }) => color === CASTLE_PALETTE.tower
    && args[0] === -23 && args[1] === -204), 'the rooftop access structure is removed');
  assert.equal(rectangles.filter(({ args }) => args[0] === -9 && args[1] === -24 && args[2] === 18 && args[3] === 24).length, 3);
  assert.equal(rectangles.filter(({ args }) => args[0] === -10 && args[1] === -20 && args[2] === 20 && args[3] === 20).length, 3);
  for (const top of [-109, -60]) for (const x of [-55, -39, 39, 55]) {
    assert.ok(rectangles.some(({ color, args }) => color === '#394c4c'
      && args[0] === x - 6 && args[1] === top && args[2] === 12 && args[3] === 19));
  }
  assert.ok(fills.indexOf(CASTLE_PALETTE.trim) < fills.indexOf(CASTLE_PALETTE.gate));
  assert.equal(fills.filter((color) => color === CASTLE_PALETTE.windowGlass).length, 6, 'all tower windows have arched panes');
  assert.equal(curves.length, 28, 'six layered tower windows and the gate have arched crowns');
  for (const x of [-117, 117]) {
    assert.ok(curves.some((args) => args[0] === x - 7 && args[1] === -189 && args[2] === x && args[3] === -189),
      'rear tower windows are lower and toward the outside');
  }
  for (const plank of CASTLE_GATE_PLANKS) {
    assert.ok(rectangles.some(({ color, args }) => color === plank.color
      && args[0] === plank.x * 0.9 - 4.1 && args[2] === 8.2));
  }
  assert.ok(rectangles.some(({ color, args }) => color === CASTLE_PALETTE.gateIron
    && args[0] === -22 && args[2] === 44), 'iron bands reinforce the gate');
  assert.throws(() => drawCastleSupply(ctx, 'unknown'), RangeError);
});
