import test from 'node:test';
import assert from 'node:assert/strict';
import { BIRTHDAY_DIALOGUE, BIRTHDAY_ENTRANCE, BIRTHDAY_FAMILY, BIRTHDAY_PLAYER_POSITION, BIRTHDAY_TICKET_MARKUP, birthdayArrivalPath, birthdayFamilyPaths, createBirthdayEnding } from '../js/games/birthday-ending.js';
import { createCollision, findWorldPath } from '../js/world/world-collision.js';

test('the shared birthday ticket keeps its voucher artwork and message', () => {
  assert.match(BIRTHDAY_TICKET_MARKUP, /trophy-room__ticket-art/);
  assert.match(BIRTHDAY_TICKET_MARKUP, /Admit one/);
  assert.match(BIRTHDAY_TICKET_MARKUP, /Cuddles &amp; films/);
  assert.match(BIRTHDAY_TICKET_MARKUP, /your favourite Arsenal fan/);
  assert.match(BIRTHDAY_TICKET_MARKUP, /Love, Cat/);
});

test('the birthday conversation starts after arrival and advances on demand', () => {
  const events = [];
  const ending = createBirthdayEnding((phase, line) => events.push({ phase, line }));
  ending.advance();
  ending.start();
  ending.advance();
  assert.deepEqual(events, [{ phase: 'positioning', line: null }]);
  ending.arrive();
  assert.equal(events.length, 1);
  ending.positioned();
  assert.deepEqual(events.at(-1), { phase: 'arriving', line: null });
  ending.arrive();
  assert.deepEqual(events.at(-1), { phase: 'dialogue', line: BIRTHDAY_DIALOGUE[0] });
  for (let i = 1; i < BIRTHDAY_DIALOGUE.length; i += 1) ending.advance();
  assert.deepEqual(events.slice(2).map((event) => event.line), BIRTHDAY_DIALOGUE);
  assert.equal(events.at(-1).line.speaker, 'Cat');
  assert.equal(events.at(-1).line.gift, 'ticket');
  assert.match(BIRTHDAY_DIALOGUE[0].message, /Gran brought you a cake/);
  ending.advance();
  assert.deepEqual(events.at(-1), { phase: 'finished', line: null });
  ending.advance();
  assert.equal(events.length, BIRTHDAY_DIALOGUE.length + 3);
  ending.start(); ending.positioned(); ending.arrive();
  assert.deepEqual(events.at(-1), { phase: 'dialogue', line: BIRTHDAY_DIALOGUE[0] });
  ending.stop(); ending.advance();
  assert.equal(events.length, BIRTHDAY_DIALOGUE.length + 6);
});

test('every side of the present has a safe route to the same spacious celebration', () => {
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
  assert.ok(Math.hypot(BIRTHDAY_PLAYER_POSITION.x - 400, BIRTHDAY_PLAYER_POSITION.z - 325) < 70,
    'the present is still in range for replay after the celebration');
  for (const radius of [58, 60, 65, 69]) for (let i = 0; i < 32; i += 1) {
    const angle = i * Math.PI / 16;
    const player = { x: 400 + Math.cos(angle) * radius, z: 325 + Math.sin(angle) * radius };
    if (collision.blocked({ x: player.x, y: player.z })) continue;
    const target = { x: BIRTHDAY_PLAYER_POSITION.x, y: BIRTHDAY_PLAYER_POSITION.z };
    const staging = findWorldPath({ x: player.x, y: player.z }, target, collision);
    assert.ok(staging?.length);
    assert.deepEqual(staging.at(-1), target);
    let stagingPrevious = { x: player.x, y: player.z };
    for (const point of staging) {
      assert.ok(collision.clearSegment(stagingPrevious, point));
      stagingPrevious = point;
    }
    const path = birthdayArrivalPath(BIRTHDAY_PLAYER_POSITION, collision);
    assert.ok(path?.length, `arrival path at angle ${angle}`);
    let previous = BIRTHDAY_ENTRANCE;
    for (const point of path) {
      assert.ok(collision.clearSegment(previous, point), 'arrival avoids the hall furniture and present');
      previous = point;
    }
    assert.ok(Math.abs(Math.hypot(previous.x - target.x, previous.y - target.y) - 48) < 0.01);
    const guests = birthdayFamilyPaths(BIRTHDAY_PLAYER_POSITION, previous, collision);
    assert.equal(guests?.length, 7, `seven guests can enter at angle ${angle}`);
    const gran = guests[0].path.at(-1);
    assert.ok(gran.x > target.x, 'Gran stands beside the celebration while facing the player');
    const positions = [target, previous];
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
