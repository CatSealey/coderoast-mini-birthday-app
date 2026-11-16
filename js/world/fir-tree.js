import * as THREE from 'three';
import { createTreeBranchGeometry } from './tree-geometry.js';

const TRUNK = [
  [[0, 0, 0, 9], [0, 25, 0, 7], [1, 55, 0, 5], [0, 90, 0, 3.5], [1, 125, 0, 2], [0, 165, 0, 0.6]],
  [[-9, 0, 0, 1.5], [-6, 4, 0, 3], [0, 16, 0, 4]],
  [[9, 0, 0, 1.5], [6, 4, 0, 3], [0, 16, 0, 4]],
  [[0, 0, 9, 1.5], [0, 4, 6, 3], [0, 16, 0, 4]],
  [[0, 0, -9, 1.5], [0, 4, -6, 3], [0, 16, 0, 4]]
];
const PLATFORM_TRUNK = [
  [[0, 0, 0, 18], [0, 35, 0, 16], [1, 80, 0, 14], [0, 125, 0, 12], [0, 165, 0, 10]],
  [[-23, 0, 0, 2], [-14, 5, 0, 6], [0, 25, 0, 10]],
  [[23, 0, 0, 2], [14, 5, 0, 6], [0, 25, 0, 10]],
  [[0, 0, 23, 2], [0, 5, 14, 6], [0, 25, 0, 10]],
  [[0, 0, -23, 2], [0, 5, -14, 6], [0, 25, 0, 10]]
];
const COLORS = ['#416b50', '#577653', '#35634f'];

export function createFirTrunk(variant) {
  return createTreeBranchGeometry(TRUNK, variant, { sides: 6, segmentsPerSpan: 3, minimumSegments: 6 });
}

export function createPlatformFirTrunk(variant) {
  return createTreeBranchGeometry(PLATFORM_TRUNK, variant, { sides: 6, segmentsPerSpan: 3, minimumSegments: 6 });
}

export function platformFirLayout(platform, index) {
  return {
    x: platform.x, z: platform.z, variant: index % 3, angle: index * 0.7,
    trunkHeight: (platform.height + 70) / (165 * (1 + (index % 3 - 1) * 0.025)),
    canopyWidth: (35 + index % 3 * 7) / 46,
    canopyHeight: 0.6,
    canopyBase: platform.height + 33
  };
}

export function createFirCanopy(variant) {
  if (!Number.isInteger(variant) || variant < 0 || variant >= COLORS.length) throw new RangeError('Unknown fir tree variant.');
  const positions = [], colors = [], uvs = [];
  const baseColor = new THREE.Color(COLORS[variant]);
  const width = variant === 1 ? 0.8 : 1;
  const height = variant === 1 ? 1.08 : 1;
  const point = (angle, distance, y, side = 0) => [
    (Math.cos(angle) * distance - Math.sin(angle) * side) * width,
    y * height,
    (Math.sin(angle) * distance + Math.cos(angle) * side) * width
  ];
  const triangle = (a, b, c, shade) => {
    for (const vertex of [a, b, c]) {
      positions.push(...vertex.position);
      uvs.push(...vertex.uv);
      colors.push(baseColor.r * shade, baseColor.g * shade, baseColor.b * shade);
    }
  };
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4, next = (i + 1) * Math.PI / 4;
    const lower = { position: point(angle, 12, 41), uv: [i / 8, 1] };
    const lowerNext = { position: point(next, 12, 41), uv: [(i + 1) / 8, 1] };
    const upper = { position: point(angle, 3, 160), uv: [i / 8, 0] };
    const upperNext = { position: point(next, 3, 160), uv: [(i + 1) / 8, 0] };
    triangle(lower, upper, lowerNext, 0.73);
    triangle(lowerNext, upper, upperNext, 0.73);
  }
  for (let tier = 0; tier < 8; tier += 1) {
    const y = 47 + tier * 15;
    const radius = 46 - tier * 5.2;
    for (let branch = 0; branch < 8; branch += 1) {
      const angle = branch * Math.PI / 4 + tier * 0.31 + variant * 0.17;
      const length = radius * (0.91 + 0.1 * Math.sin(branch * 2.4 + tier * 1.7 + variant));
      const spread = length * 0.28;
      const ring = [
        { position: point(angle, 0, y), uv: [0.5, 0] },
        { position: point(angle, length * 0.55, y - 2, spread), uv: [0, 0.55] },
        { position: point(angle, length, y - 6), uv: [0.5, 1] },
        { position: point(angle, length * 0.55, y - 2, -spread), uv: [1, 0.55] }
      ];
      const top = { position: point(angle, length * 0.43, y + 7), uv: [0.5, 0.43] };
      const bottom = { position: point(angle, length * 0.43, y - 5), uv: [0.5, 0.43] };
      const shade = 0.83 + 0.1 * Math.sin(branch * 1.7 + tier + variant) ** 2 + tier * 0.012;
      for (let i = 0; i < ring.length; i += 1) {
        triangle(top, ring[i], ring[(i + 1) % ring.length], shade);
        triangle(bottom, ring[(i + 1) % ring.length], ring[i], shade * 0.76);
      }
    }
  }
  const tip = { position: point(0, 0, 177), uv: [0.5, 0] };
  for (let i = 0; i < 8; i += 1) {
    const first = { position: point(i * Math.PI / 4, 8, 151), uv: [0, 1] };
    const second = { position: point((i + 1) * Math.PI / 4, 8, 151), uv: [1, 1] };
    triangle(tip, second, first, 0.96);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createNeedleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the fir needle texture.');
  ctx.fillStyle = '#d7e0cc'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i += 1) {
    const random = (salt) => {
      const value = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const x = random(1) * 512, y = random(2) * 512;
    const direction = i % 2 ? 1 : -1;
    ctx.strokeStyle = i % 3 ? 'rgba(42, 75, 43, .28)' : 'rgba(250, 255, 222, .38)';
    ctx.lineWidth = 0.7 + random(3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + direction * (3 + random(4) * 5), y - 4 - random(5) * 6); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
