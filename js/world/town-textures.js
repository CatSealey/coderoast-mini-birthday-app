import * as THREE from 'three';

function random(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function createRoofTileGeometry(width, depth, height, side) {
  const slope = Math.atan2(height, width / 2);
  const lift = 2 / Math.cos(slope) + 0.1;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, height + lift, -depth / 2,
    0, height + lift, depth / 2,
    side * width / 2, lift, -depth / 2,
    side * width / 2, lift, depth / 2
  ], 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 0, 0, 1, 0], 2));
  geometry.setIndex(side === 1 ? [0, 1, 2, 1, 3, 2] : [0, 2, 1, 1, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
}

export function drawRoofTiles(ctx, corners, rows = 6, columns = 5) {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const point = (u, v) => ({
    x: (1 - v) * (topLeft.x * (1 - u) + topRight.x * u)
      + v * (bottomLeft.x * (1 - u) + bottomRight.x * u),
    y: (1 - v) * (topLeft.y * (1 - u) + topRight.y * u)
      + v * (bottomLeft.y * (1 - u) + bottomRight.y * u)
  });
  ctx.strokeStyle = 'rgba(49, 34, 27, .48)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let row = 1; row <= rows; row += 1) {
    const start = point(0, row / rows), end = point(1, row / rows);
    ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
    for (let col = 1; col <= columns; col += 1) {
      const u = (col - (row % 2) * 0.5) / columns;
      if (u >= 1) continue;
      const a = point(u, (row - 1) / rows), b = point(u, row / rows);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(239, 211, 174, .3)';
  ctx.lineWidth = 0.6;
  for (let row = 1; row < rows; row += 1) {
    const start = point(0.03, row / rows - 0.018), end = point(0.97, row / rows - 0.018);
    ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
  }
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
      for (let col = -1; col < 8; col += 1) {
        const x = col * 32 + (row % 2) * 16;
        const tone = 204 + Math.floor(random(row * 9 + col, 17) * 37);
        ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone})`;
        ctx.fillRect(x + 1, y + 1, 30, 30);
        ctx.fillStyle = 'rgba(255, 255, 255, .18)';
        ctx.fillRect(x + 3, y + 3, 26, 2);
        ctx.fillStyle = 'rgba(51, 45, 40, .25)';
        ctx.fillRect(x + 2, y + 28, 28, 2);
      }
      ctx.fillStyle = 'rgba(45, 38, 34, .48)';
      ctx.fillRect(0, y, 256, 1.5);
      for (let col = -1; col < 8; col += 1) {
        ctx.fillRect(col * 32 + (row % 2) * 16, y + 1, 1.5, 30);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
