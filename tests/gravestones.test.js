import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGravestoneGeometry, createGravestoneTexture, drawGravestoneFace, gravestoneLean, gravestoneStyle, GRAVESTONE_DEPTH, GRAVESTONE_HEIGHT, GRAVESTONE_WIDTH } from '../js/world/gravestones.js';
import { QUEST_LOCATIONS } from '../js/world/world-data.js';
import { placeQuestDecorations } from '../js/world/world-scenery-data.js';
import { worldObstacles } from '../js/world/world-collision.js';

function recordingContext() {
  const events = [];
  const ctx = {
    events,
    beginPath() { events.push(['begin']); },
    closePath() { events.push(['close']); },
    moveTo(...args) { events.push(['move', ...args]); },
    lineTo(...args) { events.push(['line', ...args]); },
    quadraticCurveTo(...args) { events.push(['curve', ...args]); },
    fill() { events.push(['fill', this.fillStyle]); },
    stroke() { events.push(['stroke', this.strokeStyle]); },
    fillRect(...args) { events.push(['rect', typeof this.fillStyle === 'string' ? this.fillStyle : 'gradient', ...args]); },
    save() {}, restore() {}, clip() {}, scale() {},
    createLinearGradient: () => ({ addColorStop() {} })
  };
  return ctx;
}

test('gravestones have three distinct solid silhouettes within their existing footprint', () => {
  const widths = [];
  for (const variant of [0, 1, 2]) {
    const geometry = createGravestoneGeometry(variant);
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    assert.ok(max.x - min.x <= GRAVESTONE_WIDTH);
    assert.ok(max.y - min.y <= GRAVESTONE_HEIGHT);
    assert.equal(max.z - min.z, GRAVESTONE_DEPTH);
    widths.push(max.x - min.x);
    geometry.dispose();
  }
  assert.equal(new Set(widths).size, 3);
  assert.throws(() => createGravestoneGeometry(3), RangeError);
});

test('gravestone artwork is weathered, varied and deterministic in both renderers', () => {
  const colors = new Set(), outlines = new Set();
  const graves = placeQuestDecorations(QUEST_LOCATIONS[0], 'escape', 22, 560, 12);
  const obstacles = worldObstacles();
  for (const grave of graves) {
    colors.add(gravestoneStyle(grave.x, grave.y).stone);
    const ctx = recordingContext(), repeat = recordingContext();
    drawGravestoneFace(ctx, grave.variant, grave.x, grave.y);
    drawGravestoneFace(repeat, grave.variant, grave.x, grave.y);
    assert.deepEqual(ctx.events, repeat.events);
    assert.ok(ctx.events.filter(([op]) => op === 'rect').length >= 110, 'stone has grain, staining and moss');
    assert.ok(ctx.events.filter(([op]) => op === 'stroke').length >= 3, 'stone has engraving, cracks and an outline');
    assert.ok(ctx.events.some(([op, color]) => op === 'stroke' && color === 'rgba(29, 37, 32, .68)'), 'stone has deep cracks');
    assert.ok(Math.abs(gravestoneLean(grave.rotation)) <= 0.123, 'lean remains modest');
    outlines.add(grave.variant);
    assert.ok(obstacles.some((item) => item.x === grave.x && item.y === grave.y && item.radius === 14 * grave.scale));
  }
  assert.equal(outlines.size, 3);
  assert.ok(colors.size >= 4);
});

test('gravestone silhouettes have chipped edges and staining varies by location', () => {
  const chips = [[[42, 16], [49, 8]], [[35, 15], [42, 6]], [[48, 10], [53, 16]]];
  for (const variant of [0, 1, 2]) {
    const first = recordingContext(), second = recordingContext();
    drawGravestoneFace(first, variant, 123, 456);
    drawGravestoneFace(second, variant, 124, 456);
    for (const [x, y] of chips[variant]) {
      assert.ok(first.events.some(([op, px, py]) => op === 'line' && px === x && py === y));
    }
    assert.notDeepEqual(first.events, second.events, 'weathering differs between stones');
  }
});

test('gravestone texture uses the same face artwork and sRGB colors', () => {
  const previousDocument = globalThis.document;
  const ctx = recordingContext();
  globalThis.document = { createElement: () => ({ getContext: () => ctx }) };
  try {
    const texture = createGravestoneTexture(1, 123, 456);
    const direct = recordingContext();
    drawGravestoneFace(direct, 1, 123, 456);
    assert.deepEqual(ctx.events, direct.events);
    assert.equal(texture.image.width, 200);
    assert.equal(texture.image.height, 320);
    assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
    texture.dispose();
    globalThis.document = { createElement: () => ({ getContext: () => null }) };
    assert.throws(() => createGravestoneTexture(1, 0, 0), /Could not create the gravestone texture/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
