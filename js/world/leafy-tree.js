import * as THREE from 'three';
import { createTreeBranchGeometry } from './tree-geometry.js';

const BRANCHES = [
  [[0, 0, 0, 9], [1, 21, 0, 8], [-1, 42, -1, 7], [0, 65, 0, 5], [2, 85, 0, 3], [3, 104, 0, 1]],
  [[-1, 49, 0, 6], [-12, 61, 0, 4], [-23, 76, 2, 2.5], [-30, 90, 3, 0.7]],
  [[0, 57, 0, 5], [12, 69, -2, 4], [23, 81, -4, 2], [30, 94, -4, 0.7]],
  [[0, 63, 0, 4], [1, 74, 11, 3], [-3, 89, 23, 1.5], [-6, 100, 26, 0.6]],
  [[0, 65, -1, 4], [-5, 76, -10, 3], [-11, 91, -21, 1.5], [-12, 102, -24, 0.6]],
  [[-9, 0, 0, 1.5], [-6, 4, 0, 3], [-1, 16, 0, 4]],
  [[9, 0, 0, 1.5], [6, 4, 0, 3], [1, 16, 0, 4]],
  [[0, 0, 9, 1.5], [0, 4, 6, 3], [0, 16, 1, 4]],
  [[0, 0, -9, 1.5], [0, 4, -6, 3], [0, 16, -1, 4]]
];

const COLORS = ['#5b8149', '#829455', '#567e62'];

export function createLeafyBranches(variant) {
  return createTreeBranchGeometry(BRANCHES, variant, { sides: 6, segmentsPerSpan: 3, minimumSegments: 6 });
}

export function createLeafyCanopy(variant) {
  if (!Number.isInteger(variant) || variant < 0 || variant >= COLORS.length) throw new RangeError('Unknown tree variant.');
  const geometry = new THREE.IcosahedronGeometry(1, 3);
  const positions = geometry.getAttribute('position');
  const colors = [];
  const baseColor = new THREE.Color(COLORS[variant]);
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    const shape = 1 + 0.14 * Math.sin(x * 4 + z * 2 + variant) * Math.cos(z * 4 - y * 3)
      + 0.035 * Math.sin(x * 12 - y * 8 + z * 11);
    const width = variant === 1 ? 53 : 48;
    const height = variant === 2 ? 43 : 37;
    positions.setXYZ(i, x * width * shape, 110 + y * height * shape, z * 44 * shape);
    const variation = 0.84 + 0.12 * Math.sin(x * 12 + y * 7 + z * 9 + variant) ** 2 + 0.08 * y;
    colors.push(baseColor.r * variation, baseColor.g * variation, baseColor.b * variation);
  }
  positions.needsUpdate = true;
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

export function createFoliageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the tree foliage texture.');
  ctx.fillStyle = '#d1d8bc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 1600; i += 1) {
    const random = (salt) => {
      const value = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const x = random(1) * 512, y = random(2) * 512;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(255, 255, 229, .38)' : 'rgba(53, 74, 38, .20)';
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + random(3) * 3, 5 + random(4) * 5, random(5) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
