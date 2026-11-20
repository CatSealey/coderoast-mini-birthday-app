export const WORLD_SCALE = 3;
export const BASE_WORLD_SIZE = Object.freeze({ width: 1800, height: 1200 });
export const WORLD_SIZE = Object.freeze({
  width: BASE_WORLD_SIZE.width * WORLD_SCALE,
  height: BASE_WORLD_SIZE.height * WORLD_SCALE
});
export const WORLD_SPAWN = Object.freeze({ x: 2500, y: 2000 });
export const CASTLE_ENTRANCE = Object.freeze({ x: WORLD_SPAWN.x + 50, y: WORLD_SPAWN.y - 165 });
export const CASTLE_LAYOUT = Object.freeze({
  x: WORLD_SPAWN.x + 50,
  y: WORLD_SPAWN.y - 250,
  width: 312,
  depth: 250,
  centerOffset: -47.5,
  towerSize: 68,
  towerHeight: 205
});
export const CASTLE_TOWERS = Object.freeze([-1, 1].flatMap((side) =>
  [-1, 1].map((depthSide) => Object.freeze({
    x: side * (CASTLE_LAYOUT.width - CASTLE_LAYOUT.towerSize) / 2,
    z: CASTLE_LAYOUT.centerOffset + depthSide * (CASTLE_LAYOUT.depth - CASTLE_LAYOUT.towerSize) / 2,
    height: CASTLE_LAYOUT.towerHeight,
    hasBanner: depthSide > 0
  }))));
export const CASTLE_KEEP_WIDTH = 216;
export const CASTLE_SIDE_BATTLEMENT_Z = Object.freeze(
  Array.from({ length: 9 }, (_, i) => -126 + i * 20).filter((z) =>
    z - 6 >= CASTLE_LAYOUT.centerOffset - CASTLE_LAYOUT.depth / 2 + CASTLE_LAYOUT.towerSize
    && z + 6 <= CASTLE_LAYOUT.centerOffset + CASTLE_LAYOUT.depth / 2 - CASTLE_LAYOUT.towerSize)
);
export const CASTLE_FRONT_WINDOWS = Object.freeze([-75, -48, 48, 75]);
export const CASTLE_WINDOW_LEVELS = Object.freeze([55, 112]);
export const CASTLE_WINDOW_WIDTH_SCALE = 0.8;
export const CASTLE_BARREL_COLLISION_RADIUS = 9.9;
export const CASTLE_CRATE_COLLISION_SIZE = 24.2;
export const CASTLE_ROOF_SUPPLIES = Object.freeze([
  Object.freeze({ kind: 'barrel', x: -72, z: -105, size: 1.05, variant: 0, rotation: 0.15 }),
  Object.freeze({ kind: 'crate', x: -47, z: -95, size: 1, variant: 0, rotation: -0.12 }),
  Object.freeze({ kind: 'crate', x: -70, z: -33, size: 0.7, variant: 1, rotation: 0.22 }),
  Object.freeze({ kind: 'crate', x: 68, z: -82, size: 1.1, variant: 2, rotation: -0.2 }),
  Object.freeze({ kind: 'barrel', x: 65, z: -45, size: 0.9, variant: 1, rotation: 0 }),
  Object.freeze({ kind: 'barrel', x: 42, z: -44, size: 0.65, variant: 2, rotation: 0.3 })
]);
export const CASTLE_EXTERIOR_SUPPLIES = Object.freeze([
  Object.freeze({ kind: 'barrel', x: -171, z: -46, size: 1, variant: 1, rotation: 0.2 }),
  Object.freeze({ kind: 'crate', x: -174, z: -75, size: 0.85, variant: 2, rotation: -0.25 }),
  Object.freeze({ kind: 'barrel', x: -125, z: 89, size: 0.9, variant: 0, rotation: 0 }),
  Object.freeze({ kind: 'crate', x: 171, z: -43, size: 1.05, variant: 0, rotation: 0.18 }),
  Object.freeze({ kind: 'barrel', x: 170, z: -74, size: 1.15, variant: 2, rotation: -0.1 }),
  Object.freeze({ kind: 'crate', x: 194, z: -83, size: 0.65, variant: 1, rotation: 0.3 })
]);
export const INTERACTION_RANGE = 74;
const TOWN_X = 1120, TOWN_Y = 985;
const FOREST_X = 1540, FOREST_Y = 1020;
const CASTLE_ROUTE = Object.freeze([CASTLE_ENTRANCE.x / WORLD_SCALE, CASTLE_ENTRANCE.y / WORLD_SCALE]);
const ROUTE_JUNCTION = Object.freeze([WORLD_SPAWN.x / WORLD_SCALE, WORLD_SPAWN.y / WORLD_SCALE]);
export const WORLD_ROUTES = Object.freeze([
  Object.freeze([CASTLE_ROUTE, ROUTE_JUNCTION, [760, 570], [650, 500], [470, 450]]),
  Object.freeze([CASTLE_ROUTE, ROUTE_JUNCTION, [920, 720], [1080, 850], [TOWN_X, TOWN_Y]]),
  Object.freeze([CASTLE_ROUTE, ROUTE_JUNCTION, [1100, 530], [1270, 400], [1510, 330]]),
  Object.freeze([CASTLE_ROUTE, ROUTE_JUNCTION, [950, 660], [1200, 740], [1280, 870], [1410, 1000], [FOREST_X, FOREST_Y]]),
  Object.freeze([CASTLE_ROUTE, ROUTE_JUNCTION, [760, 780], [570, 850], [390, 900]])
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
    x: FOREST_X * WORLD_SCALE,
    y: FOREST_Y * WORLD_SCALE,
    entrance: Object.freeze({ x: FOREST_X * WORLD_SCALE - 35, y: FOREST_Y * WORLD_SCALE - 120, name: 'GoApe entrance' }),
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
