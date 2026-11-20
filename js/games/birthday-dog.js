import * as THREE from 'three';
import { createCollision, findWorldPath } from '../world/world-collision.js';

export const VINNIE_PET_RANGE = 54;
export const VINNIE_BODY_RADIUS = 16;
export const VINNIE_HEAD_OFFSET = 21;
export const VINNIE_HEAD_RADIUS = 16;

export function vinnieObstacles(position, facing = 0, size = 1) {
  return [
    { x: position.x, y: position.y, radius: VINNIE_BODY_RADIUS * size },
    {
      x: position.x + Math.sin(facing) * VINNIE_HEAD_OFFSET * size,
      y: position.y + Math.cos(facing) * VINNIE_HEAD_OFFSET * size,
      radius: VINNIE_HEAD_RADIUS * size
    }
  ];
}

export function vinniePetFacing(position, facing, player, size = 1, playerRadius = 10) {
  const towardPlayer = Math.atan2(player.x - position.x, player.y - position.y);
  return createCollision(vinnieObstacles(position, towardPlayer, size), playerRadius).blocked(player)
    ? facing : towardPlayer;
}

export function findVinnieApproach(player, dog, collision) {
  if (Math.hypot(player.x - dog.x, player.y - dog.y) <= VINNIE_PET_RANGE) return [];
  const direction = Math.atan2(player.y - dog.y, player.x - dog.x);
  for (const radius of [50, 53]) {
    for (let i = 0; i < 16; i += 1) {
      const angle = direction + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8;
      const target = { x: dog.x + Math.cos(angle) * radius, y: dog.y + Math.sin(angle) * radius };
      if (collision.blocked(target)) continue;
      const path = findWorldPath(player, target, collision);
      if (path?.at(-1) && Math.hypot(path.at(-1).x - target.x, path.at(-1).y - target.y) < 1) return path;
    }
  }
  return null;
}

export const STAFF_COLORS = Object.freeze({
  coat: '#777f82',
  light: '#929a9a',
  dark: '#555d60',
  ear: '#444b4e',
  innerEar: '#806e70',
  chest: '#eeeae1',
  muzzle: '#a2a4a0',
  nose: '#2d3031',
  noseLight: '#6e7372',
  eye: '#2a2523',
  eyeLight: '#f5ede1',
  collar: '#365e83',
  tag: '#dfc48c'
});

function createBlazeGeometry() {
  const positions = [], indices = [];
  for (let row = 0; row <= 12; row += 1) {
    const y = -1.5 + row * 9.5 / 12;
    const halfWidth = 0.8 + 0.5 * Math.sin(row * Math.PI / 12);
    for (const x of [-halfWidth, halfWidth]) {
      const z = 9.5 * Math.sqrt(1 - (y / 9.5) ** 2 - (x / 13) ** 2) + 0.08;
      positions.push(x, y, z);
    }
    if (row) {
      const i = row * 2;
      indices.push(i - 2, i - 1, i, i - 1, i + 1, i);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createBirthdayDogModel(box, round, orb) {
  const model = new THREE.Group();
  const { coat, light, dark, ear, innerEar, chest, muzzle, nose, noseLight, eye, eyeLight, collar, tag } = STAFF_COLORS;
  round(orb, 0, 20, -3, 25, 22, 38, coat, model);
  round(orb, 0, 21, -13, 24, 20, 19, coat, model);
  round(orb, 0, 22, 10, 26, 24, 22, coat, model);
  round(orb, 0, 19, 21, 14, 17, 4, chest, model);
  round(orb, 0, 29, 12, 24.5, 4, 19, collar, model);
  round(orb, 0, 25.5, 21.5, 3.5, 4.5, 1.5, tag, model);
  round(orb, 0, 25.5, 22.4, 1.1, 1.1, 0.5, light, model);
  const head = new THREE.Group();
  head.position.set(0, 32, 17); model.add(head);
  round(orb, 0, 0, 0, 26, 19, 19, coat, head);
  round(createBlazeGeometry(), 0, 0, 0, 1, 1, 1, chest, head);
  for (const x of [-10, 10]) {
    const side = Math.sign(x);
    const base = round(orb, x, 6, -1.5, 6, 7, 8, dark, head);
    base.rotation.z = side * 0.35;
    const fold = round(orb, x * 1.12, 4.2, 2, 7, 4, 7, ear, head);
    fold.rotation.z = side * 0.48;
    const inside = round(orb, x * 1.12, 4.6, 5.2, 4, 1.8, 0.8, innerEar, head);
    inside.rotation.z = side * 0.48;
    round(orb, x * 0.56, 1.8, 8.3, 4.2, 3.6, 1.7, dark, head);
    round(orb, x * 0.56, 1.8, 9.2, 2.4, 2.5, 1.4, eye, head);
    round(orb, x * 0.56 - 0.35, 2.3, 10, 0.7, 0.7, 0.4, eyeLight, head);
    const brow = round(orb, x * 0.56, 4, 8.1, 4.8, 1.4, 1.5, light, head);
    brow.rotation.z = -side * 0.14;
    round(orb, x * 0.34, -4.5, 10.5, 8.5, 7, 8, muzzle, head);
    for (const dot of [-1, 1]) round(orb, x * 0.34 + dot * 1.5, -4.5, 14.1, 0.65, 0.65, 0.45, dark, head);
  }
  round(orb, 0, -7, 10, 15, 4, 8, dark, head);
  round(orb, 0, -4, 11, 13, 7, 8, muzzle, head);
  round(orb, 0, -2.8, 15, 7.5, 4.5, 4, nose, head);
  round(orb, -1, -2, 17, 2, 0.8, 0.5, noseLight, head);
  round(orb, 0, -6.2, 14.9, 1, 2.8, 0.8, nose, head);
  const legs = [];
  for (const z of [-14, 12]) for (const x of [-8, 8]) {
    const leg = new THREE.Group();
    leg.position.set(x, 15, z); model.add(leg);
    round(orb, 0, -3, 0, 8, 11, 9, coat, leg);
    round(orb, 0, -7, 0, 6.5, 10, 7, coat, leg);
    leg.userData.foot = round(orb, 0, -11, 2, 8, 5, 10, coat, leg);
    for (const toe of [-2.2, 0, 2.2]) round(orb, toe, -10.5, 6.4, 1, 0.8, 1.1, dark, leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 23, -20); model.add(tail);
  const tailShape = round(orb, 0, 3, -6, 5, 5, 15, coat, tail);
  tailShape.rotation.x = 0.4;
  const tailTip = round(orb, 0, 6, -14, 3, 3, 7, coat, tail);
  tailTip.rotation.x = 0.4;
  return { model, legs, tail, head };
}

export function drawBirthdayDog(ctx, x, y, facing, stride, scale = 1, wag = 0) {
  const { coat, light, dark, ear, innerEar, chest, muzzle, nose, noseLight, eye, eyeLight, collar, tag } = STAFF_COLORS;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-facing); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(20,18,14,.3)';
  ctx.beginPath(); ctx.ellipse(1, 2, 15, 19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = coat; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(wag * 10, -24); ctx.stroke();
  ctx.fillStyle = dark;
  for (const z of [-10, 10]) for (const side of [-1, 1]) {
    ctx.fillRect(side * 9 - 3, z + side * stride * 2, 6, 7);
  }
  ctx.fillStyle = coat;
  for (const z of [-10, 10]) for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(side * 9, z + 4 + side * stride * 2, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(0, -1, 11, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = chest;
  ctx.beginPath(); ctx.ellipse(0, 11, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = collar; ctx.fillRect(-10, 8, 20, 3);
  ctx.fillStyle = tag; ctx.fillRect(-1, 10, 2, 3);
  ctx.fillStyle = ear;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(side * 9, 13, 4, 3, side * 0.35, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(0, 15, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = innerEar;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(side * 9, 14, 2, 1, side * 0.35, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = muzzle;
  ctx.beginPath(); ctx.ellipse(0, 20, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = chest; ctx.fillRect(-1, 11, 2, 6);
  ctx.fillStyle = nose; ctx.fillRect(-3, 21, 6, 3);
  ctx.fillStyle = noseLight; ctx.fillRect(-2, 21, 2, 1);
  ctx.fillStyle = light;
  for (const side of [-1, 1]) ctx.fillRect(side * 5 - 2, 11, 4, 1);
  ctx.fillStyle = eye;
  for (const side of [-1, 1]) ctx.fillRect(side * 5 - 1, 13, 2, 2);
  ctx.fillStyle = eyeLight;
  for (const side of [-1, 1]) ctx.fillRect(side * 5 - 1, 13, 1, 1);
  ctx.restore();
}
