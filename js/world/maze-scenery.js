export function createMazeWalls(columns, rows) {
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1) {
    throw new RangeError('Maze dimensions must be positive integers.');
  }
  const visited = new Set([0]);
  const passages = new Set();
  const stack = [0];
  let seed = 1347;
  while (stack.length) {
    const cell = stack[stack.length - 1];
    const x = cell % columns;
    const y = Math.floor(cell / columns);
    const neighbors = [
      ...(x > 0 ? [cell - 1] : []),
      ...(x + 1 < columns ? [cell + 1] : []),
      ...(y > 0 ? [cell - columns] : []),
      ...(y + 1 < rows ? [cell + columns] : [])
    ].filter((next) => !visited.has(next));
    if (!neighbors.length) {
      stack.pop();
      continue;
    }
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const next = neighbors[seed % neighbors.length];
    passages.add(`${Math.min(cell, next)}:${Math.max(cell, next)}`);
    visited.add(next);
    stack.push(next);
  }
  const walls = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const cell = y * columns + x;
      if (y === 0 || !passages.has(`${cell - columns}:${cell}`)) walls.push({ x, y, vertical: false });
      if (x === 0 || !passages.has(`${cell - 1}:${cell}`)) walls.push({ x, y, vertical: true });
      if (y === rows - 1) walls.push({ x, y: y + 1, vertical: false });
      if (x === columns - 1 && y !== Math.floor(rows / 2)) walls.push({ x: x + 1, y, vertical: true });
    }
  }
  return walls;
}
