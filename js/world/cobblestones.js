const COLORS = ['#939586', '#a5a394', '#858b80', '#b0aa98', '#96958c', '#aaa99a'];
export const COBBLESTONE_SPACING = Object.freeze({ x: 23, y: 18.5 });
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
  const x = col * COBBLESTONE_SPACING.x + (row % 2) * COBBLESTONE_SPACING.x / 2 + (random(index, 26) - 0.5) * 2.5;
  const y = row * COBBLESTONE_SPACING.y + (random(index, 27) - 0.5) * 2;
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
  const trace = (offsetX = 0, offsetY = 0) => {
    const last = points.at(-1), first = points[0];
    ctx.beginPath();
    ctx.moveTo((last.x + first.x) / 2 + offsetX, (last.y + first.y) / 2 + offsetY);
    points.forEach((point, i) => {
      const next = points[(i + 1) % points.length];
      ctx.quadraticCurveTo(point.x + offsetX, point.y + offsetY,
        (point.x + next.x) / 2 + offsetX, (point.y + next.y) / 2 + offsetY);
    });
    ctx.closePath();
  };
  trace(0.7, 2);
  ctx.fillStyle = 'rgba(42, 48, 39, .38)'; ctx.fill();
  trace();
  ctx.fillStyle = color; ctx.fill();
  const shading = ctx.createLinearGradient(x - width * 0.25, y - height * 0.5,
    x + width * 0.2, y + height * 0.5);
  shading.addColorStop(0, 'rgba(255, 247, 215, .28)');
  shading.addColorStop(0.48, 'rgba(255, 247, 215, .03)');
  shading.addColorStop(1, 'rgba(44, 53, 46, .32)');
  ctx.fillStyle = shading; ctx.fill();
  ctx.strokeStyle = 'rgba(48, 56, 49, .48)'; ctx.lineWidth = 1.2; ctx.stroke();

  ctx.strokeStyle = 'rgba(247, 237, 211, .55)'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo((points[7].x + points[0].x) / 2, (points[7].y + points[0].y) / 2);
  for (let i = 0; i < 3; i += 1) {
    ctx.quadraticCurveTo(points[i].x, points[i].y,
      (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40, 48, 41, .32)'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo((points[3].x + points[4].x) / 2, (points[3].y + points[4].y) / 2);
  for (let i = 4; i < 7; i += 1) {
    ctx.quadraticCurveTo(points[i].x, points[i].y,
      (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2);
  }
  ctx.stroke();

  const pits = 4 + Math.floor(random(index, 80) * 4);
  for (let i = 0; i < pits; i += 1) {
    const px = x + (random(index, 81 + i * 4) - 0.5) * width * 0.52;
    const py = y + (random(index, 82 + i * 4) - 0.5) * height * 0.42;
    const pitWidth = 1.2 + random(index, 83 + i * 4) * 1.5;
    const pitHeight = 0.9 + random(index, 84 + i * 4) * 1.1;
    ctx.fillStyle = i % 2 ? 'rgba(54, 60, 53, .32)' : 'rgba(73, 72, 59, .38)';
    ctx.fillRect(px, py, pitWidth, pitHeight);
    ctx.fillStyle = 'rgba(242, 229, 197, .32)';
    ctx.fillRect(px + pitWidth * 0.2, py + pitHeight, pitWidth * 0.8, 0.8);
  }
  if (random(index, 110) < 0.55) {
    const startX = x + (random(index, 111) - 0.5) * width * 0.35;
    const startY = y + (random(index, 112) - 0.5) * height * 0.25;
    const direction = random(index, 113) < 0.5 ? -1 : 1;
    ctx.strokeStyle = 'rgba(57, 64, 56, .42)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(startX, startY);
    ctx.lineTo(startX + direction * width * 0.1, startY + height * 0.06);
    ctx.lineTo(startX + direction * width * 0.14, startY + height * 0.16); ctx.stroke();
  }
}
