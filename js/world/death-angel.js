import * as THREE from 'three';

export const DEATH_ANGEL_HEIGHT = 70;
export const DEATH_ANGEL_BASE_WIDTH = 28;
export const DEATH_ANGEL_BASE_DEPTH = 18;

function stoneTexture() {
  const width = 64, height = 128;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const noise = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const grain = noise - Math.floor(noise);
      const streak = Math.sin(x * 0.39 + Math.sin(y * 0.055) * 1.7);
      const shade = Math.round(177 + grain * 33 + streak * 6 - y / height * 12);
      const index = (y * width + x) * 4;
      pixels[index] = shade; pixels[index + 1] = shade; pixels[index + 2] = shade - 4; pixels[index + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createDeathAngelArt() {
  const shape = new THREE.Shape();
  shape.moveTo(-13, 0); shape.lineTo(13, 0); shape.lineTo(13, 32);
  shape.quadraticCurveTo(13, 43, 0, 43);
  shape.quadraticCurveTo(-13, 43, -13, 32); shape.closePath();
  const slab = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: true, bevelSize: 0.6, bevelThickness: 0.6, bevelSegments: 1, curveSegments: 12 });
  const face = new THREE.ShapeGeometry(shape, 12);
  const position = face.getAttribute('position');
  const uv = face.getAttribute('uv');
  for (let i = 0; i < position.count; i += 1) uv.setXY(i, position.getX(i) / 26 + 0.5, position.getY(i) / 43);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const stone = new THREE.SphereGeometry(1, 10, 7);
  const hoodTip = new THREE.ConeGeometry(1, 1, 8);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
  const texture = stoneTexture();
  const stoneMaterial = new THREE.MeshStandardMaterial({ map: texture, color: '#a7a9a4', roughness: 1 });
  const lightMaterial = new THREE.MeshStandardMaterial({ map: texture, color: '#c4c4bc', roughness: 1 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: '#595e5c', roughness: 1 });
  const shadowMaterial = new THREE.MeshStandardMaterial({ color: '#303735', roughness: 1 });
  const faceMaterial = new THREE.MeshStandardMaterial({ map: texture, color: '#b7b7ad', roughness: 1 });

  function part(parent, geometry, material, x, y, z, sx, sy, sz, rotation = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.z = rotation;
    parent.add(mesh);
    return mesh;
  }
  function engraving(parent, x1, y1, x2, y2, width = 0.18) {
    const dx = x2 - x1, dy = y2 - y1;
    part(parent, cylinder, darkMaterial, (x1 + x2) / 2, (y1 + y2) / 2, 6.76,
      width, Math.hypot(dx, dy), width, -Math.atan2(dx, dy));
  }
  function createModel() {
    const group = new THREE.Group();
    group.name = 'death-angel';
    const base = part(group, box, darkMaterial, 0, 3, 0, DEATH_ANGEL_BASE_WIDTH, 6, DEATH_ANGEL_BASE_DEPTH);
    base.name = 'stone-base';
    part(group, box, stoneMaterial, 0, 6.5, 0, 26, 2, 16);
    part(group, stone, darkMaterial, 0, 38, -4, 10, 19, 6);
    for (const side of [-1, 1]) {
      part(group, stone, stoneMaterial, side * 7, 48, -5, 4, 16, 3, -side * 0.12);
      part(group, stone, lightMaterial, side * 8, 44, -3, 2.7, 11, 2, -side * 0.2);
      part(group, stone, stoneMaterial, side * 7, 49, 0, 3, 10, 3, side * 0.25);
    }
    const hood = part(group, stone, stoneMaterial, 0, 61, -3, 8, 9, 6);
    hood.name = 'hood';
    part(group, hoodTip, stoneMaterial, 0, 65, -3, 7.5, 10, 5.5);
    part(group, stone, shadowMaterial, 0, 61, 2.8, 5, 6.3, 0.7);
    part(group, stone, darkMaterial, 0, 56, 3, 3.8, 1.6, 0.8);
    const grave = part(group, slab, stoneMaterial, 0, 7, 0, 1, 1, 1);
    grave.name = 'grave-marker';
    part(group, face, faceMaterial, 0, 7, 6.65, 1, 1, 1);
    for (const [x1, y1, x2, y2] of [
      [-9, 12, -9, 34], [-9, 34, -6, 42], [-6, 42, 0, 45],
      [0, 45, 6, 42], [6, 42, 9, 34], [9, 34, 9, 12],
      [-9, 12, 9, 12], [-4, 31, 0, 36], [0, 36, 4, 31],
      [4, 31, 0, 26], [0, 26, -4, 31], [-2.4, 32, 2.4, 29],
      [2.4, 32, -2.4, 29], [-10, 26, -6, 24], [-6, 24, -4, 19],
      [-4, 19, -1, 17], [9, 23, 6, 21], [6, 21, 7, 17]
    ]) engraving(group, x1, y1, x2, y2);
    return group;
  }
  return {
    createModel,
    dispose() {
      slab.dispose(); face.dispose(); box.dispose(); stone.dispose(); hoodTip.dispose(); cylinder.dispose(); texture.dispose();
      stoneMaterial.dispose(); lightMaterial.dispose(); darkMaterial.dispose(); shadowMaterial.dispose(); faceMaterial.dispose();
    }
  };
}

export function drawDeathAngel(ctx) {
  ctx.fillStyle = '#555b59'; ctx.fillRect(-14, -6, 28, 6);
  ctx.fillStyle = '#92948e'; ctx.fillRect(-13, -8, 26, 2);
  ctx.fillStyle = '#646b68';
  ctx.beginPath(); ctx.ellipse(-10, -45, 4, 15, -0.25, 0, Math.PI * 2);
  ctx.ellipse(10, -45, 4, 15, 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#898b86'; ctx.beginPath(); ctx.ellipse(0, -61, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#303735'; ctx.beginPath(); ctx.ellipse(0, -61, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#898b86'; ctx.beginPath(); ctx.moveTo(-13, -8); ctx.lineTo(-13, -39);
  ctx.quadraticCurveTo(-13, -50, 0, -50); ctx.quadraticCurveTo(13, -50, 13, -39);
  ctx.lineTo(13, -8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#5c615d'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-9, -11); ctx.lineTo(-9, -38);
  ctx.quadraticCurveTo(-9, -46, 0, -46); ctx.quadraticCurveTo(9, -46, 9, -38);
  ctx.lineTo(9, -11); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -37); ctx.lineTo(4, -33); ctx.lineTo(0, -29);
  ctx.lineTo(-4, -33); ctx.closePath(); ctx.moveTo(-3, -35); ctx.lineTo(3, -31);
  ctx.moveTo(3, -35); ctx.lineTo(-3, -31);
  ctx.moveTo(-10, -27); ctx.lineTo(-6, -25); ctx.lineTo(-4, -20); ctx.lineTo(-1, -18); ctx.stroke();
}
