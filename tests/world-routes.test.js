import test from 'node:test';
import assert from 'node:assert/strict';
import { CASTLE_ENTRANCE, QUEST_LOCATIONS, WORLD_ROUTES, WORLD_SCALE, WORLD_SPAWN } from '../js/world/world-data.js';
import { roadDistance } from '../js/world/world-art.js';
import { createCollision, worldObstacles } from '../js/world/world-collision.js';
import { DIRECTION_BOARDS, DIRECTION_SIGN, drawDirectionSign } from '../js/world/direction-sign.js';

const worldPoint = ([x, y]) => ({ x: x * WORLD_SCALE, y: y * WORLD_SCALE });

test('all roads join the castle door and junction, with GoApe independent of Thirteen', () => {
  for (const route of WORLD_ROUTES) {
    assert.deepEqual(worldPoint(route[0]), CASTLE_ENTRANCE);
    assert.deepEqual(worldPoint(route[1]), WORLD_SPAWN);
  }
  assert.deepEqual(worldPoint(WORLD_ROUTES[3].at(-1)), { x: QUEST_LOCATIONS[3].x, y: QUEST_LOCATIONS[3].y });
  assert.ok(roadDistance({ x: 1610 * WORLD_SCALE, y: 500 * WORLD_SCALE }) > 100,
    'the former Thirteen-to-GoApe road is gone');
  assert.equal(roadDistance(CASTLE_ENTRANCE), 0);
});

test('the new GoApe road is walkable from the junction to the guide approach', () => {
  const collision = createCollision(worldObstacles());
  const points = WORLD_ROUTES[3].slice(1).map(worldPoint);
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1], to = points[index];
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const end = index === points.length - 1 ? 1 - 40 / distance : 1;
    const steps = Math.ceil(distance / 8);
    for (let step = 0; step <= steps * end; step += 1) {
      const progress = step / steps;
      assert.equal(collision.blocked({
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress
      }), false, `blocked at segment ${index}, step ${step}`);
    }
  }
});

test('the compact junction sign is solid and its plain boards follow the routes', () => {
  const obstacles = worldObstacles();
  const collision = createCollision(obstacles);
  assert.equal(collision.blocked(DIRECTION_SIGN), true);
  assert.equal(collision.blocked(WORLD_SPAWN), false);
  const signIndex = obstacles.findIndex((item) => item.x === DIRECTION_SIGN.x && item.y === DIRECTION_SIGN.y
    && item.radius === DIRECTION_SIGN.radius);
  assert.notEqual(signIndex, -1);
  assert.equal(createCollision(obstacles.filter((_, index) => index !== signIndex), DIRECTION_SIGN.radius)
    .blocked(DIRECTION_SIGN), false, 'the post does not overlap other scenery');
  assert.ok(Math.hypot(DIRECTION_SIGN.x - WORLD_SPAWN.x, DIRECTION_SIGN.y - WORLD_SPAWN.y) < 150);
  assert.equal(DIRECTION_SIGN.height, 72);
  assert.equal(DIRECTION_BOARDS.length, WORLD_ROUTES.length + 1);
  const destinations = [CASTLE_ENTRANCE, ...WORLD_ROUTES.map((route) => worldPoint(route[2]))];
  DIRECTION_BOARDS.forEach((board, index) => {
    const dx = destinations[index].x - WORLD_SPAWN.x, dy = destinations[index].y - WORLD_SPAWN.y;
    assert.ok(Math.abs(board.dx * dy - board.dy * dx) < 1e-9);
    assert.ok(board.dx * dx + board.dy * dy > 0);
    assert.ok(board.length <= 42);
  });
  let boardCount = 0;
  const context = {
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, fillRect() {},
    fill() { boardCount += 1; },
    fillText() { assert.fail('wooden boards should be unlabelled'); }
  };
  drawDirectionSign(context);
  assert.equal(boardCount, DIRECTION_BOARDS.length);
});
