export const CANOPY_LIGHT_COLORS = Object.freeze([
  '#ffba72', '#f28fb3', '#7ed8ca', '#c4a0ed', '#a8d882', '#f1a883'
]);

const LANTERN_COLORS = Object.freeze({
  'lantern-1': '#78d8ce',
  'lantern-2': '#f28fb3',
  'lantern-3': '#c4a0ed'
});

export function canopyPlatformLightColor(index) {
  return CANOPY_LIGHT_COLORS[index % CANOPY_LIGHT_COLORS.length];
}

export function canopyLanternColor(id, lit) {
  if (!Object.hasOwn(LANTERN_COLORS, id)) throw new RangeError(`Unknown canopy lantern: ${id}`);
  return lit ? LANTERN_COLORS[id] : '#8a7959';
}

export function drawCanopyLight(ctx, x, y, radius, color, lit = true) {
  if (lit) {
    ctx.fillStyle = 'rgba(255, 231, 184, 0.16)';
    ctx.beginPath(); ctx.arc(x, y, radius * 1.65, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#58432f';
  ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, radius * 0.72, 0, Math.PI * 2); ctx.fill();
  if (lit) {
    ctx.fillStyle = 'rgba(255, 255, 240, 0.7)';
    ctx.beginPath(); ctx.arc(x - radius * 0.18, y - radius * 0.18, radius * 0.18, 0, Math.PI * 2); ctx.fill();
  }
}
