import * as THREE from 'three';
import { DAVID_GRAVE } from './side-quests.js';

export const DAVID_FIGURE_SCALE = 1.45;

export function createSideQuestArt() {
  const box = new THREE.BoxGeometry(1, 1, 1);
  const sphere = new THREE.SphereGeometry(1, 16, 12);
  const clod = new THREE.IcosahedronGeometry(1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const skirt = new THREE.CylinderGeometry(0.55, 1, 1, 12);
  const materials = new Map();
  function part(group, geometry, color, x, y, z, width, height, depth, name) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    const mesh = new THREE.Mesh(geometry, materials.get(color));
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    if (name) mesh.name = name;
    group.add(mesh);
    return mesh;
  }

  function createDoll() {
    const doll = new THREE.Group();
    doll.name = 'abigail-doll';
    const p = (geometry, color, x, y, z, w, h, d, name) => part(doll, geometry, color, x, y, z, w, h, d, name);
    p(skirt, '#795253', 0, 12, 0, 10, 15, 7, 'dress');
    p(cylinder, '#a47a78', 0, 5, 0, 10.1, 2, 7.1);
    p(sphere, '#dcc5ae', 0, 30, 0, 7, 8, 6, 'face');
    p(sphere, '#49332d', 0, 34, -1.5, 7.4, 5, 6.4, 'hair');
    p(box, '#49332d', 0, 34, 5.2, 12, 3, 2);
    for (const side of [-1, 1]) {
      p(sphere, '#543a31', side * 7, 27, -0.5, 2.5, 7, 3, `braid-${side}`);
      p(sphere, '#9d6465', side * 7, 22, 0, 2.7, 1.6, 2.3);
      p(sphere, '#c7ab98', side * 10, 17, 0, 2.1, 5, 2.1).rotation.z = side * 0.25;
      p(sphere, '#e4ceba', side * 11, 12, 0, 2.1, 2.1, 2.1);
      p(box, '#d7c3ae', side * 4, 3, 0, 3, 6, 3);
      p(sphere, '#493837', side * 4, 1.6, 1.5, 2.5, 1.6, 3.5);
      p(sphere, '#433536', side * 2.8, 30.5, 5.5, 1.25, 1.5, 0.8, `eye-${side}`);
      p(sphere, '#f4e4d3', side * 2.5, 31, 6.2, 0.35, 0.4, 0.3);
      p(sphere, '#bd8d83', side * 4.5, 27.5, 5.3, 1.2, 0.65, 0.4);
      p(box, '#ddc6a9', side * 3, 22, 6.5, 5, 2, 1);
    }
    p(box, '#e0cab1', 0, 16, 6.7, 8, 9, 0.8, 'apron');
    p(box, '#a47976', 0, 19, 7.2, 9, 1, 0.8);
    p(box, '#744c4a', 0, 26.8, 6, 3, 0.7, 0.5, 'mouth');
    for (const y of [20, 17, 14]) p(sphere, '#d6b79f', 0, y, 7.5, 0.5, 0.5, 0.3);
    return doll;
  }

  function createDavidGrave() {
    const grave = new THREE.Group();
    grave.name = 'david-grave';
    const p = (geometry, color, x, y, z, w, h, d, name) => part(grave, geometry, color, x, y, z, w, h, d, name);
    p(box, '#4b382d', 0, 1, 0, DAVID_GRAVE.width, 2, DAVID_GRAVE.depth, 'grave-soil');
    p(box, '#30261f', 0, 2, 0, 84, 1, 27);
    for (const z of [-15, 15]) {
      for (let x = -40; x <= 40; x += 8) {
        p(sphere, x % 16 ? '#766b59' : '#887a65', x, 2.2, z, 4, 2, 2);
      }
    }
    for (const x of [-44, 44]) p(box, '#766b59', x, 2, 0, 4, 3, 27);
    const mound = new THREE.Group();
    mound.name = 'dirt-mound';
    mound.position.set(DAVID_GRAVE.mound.offsetX, 0, DAVID_GRAVE.mound.offsetY);
    grave.add(mound);
    part(mound, clod, '#634832', 0, 2, 0, 29, 8, 14, 'mound-base');
    for (const [x, y, z, w, h, d, color] of [
      [-17, 3, -1, 10, 5, 8, '#684c35'], [-6, 4, 1, 11, 6, 9, '#715239'],
      [7, 4, -2, 11, 6, 9, '#6d4e35'], [18, 3, 1, 9, 4, 7, '#604631']
    ]) part(mound, clod, color, x, y, z, w, h, d);
    for (const [x, z] of [[-20, -2], [-15, 5], [-10, -5], [-5, 3], [0, -4], [4, 5], [10, -6], [14, 2], [20, -3]]) {
      const height = 2 + 8 * Math.sqrt(Math.max(0, 1 - (x / 29) ** 2 - (z / 14) ** 2));
      part(mound, clod, x % 2 ? '#4e382a' : '#927052', x, height, z, 1.5, 0.8, 1.2);
    }
    const figure = new THREE.Group();
    figure.name = 'david-figure';
    figure.scale.setScalar(DAVID_FIGURE_SCALE);
    grave.add(figure);
    const body = (geometry, color, x, y, z, w, h, d, name) => part(figure, geometry, color, x, y, z, w, h, d, name);
    body(sphere, '#52676b', -3, 5.5, 0, 11, 3.5, 6, 'david-torso');
    for (const side of [-1, 1]) {
      body(sphere, '#45595f', -3, 5, side * 7, 9.5, 2, 1.8, `david-arm-${side}`);
      body(sphere, '#d0a589', -12, 5, side * 7, 2.5, 2, 2);
      body(sphere, '#3c4145', -18, 4.5, side * 3.2, 6, 2.2, 2.5, `david-leg-${side}`);
      body(box, '#292b2c', -24, 4, side * 3.2, 4, 4, 5);
      const collar = body(box, '#d9c8b3', 5, 8.6, side * 2, 5, 0.7, 2);
      collar.rotation.y = side * 0.3;
    }
    body(sphere, '#d8ad8f', 15, 6.5, 0, 6.2, 4.5, 5.1, 'david-face');
    body(sphere, '#59443b', 19.5, 7, 0, 3, 4, 5.2, 'david-hair');
    for (const side of [-1, 1]) {
      body(box, '#53433d', 14, 10.7, side * 2, 2, 0.5, 0.6, `david-eye-${side}`);
      body(sphere, '#d0a284', 15, 6, side * 5, 1.4, 1.3, 0.8);
    }
    body(sphere, '#c68e74', 12, 10.5, 0, 1, 0.8, 1);
    body(box, '#866357', 10.5, 10, 0, 0.7, 0.4, 2, 'david-mouth');
    body(box, '#8a6454', 2, 9, 0, 6, 0.7, 1.3, 'david-tie');
    for (const x of [-7, -3]) body(sphere, '#b8a993', x, 8.9, 0, 0.5, 0.5, 0.5);
    return grave;
  }

  return {
    createDoll, createDavidGrave,
    dispose() {
      box.dispose(); sphere.dispose(); clod.dispose(); cylinder.dispose(); skirt.dispose();
      materials.forEach((material) => material.dispose());
    }
  };
}

export function drawAbigailDoll(ctx) {
  ctx.save();
  ctx.fillStyle = '#493837';
  for (const x of [-4, 4]) { ctx.beginPath(); ctx.ellipse(x, -2, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#795253'; ctx.beginPath(); ctx.moveTo(-5, -21); ctx.lineTo(5, -21);
  ctx.lineTo(10, -5); ctx.lineTo(-10, -5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e0cab1'; ctx.fillRect(-4, -17, 8, 10);
  ctx.strokeStyle = '#c7ab98'; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(-6, -19); ctx.lineTo(-11, -10); ctx.moveTo(6, -19); ctx.lineTo(11, -10); ctx.stroke();
  ctx.fillStyle = '#49332d';
  for (const x of [-7, 7]) { ctx.beginPath(); ctx.ellipse(x, -26, 2.5, 7, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#dcc5ae'; ctx.beginPath(); ctx.ellipse(0, -30, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#49332d'; ctx.beginPath(); ctx.ellipse(0, -35, 7, 3.5, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#433536'; ctx.beginPath(); ctx.arc(-2.8, -30, 1.2, 0, Math.PI * 2);
  ctx.arc(2.8, -30, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f4e4d3'; ctx.fillRect(-2.8, -31, 0.7, 0.7); ctx.fillRect(2.8, -31, 0.7, 0.7);
  ctx.strokeStyle = '#744c4a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-1.5, -26.5); ctx.lineTo(1.5, -26.5); ctx.stroke();
  ctx.restore();
}

export function drawDavidGrave(ctx) {
  ctx.save();
  ctx.fillStyle = '#59402e'; ctx.beginPath(); ctx.ellipse(0, -25, 30, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#76563a'; ctx.beginPath(); ctx.ellipse(-7, -29, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6d4d33'; ctx.beginPath(); ctx.ellipse(12, -28, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#967253';
  for (const [x, y] of [[-20, -25], [-13, -30], [-6, -26], [3, -32], [10, -25], [19, -29]]) {
    ctx.beginPath(); ctx.ellipse(x, y, 1.8, 1, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#4b382d'; ctx.beginPath(); ctx.ellipse(0, 0, DAVID_GRAVE.width / 2 - 1.5, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#887a65'; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); ctx.scale(DAVID_FIGURE_SCALE, DAVID_FIGURE_SCALE);
  ctx.fillStyle = '#3c4145'; ctx.fillRect(-23, -5, 16, 10);
  ctx.fillStyle = '#52676b'; ctx.fillRect(-10, -7, 20, 14);
  ctx.fillStyle = '#d9c8b3'; ctx.fillRect(4, -4, 5, 8);
  ctx.fillStyle = '#d8ad8f'; ctx.beginPath(); ctx.ellipse(15, 0, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#59443b'; ctx.beginPath(); ctx.ellipse(20, 0, 2.8, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#53433d'; ctx.lineWidth = 0.8; ctx.beginPath();
  ctx.moveTo(13, -2); ctx.lineTo(15, -2); ctx.moveTo(13, 2); ctx.lineTo(15, 2); ctx.stroke();
  ctx.fillStyle = '#d0a589'; ctx.beginPath(); ctx.arc(-10, -8, 2, 0, Math.PI * 2);
  ctx.arc(-10, 8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}
