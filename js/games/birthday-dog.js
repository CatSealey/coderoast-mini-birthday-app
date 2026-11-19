import * as THREE from 'three';
import { findWorldPath } from '../world/world-collision.js';

export const VINNIE_PET_RANGE = 48;

export function findVinnieApproach(player, dog, collision) {
  if (Math.hypot(player.x - dog.x, player.y - dog.y) <= VINNIE_PET_RANGE) return [];
  const direction = Math.atan2(player.y - dog.y, player.x - dog.x);
  for (const radius of [44, 47]) {
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
  chest: '#eeeae1',
  nose: '#2d3031',
  eye: '#2a2523',
  eyeLight: '#f5ede1',
  collar: '#365e83',
  tag: '#dfc48c'
});

export function createBirthdayDogModel(box, round, orb) {
  const model = new THREE.Group();
  const { coat, light, dark, chest, nose, eye, eyeLight, collar, tag } = STAFF_COLORS;
  round(orb, 0, 20, -3, 25, 22, 38, coat, model);
  round(orb, 0, 24, -12, 24, 19, 20, light, model);
  round(orb, 0, 22, 13, 23, 24, 18, coat, model);
  round(orb, 0, 19, 22, 13, 17, 5, chest, model);
  for (const x of [-10, 10]) round(orb, x, 18, 16, 5, 14, 9, chest, model);
  round(orb, 0, 29, 11, 24, 6, 20, collar, model);
  round(orb, 0, 25, 22, 4, 5, 2, tag, model);
  const head = new THREE.Group();
  head.position.set(0, 32, 17); model.add(head);
  round(orb, 0, 0, 0, 24, 18, 19, coat, head);
  round(orb, 0, 2, 8, 3.5, 11, 2.5, chest, head);
  for (const x of [-10, 10]) {
    const ear = round(orb, x, 6, -4, 8, 9, 10, dark, head);
    ear.rotation.z = Math.sign(x) * 0.35;
    const fold = round(orb, x * 1.08, 3, 1, 7, 5, 7, coat, head);
    fold.rotation.z = Math.sign(x) * 0.3;
    round(orb, x * 0.56, 1.5, 8.3, 4.5, 4, 2.5, light, head);
    round(orb, x * 0.56, 1.5, 9.5, 2.5, 2.7, 1.6, eye, head);
    round(orb, x * 0.56 - 0.4, 2.1, 10.3, 0.8, 0.8, 0.5, eyeLight, head);
    round(orb, x * 0.35, -5, 10, 9, 7, 7, light, head);
  }
  round(orb, 0, -7, 9, 15, 5, 8, dark, head);
  round(orb, 0, -4, 11, 15, 8, 9, light, head);
  round(orb, 0, -2.5, 15.5, 8, 5, 4, nose, head);
  round(orb, 0, -6.5, 15, 1, 3, 1, nose, head);
  const legs = [];
  for (const z of [-14, 12]) for (const x of [-8, 8]) {
    const leg = new THREE.Group();
    leg.position.set(x, 15, z); model.add(leg);
    round(orb, 0, -3, 0, 8, 11, 9, coat, leg);
    round(orb, 0, -7, 0, 6.5, 10, 7, coat, leg);
    leg.userData.foot = round(orb, 0, -11, 2, 8, 5, 10, dark, leg);
    for (const toe of [-2, 0, 2]) round(orb, toe, -10.5, 6.2, 1, 1.2, 0.8, light, leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 23, -20); model.add(tail);
  const tailShape = round(orb, 0, 4, -7, 5, 6, 18, coat, tail);
  tailShape.rotation.x = -0.4;
  return { model, legs, tail, head };
}

export function drawBirthdayDog(ctx, x, y, facing, stride, scale = 1, wag = 0) {
  const { coat, light, dark, chest, nose, eye, eyeLight, collar, tag } = STAFF_COLORS;
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
  ctx.beginPath(); ctx.ellipse(0, -1, 11, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.ellipse(0, -8, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = chest;
  ctx.beginPath(); ctx.ellipse(0, 11, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = collar; ctx.fillRect(-10, 8, 20, 3);
  ctx.fillStyle = tag; ctx.fillRect(-1, 10, 2, 3);
  ctx.fillStyle = dark;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(side * 9, 13, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(0, 15, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.ellipse(0, 20, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = chest; ctx.fillRect(-1, 11, 2, 6);
  ctx.fillStyle = nose; ctx.fillRect(-3, 21, 6, 3);
  ctx.fillStyle = eye;
  for (const side of [-1, 1]) ctx.fillRect(side * 5 - 1, 13, 2, 2);
  ctx.fillStyle = eyeLight;
  for (const side of [-1, 1]) ctx.fillRect(side * 5 - 1, 13, 1, 1);
  ctx.restore();
}
