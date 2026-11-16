const COLORS = ['#939586', '#a5a394', '#858b80', '#b0aa98', '#96958c', '#aaa99a'];
const OUTLINE = [
  [-0.5, -0.24], [-0.35, -0.49], [0.2, -0.5], [0.47, -0.32],
  [0.5, 0.22], [0.31, 0.48], [-0.23, 0.5], [-0.49, 0.3]
];

function random(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function cobblestoneShape(row, col) {
  const index = row * 300 + col;
  const x = col * 25 + (row % 2) * 12 + (random(index, 26) - 0.5) * 4;
  const y = row * 20 + (random(index, 27) - 0.5) * 3;
  const width = 18 + random(index, 24) * 5;
  const height = 12 + random(index, 25) * 4;
  const points = OUTLINE.map(([px, py], i) => ({
    x: x + (px + (random(index, 30 + i * 2) - 0.5) * 0.14) * width,
    y: y + (py + (random(index, 31 + i * 2) - 0.5) * 0.14) * height
  }));
  return { x, y, width, height, points, color: COLORS[Math.floor(random(index, 23) * COLORS.length)], index };
}

export function drawCobblestone(ctx, row, col) {
  const { x, y, width, height, points, color, index } = cobblestoneShape(row, col);
  const last = points.at(-1), first = points[0];
  ctx.beginPath();
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  points.forEach((point, i) => {
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  });
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = 'rgba(57, 65, 58, .38)'; ctx.lineWidth = 1.4; ctx.stroke();

  ctx.strokeStyle = 'rgba(241, 235, 211, .35)'; ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x - width * 0.32, y - height * 0.29);
  ctx.quadraticCurveTo(x - width * 0.05, y - height * 0.41, x + width * 0.28, y - height * 0.3);
  ctx.stroke();

  ctx.fillStyle = 'rgba(59, 67, 59, .25)';
  for (let i = 0; i < 3; i += 1) {
    const px = x + (random(index, 60 + i * 2) - 0.5) * width * 0.6;
    const py = y + (random(index, 61 + i * 2) - 0.5) * height * 0.5;
    ctx.fillRect(px, py, 1.4, 1.1);
  }
  if (random(index, 70) < 0.25) {
    ctx.strokeStyle = 'rgba(63, 70, 61, .32)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - width * 0.12, y - height * 0.04);
    ctx.lineTo(x + width * 0.02, y + height * 0.03);
    ctx.lineTo(x + width * 0.08, y + height * 0.2); ctx.stroke();
  }
}
