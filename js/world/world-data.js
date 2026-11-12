export const WORLD_SCALE = 3;
export const BASE_WORLD_SIZE = Object.freeze({ width: 1800, height: 1200 });
export const WORLD_SIZE = Object.freeze({
  width: BASE_WORLD_SIZE.width * WORLD_SCALE,
  height: BASE_WORLD_SIZE.height * WORLD_SCALE
});
export const WORLD_SPAWN = Object.freeze({ x: 2500, y: 2000 });
export const CASTLE_ENTRANCE = Object.freeze({ x: WORLD_SPAWN.x + 50, y: WORLD_SPAWN.y - 165 });
export const INTERACTION_RANGE = 74;
const TOWN_X = 1120, TOWN_Y = 985;
export const WORLD_ROUTES = Object.freeze([
  Object.freeze([[2500 / WORLD_SCALE, 2000 / WORLD_SCALE], [760, 570], [650, 500], [470, 450]]),
  Object.freeze([[2500 / WORLD_SCALE, 2000 / WORLD_SCALE], [920, 720], [1080, 850], [TOWN_X, TOWN_Y]]),
  Object.freeze([[2500 / WORLD_SCALE, 2000 / WORLD_SCALE], [1100, 530], [1270, 400], [1510, 330]]),
  Object.freeze([[1510, 330], [1610, 500], [1650, 690], [1540, 900]]),
  Object.freeze([[2500 / WORLD_SCALE, 2000 / WORLD_SCALE], [760, 780], [570, 850], [390, 900]])
]);

export const QUEST_LOCATIONS = Object.freeze([
  Object.freeze({
    name: 'Abigail Escape',
    region: 'KETTERING · THE OLD QUARTER',
    icon: '🗝',
    x: 470 * WORLD_SCALE,
    y: 450 * WORLD_SCALE,
    entrance: Object.freeze({ x: 470 * WORLD_SCALE - 70, y: 450 * WORLD_SCALE - 115, name: 'Escape room entrance' }),
    guide: 'Mara the Wardkeeper',
    introduction: 'A strange doll has unsettled the old escape room. Explore its rooms, uncover the wardkeeper’s clues, and find a way out together.'
  }),
  Object.freeze({
    name: 'Lucky Chucks',
    region: 'KETTERING · LUCKY CHUCKS',
    icon: '🎱',
    x: TOWN_X * WORLD_SCALE,
    y: TOWN_Y * WORLD_SCALE,
    entrance: Object.freeze({ x: TOWN_X * WORLD_SCALE - 85, y: TOWN_Y * WORLD_SCALE - 95, name: 'Lucky Chucks entrance' }),
    guide: 'Chuck the Innkeeper',
    introduction: 'Cat is waiting inside. Gather the drinks and pool equipment, then help with a surprise under the cabinet.'
  }),
  Object.freeze({
    name: 'Thirteen',
    region: 'ALTON TOWERS · THE HIGH PARK',
    icon: '🎢',
    x: 1510 * WORLD_SCALE,
    y: 330 * WORLD_SCALE,
    entrance: Object.freeze({ x: 1510 * WORLD_SCALE - 180, y: 330 * WORLD_SCALE - 60, name: 'Thirteen entrance' }),
    guide: 'Pippa the Ride Keeper',
    introduction: 'Board with Cat and hold left or right to collect all five park items. Then enjoy the drop!'
  }),
  Object.freeze({
    name: 'GoApe After Dark',
    region: 'THE NIGHT CANOPY · SALCEY FOREST',
    icon: '🌙',
    x: 1540 * WORLD_SCALE,
    y: 900 * WORLD_SCALE,
    entrance: Object.freeze({ x: 1540 * WORLD_SCALE - 35, y: 900 * WORLD_SCALE - 120, name: 'GoApe entrance' }),
    guide: 'Ash the Tree Guide',
    introduction: 'Follow the lanterns across platforms, nets and ropes. Find four forest treasures before taking the zip-wire.'
  }),
  Object.freeze({
    name: 'Fright Nights',
    region: 'EARLS BARTON · THE HARVEST FIELDS',
    icon: '🎃',
    x: 390 * WORLD_SCALE,
    y: 900 * WORLD_SCALE,
    entrance: Object.freeze({ x: 390 * WORLD_SCALE - 175, y: 900 * WORLD_SCALE - 175, name: 'Fright Nights entrance' }),
    guide: 'Dr. Fright',
    introduction: 'Seven unsettling corners hide seven objects. Find the clues and recover them all to open the maze gate.'
  })
]);
