const EDGE_COLUMNS = [100, 270, 460, 660, 850, 1050, 1250, 1450, 1650, 1820];

export const CANOPY_EDGE_TREES = EDGE_COLUMNS.flatMap((x, column) => [70, 620].map((z, row) => ({
  x, z, variant: (column + row) % 3, angle: column * 0.7 + row
})));

export const CANOPY_FOREST_TREES = Array.from({ length: 29 }, (_, column) =>
  Array.from({ length: 8 }, (_, row) => ({
    x: 25 + column * 80, z: 35 + row * 90,
    variant: (column + row) % 3, angle: column * 0.7 + row
  }))).flat();
