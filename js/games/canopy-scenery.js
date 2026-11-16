import { CANOPY_COURSE_LENGTH, CANOPY_PLATFORMS } from './adventure-logic.js';

const EDGE_COLUMNS = [
  100, 270, ...CANOPY_PLATFORMS.slice(1).map((platform) => (platform.left + platform.right) / 2)
];

export const CANOPY_EDGE_TREES = EDGE_COLUMNS.flatMap((x, column) => [70, 620].map((z, row) => ({
  x, z, variant: (column + row) % 3, angle: column * 0.7 + row
})));

export const CANOPY_FOREST_TREES = Array.from({ length: Math.ceil((CANOPY_COURSE_LENGTH - 25) / 80) }, (_, column) =>
  Array.from({ length: 8 }, (_, row) => ({
    x: 25 + column * 80, z: 35 + row * 90,
    variant: (column + row) % 3, angle: column * 0.7 + row
  }))).flat();
