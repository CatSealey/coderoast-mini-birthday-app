export const COASTER_DROP_SECONDS = 0.75;
export const COASTER_RIDE_SECONDS = 20;
export const COASTER_RETURN_SECONDS = 8.5;
export const COASTER_RAIL_OFFSET = 25;
export const COASTER_PLATFORM = Object.freeze({ left: 25, right: 975, top: 580, bottom: 695 });
// The original IDs are retained so existing ride saves keep their collected items.
export const COASTER_TREATS = Object.freeze([
  { id: 'sweet-1', progress: 0.12, lane: -1, kind: 'pizza', name: 'Pizza slice' },
  { id: 'sweet-2', progress: 0.22, lane: 1, kind: 'cup', name: 'Refill cup' },
  { id: 'sweet-3', progress: 0.32, lane: -1, kind: 'map', name: 'Park map' },
  { id: 'sweet-4', progress: 0.42, lane: -1, kind: 'ticket', name: 'Fastrack ticket' },
  { id: 'sweet-5', progress: 0.52, lane: 1, kind: 'umbrella', name: 'Umbrella' }
].map(Object.freeze));
export const COASTER_GOAL = COASTER_TREATS.length;

const MAIN = [
  [500, 40, 530], [720, 72, 480], [870, 120, 350], [820, 95, 160],
  [650, 155, 90], [460, 110, 105], [250, 140, 150], [140, 85, 285],
  [260, 150, 370], [430, 145, 275], [570, 160, 180], [730, 120, 230]
];
const MAIN_REJOIN_PROGRESS = 0.1;
const LOWER = [
  [730, 18, 230], [600, 18, 190], [480, 18, 240], [380, 18, 320],
  [270, 18, 405], [350, 20, 485], [500, 18, 440], [650, 18, 400],
  [800, 18, 360], [910, 23, 340], [950, 30, 380], [930, 42, 430],
  [850, 65, 455], spline(MAIN, MAIN_REJOIN_PROGRESS)
];
export const COASTER_REJOIN_PROGRESS = 0.8;

function spline(points, progress, endControl = null) {
  const scaled = Math.max(0, Math.min(1, progress)) * (points.length - 1);
  const i = Math.min(points.length - 2, Math.floor(scaled)), t = scaled - i;
  const p0 = points[Math.max(0, i - 1)], p1 = points[i];
  const p2 = points[i + 1], p3 = i === points.length - 2 && endControl ? endControl : points[Math.min(points.length - 1, i + 2)];
  return p1.map((value, axis) => 0.5 * (2 * value + (-p0[axis] + p2[axis]) * t
    + (2 * p0[axis] - 5 * value + 4 * p2[axis] - p3[axis]) * t * t
    + (-p0[axis] + 3 * value - 3 * p2[axis] + p3[axis]) * t * t * t));
}

const junction = LOWER.at(-1), beforeJunction = LOWER.at(-2);
const continuation = spline(MAIN, MAIN_REJOIN_PROGRESS - 0.00001);
const approachLength = Math.hypot(...junction.map((value, i) => value - beforeJunction[i]));
const continuationLength = Math.hypot(...continuation.map((value, i) => value - junction[i]));
const lowerEndControl = beforeJunction.map((value, i) =>
  value + 2 * (continuation[i] - junction[i]) * approachLength / continuationLength);

export function coasterPosition(phase, progress) {
  if (phase === 'dropping') {
    const top = MAIN.at(-1), bottom = LOWER[0], t = Math.max(0, Math.min(1, progress)) ** 2;
    return { x: top[0], height: top[1] + (bottom[1] - top[1]) * t, y: top[2] };
  }
  const [x, height, y] = phase === 'returning'
    ? progress <= COASTER_REJOIN_PROGRESS
      ? spline(LOWER, progress / COASTER_REJOIN_PROGRESS, lowerEndControl)
      : spline(MAIN, MAIN_REJOIN_PROGRESS * (1 - (progress - COASTER_REJOIN_PROGRESS) / (1 - COASTER_REJOIN_PROGRESS)))
    : spline(MAIN, progress);
  return { x, height, y };
}

export function coasterHeading(phase, progress) {
  const direction = coasterDirection(phase, progress);
  return Math.atan2(direction.x, direction.y) + (phase === 'returning' ? Math.PI : 0);
}

export function coasterRailPosition(phase, progress, side) {
  const point = coasterPosition(phase, progress), direction = coasterDirection(phase, progress);
  return { x: point.x - direction.y * COASTER_RAIL_OFFSET * side,
    y: point.y + direction.x * COASTER_RAIL_OFFSET * side, height: point.height };
}

export function coasterDirection(phase, progress) {
  if (phase === 'dropping') return coasterDirection('riding', 1);
  const a = coasterPosition(phase, Math.max(0, progress - 0.00001));
  const b = coasterPosition(phase, Math.min(1, progress + 0.00001));
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
}

export function coasterLanePosition(progress, lane) {
  const point = coasterPosition('riding', progress), direction = coasterDirection('riding', progress);
  return { x: point.x - direction.y * lane * 42, y: point.y + direction.x * lane * 42, height: point.height + 38 };
}
