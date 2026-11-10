export const WORLD_SCALE = 3;
export const BASE_WORLD_SIZE = Object.freeze({ width: 1800, height: 1200 });
export const WORLD_SIZE = Object.freeze({
  width: BASE_WORLD_SIZE.width * WORLD_SCALE,
  height: BASE_WORLD_SIZE.height * WORLD_SCALE
});
export const WORLD_SPAWN = Object.freeze({ x: 2500, y: 2000 });
export const INTERACTION_RANGE = 74;
export const WORLD_ROUTES = Object.freeze([
  Object.freeze([[2500 / WORLD_SCALE, 2000 / WORLD_SCALE], [760, 570], [650, 500], [470, 450]]),
  Object.freeze([[2500 / WORLD_SCALE, 2000 / WORLD_SCALE], [920, 720], [1020, 800], [1020, 920]]),
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
    x: 1020 * WORLD_SCALE,
    y: 920 * WORLD_SCALE,
    entrance: Object.freeze({ x: 1020 * WORLD_SCALE - 85, y: 920 * WORLD_SCALE - 95, name: 'Lucky Chucks entrance' }),
    guide: 'Chuck the Innkeeper',
    introduction: 'The regulars have set up a birthday challenge at the pool table. A careful aim and a little luck should settle the match.'
  }),
  Object.freeze({
    name: 'Thirteen',
    region: 'ALTON TOWERS · THE HIGH PARK',
    icon: '🎢',
    x: 1510 * WORLD_SCALE,
    y: 330 * WORLD_SCALE,
    entrance: Object.freeze({ x: 1510 * WORLD_SCALE - 180, y: 330 * WORLD_SCALE - 60, name: 'Thirteen entrance' }),
    guide: 'Pippa the Ride Keeper',
    introduction: 'A mysterious lift hill leads to a sudden drop. Keep your nerve and react when the signal appears.'
  }),
  Object.freeze({
    name: 'GoApe After Dark',
    region: 'THE NIGHT CANOPY · SALCEY FOREST',
    icon: '🌙',
    x: 1540 * WORLD_SCALE,
    y: 900 * WORLD_SCALE,
    entrance: Object.freeze({ x: 1540 * WORLD_SCALE - 35, y: 900 * WORLD_SCALE - 120, name: 'GoApe entrance' }),
    guide: 'Ash the Tree Guide',
    introduction: 'The forest platforms glow beneath the evening sky. Cross the canopy and reach the waiting zip-line.'
  }),
  Object.freeze({
    name: 'Fright Nights',
    region: 'EARLS BARTON · THE HARVEST FIELDS',
    icon: '🎃',
    x: 390 * WORLD_SCALE,
    y: 900 * WORLD_SCALE,
    entrance: Object.freeze({ x: 390 * WORLD_SCALE - 175, y: 900 * WORLD_SCALE - 175, name: 'Fright Nights entrance' }),
    guide: 'Dr. Fright',
    introduction: 'The corn maze is full of wrong turns and one restless ghost. Find the lantern key before heading for the exit.'
  })
]);
