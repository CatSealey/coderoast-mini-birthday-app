import * as THREE from 'three';
import { CANOPY_FOREST_TREES } from './canopy-scenery.js';

export const CANOPY_FOREST_LIGHT_COLORS = Object.freeze(['#f9b775', '#d795df', '#8dd8cb', '#e8d585']);

export const CANOPY_FOREST_LIGHTS = CANOPY_FOREST_TREES.flatMap((tree, index) => {
  if ((Math.floor(index / 8) + index % 8) % 2 !== 0) return [];
  return [1, 2, 4, 5].map((tier, light) => {
    const branch = (index + light * 3) % 8;
    const angle = branch * Math.PI / 4 + tier * 0.31 + tree.variant * 0.17;
    const radius = (46 - tier * 5.2) * (0.91 + 0.1 * Math.sin(branch * 2.4 + tier * 1.7 + tree.variant)) * 0.87 * 0.85;
    const localX = Math.cos(angle) * radius * (tree.variant === 1 ? 0.8 : 1);
    const localZ = Math.sin(angle) * radius;
    return {
      treeIndex: index,
      x: tree.x + localX * Math.cos(tree.angle) + localZ * Math.sin(tree.angle),
      y: -130.75 + (47 + tier * 15) * 0.75,
      z: tree.z - localX * Math.sin(tree.angle) + localZ * Math.cos(tree.angle),
      color: CANOPY_FOREST_LIGHT_COLORS[(index + light) % CANOPY_FOREST_LIGHT_COLORS.length]
    };
  });
});

export function createCanopyForestLights() {
  const image = document.createElement('canvas');
  image.width = 64; image.height = 64;
  const ctx = image.getContext('2d');
  if (!ctx) throw new Error('Could not create canopy forest lights.');
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, 'rgba(255,255,255,1)');
  glow.addColorStop(0.18, 'rgba(255,255,255,0.9)');
  glow.addColorStop(0.45, 'rgba(255,255,255,0.2)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(image);
  const geometry = new THREE.BufferGeometry();
  const positions = [], colors = [], color = new THREE.Color();
  for (const light of CANOPY_FOREST_LIGHTS) {
    positions.push(light.x, light.y, light.z);
    color.set(light.color);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 9, sizeAttenuation: false, map: texture, vertexColors: true, transparent: true, depthWrite: false
  });
  return new THREE.Points(geometry, material);
}

export function drawCanopyForest(ctx, sx, sy, scale, width, height) {
  const offset = (index) => ({
    x: Math.sin(index * 17.1) * 11,
    y: Math.sin(index * 7.3 + 1) * 10
  });
  const crown = (x, y, radius, rotation) => {
    ctx.beginPath();
    for (let point = 0; point <= 16; point += 1) {
      const angle = rotation + point * Math.PI / 8, r = radius * (point % 2 ? 0.76 : 1);
      const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r;
      if (point === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.fill();
  };
  for (const [index, tree] of CANOPY_FOREST_TREES.entries()) {
    const shift = offset(index);
    const x = sx(tree.x + shift.x), y = sy(tree.z + shift.y), radius = (28 + tree.variant * 2) * scale;
    if (x + radius < 0 || x - radius > width || y + radius < 0 || y - radius > height) continue;
    ctx.fillStyle = ['#1b372d', '#203f32', '#1d3a30'][tree.variant];
    crown(x, y, radius, tree.angle);
    ctx.fillStyle = ['#254635', '#2a4b39', '#274b3a'][tree.variant];
    crown(x, y, radius * 0.6, tree.angle + 0.18);
  }
  for (const light of CANOPY_FOREST_LIGHTS) {
    const shift = offset(light.treeIndex), x = sx(light.x + shift.x), y = sy(light.z + shift.y);
    if (x < -5 || x > width + 5 || y < -5 || y > height + 5) continue;
    ctx.fillStyle = light.color;
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, 2 * scale), 0, Math.PI * 2); ctx.fill();
  }
}
