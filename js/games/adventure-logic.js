import { createCollision, findWorldPath } from '../world/world-collision.js';
import { COASTER_DROP_SECONDS, COASTER_GOAL, COASTER_RETURN_SECONDS, COASTER_RIDE_SECONDS, COASTER_TREATS } from './coaster-course.js';

export const ADVENTURE_NAMES = { 1: 'Lucky Chucks', 2: 'Thirteen', 3: 'GoApe' };
export const POOL_TABLE_FOOTPRINT = Object.freeze({ x: 500, y: 230, width: 220, depth: 131 });
export const PUB_JOIN_POINT = Object.freeze({ x: 780, y: 412 });
export const PUB_EXIT = Object.freeze({ x: 900, y: 640 });
export const PUB_PARTNER_OFFSET = -50;
const COUPLE_FACING = Math.atan2(500, 950);
export const PUB_GOODBYE = "Cat: We sucked at pool but I had so much fun! Let's go home.";
export const COASTER_GOODBYE = 'Cat: You look so happy with yourself 😅, you got me good!';
export const COUPLE_GOODBYE_SECONDS = 3;
export const COASTER_JOIN_POINT = Object.freeze({ x: 860, y: 580 });
export const COASTER_EXIT = Object.freeze({ x: 900, y: 656 });
const CANOPY_OFFSETS = [0, 200, 400, 400, 600, 600, 800, 1000];
const canopyX = (x, platform) => x + CANOPY_OFFSETS[platform];
export const CANOPY_ZIPLINE = Object.freeze({
  start: Object.freeze({ x: canopyX(1800, 7), y: 350, height: 190 }),
  departure: Object.freeze({ x: canopyX(1850, 7), y: 375, height: 190 }),
  end: Object.freeze({ x: canopyX(2200, 7), y: 570, height: 0 }),
  departureProgress: 0.15,
  cableHeight: 125
});
export const LEGACY_CANOPY_ZIPLINE = Object.freeze({
  start: Object.freeze({ x: 900, y: 350, height: 130 }),
  end: Object.freeze({ x: 960, y: 570, height: 0 })
});
const PUB_BAR = Object.freeze({ x: 130, y: 120, width: 190, depth: 65 });
export const OBJECTS = {
  1: [
    { id: 'bar', name: 'Bar', x: PUB_BAR.x, y: PUB_BAR.y, kind: 'bar', footprint: { width: PUB_BAR.width, depth: PUB_BAR.depth } },
    {
      id: 'bartender', name: 'Jamie the Bartender', x: 130, y: 78, kind: 'npc', footprint: { radius: 16 },
      interactionArea: PUB_BAR
    },
    { id: 'rack-note', name: 'Scorecard', x: 285, y: 130, kind: 'note', footprint: { width: 62, depth: 32 } },
    { id: 'drinks-table', name: 'Drinks table', x: 530, y: 520, kind: 'table', footprint: { width: 100, depth: 70 } },
    { id: 'cue-rack', name: 'Cue rack', x: 835, y: 130, kind: 'rack', footprint: { width: 80, depth: 23 } },
    { id: 'ball-box', name: 'Ball case', x: 115, y: 510, kind: 'box', footprint: { width: 60, depth: 45 } },
    {
      id: 'pool-table', name: 'Pool table', x: POOL_TABLE_FOOTPRINT.x, y: POOL_TABLE_FOOTPRINT.y, kind: 'pool',
      footprint: { width: POOL_TABLE_FOOTPRINT.width, depth: POOL_TABLE_FOOTPRINT.depth }
    },
    { id: 'tool-rack', name: 'Equipment cupboard', x: 290, y: 590, kind: 'tools', footprint: { width: 75, depth: 48 } },
    { id: 'cabinet', name: 'Cabinet', x: 900, y: 300, kind: 'cabinet', footprint: { width: 60, depth: 52 } },
    { id: 'love', name: 'Cat', ...couplePartnerPosition(PUB_JOIN_POINT, COUPLE_FACING), kind: 'npc', footprint: { radius: 16 } }
  ],
  2: [
    { id: 'carriage', name: 'Thirteen carriage', x: 500, y: 530, kind: 'carriage' },
    { id: 'locker', name: 'Bag locker', x: 260, y: 592.25, kind: 'locker', footprint: { width: 60, depth: 24.5 } },
    { id: 'amor', name: 'Cat', ...couplePartnerPosition(COASTER_JOIN_POINT, COUPLE_FACING), kind: 'npc', footprint: { radius: 16 } }
  ],
  3: [
    { id: 'leaf', name: 'Glowing leaf', x: 200, y: 295, kind: 'collectible', height: 0 },
    { id: 'net', name: 'Climbing net', x: canopyX(330, 0), y: 350, kind: 'net', height: 0 },
    { id: 'feather', name: 'Night feather', x: canopyX(440, 1), y: 405, kind: 'collectible', height: 80 },
    { id: 'rope', name: 'Rope crossing', x: canopyX(500, 1), y: 350, kind: 'rope', height: 80 },
    { id: 'acorn', name: 'Silver acorn', x: canopyX(680, 2), y: 290, kind: 'collectible', height: 130 },
    { id: 'star', name: 'Forest star', x: canopyX(850, 3), y: 405, kind: 'collectible', height: 130 },
    { id: 'high-rope', name: 'High rope bridge', x: canopyX(945, 3), y: 350, kind: 'rope', height: 130 },
    { id: 'lantern-1', name: 'First lantern', x: canopyX(1110, 4), y: 300, kind: 'beacon', height: 165 },
    { id: 'lantern-2', name: 'Second lantern', x: canopyX(1300, 5), y: 405, kind: 'beacon', height: 165 },
    { id: 'high-net', name: 'Summit net', x: canopyX(1370, 5), y: 350, kind: 'net', height: 165 },
    { id: 'summit-rope', name: 'Summit rope bridge', x: canopyX(1575, 6), y: 350, kind: 'rope', height: 190 },
    { id: 'lantern-3', name: 'Final lantern', x: canopyX(1720, 7), y: 300, kind: 'beacon', height: 190 },
    {
      id: 'zipline', name: 'Zip-wire', x: CANOPY_ZIPLINE.start.x, y: CANOPY_ZIPLINE.start.y,
      kind: 'zipline', height: CANOPY_ZIPLINE.start.height
    }
  ]
};

const PUB_PLAYER_RADIUS = 10;
const PUB_INTERACTION_RANGE = 25;
export const PUB_STOOLS = Object.freeze([
  ...[75, 135, 195].map((x) => Object.freeze({ x, y: 205, radius: 17.5 })),
  ...[420, 640].flatMap((x) => [470, 570].map((y) => Object.freeze({ x, y, radius: 18.5 })))
]);
export const PUB_OBSTACLES = Object.freeze([
  ...OBJECTS[1].map(({ id, x, y, footprint }) => ({ id, x, y, ...footprint })),
  ...PUB_STOOLS
]);
const furnitureCollision = createCollision(PUB_OBSTACLES, PUB_PLAYER_RADIUS);
const withinPub = (point) => point.x >= 40 && point.x <= 960 && point.y >= 40 && point.y <= 660;
const pubCollision = {
  blocked: (point) => !withinPub(point) || furnitureCollision.blocked(point),
  clearSegment: (start, end) => withinPub(end) && furnitureCollision.clearSegment(start, end)
};
export function couplePartnerPosition(point, facing) {
  return {
    x: point.x + PUB_PARTNER_OFFSET * Math.cos(facing),
    y: point.y - PUB_PARTNER_OFFSET * Math.sin(facing)
  };
}
const withinRoom = (point) => point.x >= PUB_PLAYER_RADIUS && point.x <= 1000 - PUB_PLAYER_RADIUS
  && point.y >= PUB_PLAYER_RADIUS && point.y <= 700 - PUB_PLAYER_RADIUS;
function coupleCollisionFor(obstacles) {
  const collision = createCollision(obstacles, PUB_PLAYER_RADIUS);
  const partner = (point) => couplePartnerPosition(point, COUPLE_FACING);
  return {
    blocked: (point) => !withinPub(point) || !withinRoom(partner(point))
      || collision.blocked(point) || collision.blocked(partner(point)),
    clearSegment: (start, end) => withinPub(end) && withinRoom(partner(end))
      && collision.clearSegment(start, end) && collision.clearSegment(partner(start), partner(end))
  };
}
const coupleCollision = coupleCollisionFor(PUB_OBSTACLES.filter((obstacle) => obstacle.id !== 'love'));
const locker = OBJECTS[2].find((object) => object.id === 'locker');
const coasterObstacles = OBJECTS[2].filter((object) => object.footprint)
  .map(({ x, y, footprint }) => ({ x, y, ...footprint }));
const platformCollision = createCollision(coasterObstacles, PUB_PLAYER_RADIUS);
const coasterCollision = {
  blocked: (point) => !withinPub(point) || platformCollision.blocked(point),
  clearSegment: (start, end) => withinPub(end) && platformCollision.clearSegment(start, end)
};
const coasterCoupleCollision = coupleCollisionFor([{ x: locker.x, y: locker.y, ...locker.footprint }]);

function followsCoupleHeading(start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  return dx * Math.sin(COUPLE_FACING) + dy * Math.cos(COUPLE_FACING) >= 0
    && Math.abs(dx * Math.cos(COUPLE_FACING) - dy * Math.sin(COUPLE_FACING)) < 1e-6 * Math.max(1, Math.hypot(dx, dy));
}

export function pubCouplePath(start) {
  return followsCoupleHeading(start, PUB_EXIT) && !coupleCollision.blocked(start) && !coupleCollision.blocked(PUB_EXIT)
    && coupleCollision.clearSegment(start, PUB_EXIT) ? [PUB_EXIT] : null;
}

export function walkPubCouple(state, destination, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  const dx = destination.x - state.player.x, dy = destination.y - state.player.y;
  const length = Math.hypot(dx, dy);
  if (!length || !followsCoupleHeading(state.player, destination)) return state;
  const distance = Math.min(length, 55 * seconds);
  const next = { x: state.player.x + dx / length * distance, y: state.player.y + dy / length * distance };
  if (!coupleCollision.clearSegment(state.player, next)) return state;
  return { ...state, player: { ...state.player, ...next } };
}

export function coasterCouplePath(start) {
  return followsCoupleHeading(start, COASTER_EXIT) && !coasterCoupleCollision.blocked(start) && !coasterCoupleCollision.blocked(COASTER_EXIT)
    && coasterCoupleCollision.clearSegment(start, COASTER_EXIT) ? [COASTER_EXIT] : null;
}

export function walkCoasterCouple(state, destination, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  const dx = destination.x - state.player.x, dy = destination.y - state.player.y;
  const length = Math.hypot(dx, dy);
  if (!length || !followsCoupleHeading(state.player, destination)) return state;
  const distance = Math.min(length, 105 * seconds);
  const next = { x: state.player.x + dx / length * distance, y: state.player.y + dy / length * distance };
  if (!coasterCoupleCollision.clearSegment(state.player, next)) return state;
  return { ...state, player: { ...state.player, ...next } };
}

export function coasterWalkable(point) {
  return !coasterCollision.blocked(point);
}

export function finishPubGoodbye(state) {
  if (state.pubEnding !== 'dialogue') return state;
  return { ...state, pubEnding: 'ready', message: 'Leave Lucky Chucks together, hand in hand.' };
}

export function finishPubExit(state) {
  if (state.pubEnding !== 'ready' || Math.hypot(state.player.x - PUB_EXIT.x, state.player.y - PUB_EXIT.y) > 1) return state;
  return { ...state, complete: true, message: 'You leave Lucky Chucks hand in hand.' };
}

export function finishCoasterGoodbye(state) {
  if (state.rideEnding !== 'dialogue') return state;
  return { ...state, rideEnding: 'ready', message: 'Leave Thirteen together, hand in hand.' };
}

export function finishCoasterExit(state) {
  if (state.rideEnding !== 'ready' || Math.hypot(state.player.x - COASTER_EXIT.x, state.player.y - COASTER_EXIT.y) > 1) return state;
  return { ...state, phase: 'finished', complete: true, message: 'You leave Thirteen hand in hand.' };
}

export function pubWalkable(point) {
  return !pubCollision.blocked(point);
}

function footprintDistance(point, { x, y, width, depth, radius }) {
  if (radius !== undefined) return Math.max(0, Math.hypot(point.x - x, point.y - y) - radius);
  return Math.hypot(Math.max(Math.abs(point.x - x) - width / 2, 0),
    Math.max(Math.abs(point.y - y) - depth / 2, 0));
}

function furnitureApproaches(point, { x, y, width, depth, radius }) {
  const margin = PUB_PLAYER_RADIUS + 5;
  if (radius !== undefined) {
    return Array.from({ length: 16 }, (_, index) => {
      const angle = index * Math.PI / 8;
      return { x: x + Math.cos(angle) * (radius + margin), y: y + Math.sin(angle) * (radius + margin) };
    });
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const xs = [clamp(point.x, x - width / 2, x + width / 2), x - width / 4, x, x + width / 4];
  const ys = [clamp(point.y, y - depth / 2, y + depth / 2), y - depth / 4, y, y + depth / 4];
  return [
    ...ys.flatMap((py) => [{ x: x - width / 2 - margin, y: py }, { x: x + width / 2 + margin, y: py }]),
    ...xs.flatMap((px) => [{ x: px, y: y - depth / 2 - margin }, { x: px, y: y + depth / 2 + margin }])
  ];
}

export function adventureObjectDistance(index, player, object) {
  const crossing = index === 3 && CANOPY_CROSSINGS[object.id];
  if (crossing) {
    const endpoints = [crossing.start, crossing.end].filter((point) => Math.abs(player.height - point[2]) <= 25);
    return Math.min(...endpoints.map(([x, y]) => Math.hypot(player.x - x, player.y - y)));
  }
  return (index === 1 || (index === 2 && object.kind !== 'npc')) && object.footprint
    ? footprintDistance(player, object.interactionArea || { ...object.footprint, x: object.x, y: object.y })
    : Math.hypot(player.x - object.x, player.y - object.y);
}

export function adventureObjectInRange(index, player, object) {
  const range = (index === 1 || (index === 2 && object.kind !== 'npc')) && object.footprint ? PUB_INTERACTION_RANGE : 85;
  return adventureObjectDistance(index, player, object) <= range
    && (Boolean(index === 3 && CANOPY_CROSSINGS[object.id]) || Math.abs(player.height - (object.height || 0)) <= 25);
}

function furniturePath(player, destination, object, collision) {
  const points = object?.footprint
    ? furnitureApproaches(player, object.interactionArea || { ...object.footprint, x: object.x, y: object.y })
    : [destination];
  const routes = points.filter((point) => !collision.blocked(point))
    .map((point) => ({ point, route: findWorldPath(player, point, collision) }))
    .filter(({ point, route }) => route?.length && Math.hypot(route.at(-1).x - point.x, route.at(-1).y - point.y) < 0.01)
    .map(({ route }) => route);
  const length = (route) => route.reduce((result, point, index) => {
    const previous = index ? route[index - 1] : player;
    return result + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
  routes.sort((a, b) => length(a) - length(b));
  return routes[0] ?? null;
}

export function pubPath(player, destination, object = null) {
  return furniturePath(player, destination, object, pubCollision);
}

export function coasterPath(player, destination, object = null) {
  return furniturePath(player, destination, object, coasterCollision);
}

const LEGACY_CANOPY_PLATFORMS = [
  { left: 40, right: 350, top: 265, bottom: 435, height: 0 },
  { left: 380, right: 525, top: 265, bottom: 435, height: 80 },
  { left: 600, right: 730, top: 265, bottom: 435, height: 130 },
  { left: 795, right: 960, top: 265, bottom: 435, height: 130 },
  { left: 1040, right: 1180, top: 265, bottom: 435, height: 165 },
  { left: 1245, right: 1380, top: 265, bottom: 435, height: 165 },
  { left: 1450, right: 1585, top: 265, bottom: 435, height: 190 },
  { left: 1660, right: 1840, top: 265, bottom: 435, height: 190 }
];
export const CANOPY_PLATFORMS = LEGACY_CANOPY_PLATFORMS.map((platform, index) => ({
  ...platform, left: canopyX(platform.left, index), right: canopyX(platform.right, index)
}));
export const CANOPY_CROSSINGS = Object.freeze({
  net: { kind: 'net', from: 0, to: 1, start: [canopyX(330, 0), 350, 0], end: [canopyX(400, 1), 350, 80], moves: 3 },
  rope: { kind: 'rope', from: 1, to: 2, start: [canopyX(500, 1), 350, 80], end: [canopyX(615, 2), 350, 130], moves: 3 },
  'high-rope': { kind: 'rope', from: 3, to: 4, start: [canopyX(945, 3), 350, 130], end: [canopyX(1055, 4), 350, 165], moves: 4 },
  'high-net': { kind: 'net', from: 5, to: 6, start: [canopyX(1370, 5), 350, 165], end: [canopyX(1465, 6), 350, 190], moves: 4 },
  'summit-rope': { kind: 'rope', from: 6, to: 7, start: [canopyX(1575, 6), 350, 190], end: [canopyX(1675, 7), 350, 190], moves: 5 }
});
export const CANOPY_COURSE_LENGTH = CANOPY_ZIPLINE.end.x + 120;
const CANOPY_PLAYER_RADIUS = 10;
export const CANOPY_OBSTACLES = [
  ...CANOPY_PLATFORMS.flatMap((p) => [
    ...[p.top + 8, p.bottom - 8].map((y) => ({
      x: (p.left + p.right) / 2, y, width: p.right - p.left - 12, depth: 4,
      minHeight: p.height, maxHeight: p.height + 54
    })),
    { x: (p.left + p.right) / 2, y: p.top + 16, width: 6, depth: 6, minHeight: p.height, maxHeight: p.height + 105 }
  ]),
  ...OBJECTS[3].filter((object) => ['collectible', 'beacon', 'zipline'].includes(object.kind)).map((object) => ({
    x: object.x, y: object.y, radius: object.kind === 'collectible' ? 18 : object.kind === 'beacon' ? 5 : 5,
    minHeight: object.height, maxHeight: object.height + (object.kind === 'collectible' ? 22 : object.kind === 'beacon' ? 67 : 130)
  }))
];

function canopyCollision(height) {
  return createCollision(CANOPY_OBSTACLES.filter((obstacle) =>
    height < obstacle.maxHeight && height + 80 > obstacle.minHeight), CANOPY_PLAYER_RADIUS);
}

function clearCanopyPosition(player, platform) {
  const collision = canopyCollision(platform.height);
  if (!collision.blocked(player)) return player;
  for (let distance = 10; distance <= 200; distance += 10) {
    for (let angle = 0; angle < 16; angle += 1) {
      const x = player.x + Math.cos(angle * Math.PI / 8) * distance;
      const y = player.y + Math.sin(angle * Math.PI / 8) * distance;
      if (x >= platform.left && x <= platform.right && y >= platform.top && y <= platform.bottom
        && !collision.blocked({ x, y })) return { ...player, x, y };
    }
  }
  throw new Error('Could not find a clear position on the canopy platform.');
}
export const CANOPY_LANTERNS = Object.freeze(['lantern-1', 'lantern-2', 'lantern-3']);
const ITEMS = ['leaf', 'feather', 'acorn', 'star'];
export function canopyObjectAvailable(state, object) {
  return !state.collected.includes(object.id) && !(state.lanterns || []).includes(object.id);
}
const initialMessages = {
  1: 'Cat is waiting by the table. Set up the drinks and pool equipment.',
  2: 'Find the carriage and board with Cat.',
  3: 'Collect four forest treasures, cross the treetop course and light three lanterns in order.'
};

export function newAdventureState(index) {
  if (!ADVENTURE_NAMES[index]) throw new RangeError('Unknown adventure.');
  const base = { version: 3, player: { x: index === 1 ? 70 : 90, y: index === 3 ? 350 : index === 1 ? 560 : 610, height: 0 }, complete: false, message: initialMessages[index] };
  if (index === 1) return {
    ...base, drinks: false, drinksPlaced: false, cues: false, balls: false, cuesPlaced: false, catCueGiven: false,
    ballsPlaced: false, ballLost: false, ballFound: false, noteRead: false, caseUnlocked: false, puzzle: false,
    hook: false, shot: false, pubEnding: null
  };
  if (index === 2) return { ...base, rideVersion: 3, phase: 'boarding', progress: 0, speed: 0, stalled: 0, lane: 0, treats: [], bags: false, ticket: false, rideEnding: null };
  return {
    ...base, courseVersion: 3, collected: [], lanterns: [], checkpoint: 0, flight: null, traversal: null,
    zipline: false, zipProgress: 0, treasuresUsed: false
  };
}

export function restoreAdventureState(index, saved) {
  const initial = newAdventureState(index);
  if (!saved) return initial;
  if (saved.version !== 3) {
    return { ...initial, legacyProgress: saved, complete: saved.complete === true };
  }
  const player = saved.player;
  const maxX = index === 3 ? (saved.zipline ? CANOPY_ZIPLINE.end.x : CANOPY_ZIPLINE.departure.x) : 960;
  const validPlayer = player && Number.isFinite(player.x) && player.x >= 40 && player.x <= maxX
    && Number.isFinite(player.y) && player.y >= 40 && player.y <= 660 && Number.isFinite(player.height)
    && player.height >= 0 && player.height <= (index === 3 ? 400 : 200);
  const flags = index === 1 ? ['drinks', 'drinksPlaced', 'cues', 'balls', 'cuesPlaced', 'ballsPlaced', 'ballLost', 'ballFound']
    : index === 2 ? ['bags', 'ticket'] : [];
  const valid = validPlayer && flags.every((flag) => typeof saved[flag] === 'boolean')
    && (index !== 1 || ['noteRead', 'caseUnlocked', 'hook', 'catCueGiven'].every((flag) => saved[flag] === undefined || typeof saved[flag] === 'boolean'))
    && (index !== 1 || saved.pubEnding === undefined || saved.pubEnding === null || ['dialogue', 'ready'].includes(saved.pubEnding))
    && (index !== 2 || saved.rideEnding === undefined || saved.rideEnding === null || ['dialogue', 'ready'].includes(saved.rideEnding))
    && typeof saved.complete === 'boolean'
    && (index !== 2 || (['boarding', 'riding', 'dropping', 'returning', 'platform', 'finished'].includes(saved.phase)
      && Number.isFinite(saved.progress) && saved.progress >= 0 && saved.progress <= 1
      && Number.isFinite(saved.speed) && saved.speed >= 0 && saved.speed <= 1
      && Number.isFinite(saved.stalled) && saved.stalled >= 0
      && (saved.rideVersion === 3
        ? ([-1, 0, 1].includes(saved.lane) && Array.isArray(saved.treats)
          && saved.treats.every((id) => COASTER_TREATS.some((treat) => treat.id === id)
            || ['sweet-6', 'sweet-7', 'sweet-8'].includes(id))
          && new Set(saved.treats).size === saved.treats.length)
        : (saved.signals === undefined || (Number.isInteger(saved.signals) && saved.signals >= 0
          && saved.signals <= (saved.rideVersion === 2 ? 3 : 2))))))
    && (index !== 3 || (Array.isArray(saved.collected) && saved.collected.every((id) => ITEMS.includes(id))
      && new Set(saved.collected).size === saved.collected.length && Number.isInteger(saved.checkpoint)
      && saved.checkpoint >= 0 && saved.checkpoint < CANOPY_PLATFORMS.length
      && (saved.lanterns === undefined || (Array.isArray(saved.lanterns) && saved.lanterns.length <= CANOPY_LANTERNS.length
        && saved.lanterns.every((id, i) => id === CANOPY_LANTERNS[i])))
      && typeof saved.zipline === 'boolean' && typeof saved.treasuresUsed === 'boolean'
      && (saved.traversal === null || (['net', 'rope'].includes(saved.traversal?.kind)
        && (saved.traversal.crossingId === undefined
          || CANOPY_CROSSINGS[saved.traversal.crossingId]?.kind === saved.traversal.kind)
        && Number.isFinite(saved.traversal.progress) && saved.traversal.progress >= 0 && saved.traversal.progress <= 1
        && (saved.traversal.elapsed === undefined || (Number.isFinite(saved.traversal.elapsed) && saved.traversal.elapsed >= 0))
        && (saved.traversal.armed === undefined || typeof saved.traversal.armed === 'boolean')
        && (saved.traversal.reverse === undefined || typeof saved.traversal.reverse === 'boolean')
        && (saved.traversal.target === undefined || validCanopyTarget(saved.traversal.target))))
      && Number.isFinite(saved.zipProgress) && saved.zipProgress >= 0 && saved.zipProgress <= 1));
  if (!valid) {
    console.warn(`Invalid saved ${ADVENTURE_NAMES[index]} progress; returning to the entrance.`);
    return initial;
  }
  const restored = { ...initial, ...saved, player: { ...player }, message: initialMessages[index] };
  if (index === 1) {
    if (saved.catCueGiven === undefined) restored.catCueGiven = saved.cuesPlaced;
    restored.puzzle = false;
    restored.shot = false;
    if (saved.caseUnlocked === undefined && (saved.balls || saved.ballsPlaced)) restored.caseUnlocked = true;
    if (restored.pubEnding === 'dialogue') restored.message = PUB_GOODBYE;
    if (restored.pubEnding === 'ready') restored.message = 'Leave Lucky Chucks together, hand in hand.';
    if (pubCollision.blocked(restored.player)) {
      const positions = PUB_OBSTACLES.flatMap((obstacle) => furnitureApproaches(restored.player, obstacle))
        .filter((point) => !pubCollision.blocked(point));
      positions.push({ x: initial.player.x, y: initial.player.y });
      const position = positions.sort((a, b) =>
        Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
      restored.player = { ...restored.player, ...position };
      if (!restored.pubEnding) restored.message = 'You moved clear of the furniture to continue your game.';
    }
  }
  if (index === 2) {
    if (saved.rideVersion !== 3) {
      const previousSignals = saved.signals ?? (saved.progress >= 0.48 ? 2 : saved.progress >= 0.22 ? 1 : 0);
      const finalSignal = saved.rideVersion === 2 && saved.phase === 'riding' && previousSignals === 3;
      const earned = finalSignal || ['dropping', 'returning', 'platform', 'finished'].includes(saved.phase)
        ? COASTER_GOAL : saved.phase === 'riding' ? Math.min(previousSignals, 2) : 0;
      restored.treats = COASTER_TREATS.slice(0, earned).map((treat) => treat.id);
      if (saved.phase === 'riding') { restored.progress = 0; if (finalSignal) restored.phase = 'dropping'; }
    }
    restored.rideVersion = 3;
    restored.lane = 0;
    restored.treats = restored.treats.filter((id) => COASTER_TREATS.some((treat) => treat.id === id));
    if (restored.phase === 'platform' && !restored.complete && !restored.rideEnding && restored.treats.length < COASTER_GOAL) {
      restored.phase = 'riding';
      restored.progress = 0;
    }
    if (['boarding', 'platform'].includes(restored.phase) && !restored.complete && coasterCollision.blocked(restored.player)) {
      const positions = coasterObstacles.flatMap((obstacle) => furnitureApproaches(restored.player, obstacle))
        .filter((point) => !coasterCollision.blocked(point));
      positions.push({ x: initial.player.x, y: initial.player.y });
      positions.sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
      restored.player = { ...restored.player, ...positions[0] };
    }
  }
  if (index === 2 && restored.phase !== 'boarding' && !restored.complete) {
    restored.message = restored.rideEnding === 'dialogue' ? COASTER_GOODBYE : restored.rideEnding === 'ready'
      ? 'Leave Thirteen together, hand in hand.' : {
        riding: 'Hold left or right to collect park items.',
        dropping: 'Here comes the drop!',
        returning: 'Back to the station.',
        platform: restored.bags ? 'Take the bags to Cat.' : 'Find the bags in the locker.'
      }[restored.phase] || initialMessages[2];
  }
  if (index === 3) {
    restored.collected = [...saved.collected];
    restored.lanterns = [...(saved.lanterns || [])];
    restored.courseVersion = 3;
    if (saved.zipline && saved.courseVersion === undefined) restored.legacyZipline = true;
    restored.flight = null;
    if (restored.traversal) {
      const crossingId = restored.traversal.crossingId || restored.traversal.kind;
      const moves = CANOPY_CROSSINGS[crossingId].moves;
      restored.traversal = {
        ...restored.traversal, crossingId,
        progress: Math.min(moves - 1, Math.floor(restored.traversal.progress * moves)) / moves,
        elapsed: restored.traversal.elapsed ?? 0, armed: restored.traversal.armed ?? true,
        target: saved.traversal.target ? { ...saved.traversal.target } : createCanopyTarget()
      };
      if (saved.courseVersion !== 3) {
        const crossing = CANOPY_CROSSINGS[crossingId];
        const from = restored.traversal.reverse ? crossing.end : crossing.start;
        const to = restored.traversal.reverse ? crossing.start : crossing.end;
        const [x, y, height] = from.map((value, i) =>
          value + (to[i] - value) * restored.traversal.progress);
        restored.player = { x, y, height };
      }
    }
    if (saved.courseVersion !== 3 && !restored.traversal) {
      if (!restored.zipline) {
        const previousPlatform = LEGACY_CANOPY_PLATFORMS.findIndex((p) => player.x >= p.left && player.x <= p.right
          && player.y >= p.top && player.y <= p.bottom && Math.abs(player.height - p.height) < 1);
        if (previousPlatform >= 0) restored.player.x += CANOPY_OFFSETS[previousPlatform];
      }
    }
    if (restored.zipline && !restored.legacyZipline) restored.player = canopyZipPosition(restored.zipProgress);
    if (restored.traversal) restored.message = 'Time your moves as the marker passes through the safe zone.';
    const flightOrigin = saved.flight?.from;
    const origin = Number.isInteger(flightOrigin) && flightOrigin >= 0 && flightOrigin <= restored.checkpoint
      ? flightOrigin : restored.checkpoint;
    const platform = CANOPY_PLATFORMS[origin];
    if (!restored.zipline && !restored.traversal && platformAt(restored.player.x, restored.player.y, restored.player.height) < 0) {
      restored.player = { x: (platform.left + platform.right) / 2, y: 350, height: platform.height };
    }
    if (!restored.zipline && !restored.traversal) {
      const currentPlatform = CANOPY_PLATFORMS[platformAt(restored.player.x, restored.player.y, restored.player.height)];
      restored.player = clearCanopyPosition(restored.player, currentPlatform);
    }
  }
  return restored;
}

export function platformAt(x, y, height) {
  return CANOPY_PLATFORMS.findIndex((platform) => x >= platform.left && x <= platform.right
    && y >= platform.top && y <= platform.bottom && Math.abs(platform.height - height) < 1);
}

export function walkAdventure(index, state, dx, dy, seconds) {
  if (state.complete || (index === 3 && (state.zipline || state.traversal)) || (index === 2 && state.phase !== 'boarding' && state.phase !== 'platform')
    || !Number.isFinite(seconds) || seconds <= 0) return state;
  const length = Math.hypot(dx, dy);
  if (!length) return state;
  const distance = Math.min(length, 175 * seconds);
  let x = Math.max(40, Math.min(index === 3 ? CANOPY_ZIPLINE.departure.x : 960, state.player.x + dx / length * distance));
  let y = Math.max(40, Math.min(660, state.player.y + dy / length * distance));
  if (index === 1 || index === 2) {
    const collision = index === 1 ? furnitureCollision : platformCollision;
    const next = collision.move(state.player, x - state.player.x, y - state.player.y);
    x = next.x; y = next.y;
    if (x === state.player.x && y === state.player.y) return state;
  }
  if (index === 3) {
    const next = canopyCollision(state.player.height).move(state.player, x - state.player.x, y - state.player.y);
    x = next.x; y = next.y;
    if (x === state.player.x && y === state.player.y) return state;
    const currentPlatform = platformAt(state.player.x, state.player.y, state.player.height);
    if (!state.flight && (currentPlatform < 0 || platformAt(x, y, state.player.height) !== currentPlatform)) return state;
  }
  return { ...state, player: { ...state.player, x, y } };
}

export function jumpCanopy(state) {
  if (state.complete || state.flight || state.zipline || state.traversal) return state;
  const from = platformAt(state.player.x, state.player.y, state.player.height);
  if (from < 0) return state;
  return { ...state, flight: { velocity: 250, from }, message: 'Jump across the gap to the other platform.' };
}

export function tickCanopy(state, seconds) {
  if (state.traversal && seconds > 0) {
    const elapsed = state.traversal.elapsed + seconds;
    const meter = canopyMeter(elapsed);
    const target = canopyTarget({ ...state.traversal, elapsed });
    return {
      ...state, traversal: {
        ...state.traversal, elapsed,
        armed: state.traversal.armed || meter < target.start || meter > target.end
      }
    };
  }
  if (state.zipline && !state.complete && seconds > 0) {
    const zipProgress = Math.min(1, state.zipProgress + seconds / 3);
    const player = state.legacyZipline
      ? {
        x: LEGACY_CANOPY_ZIPLINE.start.x + (LEGACY_CANOPY_ZIPLINE.end.x - LEGACY_CANOPY_ZIPLINE.start.x) * zipProgress,
        y: LEGACY_CANOPY_ZIPLINE.start.y + (LEGACY_CANOPY_ZIPLINE.end.y - LEGACY_CANOPY_ZIPLINE.start.y) * zipProgress,
        height: LEGACY_CANOPY_ZIPLINE.start.height * (1 - zipProgress)
      }
      : canopyZipPosition(zipProgress);
    return {
      ...state, zipProgress, player,
      ...(zipProgress === 1 ? { complete: true, message: 'You ride the zip-wire down through the glowing trees!' } : {})
    };
  }
  if (!state.flight || seconds <= 0) return state;
  const velocity = state.flight.velocity - 500 * seconds;
  const height = state.player.height + velocity * seconds;
  if (velocity <= 0) {
    const landed = CANOPY_PLATFORMS.findIndex((p, index) => (index <= state.checkpoint || ([3, 5].includes(index) && index === state.checkpoint + 1))
      && state.player.x >= p.left && state.player.x <= p.right
      && state.player.y >= p.top && state.player.y <= p.bottom && state.player.height >= p.height && height <= p.height);
    if (landed >= 0) return {
      ...state, player: clearCanopyPosition({ ...state.player, height: CANOPY_PLATFORMS[landed].height }, CANOPY_PLATFORMS[landed]),
      flight: null, checkpoint: Math.max(state.checkpoint, landed), message: 'Safe landing! Follow the next lantern.'
    };
  }
  if (height < -90) {
    const platform = CANOPY_PLATFORMS[state.flight.from ?? state.checkpoint];
    return {
      ...state, player: { x: (platform.left + platform.right) / 2, y: 350, height: platform.height },
      flight: null, message: 'You slipped into the dark and returned to your last checkpoint.'
    };
  }
  return { ...state, player: { ...state.player, height }, flight: { ...state.flight, velocity } };
}

export function canopyMeter(elapsed) {
  return (1 - Math.cos(elapsed * Math.PI)) / 2;
}

export function createCanopyTarget(random = Math.random) {
  return { width: 0.12 + random() * 0.1, phase: random() * Math.PI * 2, period: 4.5 + random() * 2 };
}

function validCanopyTarget(target) {
  return target && Number.isFinite(target.width) && target.width >= 0.12 && target.width <= 0.22
    && Number.isFinite(target.phase) && target.phase >= 0 && target.phase <= Math.PI * 2
    && Number.isFinite(target.period) && target.period >= 4.5 && target.period <= 6.5;
}

export function canopyTarget({ target, elapsed }) {
  const wave = (1 + Math.sin(elapsed * Math.PI * 2 / target.period + target.phase)) / 2;
  const start = 0.08 + (0.84 - target.width) * wave;
  return { start, end: start + target.width };
}

export function canopyZipPosition(progress) {
  const { start, departure, end, departureProgress } = CANOPY_ZIPLINE;
  const first = progress <= departureProgress;
  const from = first ? start : departure, to = first ? departure : end;
  const t = first ? progress / departureProgress : (progress - departureProgress) / (1 - departureProgress);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    height: from.height + (to.height - from.height) * t
  };
}

export function advanceCanopy(state) {
  if (!state.traversal) return state;
  const { kind, progress, elapsed, armed } = state.traversal;
  const crossing = CANOPY_CROSSINGS[state.traversal.crossingId || kind];
  const reverse = state.traversal.reverse === true;
  const from = reverse ? crossing.end : crossing.start;
  const to = reverse ? crossing.start : crossing.end;
  const meter = canopyMeter(elapsed);
  const target = canopyTarget(state.traversal);
  if (!armed) return message(state, 'Wait for the marker to leave the safe zone before the next move.');
  if (meter < target.start || meter > target.end) {
    return {
      ...state, traversal: null,
      player: { x: from[0] + (reverse ? 10 : -10), y: from[1], height: from[2] },
      message: 'You lost your footing and returned to the platform. Try the crossing again.'
    };
  }
  const next = Math.min(1, Math.round(progress * crossing.moves + 1) / crossing.moves);
  const [x, y, height] = from.map((value, i) => value + (to[i] - value) * next);
  const player = { x, y, height };
  return {
    ...state, player, traversal: next >= 1 ? null
      : { ...state.traversal, progress: next, elapsed, armed: false, target: createCanopyTarget() },
    ...(next >= 1 ? {
      checkpoint: Math.max(state.checkpoint, reverse ? crossing.from : crossing.to),
      message: kind === 'net' ? 'You climbed to the other platform.' : 'You crossed the rope to the other platform.'
    }
      : { message: 'Good timing. Wait for the marker to return to the safe zone.' })
  };
}

function message(state, text) { return { ...state, message: text }; }

export function interactAdventure(index, state, id) {
  const object = OBJECTS[index].find((item) => item.id === id);
  if (!object || state.complete || (index === 3 && (state.flight || state.zipline || state.traversal))) return state;
  if (!adventureObjectInRange(index, state.player, object)) return message(state, `Move closer to ${object.name}.`);
  if (index === 1) {
    if (id === 'bar') return state.drinksPlaced ? message(state, 'The drinks are already on the table.')
      : { ...state, drinks: true, message: 'You collect two drinks from the bar.' };
    if (id === 'bartender') return message(state, state.drinks || state.drinksPlaced
      ? 'Jamie: Enjoy your drinks, and good luck with the pool!'
      : 'Jamie: Welcome to Lucky Chucks! Help yourselves to drinks at the bar.');
    if (id === 'drinks-table') return state.drinksPlaced ? message(state, 'The drinks are ready.')
      : state.drinks ? { ...state, drinks: false, drinksPlaced: true, message: 'You put the drinks beside the pool table.' }
        : message(state, 'Get the drinks from the bar first.');
    if (id === 'cue-rack') return state.cues || state.cuesPlaced || state.catCueGiven
      ? message(state, 'You have already taken two cues from the rack.')
      : { ...state, cues: true, message: 'You take two cues. Give the longer one to Cat and lean your shorter cue against the pool table.' };
    if (id === 'rack-note') return {
      ...state, noteRead: true,
      message: 'Scorecard: The case code is half the table pockets, then one cue each for you and Cat, then the eight-ball.'
    };
    if (id === 'ball-box') return state.ballsPlaced ? message(state, 'The balls are already on the pool table.')
      : state.caseUnlocked ? { ...state, balls: true, message: 'You pick up the pool balls.' }
        : state.noteRead ? { ...state, puzzle: true, message: 'Use the scorecard and the pool table to work out the three-digit case code.' }
          : message(state, 'The ball case is locked. Find a clue to its code in the pub.');
    if (id === 'pool-table') {
      if (state.ballLost) return message(state, 'The eight-ball rolled away. Search around the cabinet.');
      if (state.cuesPlaced && state.catCueGiven && state.ballsPlaced) return {
        ...state, shot: true,
        message: 'Line up your break and choose a controlled power. The guide shows where the cue ball will travel.'
      };
      const placeCue = state.cues && !state.cuesPlaced, placeBalls = state.balls && !state.ballsPlaced;
      if (!placeCue && !placeBalls) return message(state, !state.catCueGiven && state.cues
        ? 'Give the longer cue to Cat before taking the break.'
        : 'Find the cues and ball case before setting up the table.');
      const cuesPlaced = state.cuesPlaced || placeCue, ballsPlaced = state.ballsPlaced || placeBalls;
      return {
        ...state, cues: state.cues && !(cuesPlaced && state.catCueGiven), balls: false, cuesPlaced, ballsPlaced,
        message: placeCue
          ? `You lean your shorter cue against the table.${placeBalls ? ' You also set out the balls.' : ''}${!state.catCueGiven ? ' Give the longer cue to Cat.' : ''}`
          : 'You set the balls on the pool table.'
      };
    }
    if (id === 'tool-rack') return !state.ballLost ? message(state, 'Pool brushes, a rest and a long retrieval hook hang inside.')
      : state.ballFound ? message(state, 'The eight-ball is already out from under the cabinet.')
        : state.hook ? message(state, 'You already have the retrieval hook.')
          : { ...state, hook: true, message: 'You take the long retrieval hook from the equipment cupboard.' };
    if (id === 'cabinet') return !state.ballLost ? message(state, 'There is nothing under the cabinet yet.')
      : state.ballFound ? message(state, 'You already retrieved the eight-ball.')
        : !state.hook ? message(state, 'The eight-ball is too far under the cabinet to reach. Look for a long tool in the equipment cupboard.')
          : { ...state, hook: false, ballFound: true, message: 'You use the retrieval hook to pull the eight-ball from under the cabinet.' };
    if (id === 'love') return state.pubEnding ? message(state, 'It is time to leave together.')
      : state.cues && !state.catCueGiven
        ? { ...state, cues: !state.cuesPlaced, catCueGiven: true, message: 'You give the longer cue to Cat.' }
      : state.drinksPlaced && state.ballFound
        ? { ...state, ballFound: false, pubEnding: 'dialogue', message: PUB_GOODBYE }
        : message(state, 'Cat: Set out our drinks and pool equipment, then find the missing eight-ball.');
  }
  if (index === 2) {
    if (id === 'carriage') return state.phase === 'boarding'
      ? { ...state, phase: 'riding', lane: 0, message: 'Hold left or right to collect park items.' }
      : message(state, 'The carriage has returned to the dock.');
    if (id === 'locker') return state.phase !== 'platform' ? message(state, 'Collect the bags after the ride returns.')
      : state.bags ? message(state, 'You already have the bags.') : { ...state, bags: true, message: 'You take the bags from the locker.' };
    if (id === 'amor') return state.rideEnding ? message(state, 'It is time to leave together.')
      : state.phase === 'platform' && state.bags
        ? { ...state, bags: false, ticket: true, rideEnding: 'dialogue', message: COASTER_GOODBYE }
        : message(state, 'Cat: Ride together first, then bring our bags from the locker.');
  }
  if (index === 3) {
    if (ITEMS.includes(id)) return state.collected.includes(id) ? message(state, `You already found the ${object.name.toLowerCase()}.`)
      : { ...state, collected: [...state.collected, id], message: `You found the ${object.name.toLowerCase()}!` };
    const crossing = CANOPY_CROSSINGS[id];
    if (crossing) {
      const reverse = platformAt(state.player.x, state.player.y, state.player.height) === crossing.to;
      if (state.checkpoint < (reverse ? crossing.to : crossing.from)) return message(state, 'Follow the course to reach this crossing first.');
      if (!reverse && id === 'high-rope' && state.collected.length < ITEMS.length) {
        return message(state, 'Find all four treasures before crossing the high rope bridge.');
      }
      if (!reverse && id === 'high-net' && (state.lanterns || []).length < 2) {
        return message(state, 'Light the first two lanterns before climbing the summit net.');
      }
      const [x, y, height] = reverse ? crossing.end : crossing.start;
      return {
        ...state, player: { x, y, height },
        traversal: { kind: crossing.kind, crossingId: id, reverse, progress: 0, elapsed: 0, armed: true, target: createCanopyTarget() },
        message: `Time ${crossing.moves} moves as the marker passes through the safe zone.`
      };
    }
    if (CANOPY_LANTERNS.includes(id)) {
      const lanterns = state.lanterns || [];
      if (lanterns.includes(id)) return message(state, 'This lantern is already lit.');
      if (CANOPY_LANTERNS[lanterns.length] !== id) return message(state, 'Light the lanterns in order, starting with the first.');
      return { ...state, lanterns: [...lanterns, id], message: `The ${object.name.toLowerCase()} glows. Lanterns lit: ${lanterns.length + 1}/3.` };
    }
    if (id === 'zipline') return state.collected.length === 4 && (state.lanterns || []).length === CANOPY_LANTERNS.length
      ? { ...state, player: canopyZipPosition(0), zipline: true, zipProgress: 0, treasuresUsed: true, message: 'You present the four treasures and clip onto the zip-wire!' }
      : message(state, `The zip-wire needs four treasures (${state.collected.length}/4) and three lit lanterns (${(state.lanterns || []).length}/3).`);
  }
  return state;
}

export function takePoolShot(state, aim, power) {
  if (!state.shot || !Number.isFinite(aim) || !Number.isFinite(power) || aim < -35 || aim > 35 || power < 0 || power > 100) return state;
  if (Math.abs(aim) > 7 || power < 55 || power > 75) {
    const hint = Math.abs(aim) > 7 ? 'The cue ball missed the rack. Adjust the line towards the centre.'
      : power < 55 ? 'The break was too gentle. Try a little more power.'
        : 'That break was too hard. Try a more controlled shot.';
    return { ...state, message: hint };
  }
  return { ...state, shot: false, ballLost: true, message: 'The break scatters the balls, but the eight-ball rolls away under the cabinet!' };
}

export function unlockBallCase(state, code) {
  if (!state.puzzle || !['321', '312', '231'].includes(code)) return state;
  return code === '321'
    ? { ...state, puzzle: false, caseUnlocked: true, balls: true, message: 'The case clicks open. You take the pool balls.' }
    : { ...state, puzzle: false, message: 'That code does not work. Check the scorecard, cues and table pockets.' };
}

export function controlCoaster(state, command) {
  if (state.phase !== 'riding' || !['left', 'right', 'neutral'].includes(command)) return state;
  const lane = command === 'left' ? -1 : command === 'right' ? 1 : 0;
  return lane === state.lane ? state : { ...state, lane };
}

export function tickCoaster(state, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  if (state.phase === 'riding') {
    const progress = Math.min(1, state.progress + seconds / COASTER_RIDE_SECONDS);
    const caught = COASTER_TREATS.filter((treat) => treat.progress > state.progress && treat.progress <= progress
      && treat.lane === state.lane && !state.treats.includes(treat.id));
    const treats = caught.length ? [...state.treats, ...caught.map((treat) => treat.id)] : state.treats;
    return {
      ...state, progress, treats,
      ...(caught.length ? { message: treats.length >= COASTER_GOAL ? `Collected: ${caught.at(-1).name}. Goal reached!` : `Collected: ${caught.at(-1).name}!` } : {}),
      ...(progress === 1 ? { phase: 'dropping', progress: 0, message: 'Here comes the drop!' } : {})
    };
  }
  if (state.phase === 'dropping') {
    const progress = Math.min(1, state.progress + seconds / COASTER_DROP_SECONDS);
    return { ...state, progress, ...(progress === 1 ? { phase: 'returning', progress: 0, message: 'Going backwards!' } : {}) };
  }
  if (state.phase === 'returning') {
    const progress = Math.min(1, state.progress + seconds / COASTER_RETURN_SECONDS);
    if (progress === 1 && state.treats.length < COASTER_GOAL) {
      return { ...state, phase: 'riding', progress: 0, message: 'Another lap! Collect the remaining park items.' };
    }
    return {
      ...state, progress, ...(progress === 1 ? {
        phase: 'platform', progress: 1, player: { x: 500, y: 610, height: 0 },
        message: 'You and Cat step out. Retrieve the bags from the locker.'
      } : {})
    };
  }
  return state;
}
