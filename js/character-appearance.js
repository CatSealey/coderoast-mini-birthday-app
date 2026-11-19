import { Color } from 'three';
import { TATTOO_ACCENT, TATTOO_INK } from './character-body.js';

export const PLAYER_OUTFIT = '#25272b';
export const CAT_OUTFIT = '#1c1e1e';
export const CHARACTER_HAIR = '#40342d';
export const PLAYER_STYLE = Object.freeze({ shorts: '#141619', legTattoo: true, belt: '#141619', hairLength: 'long' });
export const CAT_STYLE = Object.freeze({ trousers: '#263d30', belt: '#141619', buckle: '#d3d8d5', hairLength: 'shoulder', shortSleeves: true, tattoo: true });
export const GUIDE_HAIRSTYLES = [
  { longHair: true, hair: '#604438' }, { longHair: false, hair: '#554238' },
  { longHair: true, hair: '#48372c' }, { longHair: false, hair: '#765843' },
  { longHair: true, hair: '#6b5144' }
];
export const TOWNSFOLK_HAIRSTYLES = [
  { longHair: true, hair: '#b2aaa0' }, { longHair: false, hair: '#63483a' },
  { longHair: false, hair: '#44362f' }, { longHair: true, hair: '#b6aaa0' },
  { longHair: true, hair: '#5a4034' }, { longHair: false, hair: '#74513b' },
  { longHair: true, hair: '#a97d50' }, { longHair: true, hair: '#5e4035' }
];

export function facingForMovement(previous, current, facing = 0) {
  if (!previous) return facing;
  const dx = current.x - previous.x, dy = current.y - previous.y;
  return Math.hypot(dx, dy) > 0.01 ? Math.atan2(dx, dy) : facing;
}

export function addCharacterHeadDetails(box, round, options) {
  const { skin, hair = CHARACTER_HAIR, longHair = false, hairLength = longHair ? 'long' : 'short' } = options;
  const width = options.width * 0.96, height = options.height * 0.96, depth = options.depth * 0.96;
  const headY = options.headY - options.height * 0.06;
  const long = hairLength === 'long', shoulder = hairLength === 'shoulder';
  const front = depth / 2;
  const hairHighlight = `#${new Color(hair).offsetHSL(0, 0, 0.06).getHexString()}`;
  const hairLock = `#${new Color(hair).offsetHSL(0, 0, 0.025).getHexString()}`;
  box(0, headY - height * 0.52, 0, width * 0.35, height * 0.35, depth * 0.35, skin);
  round(0, headY - height * (long ? 0.28 : shoulder ? 0.12 : 0), -front * 0.5,
    width + 2, height * (long ? 2 : shoulder ? 1.5 : 1.05), depth * 0.9, hair);
  round(0, headY, 0, width, height, depth, skin);
  round(0, headY + height * 0.39, -front * 0.08, width + 1, height * 0.36, depth + 1, hair);
  for (const side of [-1, 1]) {
    round(side * width * 0.48, headY + height * (long ? -0.3 : shoulder ? -0.16 : 0.25), 0,
      width * (long || shoulder ? 0.26 : 0.16), height * (long ? 1.65 : shoulder ? 1.25 : 0.4), depth * 0.95, hair);
    if (long || shoulder) box(side * width * 0.57, headY - height * (long ? 0.35 : 0.16), -front * 0.3,
      width * 0.035, height * (long ? 0.85 : 0.55), depth * 0.25, hairHighlight);
    round(side * width * 0.46, headY - height * 0.03, 0, width * 0.15, height * 0.25, depth * 0.25, skin);
    box(side * width * 0.22, headY + height * 0.05, front * 0.9, width * 0.11, height * 0.08, 1.2, '#49382f');
    box(side * width * 0.205, headY + height * 0.065, front * 0.9 + 0.62,
      width * 0.025, height * 0.025, 0.25, '#e3d2ba');
    const brow = box(side * width * 0.22, headY + height * 0.17, front * 0.86,
      width * 0.18, height * 0.045, 1, hair);
    if (brow?.rotation) brow.rotation.z = side * 0.12;
  }
  round(-width * 0.13, headY + height * 0.35, front * 0.55, width * 0.7, height * 0.23, depth * 0.4, hair);
  if (long || shoulder) {
    for (const side of [-1, 1]) {
      const lockHeight = height * (long ? 1.1 : 0.7);
      round(side * width * 0.33, headY - height * (long ? 0.52 : 0.27), -front * 1.3,
        width * 0.12, lockHeight, depth * 0.14, hairLock);
    }
  }
  box(-width * 0.13, headY + height * 0.47, 0, width * 0.4, height * 0.025, depth * 0.4, hairHighlight);
  round(0, headY - height * 0.08, front * 0.95, width * 0.14, height * 0.18, depth * 0.14, skin);
  box(0, headY - height * 0.23, front * 0.96, width * 0.18, height * 0.06, 1.2, '#a66f67');
}

export function drawCharacterMarker(context, x, y, outfit, { scale = 1, hair = CHARACTER_HAIR, hairLength = 'long', trousers, shorts, legTattoo = false, belt, buckle, shortSleeves = false, tattoo = false, stride = 0, heldArm = -1, facing = 0, zipline = false } = {}) {
  const back = Math.cos(facing) < -Math.SQRT1_2;
  const side = Math.abs(Math.sin(facing)) > Math.SQRT1_2;
  context.fillStyle = hair;
  context.beginPath();
  context.ellipse(x, y, 8 * scale, (hairLength === 'long' ? 12 : hairLength === 'shoulder' ? 10 : 7) * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = outfit;
  context.beginPath(); context.ellipse(x, y + 9 * scale, 7 * scale, 4 * scale, 0, 0, Math.PI * 2); context.fill();
  context.beginPath(); context.ellipse(x, y + 12.5 * scale, 5.5 * scale, 4.5 * scale, 0, 0, Math.PI * 2); context.fill();
  for (const [index, side] of [-1, 1].entries()) {
    const armX = x + (side < 0 ? -10 : 7) * scale;
    const armY = y + (zipline ? -10 : 7 + (index === heldArm ? 0 : side * stride * 2)) * scale;
    context.fillRect(armX, armY, 3 * scale, (zipline ? 20 : shortSleeves ? 4 : 9) * scale);
  }
  if (zipline) {
    context.fillStyle = '#dfb38c';
    context.fillRect(x - 10 * scale, y - 12 * scale, 3 * scale, 3 * scale);
    context.fillRect(x + 7 * scale, y - 12 * scale, 3 * scale, 3 * scale);
  } else if (shortSleeves) {
    context.fillStyle = '#dfb38c';
    const rightArmStride = heldArm === 0 ? 0 : stride;
    const leftArmStride = heldArm === 1 ? 0 : stride;
    context.fillRect(x - 10 * scale, y + (11 - rightArmStride * 2) * scale, 2 * scale, 6 * scale);
    context.fillRect(x + 8 * scale, y + (11 + leftArmStride * 2) * scale, 2 * scale, 6 * scale);
    if (tattoo) {
      const tattooOffset = back ? leftArmStride * 2 : -rightArmStride * 2;
      context.fillStyle = TATTOO_INK;
      context.fillRect(x + (back ? 8 : -10) * scale, y + (12 + tattooOffset) * scale, 2 * scale, 3 * scale);
      context.fillStyle = TATTOO_ACCENT;
      context.fillRect(x + (back ? 9 : -9) * scale, y + (13 + tattooOffset) * scale, scale, scale);
    }
  }
  if (hairLength === 'long') {
    context.fillStyle = hair;
    context.fillRect(x - 8 * scale, y + 6 * scale, 2 * scale, 7 * scale);
    context.fillRect(x + 6 * scale, y + 6 * scale, 2 * scale, 7 * scale);
  }
  context.fillStyle = shorts || tattoo ? '#505450' : '#c4ae80';
  context.fillRect(x - 5 * scale, y + 7 * scale, 3 * scale, scale);
  context.fillRect(x + 2 * scale, y + 7 * scale, 3 * scale, scale);
  if (!shorts && !tattoo) {
    context.fillStyle = '#70513a';
    for (let step = 0; step < 5; step += 1) {
      context.fillRect(x + (3 - step) * scale, y + (7 + step) * scale, 2 * scale, 2 * scale);
    }
    context.fillStyle = '#d3b47a'; context.fillRect(x + scale, y + 10 * scale, 2 * scale, scale);
  }
  context.fillStyle = shorts || trousers || outfit;
  context.fillRect(x - 8 * scale, y + 16 * scale, 16 * scale, shorts ? 4 * scale : 6 * scale);
  if (shorts) {
    context.fillStyle = '#dfb38c';
    context.fillRect(x - 7 * scale, y + (20 + stride * 2) * scale, 6 * scale, 6 * scale);
    context.fillRect(x + scale, y + (20 - stride * 2) * scale, 6 * scale, 6 * scale);
    if (legTattoo) {
      context.fillStyle = TATTOO_INK;
      context.fillRect(x + (back ? -6 : 2) * scale, y + (21 + (back ? stride : -stride) * 2) * scale, 4 * scale, 3 * scale);
      context.fillStyle = TATTOO_ACCENT;
      context.fillRect(x + (back ? -4 : 4) * scale, y + (22 + (back ? stride : -stride) * 2) * scale, scale, scale);
    }
    context.fillStyle = '#594336';
    context.fillRect(x - 7 * scale, y + (26 + stride * 2) * scale, 6 * scale, 2 * scale);
    context.fillRect(x + scale, y + (26 - stride * 2) * scale, 6 * scale, 2 * scale);
  } else {
    context.fillStyle = trousers || outfit;
    for (const [index, side] of [-1, 1].entries()) {
      const step = (index === 0 ? stride : -stride) * 2;
      context.beginPath();
      context.ellipse(x + side * 4 * scale, y + (23 + step) * scale, 3 * scale, 5 * scale, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#594336';
      context.fillRect(x + (side < 0 ? -7 : 1) * scale, y + (27 + step) * scale, 6 * scale, 2 * scale);
      context.fillStyle = trousers || outfit;
    }
  }
  if (belt) {
    context.fillStyle = belt;
    context.fillRect(x - 8 * scale, y + 14 * scale, 16 * scale, 2 * scale);
    if (buckle && !back) {
      context.fillStyle = buckle;
      context.fillRect(x - scale, y + 14 * scale, 2 * scale, 2 * scale);
    }
  }
  context.fillStyle = back ? hair : '#dfb38c';
  context.beginPath();
  context.arc(x, y, 6.5 * scale, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = hair;
  context.fillRect(x - 5 * scale, y - 6 * scale, 8 * scale, 2 * scale);
  context.fillRect(x + 3.5 * scale, y - 5 * scale, 2 * scale, 5 * scale);
  if (!back) {
    context.fillStyle = '#49382f';
    if (!side || Math.sin(facing) < 0) context.fillRect(x - 3.5 * scale, y - scale, 1.5 * scale, 1.5 * scale);
    if (!side || Math.sin(facing) > 0) context.fillRect(x + 2 * scale, y - scale, 1.5 * scale, 1.5 * scale);
    context.fillStyle = '#a66f67';
    context.fillRect(x - scale, y + 3 * scale, 2 * scale, scale);
  }
}
