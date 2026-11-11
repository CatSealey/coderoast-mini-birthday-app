import { createCollision, findWorldPath } from '../world/world-collision.js';
import { COASTER_DROP_SECONDS, COASTER_GOAL, COASTER_RETURN_SECONDS, COASTER_RIDE_SECONDS, COASTER_TREATS } from './coaster-course.js';

export const ADVENTURE_NAMES = { 1: 'Lucky Chucks', 2: 'Thirteen', 3: 'GoApe' };
export const POOL_TABLE_FOOTPRINT = Object.freeze({ x: 500, y: 230, width: 220, depth: 131 });
export const PUB_JOIN_POINT = Object.freeze({ x: 724, y: 460 });
export const PUB_EXIT = Object.freeze({ x: 900, y: 640 });
export const PUB_PARTNER_OFFSET = -34;
export const PUB_GOODBYE = "Cat: We sucked at pool, let's go home.";
export const COASTER_GOODBYE = 'Cat: You look so happy with yourself 😅, you got me good!';
export const COASTER_JOIN_POINT = Object.freeze({ x: 644, y: 610 });
export const COASTER_EXIT = Object.freeze({ x: 900, y: 610 });
export const CANOPY_ZIPLINE = Object.freeze({
  start: Object.freeze({ x: 1800, y: 350, height: 190 }),
  departure: Object.freeze({ x: 1850, y: 375, height: 190 }),
  end: Object.freeze({ x: 2200, y: 570, height: 0 }),
  departureProgress: 0.15,
  cableHeight: 85
});
export const OBJECTS = {
  1: [
    { id: 'bar', name: 'Bar', x: 130, y: 120, kind: 'bar', footprint: { width: 190, depth: 65 } },
    { id: 'rack-note', name: 'Scorecard', x: 285, y: 130, kind: 'note', footprint: { width: 62, depth: 32 } },
    { id: 'drinks-table', name: 'Drinks table', x: 540, y: 440, kind: 'table', footprint: { width: 100, depth: 70 } },
    { id: 'cue-rack', name: 'Cue rack', x: 835, y: 130, kind: 'rack', footprint: { width: 80, depth: 23 } },
    { id: 'ball-box', name: 'Ball case', x: 115, y: 510, kind: 'box', footprint: { width: 60, depth: 45 } },
    {
      id: 'pool-table', name: 'Pool table', x: POOL_TABLE_FOOTPRINT.x, y: POOL_TABLE_FOOTPRINT.y, kind: 'pool',
      footprint: { width: POOL_TABLE_FOOTPRINT.width, depth: POOL_TABLE_FOOTPRINT.depth }
    },
    { id: 'tool-rack', name: 'Equipment cupboard', x: 290, y: 590, kind: 'tools', footprint: { width: 75, depth: 48 } },
    { id: 'cabinet', name: 'Cabinet', x: 840, y: 500, kind: 'cabinet', footprint: { width: 60, depth: 52 } },
    { id: 'love', name: 'Cat', x: 690, y: 460, kind: 'npc', footprint: { radius: 16 } }
  ],
  2: [
    { id: 'carriage', name: 'Thirteen carriage', x: 500, y: 530, kind: 'carriage' },
    { id: 'locker', name: 'Bag locker', x: 790, y: 665, kind: 'locker', footprint: { width: 60, depth: 49 } },
    { id: 'amor', name: 'Cat', x: 610, y: 610, kind: 'npc' }
  ],
  3: [
    { id: 'leaf', name: 'Glowing leaf', x: 200, y: 295, kind: 'collectible', height: 0 },
    { id: 'net', name: 'Climbing net', x: 330, y: 350, kind: 'net', height: 0 },
    { id: 'feather', name: 'Night feather', x: 440, y: 405, kind: 'collectible', height: 80 },
    { id: 'rope', name: 'Rope crossing', x: 500, y: 350, kind: 'rope', height: 80 },
    { id: 'acorn', name: 'Silver acorn', x: 680, y: 290, kind: 'collectible', height: 130 },
    { id: 'star', name: 'Forest star', x: 850, y: 405, kind: 'collectible', height: 130 },
    { id: 'high-rope', name: 'High rope bridge', x: 945, y: 350, kind: 'rope', height: 130 },
    { id: 'lantern-1', name: 'First lantern', x: 1110, y: 300, kind: 'beacon', height: 165 },
    { id: 'lantern-2', name: 'Second lantern', x: 1300, y: 405, kind: 'beacon', height: 165 },
    { id: 'high-net', name: 'Summit net', x: 1370, y: 350, kind: 'net', height: 165 },
    { id: 'summit-rope', name: 'Summit rope bridge', x: 1575, y: 350, kind: 'rope', height: 190 },
    { id: 'lantern-3', name: 'Final lantern', x: 1720, y: 300, kind: 'beacon', height: 190 },
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
  ...[420, 640].flatMap((x) => [470, 570].map((y) => Object.freeze({ x, y, radius: 23.5 })))
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
const coupleFurniture = createCollision(PUB_OBSTACLES.filter((obstacle) => obstacle.id !== 'love'), PUB_PLAYER_RADIUS);
const partnerPoint = (point) => ({ x: point.x + PUB_PARTNER_OFFSET, y: point.y });
const coupleCollision = {
  blocked: (point) => !withinPub(point) || !withinPub(partnerPoint(point))
    || coupleFurniture.blocked(point) || coupleFurniture.blocked(partnerPoint(point)),
  clearSegment: (start, end) => withinPub(end) && withinPub(partnerPoint(end))
    && coupleFurniture.clearSegment(start, end)
    && coupleFurniture.clearSegment(partnerPoint(start), partnerPoint(end))
};
const locker = OBJECTS[2].find((object) => object.id === 'locker');
const lockerCollision = createCollision([{ x: locker.x, y: locker.y, ...locker.footprint }], PUB_PLAYER_RADIUS);
const coasterCollision = {
  blocked: (point) => !withinPub(point) || lockerCollision.blocked(point),
  clearSegment: (start, end) => withinPub(end) && lockerCollision.clearSegment(start, end)
};
const coasterCoupleCollision = {
  blocked: (point) => coasterCollision.blocked(point) || coasterCollision.blocked(partnerPoint(point)),
  clearSegment: (start, end) => coasterCollision.clearSegment(start, end)
    && coasterCollision.clearSegment(partnerPoint(start), partnerPoint(end))
};

export function pubCouplePath(start) {
  const route = findWorldPath(start, PUB_EXIT, coupleCollision);
  return route?.length && Math.hypot(route.at(-1).x - PUB_EXIT.x, route.at(-1).y - PUB_EXIT.y) < 0.01 ? route : null;
}

export function walkPubCouple(state, destination, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  const dx = destination.x - state.player.x, dy = destination.y - state.player.y;
  const length = Math.hypot(dx, dy);
  if (!length) return state;
  const distance = Math.min(length, 105 * seconds);
  const next = { x: state.player.x + dx / length * distance, y: state.player.y + dy / length * distance };
  if (!coupleCollision.clearSegment(state.player, next)) return state;
  return { ...state, player: { ...state.player, ...next } };
}

export function coasterCouplePath(start) {
  const route = findWorldPath(start, COASTER_EXIT, coasterCoupleCollision);
  return route?.length && Math.hypot(route.at(-1).x - COASTER_EXIT.x, route.at(-1).y - COASTER_EXIT.y) < 0.01 ? route : null;
}

export function walkCoasterCouple(state, destination, seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return state;
  const dx = destination.x - state.player.x, dy = destination.y - state.player.y;
  const length = Math.hypot(dx, dy);
  if (!length) return state;
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
  return (index === 1 || index === 2) && object.footprint
    ? footprintDistance(player, { ...object.footprint, x: object.x, y: object.y })
    : Math.hypot(player.x - object.x, player.y - object.y);
}

export function adventureObjectInRange(index, player, object) {
  const range = (index === 1 || index === 2) && object.footprint ? PUB_INTERACTION_RANGE : 85;
  return adventureObjectDistance(index, player, object) <= range
    && Math.abs(player.height - (object.height || 0)) <= 25;
}

function furniturePath(player, destination, object, collision) {
  const points = object?.footprint ? furnitureApproaches(player, { ...object.footprint, x: object.x, y: object.y }) : [destination];
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

export const CANOPY_PLATFORMS = [
  { left: 40, right: 350, top: 265, bottom: 435, height: 0 },
  { left: 380, right: 525, top: 265, bottom: 435, height: 80 },
  { left: 600, right: 730, top: 265, bottom: 435, height: 130 },
  { left: 795, right: 960, top: 265, bottom: 435, height: 130 },
  { left: 1040, right: 1180, top: 265, bottom: 435, height: 165 },
  { left: 1245, right: 1380, top: 265, bottom: 435, height: 165 },
  { left: 1450, right: 1585, top: 265, bottom: 435, height: 190 },
  { left: 1660, right: 1840, top: 265, bottom: 435, height: 190 }
];
export const CANOPY_CROSSINGS = Object.freeze({
  net: { kind: 'net', from: 0, to: 1, start: [330, 350, 0], end: [400, 350, 80], moves: 3 },
  rope: { kind: 'rope', from: 1, to: 2, start: [500, 350, 80], end: [615, 350, 130], moves: 3 },
  'high-rope': { kind: 'rope', from: 3, to: 4, start: [945, 350, 130], end: [1055, 350, 165], moves: 4 },
  'high-net': { kind: 'net', from: 5, to: 6, start: [1370, 350, 165], end: [1465, 350, 190], moves: 4 },
  'summit-rope': { kind: 'rope', from: 6, to: 7, start: [1575, 350, 190], end: [1675, 350, 190], moves: 5 }
});
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
    ...base, drinks: false, drinksPlaced: false, cues: false, balls: false, cuesPlaced: false,
    ballsPlaced: false, ballLost: false, ballFound: false, noteRead: false, caseUnlocked: false, puzzle: false,
    hook: false, shot: false, pubEnding: null
  };
  if (index === 2) return { ...base, rideVersion: 3, phase: 'boarding', progress: 0, speed: 0, stalled: 0, lane: 0, treats: [], bags: false, ticket: false, rideEnding: null };
  return {
    ...base, courseVersion: 2, collected: [], lanterns: [], checkpoint: 0, flight: null, traversal: null,
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
  const maxX = index === 3 ? (saved.zipline ? CANOPY_ZIPLINE.end.x : 1850) : 960;
  const validPlayer = player && Number.isFinite(player.x) && player.x >= 40 && player.x <= maxX
    && Number.isFinite(player.y) && player.y >= 40 && player.y <= 660 && Number.isFinite(player.height)
    && player.height >= 0 && player.height <= (index === 3 ? 400 : 200);
  const flags = index === 1 ? ['drinks', 'drinksPlaced', 'cues', 'balls', 'cuesPlaced', 'ballsPlaced', 'ballLost', 'ballFound']
    : index === 2 ? ['bags', 'ticket'] : [];
  const valid = validPlayer && flags.every((flag) => typeof saved[flag] === 'boolean')
    && (index !== 1 || ['noteRead', 'caseUnlocked', 'hook'].every((flag) => saved[flag] === undefined || typeof saved[flag] === 'boolean'))
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
        && (saved.traversal.target === undefined || validCanopyTarget(saved.traversal.target))))
      && Number.isFinite(saved.zipProgress) && saved.zipProgress >= 0 && saved.zipProgress <= 1));
  if (!valid) {
    console.warn(`Invalid saved ${ADVENTURE_NAMES[index]} progress; returning to the entrance.`);
    return initial;
  }
  const restored = { ...initial, ...saved, player: { ...player }, message: initialMessages[index] };
  if (index === 1) {
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
      const positions = furnitureApproaches(restored.player, { x: locker.x, y: locker.y, ...locker.footprint })
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
    restored.courseVersion = 2;
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
    }
    if (restored.traversal) restored.message = 'Time your moves as the marker passes through the safe zone.';
    const platform = CANOPY_PLATFORMS[restored.checkpoint];
    if (!restored.zipline && !restored.traversal && platformAt(restored.player.x, restored.player.y, restored.player.height) < 0) {
      restored.player = { x: (platform.left + platform.right) / 2, y: 350, height: platform.height };
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
  let x = Math.max(40, Math.min(index === 3 ? 1850 : 960, state.player.x + dx / length * distance));
  let y = Math.max(40, Math.min(660, state.player.y + dy / length * distance));
  if (index === 1 || index === 2) {
    const collision = index === 1 ? furnitureCollision : lockerCollision;
    const next = collision.move(state.player, x - state.player.x, y - state.player.y);
    x = next.x; y = next.y;
    if (x === state.player.x && y === state.player.y) return state;
  }
  if (index === 3 && !state.flight && platformAt(x, y, state.player.height) < 0) return state;
  return { ...state, player: { ...state.player, x, y } };
}

export function jumpCanopy(state) {
  if (state.complete || state.flight || state.zipline || state.traversal) return state;
  return { ...state, flight: { velocity: 250 }, message: 'Jump across the gap and land on the next lit platform.' };
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
      ? { x: 900 + 60 * zipProgress, y: 350 + 220 * zipProgress, height: 130 * (1 - zipProgress) }
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
      ...state, player: { ...state.player, height: CANOPY_PLATFORMS[landed].height },
      flight: null, checkpoint: Math.max(state.checkpoint, landed), message: 'Safe landing! Follow the next lantern.'
    };
  }
  if (height < -90) {
    const platform = CANOPY_PLATFORMS[state.checkpoint];
    return {
      ...state, player: { x: (platform.left + platform.right) / 2, y: 350, height: platform.height },
      flight: null, message: 'You slipped into the dark and returned to your last checkpoint.'
    };
  }
  return { ...state, player: { ...state.player, height }, flight: { velocity } };
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
  const meter = canopyMeter(elapsed);
  const target = canopyTarget(state.traversal);
  if (!armed) return message(state, 'Wait for the marker to leave the safe zone before the next move.');
  if (meter < target.start || meter > target.end) {
    const platform = CANOPY_PLATFORMS[crossing.from];
    return {
      ...state, traversal: null,
      player: { x: crossing.start[0] - 10, y: crossing.start[1], height: platform.height },
      message: 'You lost your footing and returned to the platform. Try the crossing again.'
    };
  }
  const next = Math.min(1, Math.round(progress * crossing.moves + 1) / crossing.moves);
  const [x, y, height] = crossing.start.map((value, i) => value + (crossing.end[i] - value) * next);
  const player = { x, y, height };
  return {
    ...state, player, traversal: next >= 1 ? null
      : { ...state.traversal, progress: next, elapsed, armed: false, target: createCanopyTarget() },
    ...(next >= 1 ? {
      checkpoint: Math.max(state.checkpoint, crossing.to),
      message: kind === 'net' ? 'You climbed to the lantern-lit platform.' : 'You crossed the rope to the next platform.'
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
    if (id === 'drinks-table') return state.drinksPlaced ? message(state, 'The drinks are ready.')
      : state.drinks ? { ...state, drinks: false, drinksPlaced: true, message: 'You put the drinks beside the pool table.' }
        : message(state, 'Get the drinks from the bar first.');
    if (id === 'cue-rack') return state.cuesPlaced ? message(state, 'The cues are already at the pool table.')
      : { ...state, cues: true, message: 'You pick up the pool cues.' };
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
      if (state.cuesPlaced && state.ballsPlaced) return {
        ...state, shot: true,
        message: 'Line up your break and choose a controlled power. The guide shows where the cue ball will travel.'
      };
      if (!state.cues && !state.balls) return message(state, 'Find the cues and ball case before setting up the table.');
      const cuesPlaced = state.cuesPlaced || state.cues, ballsPlaced = state.ballsPlaced || state.balls;
      return {
        ...state, cues: false, balls: false, cuesPlaced, ballsPlaced,
        message: cuesPlaced && ballsPlaced ? 'The table is ready. Investigate it again to take the break.' : 'You set the equipment on the pool table. Something is still missing.'
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
      if (state.checkpoint < crossing.from) return message(state, 'Follow the course to reach this crossing first.');
      if (id === 'high-rope' && state.collected.length < ITEMS.length) {
        return message(state, 'Find all four treasures before crossing the high rope bridge.');
      }
      if (id === 'high-net' && (state.lanterns || []).length < 2) {
        return message(state, 'Light the first two lanterns before climbing the summit net.');
      }
      const [x, y, height] = crossing.start;
      return {
        ...state, player: { x, y, height },
        traversal: { kind: crossing.kind, crossingId: id, progress: 0, elapsed: 0, armed: true, target: createCanopyTarget() },
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
      ? { ...state, zipline: true, zipProgress: 0, treasuresUsed: true, message: 'You present the four treasures and clip onto the zip-wire!' }
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
