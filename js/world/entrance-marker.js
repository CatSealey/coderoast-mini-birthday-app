export const ENTRANCE_MARKER_RADIUS = 21;

export function entranceMarkerHit(point, center, zoom) {
  return Math.abs(point.x - center.x) <= Math.max(24 * zoom, 18)
    && Math.abs(point.y - center.y) <= Math.max(14 * zoom, 12);
}
