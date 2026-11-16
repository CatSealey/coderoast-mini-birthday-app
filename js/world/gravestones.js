import * as THREE from 'three';

export const GRAVESTONE_WIDTH = 26;
export const GRAVESTONE_HEIGHT = 44;
export const GRAVESTONE_DEPTH = 10;

const STONES = ['#5b635b', '#71766a', '#7b796d', '#626b60', '#858476'];
const BASES = ['#454e46', '#555b51', '#5d5c50', '#485249'];

function random(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function gravestoneStyle(x, y) {
  return {
    stone: STONES[Math.floor(random(x, y + 43) * STONES.length)],
    base: BASES[Math.floor(random(x, y + 45) * BASES.length)]
  };
}

export function gravestoneLean(rotation) {
  return rotation * 0.35;
}

function traceShape(path, variant) {
  if (!Number.isInteger(variant) || variant < 0 || variant > 2) throw new RangeError('Unknown gravestone variant.');
  path.beginPath();
  if (variant === 0) {
    path.moveTo(8, 160); path.lineTo(8, 24); path.lineTo(20, 8);
    path.lineTo(37, 8); path.lineTo(42, 16); path.lineTo(49, 8);
    path.lineTo(76, 8); path.lineTo(92, 24); path.lineTo(92, 160);
  } else if (variant === 1) {
    path.moveTo(5, 160); path.lineTo(5, 54);
    path.quadraticCurveTo(5, 18, 30, 9); path.lineTo(35, 15); path.lineTo(42, 6);
    path.quadraticCurveTo(72, 0, 84, 22); path.lineTo(79, 27); path.lineTo(90, 33);
    path.quadraticCurveTo(95, 43, 95, 54);
    path.lineTo(95, 160);
  } else {
    path.moveTo(38, 160); path.lineTo(38, 85); path.lineTo(6, 85); path.lineTo(6, 57);
    path.lineTo(38, 57); path.lineTo(38, 10); path.lineTo(48, 10);
    path.lineTo(53, 16); path.lineTo(62, 10); path.lineTo(62, 57);
    path.lineTo(86, 57); path.lineTo(94, 65); path.lineTo(94, 85); path.lineTo(62, 85); path.lineTo(62, 160);
  }
  path.closePath();
}

export function createGravestoneGeometry(variant) {
  const shape = new THREE.Shape();
  const x = (value) => (value / 100 - 0.5) * GRAVESTONE_WIDTH;
  const y = (value) => (1 - value / 160) * GRAVESTONE_HEIGHT;
  traceShape({
    beginPath() {},
    moveTo: (px, py) => shape.moveTo(x(px), y(py)),
    lineTo: (px, py) => shape.lineTo(x(px), y(py)),
    quadraticCurveTo: (cx, cy, px, py) => shape.quadraticCurveTo(x(cx), y(cy), x(px), y(py)),
    closePath: () => shape.closePath()
  }, variant);
  return new THREE.ExtrudeGeometry(shape, { depth: GRAVESTONE_DEPTH, bevelEnabled: false, curveSegments: 12 });
}

export function drawGravestoneFace(ctx, variant, x, y) {
  const { stone } = gravestoneStyle(x, y);
  traceShape(ctx, variant);
  ctx.fillStyle = stone; ctx.fill();
  ctx.save(); ctx.clip();
  const shading = ctx.createLinearGradient(10, 0, 90, 160);
  shading.addColorStop(0, 'rgba(213, 214, 193, .2)');
  shading.addColorStop(0.48, 'rgba(229, 222, 200, .02)');
  shading.addColorStop(1, 'rgba(26, 34, 29, .48)');
  ctx.fillStyle = shading; ctx.fillRect(0, 0, 100, 160);
  const seed = x * 0.37 + y * 0.19;
  for (let i = 0; i < 7; i += 1) {
    const px = 9 + random(seed + i, 20) * 82;
    const py = 12 + random(seed + i, 21) * 75;
    ctx.fillStyle = i % 2 ? 'rgba(32, 43, 36, .12)' : 'rgba(57, 68, 51, .16)';
    ctx.fillRect(px, py, 3 + random(seed + i, 22) * 5, 25 + random(seed + i, 23) * 55);
  }
  for (let i = 0; i < 80; i += 1) {
    const px = random(seed + i, 8) * 100, py = random(seed + i, 9) * 160;
    ctx.fillStyle = i % 3 ? 'rgba(43, 51, 45, .26)' : 'rgba(236, 229, 202, .35)';
    ctx.fillRect(px, py, 1.5 + random(seed + i, 10) * 2.8, 1 + random(seed + i, 11) * 2.5);
  }
  ctx.strokeStyle = 'rgba(40, 47, 42, .55)'; ctx.lineWidth = 3;
  ctx.beginPath();
  if (variant === 0) {
    ctx.moveTo(50, 35); ctx.lineTo(50, 98); ctx.moveTo(31, 54); ctx.lineTo(69, 54);
    ctx.moveTo(29, 119); ctx.lineTo(71, 119);
  } else if (variant === 1) {
    ctx.moveTo(50, 33); ctx.lineTo(50, 57); ctx.moveTo(40, 43); ctx.lineTo(60, 43);
    ctx.moveTo(25, 82); ctx.lineTo(75, 82); ctx.moveTo(30, 94); ctx.lineTo(70, 94);
    ctx.moveTo(35, 106); ctx.lineTo(65, 106);
  } else {
    ctx.moveTo(50, 26); ctx.lineTo(50, 133); ctx.moveTo(19, 70); ctx.lineTo(81, 70);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(29, 37, 32, .68)'; ctx.lineWidth = 2.8;
  ctx.beginPath();
  if (variant === 2) {
    ctx.moveTo(61, 83); ctx.lineTo(53, 99); ctx.lineTo(58, 111); ctx.lineTo(47, 128); ctx.lineTo(52, 141);
  } else {
    const shift = (random(seed, 24) - 0.5) * 12;
    ctx.moveTo(82 + shift, 18); ctx.lineTo(72 + shift, 37);
    ctx.lineTo(77 + shift, 49); ctx.lineTo(66 + shift, 64); ctx.lineTo(70 + shift, 77);
    ctx.moveTo(77 + shift, 49); ctx.lineTo(85 + shift, 57);
  }
  ctx.stroke();
  for (let i = 0; i < 24; i += 1) {
    ctx.fillStyle = i % 2 ? 'rgba(57, 77, 52, .55)' : 'rgba(104, 119, 76, .48)';
    const px = i < 16 ? random(seed + i, 14) * 100 : (i % 2 ? 10 : 80) + random(seed + i, 14) * 12;
    const py = i < 16 ? 130 + random(seed + i, 15) * 30 : 35 + random(seed + i, 15) * 85;
    ctx.fillRect(px, py, 3 + random(seed + i, 16) * 7, 2 + random(seed + i, 17) * 5);
  }
  ctx.restore();
  traceShape(ctx, variant);
  ctx.strokeStyle = 'rgba(39, 47, 41, .6)'; ctx.lineWidth = 3; ctx.stroke();
}

export function createGravestoneTexture(variant, x, y) {
  const image = document.createElement('canvas');
  image.width = 200; image.height = 320;
  const ctx = image.getContext('2d');
  if (!ctx) throw new Error('Could not create the gravestone texture.');
  ctx.scale(2, 2);
  drawGravestoneFace(ctx, variant, x, y);
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
