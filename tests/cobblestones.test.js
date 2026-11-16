import test from 'node:test';
import assert from 'node:assert/strict';
import { cobblestoneShape, drawCobblestone } from '../js/world/cobblestones.js';

test('cobblestones are deterministic, irregular and remain within their original grid', () => {
  const first = cobblestoneShape(10, 20);
  assert.deepEqual(first, cobblestoneShape(10, 20));
  assert.notDeepEqual(first.points, cobblestoneShape(10, 21).points);
  const colors = new Set();
  for (let row = 0; row < 20; row += 1) {
    for (let col = 0; col < 20; col += 1) {
      const stone = cobblestoneShape(row, col);
      colors.add(stone.color);
      const originX = col * 25 + (row % 2) * 12, originY = row * 20;
      assert.equal(stone.points.length, 8);
      assert.ok(stone.points.every(({ x, y }) =>
        Number.isFinite(x) && Number.isFinite(y) && Math.abs(x - originX) <= 16 && Math.abs(y - originY) <= 11));
    }
  }
  assert.ok(colors.size >= 4);
});

test('cobblestones draw softened edges, shaded borders and surface grain', () => {
  let curves = 0, fills = 0, strokes = 0, grain = 0;
  const ctx = {
    beginPath() {}, moveTo() {}, closePath() {}, lineTo() {},
    quadraticCurveTo() { curves += 1; }, fill() { fills += 1; },
    stroke() { strokes += 1; }, fillRect() { grain += 1; }
  };
  drawCobblestone(ctx, 10, 20);
  assert.equal(curves, 9);
  assert.equal(fills, 1);
  assert.ok(strokes >= 2);
  assert.equal(grain, 3);
});
