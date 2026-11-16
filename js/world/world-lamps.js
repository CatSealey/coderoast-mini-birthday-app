import { QUEST_LOCATIONS, WORLD_SPAWN } from './world-data.js';
import { TOWN_LAMPS } from './town-scenery.js';

const [escape, , park, , harvest] = QUEST_LOCATIONS;
const lamp = (x, y) => Object.freeze({ x, y, radius: 7 });

export const WORLD_LAMPS = Object.freeze([
  lamp(WORLD_SPAWN.x - 75, WORLD_SPAWN.y - 50),
  lamp(WORLD_SPAWN.x + 95, WORLD_SPAWN.y + 75),
  lamp(escape.x - 180, escape.y - 50),
  lamp(escape.x + 95, escape.y + 75),
  lamp(park.x - 75, park.y - 50),
  lamp(park.x + 95, park.y + 75),
  lamp(harvest.x - 75, harvest.y - 50),
  lamp(harvest.x + 95, harvest.y + 75),
  ...TOWN_LAMPS
]);
