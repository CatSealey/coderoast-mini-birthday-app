import * as THREE from 'three';

export const PARK_PALETTE = Object.freeze({
  iron: '#494844', ironLight: '#807c6d', brass: '#d4b77c',
  wood: '#73533e', woodLight: '#ad8661', red: '#a65b4c',
  teal: '#6d8d89', cream: '#e5d2a7'
});

export const PARK_FLAG_COLORS = Object.freeze(['#4d6f91', '#769ab6']);

function random(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function drawParkGround(ctx, x, y, width, height) {
  ctx.fillStyle = '#3e503b'; ctx.fillRect(x, y, width, height);
  for (let i = 0; i < 240; i += 1) {
    const px = x + random(i, 1) * width, py = y + random(i, 2) * height;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(24, 37, 28, .17)' : 'rgba(127, 139, 94, .12)';
    ctx.beginPath();
    ctx.ellipse(px, py, width * (0.008 + random(i, 3) * 0.02), height * (0.004 + random(i, 4) * 0.009), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createParkGroundCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the park ground texture.');
  drawParkGround(ctx, 0, 0, 512, 512);
  return canvas;
}

export function createParkGroundTexture() {
  const texture = new THREE.CanvasTexture(createParkGroundCanvas());
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function drawParkCar(ctx, width, depth) {
  const x = -width / 2, y = -depth / 2;
  ctx.fillStyle = '#342e2b'; ctx.fillRect(x, y, width, depth);
  ctx.fillStyle = PARK_PALETTE.wood; ctx.fillRect(x + width * 0.04, y + depth * 0.09, width * 0.92, depth * 0.82);
  ctx.fillStyle = PARK_PALETTE.woodLight; ctx.fillRect(x + width * 0.1, y + depth * 0.1, width * 0.8, depth * 0.12);
  ctx.fillStyle = '#493a31';
  for (const seat of [-1, 1]) ctx.fillRect(seat * width * 0.2 - width * 0.13, y + depth * 0.28, width * 0.26, depth * 0.48);
  ctx.fillStyle = '#b39b74';
  for (const seat of [-1, 1]) {
    ctx.fillRect(seat * width * 0.2 - width * 0.13, y + depth * 0.25, width * 0.26, depth * 0.06);
    ctx.fillRect(seat * width * 0.2 - width * 0.13, y + depth * 0.64, width * 0.26, depth * 0.06);
  }
  ctx.fillStyle = PARK_PALETTE.brass;
  ctx.fillRect(x + width * 0.1, y + depth * 0.78, width * 0.8, depth * 0.07);
  for (const side of [-1, 1]) ctx.fillRect(side * width * 0.38 - width * 0.025, y + depth * 0.35, width * 0.05, depth * 0.2);
}
