import test from 'node:test';
import assert from 'node:assert/strict';
import { COBBLESTONE_SPACING, cobblestoneShape, drawCobblestone } from '../js/world/cobblestones.js';

test('cobblestones are deterministic, irregular and remain within their grid', () => {
  const first = cobblestoneShape(10, 20);
  assert.deepEqual(first, cobblestoneShape(10, 20));
  assert.notDeepEqual(first.points, cobblestoneShape(10, 21).points);
  const colors = new Set();
  for (let row = 0; row < 20; row += 1) {
    for (let col = 0; col < 20; col += 1) {
      const stone = cobblestoneShape(row, col);
      colors.add(stone.color);
      const originX = col * COBBLESTONE_SPACING.x + (row % 2) * COBBLESTONE_SPACING.x / 2;
      const originY = row * COBBLESTONE_SPACING.y;
      assert.equal(stone.points.length, 8);
      assert.ok(stone.points.every(({ x, y }) =>
        Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - originX) <= 16 && Math.abs(y - originY) <= 11));
    }
  }
  assert.ok(colors.size >= 4);
});

test('stones are placed closer together while retaining staggered rows', () => {
  assert.equal(COBBLESTONE_SPACING.x, 23);
  assert.equal(COBBLESTONE_SPACING.y, 18.5);
  const count = 100;
  const first = cobblestoneShape(10, 0), last = cobblestoneShape(10, count);
  assert.ok((last.x - first.x) / count < 23.1, 'horizontal spacing is tighter than the previous 25 units');
  const top = cobblestoneShape(0, 0), bottom = cobblestoneShape(count, 0);
  assert.ok((bottom.y - top.y) / count < 18.6, 'vertical spacing is tighter than the previous 20 units');
  const nextRow = cobblestoneShape(11, 0);
  assert.ok(Math.abs((nextRow.x - first.x) - COBBLESTONE_SPACING.x / 2) < 2.5);
});

test('cobblestones draw a ground shadow, directional shading, bevels and surface grain', () => {
  let curves = 0, strokes = 0;
  const grain = [];
  const fills = [], stops = [], gradients = [];
  const ctx = {
    beginPath() {}, moveTo() {}, closePath() {}, lineTo() {},
    quadraticCurveTo() { curves += 1; }, fill() { fills.push(this.fillStyle); },
    stroke() { strokes += 1; }, fillRect(...args) { grain.push({ color: this.fillStyle, args }); },
    createLinearGradient(...args) {
      gradients.push(args);
      return { addColorStop: (...stop) => stops.push(stop) };
    }
  };
  drawCobblestone(ctx, 10, 20);
  assert.equal(curves, 22);
  assert.equal(fills.length, 3);
  assert.equal(fills[0], 'rgba(42, 48, 39, .38)');
  assert.equal(fills[1], cobblestoneShape(10, 20).color);
  assert.ok(gradients[0][1] < gradients[0][3], 'light falls from top to bottom');
  assert.deepEqual(stops.map(([offset]) => offset), [0, 0.48, 1]);
  assert.ok(strokes >= 3);
  assert.ok(grain.length >= 8 && grain.length <= 14);
  assert.ok(grain.some(({ color }) => color === 'rgba(242, 229, 197, .32)'), 'pits have a lighter edge');
  assert.ok(new Set(grain.map(({ color }) => color)).size >= 3);
});

test('surface wear is deterministic, varied and stays within the stone', () => {
  function wear(row, col) {
    const marks = [];
    const ctx = {
      beginPath() {}, moveTo() {}, closePath() {}, lineTo() {}, quadraticCurveTo() {}, fill() {}, stroke() {},
      fillRect(...args) { marks.push({ color: this.fillStyle, args }); },
      createLinearGradient: () => ({ addColorStop() {} })
    };
    drawCobblestone(ctx, row, col);
    return marks;
  }
  const examples = new Set();
  for (let col = 0; col < 30; col += 1) {
    const stone = cobblestoneShape(10, col), marks = wear(10, col);
    assert.deepEqual(marks, wear(10, col));
    examples.add(marks.length);
    for (const { args: [x, y, width, height] } of marks) {
      assert.ok(Math.abs(x - stone.x) + width < stone.width * 0.5);
      assert.ok(Math.abs(y - stone.y) + height < stone.height * 0.5);
    }
  }
  assert.ok(examples.size >= 3, 'stones have different numbers of pits');
});
