import { QUEST_LOCATIONS, WORLD_SPAWN } from './world-data.js';
import { TOWN_VENUES } from './town-scenery.js';
import { PARK_RELOCATED_STALL } from './park-scenery.js';

const [escape, , park] = QUEST_LOCATIONS;
const venue = (name) => {
  const building = TOWN_VENUES.find((item) => item.name === name);
  if (!building) throw new Error(`Missing venue: ${name}`);
  return building;
};
const lantern = venue('THE LANTERN');
const ivy = venue('THE IVY BAR');
const games = venue('LUCKY CHUCKS');
const kitchen = venue('CORNER KITCHEN');
const kettle = venue('THE COPPER KETTLE');

export const WORLD_SUPPLIES = Object.freeze([
  Object.freeze({ kind: 'barrel', x: WORLD_SPAWN.x - 270, y: WORLD_SPAWN.y - 65, size: 0.9, variant: 0, rotation: 0.2 }),
  Object.freeze({ kind: 'crate', x: WORLD_SPAWN.x - 272, y: WORLD_SPAWN.y - 96, size: 0.7, variant: 1, rotation: -0.15 }),
  Object.freeze({ kind: 'crate', x: escape.x + 19, y: escape.y - 145, size: 0.9, variant: 1, rotation: 0.2 }),
  Object.freeze({ kind: 'barrel', x: escape.x + 22, y: escape.y - 177, size: 0.8, variant: 1, rotation: -0.1 }),
  Object.freeze({ kind: 'barrel', x: lantern.x - 62, y: lantern.y + 83, size: 0.9, variant: 1, rotation: 0.15 }),
  Object.freeze({ kind: 'crate', x: lantern.x - 38, y: lantern.y + 95, size: 0.75, variant: 0, rotation: -0.2 }),
  Object.freeze({ kind: 'crate', x: ivy.x + 59, y: ivy.y + 84, size: 0.75, variant: 2, rotation: -0.2 }),
  Object.freeze({ kind: 'barrel', x: ivy.x + 33, y: ivy.y + 92, size: 0.85, variant: 0, rotation: 0.1 }),
  Object.freeze({ kind: 'crate', x: ivy.x + 52, y: ivy.y + 114, size: 0.65, variant: 1, rotation: 0.28 }),
  Object.freeze({ kind: 'barrel', x: games.x - 96, y: games.y + 128, size: 1, variant: 0, rotation: -0.1 }),
  Object.freeze({ kind: 'crate', x: games.x - 70, y: games.y + 132, size: 0.85, variant: 2, rotation: 0.15 }),
  Object.freeze({ kind: 'barrel', x: games.x - 86, y: games.y + 152, size: 0.75, variant: 2, rotation: 0.25 }),
  Object.freeze({ kind: 'crate', x: kitchen.x - 61, y: kitchen.y + 96, size: 0.85, variant: 0, rotation: 0.2 }),
  Object.freeze({ kind: 'barrel', x: kitchen.x - 37, y: kitchen.y + 99, size: 0.8, variant: 1, rotation: -0.2 }),
  Object.freeze({ kind: 'crate', x: kitchen.x - 52, y: kitchen.y + 124, size: 0.65, variant: 1, rotation: -0.1 }),
  Object.freeze({ kind: 'barrel', x: kettle.x + 59, y: kettle.y + 85, size: 0.85, variant: 2, rotation: 0.1 }),
  Object.freeze({ kind: 'crate', x: kettle.x + 33, y: kettle.y + 98, size: 0.8, variant: 2, rotation: 0.2 }),
  Object.freeze({ kind: 'crate', x: park.x + 264, y: park.y + 55, size: 0.8, variant: 2, rotation: 0.18 }),
  Object.freeze({ kind: 'barrel', x: park.x + 267, y: park.y + 25, size: 0.75, variant: 0, rotation: -0.15 }),
  Object.freeze({ kind: 'barrel', x: park.x - 440, y: park.y + 269, size: 0.9, variant: 2, rotation: 0.1 }),
  Object.freeze({ kind: 'crate', x: PARK_RELOCATED_STALL.x + 60, y: PARK_RELOCATED_STALL.y + 10, size: 0.9, variant: 1, rotation: -0.2 })
]);
