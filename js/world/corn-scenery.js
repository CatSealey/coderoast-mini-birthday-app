import * as THREE from 'three';

const CORN_VARIANT_COUNT = 5;
const LEAF_SHADES = ['#71843e', '#879245', '#9c9848', '#b1a052', '#b38a49'];

function random(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function cornStalks(walls) {
  return walls.flatMap((wall) => [0, -5, 5].flatMap((depth) =>
    Array.from({ length: depth === 0 ? 11 : 10 }, (_, i) => {
      const offset = -62 + i * 12.4 + (depth === 0 ? 0 : 6.2);
      const seed = i + wall.x + (depth === 0 ? 0 : depth * 13);
      return {
        x: wall.x + (wall.vertical ? depth : offset),
        z: wall.y + (wall.vertical ? offset : depth),
        size: 0.8 + random(seed, wall.y) * 0.35,
        variant: Math.floor(random(seed, wall.y + 47) * CORN_VARIANT_COUNT),
        angle: random(seed, wall.y + 48) * Math.PI * 2
      };
    })));
}

export function createCornGeometry(variant) {
  if (!Number.isInteger(variant) || variant < 0 || variant >= CORN_VARIANT_COUNT) throw new RangeError('Unknown corn variant.');
  const positions = [], colors = [], uvs = [];
  const leaf = new THREE.Color(LEAF_SHADES[variant]);
  const stalk = new THREE.Color('#9c8b4e');
  const tassel = new THREE.Color('#d4b765');
  const ear = new THREE.Color('#d0a94f');
  const vertex = (position, uv) => ({ position, uv });
  const triangle = (a, b, c, color, shade = 1) => {
    for (const point of [a, b, c]) {
      positions.push(...point.position);
      uvs.push(...point.uv);
      colors.push(color.r * shade, color.g * shade, color.b * shade);
    }
  };
  const radial = (angle, distance, height, side = 0) => [
    Math.cos(angle) * distance - Math.sin(angle) * side,
    height,
    Math.sin(angle) * distance + Math.cos(angle) * side
  ];
  for (let i = 0; i < 6; i += 1) {
    const a = i * Math.PI / 3, b = (i + 1) * Math.PI / 3;
    const lower = vertex(radial(a, 2.2, 0), [i / 6, 0]);
    const lowerNext = vertex(radial(b, 2.2, 0), [(i + 1) / 6, 0]);
    const upper = vertex(radial(a, 1.2, 84), [i / 6, 1]);
    const upperNext = vertex(radial(b, 1.2, 84), [(i + 1) / 6, 1]);
    triangle(lower, upper, lowerNext, stalk, 0.9);
    triangle(lowerNext, upper, upperNext, stalk, 0.9);
  }
  for (let i = 0; i < 9; i += 1) {
    const angle = i * 2.4 + variant * 0.5;
    const height = 10 + i * 7.5;
    const length = 18 + (i % 3) * 1.5;
    const root = vertex(radial(angle, 1, height), [0.5, 0]);
    const left = vertex(radial(angle, length * 0.52, height + 8, 5.5), [0, 0.52]);
    const right = vertex(radial(angle, length * 0.52, height + 8, -5.5), [1, 0.52]);
    const mid = vertex(radial(angle, length * 0.52, height + 10), [0.5, 0.52]);
    const tip = vertex(radial(angle, length, height + 3 - i % 2 * 3), [0.5, 1]);
    triangle(root, left, mid, leaf, 0.88);
    triangle(root, mid, right, leaf, 1);
    triangle(mid, left, tip, leaf, 0.88);
    triangle(mid, tip, right, leaf, 1);
  }
  const earAngle = 0.7 + variant * 1.1;
  const bottom = vertex(radial(earAngle, 3, 37), [0.5, 0]);
  const top = vertex(radial(earAngle, 5, 54), [0.5, 1]);
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2, b = (i + 1) * Math.PI / 2;
    const sideA = vertex([Math.cos(earAngle) * 4 + Math.cos(a) * 2.5, 46, Math.sin(earAngle) * 4 + Math.sin(a) * 2.5], [0, 0.5]);
    const sideB = vertex([Math.cos(earAngle) * 4 + Math.cos(b) * 2.5, 46, Math.sin(earAngle) * 4 + Math.sin(b) * 2.5], [1, 0.5]);
    triangle(bottom, sideA, sideB, ear, 0.85 + i * 0.04);
    triangle(top, sideB, sideA, ear, 0.85 + i * 0.04);
  }
  for (let i = 0; i < 6; i += 1) {
    const angle = i * Math.PI / 3 + variant * 0.25;
    const root = vertex(radial(angle, 0, 80), [0.5, 0]);
    const left = vertex(radial(angle, 2.5, 91, 0.8), [0, 0.5]);
    const right = vertex(radial(angle, 2.5, 91, -0.8), [1, 0.5]);
    const tip = vertex(radial(angle, 5 + i % 2, 99 + i % 3 * 2), [0.5, 1]);
    triangle(root, left, tip, tassel, 0.92);
    triangle(root, tip, right, tassel, 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createCornTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the corn texture.');
  ctx.fillStyle = '#e1debf'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i += 1) {
    const x = random(i, 1) * 256, y = random(i, 2) * 256;
    ctx.strokeStyle = i % 3 ? 'rgba(86, 88, 52, .18)' : 'rgba(255, 246, 202, .32)';
    ctx.lineWidth = 0.5 + random(i, 3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 1, y + 8 + random(i, 4) * 18); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
