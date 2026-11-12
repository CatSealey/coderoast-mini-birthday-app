import { QUEST_LOCATIONS } from './world-data.js';

const town = QUEST_LOCATIONS[1];
const venue = (name, kind, dx, dy, size, awning) => Object.freeze({
  name, kind, x: town.x + dx, y: town.y + dy, size, awning,
  width: 128 * size, depth: 105 * size
});

export const TOWN_VENUES = Object.freeze([
  venue('LUCKY CHUCKS', 'games', -85, -165, 1.2, '#4d7565'),
  venue('THE COPPER KETTLE', 'restaurant', 335, -165, 1, '#a35f48'),
  venue('THE IVY BAR', 'bar', -300, -165, 1, '#55715d'),
  venue('THE LANTERN', 'bar', -505, -165, 1, '#6d617b'),
  venue('CORNER KITCHEN', 'restaurant', 130, -165, 1, '#a37c48')
]);

export const TOWN_CHURCH = Object.freeze({
  x: town.x + 150, y: town.y + 315, width: 170, depth: 170
});

export const TOWN_TABLES = Object.freeze([
  Object.freeze({ x: town.x - 320, y: town.y + 165, radius: 32 }),
  Object.freeze({ x: town.x + 290, y: town.y + 155, radius: 32 })
]);

export const TOWN_BENCHES = Object.freeze([
  Object.freeze({ x: town.x - 440, y: town.y + 145, width: 58, depth: 20 }),
  Object.freeze({ x: town.x + 420, y: town.y + 145, width: 58, depth: 20 })
]);

export const TOWN_LAMPS = Object.freeze([
  Object.freeze({ x: town.x - 460, y: town.y + 60, radius: 7 }),
  Object.freeze({ x: town.x + 440, y: town.y + 60, radius: 7 })
]);

export const TOWN_PLAZA = Object.freeze({
  left: town.x - 610, right: town.x + 500,
  top: town.y - 280, bottom: town.y + 440
});

export function isTownPlaza(point, margin = 0) {
  return point.x >= TOWN_PLAZA.left - margin && point.x <= TOWN_PLAZA.right + margin
    && point.y >= TOWN_PLAZA.top - margin && point.y <= TOWN_PLAZA.bottom + margin;
}
