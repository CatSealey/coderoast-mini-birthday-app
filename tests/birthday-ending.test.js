import test from 'node:test';
import assert from 'node:assert/strict';
import { BIRTHDAY_DIALOGUE, BIRTHDAY_ENTRANCE, BIRTHDAY_FAMILY, birthdayArrivalPath, birthdayFamilyPaths, createBirthdayEnding } from '../js/games/birthday-ending.js';
import { createCollision } from '../js/world/world-collision.js';

test('the birthday conversation starts after arrival and advances on demand', () => {
  const events = [];
  const ending = createBirthdayEnding((phase, line) => events.push({ phase, line }));
  ending.advance();
  ending.start();
  ending.advance();
  assert.deepEqual(events, [{ phase: 'arriving', line: null }]);
  ending.arrive();
  assert.deepEqual(events.at(-1), { phase: 'dialogue', line: BIRTHDAY_DIALOGUE[0] });
  ending.advance(); ending.advance(); ending.advance();
  assert.deepEqual(events.slice(1).map((event) => event.line), BIRTHDAY_DIALOGUE);
  ending.advance();
  assert.deepEqual(events.at(-1), { phase: 'finished', line: null });
  ending.advance();
  assert.equal(events.length, 6);
  ending.start(); ending.arrive();
  assert.deepEqual(events.at(-1), { phase: 'dialogue', line: BIRTHDAY_DIALOGUE[0] });
  ending.stop(); ending.advance();
  assert.equal(events.length, 8);
});

test('Cat can enter around the present from every accessible side', () => {
  assert.deepEqual(BIRTHDAY_FAMILY.map((member) => member.id),
    ['gran', 'grandad', 'mum', 'sister', 'nephew-1', 'nephew-2', 'cousin']);
  const collision = createCollision([
    ...[110, 255, 400, 545, 690].map((x) => ({ x, y: 120, width: 108, depth: 87 })),
    ...[[85, 330, 76, 50], [715, 330, 76, 50], [72, 510, 58, 58], [728, 510, 58, 58],
    [115, 250, 52, 52], [685, 250, 52, 52], [210, 575, 94, 14],
    [400, 0, 800, 120], [400, 600, 800, 50], [0, 300, 50, 600], [800, 300, 50, 600]]
      .map(([x, y, width, depth]) => ({ x, y, width, depth })),
    { x: 400, y: 325, radius: 47 }
  ], 10);
  for (const radius of [58, 60, 65, 69]) for (let i = 0; i < 32; i += 1) {
    const angle = i * Math.PI / 16;
    const player = { x: 400 + Math.cos(angle) * radius, z: 325 + Math.sin(angle) * radius };
    if (collision.blocked({ x: player.x, y: player.z })) continue;
    const path = birthdayArrivalPath(player, collision);
    assert.ok(path?.length, `arrival path at angle ${angle}`);
    let previous = BIRTHDAY_ENTRANCE;
    for (const point of path) {
      assert.ok(collision.clearSegment(previous, point), 'arrival avoids the hall furniture and present');
      previous = point;
    }
    assert.ok(Math.abs(Math.hypot(previous.x - player.x, previous.y - player.z) - 48) < 0.01);
    const guests = birthdayFamilyPaths(player, previous, collision);
    assert.equal(guests?.length, 7, `seven guests can enter at angle ${angle}`);
    const positions = [{ x: player.x, y: player.z }, previous];
    for (const guest of guests) {
      let start = BIRTHDAY_ENTRANCE;
      for (const point of guest.path) {
        assert.ok(collision.clearSegment(start, point), `${guest.member.id} avoids furniture and the present`);
        start = point;
      }
      assert.ok(positions.every((point) => Math.hypot(point.x - start.x, point.y - start.y) >= 60),
        `${guest.member.id} has a separate spot`);
      positions.push(start);
    }
  }
});
