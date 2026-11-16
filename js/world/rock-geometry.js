import * as THREE from 'three';

const COLORS = ['#929581', '#868f88', '#9b9581'];

export function createRockGeometry(variant) {
  if (!Number.isInteger(variant) || variant < 0 || variant >= COLORS.length) throw new RangeError('Unknown rock variant.');
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const positions = geometry.getAttribute('position');
  const colors = [];
  const base = new THREE.Color(COLORS[variant]);
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const unevenness = 0.9 + 0.07 * Math.sin(x * 4 + z * 3 + variant * 2)
      + 0.035 * Math.cos(y * 6 - z * 4 + variant);
    positions.setXYZ(i, x * 16.9 * unevenness, Math.max(-0.65, y * unevenness) * 7.8, z * 13 * unevenness);
    const shade = 0.86 + 0.1 * Math.sin(x * 6 + y * 4 + z * 7 + variant) ** 2 + Math.max(0, y) * 0.06;
    colors.push(base.r * shade, base.g * shade, base.b * shade);
  }
  positions.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createRockTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the rock texture.');
  ctx.fillStyle = '#e0dfd4'; ctx.fillRect(0, 0, 512, 512);
  const random = (index, salt) => {
    const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  for (let i = 0; i < 1800; i += 1) {
    const x = random(i, 1) * 512, y = random(i, 2) * 512;
    ctx.fillStyle = i % 3 ? 'rgba(57, 64, 56, .16)' : 'rgba(255, 253, 232, .35)';
    ctx.fillRect(x, y, 0.7 + random(i, 3) * 2.2, 0.7 + random(i, 4) * 1.5);
  }
  for (let i = 0; i < 40; i += 1) {
    const x = random(i, 5) * 512, y = random(i, 6) * 512;
    ctx.strokeStyle = 'rgba(63, 70, 61, .22)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + 3 + random(i, 7) * 5, y + 3);
    ctx.lineTo(x + 5 + random(i, 8) * 7, y + 8); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
