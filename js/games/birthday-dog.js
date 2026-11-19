import * as THREE from 'three';

export const STAFF_COLORS = Object.freeze({
  coat: '#777f82',
  light: '#929a9a',
  dark: '#555d60',
  chest: '#eeeae1',
  nose: '#2d3031'
});

export function createBirthdayDogModel(box, round, orb) {
  const model = new THREE.Group();
  const { coat, light, dark, chest, nose } = STAFF_COLORS;
  round(orb, 0, 20, -3, 25, 22, 38, coat, model);
  round(orb, 0, 22, 13, 23, 24, 18, coat, model);
  round(orb, 0, 19, 22, 13, 17, 5, chest, model);
  for (const x of [-10, 10]) round(orb, x, 18, 16, 5, 14, 9, chest, model);
  round(orb, 0, 32, 17, 24, 18, 19, coat, model);
  for (const x of [-10, 10]) {
    const ear = round(orb, x, 38, 13, 8, 8, 9, dark, model);
    ear.rotation.z = Math.sign(x) * 0.35;
    round(orb, x * 0.55, 33, 25, 3, 3, 2, nose, model);
  }
  round(orb, 0, 27, 26, 15, 9, 10, light, model);
  round(orb, 0, 29, 31, 8, 5, 4, nose, model);
  const legs = [];
  for (const z of [-14, 12]) for (const x of [-8, 8]) {
    const leg = new THREE.Group();
    leg.position.set(x, 15, z); model.add(leg);
    box(0, -6, 0, 7, 12, 8, coat, leg);
    leg.userData.foot = round(orb, 0, -11, 2, 8, 5, 10, dark, leg);
    legs.push(leg);
  }
  const tail = new THREE.Group();
  tail.position.set(0, 23, -20); model.add(tail);
  const tailShape = round(orb, 0, 4, -7, 5, 6, 18, coat, tail);
  tailShape.rotation.x = -0.4;
  return { model, legs, tail };
}

export function drawBirthdayDog(ctx, x, y, facing, stride, scale = 1) {
  const { coat, light, dark, chest, nose } = STAFF_COLORS;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(-facing); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(20,18,14,.3)';
  ctx.beginPath(); ctx.ellipse(1, 2, 15, 19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = coat; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(Math.sin(stride) * 4, -24); ctx.stroke();
  ctx.fillStyle = dark;
  for (const z of [-10, 10]) for (const side of [-1, 1]) {
    ctx.fillRect(side * 9 - 3, z + side * stride * 2, 6, 7);
  }
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(0, -1, 11, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = chest;
  ctx.beginPath(); ctx.ellipse(0, 11, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(side * 9, 13, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.ellipse(0, 15, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.ellipse(0, 20, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = nose; ctx.fillRect(-3, 21, 6, 3);
  for (const side of [-1, 1]) ctx.fillRect(side * 5 - 1, 13, 2, 2);
  ctx.restore();
}
