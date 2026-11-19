export const DEATH_MARKER_HALF_WIDTH = 10;
export const DEATH_MARKER_HALF_HEIGHT = 12;

export function deathMarkerContains(dx, dy) {
  return Math.abs(dx) <= DEATH_MARKER_HALF_WIDTH && Math.abs(dy) <= DEATH_MARKER_HALF_HEIGHT;
}

export function drawDeathMarker(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#742d26'; ctx.strokeStyle = '#3e211f'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(9, -8); ctx.lineTo(9, 8);
  ctx.lineTo(0, 11); ctx.lineTo(-9, 8); ctx.lineTo(-9, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d7d1c5'; ctx.beginPath(); ctx.moveTo(-8, 7); ctx.lineTo(8, 7);
  ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(5, 0); ctx.moveTo(5, 5); ctx.lineTo(-5, 0); ctx.stroke();
  for (const [bx, by] of [[-5, 5], [5, 0], [5, 5], [-5, 0]]) {
    ctx.beginPath(); ctx.arc(bx, by, 1.4, 0, Math.PI * 2); ctx.fillStyle = '#e8e4d8'; ctx.fill();
  }
  ctx.fillStyle = '#f1ede4'; ctx.beginPath(); ctx.arc(0, -3, 4.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-2.8, -1, 5.6, 2.3);
  ctx.fillStyle = '#55241f'; ctx.beginPath(); ctx.arc(-1.7, -3.2, 1, 0, Math.PI * 2);
  ctx.arc(1.7, -3.2, 1, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(-0.7, -0.8); ctx.lineTo(0.7, -0.8); ctx.closePath(); ctx.fill();
  ctx.restore();
}
