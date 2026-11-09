export const RUNE_GLYPHS = ['✦', '☾', '◇', '✧'];

export function createRuneSequence(length, random = Math.random) {
  if (!Number.isInteger(length) || length < 1) {
    throw new RangeError('Rune sequence length must be a positive integer.');
  }
  return Array.from({ length }, () => Math.floor(random() * RUNE_GLYPHS.length));
}

export function evaluatePoolShot(angle, power, targetAngle = 0, targetPower = 72) {
  const angleError = Math.abs(angle - targetAngle);
  const powerError = Math.abs(power - targetPower);
  return {
    angleError,
    powerError,
    success: angleError <= 3 && powerError <= 14
  };
}

export function moveMazePlayer(position, direction, grid) {
  const movement = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
  }[direction];

  if (!movement) return position;
  const x = position.x + movement[0];
  const y = position.y + movement[1];
  if (!grid[y] || grid[y][x] === undefined || grid[y][x] === '#') return position;
  return { x, y };
}
