export const PLAYER_OUTFIT = '#25272b';
export const CAT_OUTFIT = '#a56a7c';
export const CHARACTER_HAIR = '#40342d';

export function drawCharacterMarker(context, x, y, outfit, scale = 1) {
  context.fillStyle = CHARACTER_HAIR;
  context.beginPath();
  context.ellipse(x, y, 10 * scale, 13 * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = outfit;
  context.fillRect(x - 8 * scale, y + 6 * scale, 16 * scale, 16 * scale);
  context.fillStyle = '#dfb38c';
  context.beginPath();
  context.arc(x, y, 7 * scale, 0, Math.PI * 2);
  context.fill();
}
