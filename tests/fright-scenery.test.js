import test from 'node:test';
import assert from 'node:assert/strict';
import { CELL, FRIGHT_MAZE, FRIGHT_THEMES } from '../js/games/fright-logic.js';
import { FRIGHT_PALETTES, FRIGHT_WALL_WIDTH, drawFrightTileDetail, frightWallSegments, paintFrightConsole, paintFrightDocument, paintFrightFloor, paintFrightWall } from '../js/games/fright-scenery.js';

test('slim wall segments connect within wall tiles without changing the maze', () => {
  const original = [...FRIGHT_MAZE];
  assert.ok(FRIGHT_WALL_WIDTH <= CELL / 3);
  FRIGHT_MAZE.forEach((row, y) => [...row].forEach((tile, x) => {
    const segments = frightWallSegments(FRIGHT_MAZE, x, y);
    if (tile !== '#') { assert.deepEqual(segments, []); return; }
    assert.ok(segments.length > 0);
    assert.ok(segments.reduce((sum, segment) => sum + segment.width * segment.depth, 0) < CELL * CELL * 0.6);
    for (const segment of segments) {
      assert.ok(Math.abs(segment.x) + segment.width / 2 <= CELL / 2);
      assert.ok(Math.abs(segment.z) + segment.depth / 2 <= CELL / 2);
      assert.ok(segment.width <= FRIGHT_WALL_WIDTH || segment.depth <= FRIGHT_WALL_WIDTH);
    }
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const reachesEdge = segments.some((segment) => dx
        ? segment.x + dx * segment.width / 2 === dx * CELL / 2 && Math.abs(segment.z) < segment.depth / 2
        : segment.z + dy * segment.depth / 2 === dy * CELL / 2 && Math.abs(segment.x) < segment.width / 2);
      assert.equal(reachesEdge, FRIGHT_MAZE[y + dy]?.[x + dx] === '#');
    }
  }));
  assert.deepEqual(FRIGHT_MAZE, original);
});

test('each themed floor and illustrated tile has its own details', () => {
  const themes = [null, ...FRIGHT_THEMES.map(({ id }) => id)];
  const signatures = new Set();
  const tileSignatures = new Set();
  for (const theme of themes) {
    const rectangles = [];
    const ctx = { fillRect(x, y, width, height) { rectangles.push([this.fillStyle, x, y, width, height]); } };
    paintFrightFloor(ctx, theme);
    assert.ok(rectangles.length > 3);
    assert.equal(rectangles[0][0], theme ? FRIGHT_PALETTES[theme][0] : '#665d49');
    signatures.add(JSON.stringify(rectangles));
    rectangles.length = 0;
    drawFrightTileDetail(ctx, 0, 0, CELL, '.', theme, 1, 2);
    assert.ok(rectangles.length >= 5);
    rectangles.length = 0;
    drawFrightTileDetail(ctx, 0, 0, CELL, '#', theme, 1, 2);
    assert.ok(rectangles.length >= 6);
    tileSignatures.add(JSON.stringify(rectangles));
  }
  assert.equal(signatures.size, themes.length);
  assert.equal(tileSignatures.size, themes.length);
});

test('maze wall textures provide distinct themed panels and varied neutral timber', () => {
  const paint = (theme, variant = 0, top = false) => {
    const rectangles = [];
    const ctx = { fillRect(x, y, width, height) { rectangles.push([this.fillStyle, x, y, width, height]); } };
    paintFrightWall(ctx, theme, variant, top);
    return rectangles;
  };
  const themes = FRIGHT_THEMES.map(({ id }) => id);
  const panels = themes.map((theme) => paint(theme));
  assert.equal(new Set(panels.map(JSON.stringify)).size, themes.length);
  for (const [index, panel] of panels.entries()) {
    assert.equal(panel[0][0], FRIGHT_PALETTES[themes[index]][1]);
    assert.ok(panel.length >= 10);
  }
  const neutral = [0, 1, 2].map((variant) => paint(null, variant));
  assert.equal(new Set(neutral.map(JSON.stringify)).size, 3);
  assert.notDeepEqual(paint(null, 0), paint(null, 0, true));
  assert.deepEqual(paint(null, 1), paint(null, 1));
});

test('clue documents and mechanism panels are distinct for all seven themes', () => {
  const paint = (fn, ...args) => {
    const rectangles = [];
    const ctx = { fillRect(x, y, width, height) { rectangles.push([this.fillStyle, x, y, width, height]); } };
    fn(ctx, ...args);
    return rectangles;
  };
  const themes = FRIGHT_THEMES.map(({ id }) => id);
  const documents = themes.map((theme) => paint(paintFrightDocument, theme, 0));
  const consoles = themes.map((theme) => paint(paintFrightConsole, theme));
  assert.equal(new Set(documents.map(JSON.stringify)).size, themes.length);
  assert.equal(new Set(consoles.map(JSON.stringify)).size, themes.length);
  for (const theme of themes) {
    const variations = [0, 1, 2].map((variant) => paint(paintFrightDocument, theme, variant));
    assert.equal(new Set(variations.map(JSON.stringify)).size, 3);
    assert.ok(variations.every((entries) => entries.length >= 12));
    assert.deepEqual(paint(paintFrightDocument, theme, 1), variations[1]);
    assert.ok(paint(paintFrightConsole, theme).length >= 15);
    assert.deepEqual(paint(paintFrightConsole, theme), paint(paintFrightConsole, theme));
  }
});
