import * as THREE from 'three';

const DECK_TONES = {
  warm: ['#94734e', '#a28159', '#896a48', '#aa8960', '#997750'],
  locked: ['#34473d', '#3d5043', '#304238', '#435548', '#394c40'],
  neutral: ['#d3d0c8', '#e3e0d8', '#c8c6bf', '#ece9e1', '#d9d7cf']
};

export function drawCanopyDeck(ctx, x, y, width, height, { variant = 0, tone = 'warm' } = {}) {
  const colors = DECK_TONES[tone];
  if (!colors) throw new RangeError('Unknown canopy deck tone.');
  const boardWidth = width / 7;
  for (let board = 0; board < 7; board += 1) {
    const left = x + board * boardWidth;
    ctx.fillStyle = colors[(board * 3 + variant) % colors.length];
    ctx.fillRect(left, y, boardWidth, height);
    ctx.fillStyle = 'rgba(36, 27, 19, .45)';
    ctx.fillRect(left, y, boardWidth * 0.045, height);
    ctx.fillStyle = 'rgba(255, 242, 207, .18)';
    ctx.fillRect(left + boardWidth * 0.08, y, boardWidth * 0.035, height);
    for (let grain = 0; grain < 3; grain += 1) {
      const gx = left + boardWidth * (0.25 + grain * 0.22);
      const start = y + height * ((board * 13 + grain * 17 + variant * 7) % 23) / 100;
      ctx.strokeStyle = grain === 1 ? 'rgba(255, 240, 207, .14)' : 'rgba(48, 34, 24, .20)';
      ctx.lineWidth = Math.max(0.35, boardWidth * 0.025);
      ctx.beginPath(); ctx.moveTo(gx, start);
      ctx.lineTo(gx + boardWidth * 0.035, Math.min(y + height, start + height * (0.48 + grain * 0.1)));
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(48, 39, 29, .65)';
    for (const end of [0.07, 0.91]) {
      ctx.fillRect(left + boardWidth * 0.46, y + height * end,
        Math.max(0.8, boardWidth * 0.08), Math.max(0.8, height * 0.015));
    }
  }
}

export function drawCanopyPlatformFace(ctx, x, y, width, height, variant = 0) {
  ctx.fillStyle = '#58432f'; ctx.fillRect(x, y, width, height);
  ctx.fillStyle = variant % 2 ? '#9a7951' : '#aa865b';
  ctx.fillRect(x, y, width, height * 0.65);
  ctx.fillStyle = 'rgba(238, 210, 162, .55)'; ctx.fillRect(x, y, width, Math.max(1, height * 0.12));
  for (let board = 1; board < 7; board += 1) {
    const px = x + width * board / 7;
    ctx.fillStyle = 'rgba(53, 38, 27, .45)'; ctx.fillRect(px, y + 1, 1, height * 0.6);
    ctx.fillStyle = '#493b2c'; ctx.fillRect(px - 3, y + height * 0.72, 2, 2);
  }
}

export function createCanopyDeckTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the canopy deck texture.');
  drawCanopyDeck(ctx, 0, 0, canvas.width, canvas.height, { tone: 'neutral' });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
