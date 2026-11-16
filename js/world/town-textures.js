import * as THREE from 'three';

function random(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function createTownTexture(kind) {
  if (!['wood', 'plaster', 'roof'].includes(kind)) throw new RangeError('Unknown town texture.');
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(`Could not create the ${kind} texture.`);
  ctx.fillStyle = '#eeeeea';
  ctx.fillRect(0, 0, 256, 256);

  if (kind === 'plaster') {
    for (let i = 0; i < 900; i += 1) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(100, 91, 73, .13)' : 'rgba(255, 255, 244, .15)';
      ctx.fillRect(random(i, 1) * 256, random(i, 2) * 256, 1 + random(i, 3) * 3, 1 + random(i, 4) * 2);
    }
  } else if (kind === 'wood') {
    for (let i = 0; i < 120; i += 1) {
      const y = random(i, 1) * 256;
      ctx.strokeStyle = i % 3 ? 'rgba(100, 76, 52, .18)' : 'rgba(255, 250, 221, .32)';
      ctx.lineWidth = 0.6 + random(i, 2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(64, y + random(i, 3) * 4 - 2, 185, y + random(i, 4) * 4 - 2, 256, y);
      ctx.stroke();
    }
  } else {
    for (let row = 0; row < 8; row += 1) {
      const y = row * 32;
      ctx.fillStyle = row % 2 ? 'rgba(104, 89, 75, .12)' : 'rgba(255, 250, 233, .12)';
      ctx.fillRect(0, y, 256, 30);
      ctx.strokeStyle = 'rgba(87, 72, 61, .24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + 31);
      ctx.lineTo(256, y + 31);
      for (let x = row % 2 ? 0 : 32; x < 256; x += 64) {
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x, y + 30);
      }
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
