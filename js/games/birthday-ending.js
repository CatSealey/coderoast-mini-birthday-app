import { createCollision, findWorldPath } from '../world/world-collision.js';
import { vinnieObstacles } from './birthday-dog.js';
import { HALL_CENTER, TROPHY_EXIT } from './trophy-logic.js';

export const BIRTHDAY_ENTRANCE = Object.freeze({ x: TROPHY_EXIT.x, y: TROPHY_EXIT.z - 20 });
export const BIRTHDAY_PLAYER_POSITION = Object.freeze({ x: HALL_CENTER, z: 390 });
export const VINNIE_HOME = Object.freeze({ x: HALL_CENTER + 180, y: 450 });
export const BIRTHDAY_CAKE_OFFSET = 25;
export const BIRTHDAY_CAKE_RADIUS = 18;
const GUEST_CLEARANCE = 38;
const ARRIVAL_SPEED = 120;
const ARRIVAL_INTERVAL = 0.1;

export const BIRTHDAY_TICKET_MARKUP = `<div class="trophy-room__ticket-art">
  <span class="trophy-room__ticket-eyebrow">Special birthday reward unlocked</span>
  <span class="trophy-room__ticket-ornament" aria-hidden="true">✦ &nbsp; ♡ &nbsp; ✦</span>
  <strong>Admit one</strong>
  <span class="trophy-room__ticket-intro">This ticket is good for</span>
  <b>Cuddles &amp; films</b>
  <span class="trophy-room__ticket-details">Redeem any time <br>with your person.</span>
  <span class="trophy-room__ticket-signature">Love, Cat ♡</span>
  <span class="trophy-room__ticket-stub">HAPPY BIRTHDAY · VALID ALWAYS</span>
</div>`;

function withGuestObstacles(collision, positions, clearance) {
  const clearOfPeople = (start, end) => {
    const dx = end.x - start.x, dy = end.y - start.y, lengthSquared = dx * dx + dy * dy;
    return positions.every((point) => {
      const projection = lengthSquared ? Math.max(0, Math.min(1,
        ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
      return Math.hypot(start.x + dx * projection - point.x, start.y + dy * projection - point.y) >= clearance;
    });
  };
  return {
    blocked: (point) => collision.blocked(point) || !clearOfPeople(point, point),
    clearSegment: (start, end) => collision.clearSegment(start, end) && clearOfPeople(start, end)
  };
}

export function birthdayArrivalPath(player, collision) {
  const angle = 5 * Math.PI / 6;
  const routeCollision = withGuestObstacles(collision, [{ x: player.x, y: player.z }], GUEST_CLEARANCE);
  for (let i = 0; i < 16; i += 1) {
    const direction = angle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8;
    const destination = { x: player.x + Math.cos(direction) * 48, y: player.z + Math.sin(direction) * 48 };
    if (routeCollision.blocked(destination)) continue;
    const path = findWorldPath(BIRTHDAY_ENTRANCE, destination, routeCollision);
    const end = path?.at(-1);
    if (end && Math.hypot(end.x - destination.x, end.y - destination.y) < 1) return path;
  }
  return null;
}

export const BIRTHDAY_FAMILY = Object.freeze([
  Object.freeze({ id: 'gran', outfit: '#8b7194', hair: '#c4beb2', hairLength: 'long', size: 0.92 }),
  Object.freeze({ id: 'grandad', outfit: '#6f7c82', hair: '#b3ada3', hairLength: 'short', size: 0.97 }),
  Object.freeze({ id: 'sister', outfit: '#b27372', hair: '#604438', hairLength: 'long', size: 1 }),
  Object.freeze({ id: 'mum', outfit: '#8a79a9', hair: '#171719', hairLength: 'short', size: 0.96 }),
  Object.freeze({ id: 'nephew-1', outfit: '#6885a1', hair: '#654a38', hairLength: 'short', size: 0.68 }),
  Object.freeze({ id: 'nephew-2', outfit: '#a18956', hair: '#513c32', hairLength: 'short', size: 0.62 }),
  Object.freeze({ id: 'cousin', outfit: '#657a64', hair: '#47372e', hairLength: 'short', size: 1 }),
  Object.freeze({ id: 'dog', kind: 'dog', size: 1 })
]);

export function birthdayCakePosition(guest) {
  const offset = BIRTHDAY_CAKE_OFFSET * guest.member.size;
  return {
    x: guest.position.x + Math.sin(guest.facing) * offset,
    y: guest.position.y + Math.cos(guest.facing) * offset
  };
}

export function birthdayGuestObstacles(phase, lovePosition, family) {
  if (phase !== 'finished') {
    return family.filter((guest) => guest.visible && guest.member.kind === 'dog')
      .flatMap((guest) => vinnieObstacles(guest.position, guest.facing, guest.member.size));
  }
  return [
    { x: lovePosition.x, y: lovePosition.y, radius: 16 },
    ...family.filter((guest) => guest.visible).flatMap((guest) => guest.member.kind === 'dog'
      ? vinnieObstacles(guest.position, guest.facing, guest.member.size)
      : [{ x: guest.position.x, y: guest.position.y, radius: 16 * guest.member.size }]),
    ...family.filter((guest) => guest.visible && guest.member.id === 'gran').map((guest) => ({
      ...birthdayCakePosition(guest), radius: BIRTHDAY_CAKE_RADIUS * guest.member.size
    }))
  ];
}

export function birthdayGuestPlayerCollision(player, member) {
  return createCollision([{ x: player.x, y: player.z, radius: 10 }], 16 * member.size);
}

export function birthdayDogFacing(position, catPosition) {
  return Math.atan2(catPosition.x - position.x, catPosition.y - position.y);
}

function arrivalTrajectory(path, start, origin = BIRTHDAY_ENTRANCE) {
  const points = [origin, ...path], times = [0];
  for (let i = 1; i < points.length; i += 1) {
    times.push(times[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y) / ARRIVAL_SPEED);
  }
  return { points, times, start, duration: times.at(-1) };
}

export function birthdayArrivalPose(trajectory, time) {
  const elapsed = Math.max(0, Math.min(trajectory.duration, time - trajectory.start));
  const index = trajectory.times.findIndex((value, i) => i > 0 && value > elapsed);
  if (index < 0) return { position: trajectory.points.at(-1), moving: false, facing: 0 };
  const from = trajectory.points[index - 1], to = trajectory.points[index];
  const progress = (elapsed - trajectory.times[index - 1]) / (trajectory.times[index] - trajectory.times[index - 1]);
  return {
    position: { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress },
    moving: true, facing: Math.atan2(to.x - from.x, to.y - from.y)
  };
}

function arrivalsClear(first, second) {
  const start = second.start, end = Math.max(first.start + first.duration, second.start + second.duration);
  const boundaries = [start, end,
    ...first.times.map((time) => first.start + time),
    ...second.times.map((time) => second.start + time)]
    .filter((time) => time >= start && time <= end).sort((a, b) => a - b);
  for (let i = 1; i < boundaries.length; i += 1) {
    const a0 = birthdayArrivalPose(first, boundaries[i - 1]).position, b0 = birthdayArrivalPose(second, boundaries[i - 1]).position;
    const a1 = birthdayArrivalPose(first, boundaries[i]).position, b1 = birthdayArrivalPose(second, boundaries[i]).position;
    const relativeStart = { x: a0.x - b0.x, y: a0.y - b0.y };
    const dx = a1.x - b1.x - relativeStart.x, dy = a1.y - b1.y - relativeStart.y;
    const lengthSquared = dx * dx + dy * dy;
    const projection = lengthSquared ? Math.max(0, Math.min(1, -(relativeStart.x * dx + relativeStart.y * dy) / lengthSquared)) : 0;
    if (Math.hypot(relativeStart.x + dx * projection, relativeStart.y + dy * projection) < GUEST_CLEARANCE) return false;
  }
  return true;
}

export function scheduleBirthdayArrivals(catPath, familyPaths) {
  const cat = arrivalTrajectory(catPath, 0), scheduled = [cat], family = [];
  const resident = familyPaths.find((guest) => guest.member.kind === 'dog' && guest.origin);
  if (resident) {
    const trajectory = arrivalTrajectory(resident.path, 0, resident.origin);
    if (!arrivalsClear(cat, trajectory)) return null;
    trajectory.memberId = resident.member.id;
    scheduled.push(trajectory);
  }
  for (const { member, path } of familyPaths) {
    if (member.id === resident?.member.id) continue;
    const earliest = scheduled.at(-1).start + ARRIVAL_INTERVAL;
    const latest = Math.max(...scheduled.map((entry) => entry.start + entry.duration)) + ARRIVAL_INTERVAL;
    let trajectory = null;
    for (let step = 0; earliest + step * ARRIVAL_INTERVAL <= latest + 1e-8; step += 1) {
      const candidate = arrivalTrajectory(path, earliest + step * ARRIVAL_INTERVAL);
      if (scheduled.every((entry) => arrivalsClear(entry, candidate))) { trajectory = candidate; break; }
    }
    if (!trajectory) return null;
    trajectory.memberId = member.id;
    family.push(trajectory); scheduled.push(trajectory);
  }
  if (resident) {
    family.splice(familyPaths.indexOf(resident), 0, scheduled.find((entry) => entry.memberId === resident.member.id));
  }
  const settlements = [];
  for (const [index, guest] of familyPaths.entries()) {
    if (!guest.settlePath) continue;
    const start = Math.max(...scheduled.map((entry) => entry.start + entry.duration));
    const trajectory = arrivalTrajectory(guest.settlePath, start, guest.path.at(-1));
    if (!scheduled.every((entry) => entry === family[index] || arrivalsClear(entry, trajectory))) return null;
    settlements.push({ index, trajectory });
    scheduled.splice(scheduled.indexOf(family[index]), 1, trajectory);
  }
  return { cat, family, settlements, duration: Math.max(...scheduled.map((entry) => entry.start + entry.duration)) };
}

export function birthdayFamilyPaths(player, loveDestination, collision, dogOrigin = null) {
  const positions = [{ x: player.x, y: player.z }, loveDestination], destinations = new Map();
  const placementOrder = [...BIRTHDAY_FAMILY].sort((a, b) => Number(b.kind === 'dog') - Number(a.kind === 'dog'));
  for (const member of placementOrder) {
    let destination = null;
    const angle = member.id === 'gran' ? 0 : member.kind === 'dog' ? Math.PI / 4 : Math.PI / 2;
    const radii = member.kind === 'dog' ? [55, 70, 90, 125, 180, 235] : [125, 180, 235];
    for (const radius of radii) {
      for (let i = 0; i < 24 && !destination; i += 1) {
        const direction = angle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 12;
        const candidate = { x: player.x + Math.cos(direction) * radius, y: player.z + Math.sin(direction) * radius };
        if (collision.blocked(candidate) || positions.some((point, index) =>
          Math.hypot(point.x - candidate.x, point.y - candidate.y) < (member.kind === 'dog' && index === 0 ? 42 : 60))) continue;
        const route = findWorldPath(BIRTHDAY_ENTRANCE, candidate, collision);
        const end = route?.at(-1);
        if (end && Math.hypot(end.x - candidate.x, end.y - candidate.y) < 1) destination = candidate;
      }
      if (destination) break;
    }
    if (!destination) return null;
    positions.push(destination);
    destinations.set(member.id, destination);
  }

  const childSpot = destinations.get('nephew-2');
  destinations.set('nephew-2', destinations.get('grandad'));
  destinations.set('grandad', childSpot);

  const arrivalOrder = [...BIRTHDAY_FAMILY].sort((a, b) => {
    const distance = (member) => {
      const destination = destinations.get(member.id);
      return Math.hypot(destination.x - BIRTHDAY_ENTRANCE.x, destination.y - BIRTHDAY_ENTRANCE.y);
    };
    return distance(b) - distance(a);
  });
  const occupied = [{ x: player.x, y: player.z }, loveDestination], paths = [];
  for (const member of arrivalOrder) {
    const destination = destinations.get(member.id);
    const origin = member.kind === 'dog' && dogOrigin ? dogOrigin : BIRTHDAY_ENTRANCE;
    const routeCollision = withGuestObstacles(collision, occupied, GUEST_CLEARANCE);
    let target = destination, path = null;
    if (member !== arrivalOrder.at(-1)
      && Math.hypot(destination.x - origin.x, destination.y - origin.y) < GUEST_CLEARANCE + 2
      && !(member.kind === 'dog' && dogOrigin)) {
      const reserved = [...destinations.entries()].filter(([id]) => id !== member.id).map(([, point]) => point);
      for (const radius of [50, 60, 75, 90]) {
        for (let i = 0; i < 16 && !path; i += 1) {
          const angle = -Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8;
          const candidate = { x: destination.x + Math.cos(angle) * radius, y: destination.y + Math.sin(angle) * radius };
          if (Math.hypot(candidate.x - BIRTHDAY_ENTRANCE.x, candidate.y - BIRTHDAY_ENTRANCE.y) < GUEST_CLEARANCE + 2
            || routeCollision.blocked(candidate) || reserved.some((point) =>
              Math.hypot(point.x - candidate.x, point.y - candidate.y) < GUEST_CLEARANCE + 2)) continue;
          const route = findWorldPath(BIRTHDAY_ENTRANCE, candidate, routeCollision);
          if (route?.at(-1) && Math.hypot(route.at(-1).x - candidate.x, route.at(-1).y - candidate.y) < 1) {
            target = candidate; path = route;
          }
        }
        if (path) break;
      }
    } else {
      const route = findWorldPath(origin, target, routeCollision);
      if (route?.at(-1) && Math.hypot(route.at(-1).x - target.x, route.at(-1).y - target.y) < 1) path = route;
    }
    if (!path) return null;
    occupied.push(target);
    paths.push({ member, path, destination, ...(member.kind === 'dog' && dogOrigin ? { origin } : {}) });
  }
  for (const guest of paths) {
    const start = guest.path.at(-1);
    if (Math.hypot(start.x - guest.destination.x, start.y - guest.destination.y) < 1) continue;
    const others = [{ x: player.x, y: player.z }, loveDestination,
      ...paths.filter((other) => other !== guest).map((other) => other.destination)];
    const routeCollision = withGuestObstacles(collision, others, GUEST_CLEARANCE);
    guest.settlePath = findWorldPath(start, guest.destination, routeCollision);
    if (!guest.settlePath?.at(-1) || Math.hypot(guest.settlePath.at(-1).x - guest.destination.x,
      guest.settlePath.at(-1).y - guest.destination.y) >= 1) return null;
  }
  return paths;
}

export const BIRTHDAY_DIALOGUE = Object.freeze([
  Object.freeze({ speaker: 'Cat', message: 'Happy birthday, meu amor! Gran brought you a cake.' }),
  Object.freeze({ speaker: 'Cat', message: 'Your family are all here to celebrate with you!' }),
  Object.freeze({ speaker: 'Cat', message: 'You made it to level 30!' }),
  Object.freeze({ speaker: 'player', message: 'Thank you, my love!' }),
  Object.freeze({ speaker: 'Cat', message: 'And here is your ticket for cuddles and films, whenever you are ready.', gift: 'ticket' })
]);

export function createBirthdayEnding(onChange, guestsPresent = false) {
  let phase = guestsPresent ? 'finished' : 'idle', line = 0;
  const notify = () => onChange(phase, phase === 'dialogue' ? BIRTHDAY_DIALOGUE[line] : null);
  return {
    start() { phase = 'positioning'; line = 0; notify(); },
    positioned() { if (phase === 'positioning') { phase = 'arriving'; notify(); } },
    arrive() { if (phase === 'arriving') { phase = 'dialogue'; notify(); } },
    advance() {
      if (phase !== 'dialogue') return;
      line += 1;
      if (line === BIRTHDAY_DIALOGUE.length) phase = 'finished';
      notify();
    },
    stop() { phase = 'idle'; line = 0; }
  };
}
