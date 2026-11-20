import { CASTLE_ENTRANCE, WORLD_ROUTES, WORLD_SCALE, WORLD_SPAWN } from './world-data.js';

export const DIRECTION_SIGN = Object.freeze({ x: WORLD_SPAWN.x - 110, y: WORLD_SPAWN.y, radius: 8, height: 72 });

const destinations = [
  CASTLE_ENTRANCE,
  ...WORLD_ROUTES.map((route) => ({ x: route[2][0] * WORLD_SCALE, y: route[2][1] * WORLD_SCALE }))
];
const colors = ['#8a6547', '#77563e', '#9a7350', '#805b40', '#94704e', '#6f503a'];

export const DIRECTION_BOARDS = Object.freeze(destinations.map((point, index) => {
  const dx = point.x - WORLD_SPAWN.x, dy = point.y - WORLD_SPAWN.y;
  const distance = Math.hypot(dx, dy);
  return Object.freeze({
    dx: dx / distance, dy: dy / distance,
    height: 63 - index * 7.5, length: 35 + (index % 3) * 3,
    color: colors[index]
  });
}));

export function drawDirectionSign(ctx) {
  ctx.fillStyle = '#513827'; ctx.fillRect(-3, -DIRECTION_SIGN.height, 6, DIRECTION_SIGN.height);
  ctx.fillStyle = '#96714e'; ctx.fillRect(-2, -DIRECTION_SIGN.height + 1, 1.5, DIRECTION_SIGN.height - 2);
  ctx.fillStyle = '#63462f'; ctx.fillRect(-5, -3, 10, 3);

  DIRECTION_BOARDS.forEach(({ dx, dy, height, length, color }) => {
    const tipX = dx * length;
    const tipY = -height + dy * length * 0.32;
    const shoulderX = dx * (length - 6);
    const shoulderY = -height + dy * (length - 6) * 0.32;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-2, -height - 4.5);
    ctx.lineTo(shoulderX, shoulderY - 4.5); ctx.lineTo(tipX, tipY);
    ctx.lineTo(shoulderX, shoulderY + 4.5); ctx.lineTo(-2, -height + 4.5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#49372c'; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.strokeStyle = 'rgba(230, 202, 158, .45)';
    ctx.beginPath(); ctx.moveTo(0, -height - 1.7); ctx.lineTo(shoulderX * 0.85, shoulderY - 1.7); ctx.stroke();
    ctx.fillStyle = '#49392e'; ctx.fillRect(-1, -height - 0.8, 1.6, 1.6);
  });
}
