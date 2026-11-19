import test from 'node:test';
import assert from 'node:assert/strict';
import { BIRTHDAY_DIALOGUE, BIRTHDAY_ENTRANCE, BIRTHDAY_FAMILY, BIRTHDAY_PLAYER_POSITION, BIRTHDAY_TICKET_MARKUP, VINNIE_HOME, birthdayArrivalPath, birthdayArrivalPose, birthdayDogFacing, birthdayFamilyPaths, birthdayGuestObstacles, birthdayGuestPlayerCollision, createBirthdayEnding, scheduleBirthdayArrivals } from '../js/games/birthday-ending.js';
import { createCollision, findWorldPath } from '../js/world/world-collision.js';
import { HALL_BOOKCASE_WIDTH, HALL_BOOKCASE_X, HALL_BOOKCASE_Z, HALL_PEDESTAL_DEPTH, HALL_PEDESTAL_WIDTH, HALL_PLANTER_X, HALL_TABLE_X } from '../js/games/castle-interior-art.js';
import { HALL_CENTER, HALL_WIDTH } from '../js/games/trophy-logic.js';

test('Vinnie blocks walking before the celebration and all visible guests block it afterwards', () => {
  const love = { x: 400, y: 440 };
  const family = BIRTHDAY_FAMILY.map((member, index) => ({
    member, visible: index !== 0, position: { x: 200 + index * 50, y: 300 }
  }));
  for (const phase of ['idle', 'positioning', 'arriving', 'dialogue']) {
    assert.deepEqual(birthdayGuestObstacles(phase, love, family), [{ x: 550, y: 300, radius: 16 }]);
  }
  const obstacles = birthdayGuestObstacles('finished', love, family);
  assert.equal(obstacles.length, 8);
  assert.equal(obstacles[4].radius, 16 * BIRTHDAY_FAMILY[4].size);
  const collision = createCollision(obstacles, 10);
  for (const guest of obstacles) {
    const start = { x: guest.x, y: guest.y - 40 };
    assert.ok(collision.blocked(guest));
    assert.ok(!collision.clearSegment(start, { x: guest.x, y: guest.y + 40 }));
    assert.notDeepEqual(collision.move(start, 0, 80), { x: guest.x, y: guest.y + 40 });
  }
  for (const member of BIRTHDAY_FAMILY) {
    const playerCollision = birthdayGuestPlayerCollision({ x: 400, z: 390 }, member);
    assert.ok(playerCollision.blocked({ x: 400, y: 390 }));
    assert.ok(!playerCollision.clearSegment({ x: 400, y: 350 }, { x: 400, y: 430 }));
  }
});

test('the shared birthday ticket keeps its voucher artwork and message', () => {
  assert.match(BIRTHDAY_TICKET_MARKUP, /trophy-room__ticket-art/);
  assert.match(BIRTHDAY_TICKET_MARKUP, /Admit one/);
  assert.match(BIRTHDAY_TICKET_MARKUP, /Cuddles &amp; films/);
  assert.match(BIRTHDAY_TICKET_MARKUP, /your person fan/);
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

test('a restored celebration remains finished until the present is replayed', () => {
  const events = [];
  const ending = createBirthdayEnding((phase, line) => events.push({ phase, line }), true);
  ending.advance(); ending.arrive(); ending.positioned();
  assert.deepEqual(events, []);
  ending.start();
  assert.deepEqual(events, [{ phase: 'positioning', line: null }]);
  ending.positioned(); ending.arrive();
  assert.deepEqual(events.at(-1), { phase: 'dialogue', line: BIRTHDAY_DIALOGUE[0] });
});

test('Cat approaches diagonally from the left, with a nearby alternative if that spot is blocked', () => {
  const player = BIRTHDAY_PLAYER_POSITION;
  const preferred = { x: player.x + 48 * Math.cos(5 * Math.PI / 6), y: player.z + 48 * Math.sin(5 * Math.PI / 6) };
  const open = createCollision([], 0);
  assert.deepEqual(birthdayArrivalPath(player, open).at(-1), preferred);
  const blocked = createCollision([{ x: preferred.x, y: preferred.y, radius: 5 }], 0);
  const alternative = birthdayArrivalPath(player, blocked);
  assert.ok(alternative?.length);
  const end = alternative.at(-1);
  assert.ok(end.x < player.x && !blocked.blocked(end));
  assert.ok(Math.abs(Math.hypot(end.x - player.x, end.y - player.z) - 48) < 1e-6);
  let previous = BIRTHDAY_ENTRANCE;
  for (const point of alternative) {
    assert.ok(blocked.clearSegment(previous, point));
    previous = point;
  }
});

test('every side of the present has a safe route to the same spacious celebration', () => {
  assert.deepEqual(BIRTHDAY_FAMILY.map((member) => member.id),
    ['gran', 'grandad', 'mum', 'sister', 'nephew-1', 'nephew-2', 'cousin', 'dog']);
  const olderChild = BIRTHDAY_FAMILY.find((member) => member.id === 'nephew-1');
  const youngerChild = BIRTHDAY_FAMILY.find((member) => member.id === 'nephew-2');
  assert.ok(youngerChild.size < olderChild.size && youngerChild.size >= olderChild.size * 0.85,
    'the mustard-clothed child is slightly smaller than the other child');
  const collision = createCollision([
    ...[230, 375, 520, 665, 810].map((x) => ({ x, y: 120, width: HALL_PEDESTAL_WIDTH, depth: HALL_PEDESTAL_DEPTH })),
    ...HALL_BOOKCASE_X.flatMap((x) => HALL_BOOKCASE_Z.map((z) => ({ x, y: z + 3, width: HALL_BOOKCASE_WIDTH, depth: 24 }))),
    ...HALL_TABLE_X.map((x) => ({ x, y: 330, width: 76, depth: 50 })),
    ...HALL_PLANTER_X.map((x) => ({ x, y: 510, width: 58, depth: 58 })),
    ...[[HALL_CENTER, 0, HALL_WIDTH, 120], [HALL_CENTER, 600, HALL_WIDTH, 50], [0, 300, 50, 600], [HALL_WIDTH, 300, 50, 600]]
      .map(([x, y, width, depth]) => ({ x, y, width, depth })),
    { x: HALL_CENTER, y: 325, radius: 47 }
  ], 10);
  assert.ok(Math.hypot(BIRTHDAY_PLAYER_POSITION.x - HALL_CENTER, BIRTHDAY_PLAYER_POSITION.z - 325) < 70,
    'the present is still in range for replay after the celebration');
  let scheduleChecked = false;
  for (const radius of [58, 60, 65, 69]) for (let i = 0; i < 32; i += 1) {
    const angle = i * Math.PI / 16;
    const player = { x: HALL_CENTER + Math.cos(angle) * radius, z: 325 + Math.sin(angle) * radius };
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
      assert.ok(segmentDistance(previous, point, target) >= 38, 'Cat does not walk through the player');
      previous = point;
    }
    assert.ok(Math.abs(Math.hypot(previous.x - target.x, previous.y - target.y) - 48) < 0.01);
    assert.ok(Math.abs(previous.x - (target.x - 24 * Math.sqrt(3))) < 1e-6, 'Cat stands slightly left of the player');
    assert.ok(Math.abs(previous.y - (target.y + 24)) < 1e-6, 'Cat stands diagonally towards the entrance');
    const guests = birthdayFamilyPaths(BIRTHDAY_PLAYER_POSITION, previous, collision);
    assert.equal(guests?.length, 8, `family and dog can enter at angle ${angle}`);
    if (!scheduleChecked) {
      const schedule = scheduleBirthdayArrivals(path, guests);
      assert.ok(schedule);
      const residentPaths = birthdayFamilyPaths(BIRTHDAY_PLAYER_POSITION, previous, collision, VINNIE_HOME);
      const residentSchedule = scheduleBirthdayArrivals(path, residentPaths);
      assert.ok(residentSchedule, 'Vinnie can join the celebration from inside the hall');
      const dogTrajectory = residentSchedule.family.find((entry) => entry.memberId === 'dog');
      assert.deepEqual(birthdayArrivalPose(dogTrajectory, 0).position, VINNIE_HOME);
      assert.deepEqual(birthdayArrivalPose(dogTrajectory, residentSchedule.duration).position,
        residentPaths.find((guest) => guest.member.id === 'dog').destination);
      assert.ok(Math.hypot(dogTrajectory.points.at(-1).x - target.x, dogTrajectory.points.at(-1).y - target.y) <= 70);
      for (let time = 0; time <= residentSchedule.duration; time += 0.02) {
        const people = [birthdayArrivalPose(residentSchedule.cat, time).position];
        for (const entry of residentSchedule.family) {
          if (time < entry.start) continue;
          const position = birthdayArrivalPose(entry, time).position;
          assert.ok(people.every((person) => Math.hypot(person.x - position.x, person.y - position.y) >= 38 - 1e-7),
            'Vinnie and the arriving family keep clear of one another');
          people.push(position);
        }
      }
      const replayPaths = birthdayFamilyPaths(BIRTHDAY_PLAYER_POSITION, previous, collision, dogTrajectory.points.at(-1));
      const replaySchedule = scheduleBirthdayArrivals(path, replayPaths);
      assert.ok(replaySchedule, 'the celebration can replay with Vinnie already at the player’s side');
      assert.deepEqual(birthdayArrivalPose(replaySchedule.family.find((entry) => entry.memberId === 'dog'), 0).position,
        dogTrajectory.points.at(-1));
      assert.deepEqual(guests.map((guest) => guest.member.id),
        ['gran', 'cousin', 'grandad', 'nephew-1', 'dog', 'mum', 'sister', 'nephew-2']);
      assert.deepEqual(schedule.family.map((entry) => entry.memberId), guests.map((guest) => guest.member.id));
      const distances = guests.map(({ destination }) =>
        Math.hypot(destination.x - BIRTHDAY_ENTRANCE.x, destination.y - BIRTHDAY_ENTRANCE.y));
      assert.ok(distances.every((distance, index) => !index || distance <= distances[index - 1] + 1e-8),
        'guests with the farthest destinations enter first');
      assert.ok(schedule.family.every((entry, index) => entry.start > (index ? schedule.family[index - 1].start : 0)));
      assert.ok(schedule.family[0].start < schedule.cat.duration, 'the first guest enters before Cat reaches her position');
      assert.ok(schedule.family.some((entry, index) => index > 0
        && entry.start < schedule.family[index - 1].start + schedule.family[index - 1].duration),
      'family members follow without waiting for the person ahead to finish');
      assert.ok(schedule.duration < 12, 'the entrance is not unnecessarily drawn out');
      const grandad = guests.find((guest) => guest.member.id === 'grandad');
      assert.ok(Math.abs(grandad.destination.x - (target.x + 108.2531754730548)) < 1e-6);
      assert.ok(Math.abs(grandad.destination.y - (target.y + 62.5)) < 1e-6);
      assert.deepEqual(guests.find((guest) => guest.member.id === 'nephew-2').destination,
        { x: target.x, y: target.y + 125 }, 'the mustard-clothed child is at the centre of the semicircle');
      assert.ok(guests.every((guest) => guest.path.length === 1), 'each guest takes a direct route without detouring');
      const restoredGuests = birthdayGuestObstacles('finished', previous, guests.map((guest) => ({
        member: guest.member, position: guest.destination, visible: true
      })));
      const guestCollision = createCollision(restoredGuests, 10);
      const restoredCollision = {
        blocked: (point) => collision.blocked(point) || guestCollision.blocked(point),
        clearSegment: (start, end) => collision.clearSegment(start, end) && guestCollision.clearSegment(start, end)
      };
      const returnSpawn = { x: HALL_CENTER + 50, y: 550 };
      assert.equal(restoredCollision.blocked(returnSpawn), false, 'the returning player does not spawn inside a guest');
      const replayPath = findWorldPath(returnSpawn, target, restoredCollision);
      assert.deepEqual(replayPath?.at(-1), target, 'the present remains reachable through the restored family');
      assert.equal(guests.find((guest) => guest.member.id === 'mum').destination.x, target.x - 62.5);
      assert.ok(Math.abs(guests.find((guest) => guest.member.id === 'nephew-1').destination.x - (target.x - 108.2531754730548)) < 1e-6);
      assert.equal(guests.find((guest) => guest.member.id === 'cousin').destination.x, target.x - 125);
      assert.equal(schedule.settlements.length, 0, 'nobody needs to move again after reaching their spot');
      for (let time = 0; time <= schedule.duration; time += 0.01) {
        const people = [birthdayArrivalPose(schedule.cat, time).position];
        for (const [index, entry] of schedule.family.entries()) {
          if (time < entry.start) continue;
          const settlement = schedule.settlements.find((item) => item.index === index)?.trajectory;
          const pose = birthdayArrivalPose(settlement && time >= settlement.start ? settlement : entry, time);
          for (const person of people) {
            assert.ok(Math.hypot(person.x - pose.position.x, person.y - pose.position.y) >= 38 - 1e-7,
              'moving guests keep clear of one another');
          }
          assert.ok(Math.hypot(target.x - pose.position.x, target.y - pose.position.y) >= 38 - 1e-7);
          people.push(pose.position);
        }
      }
      for (const [index, guest] of guests.entries()) {
        const settlement = schedule.settlements.find((item) => item.index === index)?.trajectory;
        const final = birthdayArrivalPose(settlement || schedule.family[index], schedule.duration).position;
        assert.ok(Math.hypot(final.x - guest.destination.x, final.y - guest.destination.y) < 1e-6);
      }
      scheduleChecked = true;
    }
    const gran = guests.find((guest) => guest.member.id === 'gran').path.at(-1);
    assert.ok(gran.x > target.x, 'Gran stands beside the celebration while facing the player');
    const dog = guests.find((guest) => guest.member.kind === 'dog').path.at(-1);
    assert.ok(Math.hypot(dog.x - target.x, dog.y - target.y) <= 70, 'the dog stands next to the player');
    const facing = birthdayDogFacing(dog, previous);
    assert.ok(Math.abs(Math.sin(facing) - (previous.x - dog.x) / Math.hypot(previous.x - dog.x, previous.y - dog.y)) < 1e-10);
    assert.ok(Math.abs(Math.cos(facing) - (previous.y - dog.y) / Math.hypot(previous.x - dog.x, previous.y - dog.y)) < 1e-10);
    const positions = [target, previous];
    for (const guest of guests) {
      let start = BIRTHDAY_ENTRANCE;
      for (const point of guest.path) {
        assert.ok(collision.clearSegment(start, point), `${guest.member.id} avoids furniture and the present`);
        for (const occupied of positions) {
          assert.ok(segmentDistance(start, point, occupied) >= 38 - 1e-8,
            `${guest.member.id} avoids the player and guests who arrived earlier`);
        }
        start = point;
      }
      assert.ok(Math.hypot(start.x - BIRTHDAY_ENTRANCE.x, start.y - BIRTHDAY_ENTRANCE.y) >= 40,
        `${guest.member.id} leaves the entrance clear`);
      assert.ok(positions.every((point) => Math.hypot(point.x - start.x, point.y - start.y) >= 38),
        `${guest.member.id} has a separate spot`);
      positions.push(start);
    }
  }
});

function segmentDistance(start, end, point) {
  const dx = end.x - start.x, dy = end.y - start.y, lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
  return Math.hypot(start.x + dx * t - point.x, start.y + dy * t - point.y);
}
