import { createCollision, findWorldPath } from './world-collision.js';
import { moveToward } from './world-logic.js';
import { CHIMYCHOMPS } from './chimychomps.js';

export const CHOMPY_SCALE = 0.55;
export const CHOMPY_RADIUS = 15;
export const STATUE_RADIUS = 17;
export const CHOMPY_DETECTION_RADIUS = 220;
export const CHOMPY_ESCAPE_RADIUS = 340;
export const CHOMPY_SPEED = 300;
export const CHOMPY_RETURN_SPEED = 180;
export const PLAYER_WALK_SPEED = 220;
export const CHOMPY_CONTACT_RADIUS = 30;

export function createChompyStates() {
  return CHIMYCHOMPS.map((chomp, index) => ({
    ...chomp, home: { x: chomp.x, y: chomp.y }, mode: 'idle',
    path: [], nextPlan: 0, facing: index * 1.7
  }));
}

export function planChompyRevival(creatures, defeated, statues, player, baseCollision) {
  const defeatedIds = new Set(defeated);
  const placed = creatures.filter((chomp) => !defeatedIds.has(chomp.id));
  const playerClearance = createCollision([{ x: player.x, y: player.y, radius: CHOMPY_CONTACT_RADIUS }], CHOMPY_RADIUS);
  const revived = new Map();
  for (const chomp of createChompyStates()) {
    if (!defeatedIds.has(chomp.id)) continue;
    const navigation = combineCollisions(
      encounterCollision(baseCollision, placed, statues, CHOMPY_RADIUS), playerClearance
    );
    const position = safeRespawn(chomp.home, navigation, 'ChimyChompChomp');
    chomp.x = position.x; chomp.y = position.y;
    revived.set(chomp.id, chomp);
    placed.push(chomp);
  }
  return creatures.map((chomp) => revived.get(chomp.id) || chomp);
}

export function combineCollisions(first, second) {
  function blocked(point) { return first.blocked(point) || second.blocked(point); }
  function clearSegment(start, end) {
    return first.clearSegment(start, end) && second.clearSegment(start, end);
  }
  function move(position, dx, dy) {
    const next = { x: position.x + dx, y: position.y + dy };
    if (clearSegment(position, next)) return next;
    const x = { x: position.x + dx, y: position.y };
    const y = { x: position.x, y: position.y + dy };
    if (clearSegment(position, x)) return x;
    if (clearSegment(position, y)) return y;
    return position;
  }
  return { blocked, clearSegment, move };
}

export function encounterCollision(base, creatures, statues, radius) {
  const dynamic = createCollision([
    ...creatures.map(({ x, y }) => ({ x, y, radius: CHOMPY_RADIUS })),
    ...statues.map(({ x, y }) => ({ x, y, radius: STATUE_RADIUS }))
  ], radius);
  return combineCollisions(base, dynamic);
}

export function stepChompy(chomp, player, dt, now, routeCollision, movementCollision = routeCollision) {
  const distance = Math.hypot(chomp.x - player.x, chomp.y - player.y);
  const mode = chomp.mode === 'chase'
    ? distance > CHOMPY_ESCAPE_RADIUS ? 'return' : 'chase'
    : distance < CHOMPY_DETECTION_RADIUS ? 'chase' : chomp.mode;
  if (mode !== chomp.mode) {
    chomp.mode = mode;
    chomp.path = [];
    chomp.nextPlan = 0;
  }
  if (mode === 'idle') return;
  const target = mode === 'chase' ? player : chomp.home;
  if (mode === 'return' && Math.hypot(chomp.x - target.x, chomp.y - target.y) < 1) {
    chomp.x = target.x; chomp.y = target.y; chomp.mode = 'idle'; chomp.path = [];
    return;
  }
  if (now >= chomp.nextPlan) {
    chomp.path = routeCollision.clearSegment(chomp, target)
      ? [{ x: target.x, y: target.y }] : findWorldPath(chomp, target, routeCollision) || [];
    chomp.nextPlan = now + 600;
  }
  const waypoint = chomp.path[0];
  if (!waypoint) return;
  let next = moveToward(chomp, waypoint, (mode === 'chase' ? CHOMPY_SPEED : CHOMPY_RETURN_SPEED) * dt);
  const dx = next.x - chomp.x, dy = next.y - chomp.y;
  const ox = chomp.x - player.x, oy = chomp.y - player.y;
  const a = dx * dx + dy * dy, b = 2 * (ox * dx + oy * dy);
  const c = ox * ox + oy * oy - CHOMPY_CONTACT_RADIUS * CHOMPY_CONTACT_RADIUS;
  const discriminant = b * b - 4 * a * c;
  if (a && c > 0 && discriminant >= 0) {
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t >= 0 && t <= 1) next = { x: chomp.x + dx * t, y: chomp.y + dy * t };
  } else if (c <= 0) next = { x: chomp.x, y: chomp.y };
  const moved = movementCollision.move(chomp, next.x - chomp.x, next.y - chomp.y);
  if (moved.x !== chomp.x || moved.y !== chomp.y) chomp.facing = Math.atan2(moved.x - chomp.x, moved.y - chomp.y);
  chomp.x = moved.x; chomp.y = moved.y;
  if (chomp.x === waypoint.x && chomp.y === waypoint.y) chomp.path.shift();
}

export function chompyContact(playerStart, playerEnd, chompStart, chompEnd) {
  const start = { x: playerStart.x - chompStart.x, y: playerStart.y - chompStart.y };
  const dx = (playerEnd.x - playerStart.x) - (chompEnd.x - chompStart.x);
  const dy = (playerEnd.y - playerStart.y) - (chompEnd.y - chompStart.y);
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, -(start.x * dx + start.y * dy) / length)) : 0;
  return Math.hypot(start.x + dx * t, start.y + dy * t) <= CHOMPY_CONTACT_RADIUS + 1e-6;
}

export function safeRespawn(spawn, collision, name = 'castle') {
  if (!collision.blocked(spawn)) return { ...spawn };
  for (let radius = 40; radius <= 600; radius += 40) {
    for (let i = 0; i < 32; i += 1) {
      const angle = i * Math.PI * 2 / 32;
      const candidate = { x: spawn.x + Math.cos(angle) * radius, y: spawn.y + Math.sin(angle) * radius };
      if (!collision.blocked(candidate)) return candidate;
    }
  }
  throw new Error(`No safe ${name} respawn point is available.`);
}
