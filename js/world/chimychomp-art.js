import * as THREE from 'three';
import { CHIMYCHOMPS } from './chimychomps.js';
import { CHOMPY_SCALE } from './chimy-chase.js';
import { createDeathAngelArt, DEATH_ANGEL_HEIGHT } from './death-angel.js';
export { drawDeathAngel as drawAngelStatue } from './death-angel.js';

const SPECTRAL_COLORS = Object.freeze({
  '#514b3c': '#258da6', '#39382e': '#14536f', '#9b9074': '#70d4e4', '#c2b59a': '#a5edf0',
  '#282521': '#103a5c', '#cc5260': '#4bc5e2', '#b0a387': '#94e9ef', '#aa9e83': '#82dfeb',
  '#b7aa8d': '#a9f2f1', '#887d67': '#54b9d1', '#746b55': '#3fa3bb', '#5d5546': '#2d8ca7',
  '#6f6552': '#4ca8bc', '#665d4d': '#369bb3', '#d2c9b4': '#c4f6f5', '#4b4037': '#21617f',
  '#a84945': '#42bad4', '#c83e3d': '#67dcf0', '#df5c43': '#a0f4f4', '#514536': '#286984',
  '#1e1c19': '#092c50', '#eee5d3': '#ecffff', '#e1d7bc': '#d4ffff', '#d75e6b': '#80e7ee',
  '#796d58': '#61c5d5', '#655c4a': '#3999b2', '#40342d': '#1a536e', '#bf3b35': '#38a8c8',
  '#e26a35': '#63d2e5', '#e5b459': '#a2f1f0', '#392f29': '#1a617c', '#211e1a': '#092c50'
});

export function isSpectralChimychomp(chomp) {
  return chomp.region === 'escape';
}

function chimyColor(color, spectral) {
  if (!spectral) return color;
  const result = SPECTRAL_COLORS[color];
  if (!result) throw new Error(`Missing spectral ChimyChompChomp color: ${color}`);
  return result;
}

export function createChimychompArt(scene) {
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const cone = new THREE.ConeGeometry(1, 1, 7);
  const tendrils = [-1, 1].map((side) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 4, 25, 16), new THREE.Vector3(side * 9, 24, 20),
    new THREE.Vector3(side * 15, 20, 22), new THREE.Vector3(side * 20, 21, 21),
    new THREE.Vector3(side * 23, 18, 19)
  ]), 16, 1.4, 6, false));
  const glowSize = 64;
  const glowPixels = new Uint8Array(glowSize * glowSize * 4);
  for (let y = 0; y < glowSize; y += 1) {
    for (let x = 0; x < glowSize; x += 1) {
      const distance = Math.hypot((x + 0.5) / glowSize * 2 - 1, (y + 0.5) / glowSize * 2 - 1);
      const offset = (y * glowSize + x) * 4;
      glowPixels[offset] = 65; glowPixels[offset + 1] = 205; glowPixels[offset + 2] = 255;
      glowPixels[offset + 3] = Math.round(95 * Math.max(0, 1 - distance) ** 2);
    }
  }
  const glowTexture = new THREE.DataTexture(glowPixels, glowSize, glowSize, THREE.RGBAFormat);
  glowTexture.needsUpdate = true;
  const glowMaterial = new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const deathAngel = createDeathAngelArt();
  const materials = new Map();
  function material(color, spectral = false) {
    const key = `${spectral ? 'spectral:' : ''}${color}`;
    if (!materials.has(key)) {
      materials.set(key, new THREE.MeshStandardMaterial(spectral
        ? { color: chimyColor(color, true), roughness: 0.65, emissive: '#1fa5c9', emissiveIntensity: 0.35, transparent: true, opacity: 0.9 }
        : { color, roughness: 0.86 }));
    }
    return materials.get(key);
  }
  function meshPart(parent, geometry, color, x, y, z, sx, sy, sz, rotation = 0, spectral = false) {
    const mesh = new THREE.Mesh(geometry, material(color, spectral));
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.z = rotation;
    parent.add(mesh);
    return mesh;
  }
  function creature(spectral) {
    function part(parent, geometry, color, x, y, z, sx, sy, sz, rotation = 0) {
      return meshPart(parent, geometry, color, x, y, z, sx, sy, sz, rotation, spectral);
    }
    const group = new THREE.Group();
    group.name = 'chimychomp';
    part(group, sphere, '#514b3c', 0, 16, -3, 16, 17, 13).name = 'body';
    part(group, sphere, '#39382e', 0, 14, 8, 11, 12, 5);
    part(group, sphere, '#9b9074', 0, 31, 3, 14, 13, 12).name = 'head';
    part(group, sphere, '#c2b59a', 0, 25, 13, 10, 6, 5);
    part(group, sphere, '#282521', 0, 19, 12, 7, 8, 4).name = 'mouth';
    part(group, sphere, '#cc5260', 0, 14, 16, 3, 4, 1.5);
    for (const [x, y, z, color] of [
      [-9, 38, 9, '#b0a387'], [-3, 41, 10, '#aa9e83'], [4, 41, 10, '#b7aa8d'],
      [10, 37, 8, '#887d67'], [-6, 10, 12, '#746b55'], [6, 10, 12, '#746b55']
    ]) {
      part(group, cone, color, x, y, z, 2, 5, 1.5, x * -0.035);
    }
    for (const [index, side] of [-1, 1].entries()) {
      part(group, sphere, '#5d5546', side * 10, 8, 2, 5, 8, 7, -side * 0.2);
      part(group, sphere, '#6f6552', side * 9, 3, 8, 6, 3, 6);
      part(group, sphere, '#665d4d', side * 14, 17, 3, 4, 9, 4, side * 0.3);
      for (const offset of [-2, 0, 2]) {
        part(group, cone, '#d2c9b4', side * 9 + offset, 2, 13, 0.8, 3, 0.8).rotation.x = Math.PI / 2;
      }
      const ear = part(group, sphere, '#4b4037', side * 10, 47, -1, 4.5, 13, 3.5, -side * 0.3);
      ear.name = `ear-${side}`;
      part(group, sphere, '#a84945', side * 10, 48, 2, 2.3, 9, 1, -side * 0.3);
      part(group, cone, '#c83e3d', side * 13, 59, -1, 3, 10, 2, -side * 0.55);
      part(group, cone, '#df5c43', side * 16, 57, -2, 2.5, 9, 2, -side * 0.9);
      part(group, sphere, '#514536', side * 7, 32, 13, 4.8, 4.5, 2);
      part(group, sphere, '#1e1c19', side * 7, 32, 14.5, 3, 3.2, 1.2).name = `eye-${side}`;
      part(group, sphere, '#eee5d3', side * 6.3, 33, 15.5, 0.8, 0.8, 0.5);
      part(group, cone, '#e1d7bc', side * 4, 22, 16, 1.2, 4, 1.2).rotation.z = Math.PI;
      const tendril = new THREE.Mesh(tendrils[index], material('#d75e6b', spectral));
      tendril.name = `tendril-${side}`;
      group.add(tendril);
      for (let i = 0; i < 3; i += 1) {
        part(group, cone, i % 2 ? '#796d58' : '#655c4a', side * (8 + i * 3), 24 - i * 5, 7, 2, 7, 2, side * 0.8);
      }
    }
    part(group, sphere, '#40342d', 0, 27, 18, 3.2, 2, 1.5);
    for (let i = 0; i < 5; i += 1) {
      const feather = part(group, cone, ['#bf3b35', '#e26a35', '#e5b459'][i % 3],
        (i - 2) * 4, 16 + (i % 2) * 3, -17, 3, 15, 2, (i - 2) * -0.35);
      feather.name = 'tail-feather';
      feather.rotation.x = -0.85;
    }
    if (spectral) {
      const glow = new THREE.Sprite(glowMaterial);
      glow.name = 'spectral-glow';
      glow.position.set(0, 30, -6);
      glow.scale.set(65, 75, 1);
      group.add(glow);
    }
    return group;
  }
  const creatures = CHIMYCHOMPS.map((item, index) => {
    const group = creature(isSpectralChimychomp(item));
    group.position.set(item.x, 0, item.y);
    group.rotation.y = index * 1.7;
    scene.add(group);
    return group;
  });
  const statues = [];
  const burst = new THREE.Group();
  for (let i = 0; i < 10; i += 1) {
    const spark = meshPart(burst, sphere, i % 2 ? '#ffd168' : '#ed6935', 0, 0, 0, 1, 1, 1);
    spark.userData.angle = i * Math.PI * 2 / 10;
  }
  burst.visible = false;
  scene.add(burst);

  return {
    update(encounters, explosion, time, positions = CHIMYCHOMPS) {
      creatures.forEach((group, index) => {
        group.visible = !encounters.defeated.includes(CHIMYCHOMPS[index].id);
        const chomp = positions[index];
        group.position.set(chomp.x, 0, chomp.y);
        group.rotation.y = chomp.facing ?? index * 1.7;
        group.scale.set(CHOMPY_SCALE, CHOMPY_SCALE * (1 + Math.sin(time / 650 + index) * 0.035), CHOMPY_SCALE);
      });
      while (statues.length < encounters.statues.length) {
        const group = deathAngel.createModel();
        statues.push(group);
        scene.add(group);
      }
      statues.forEach((group, index) => {
        const statue = encounters.statues[index];
        group.visible = Boolean(statue);
        if (statue) group.position.set(statue.x, 0, statue.y);
      });
      burst.visible = Boolean(explosion);
      if (explosion) {
        burst.position.set(explosion.x, 14, explosion.y);
        const progress = Math.min(1, (time - explosion.started) / 800);
        burst.children.forEach((spark, index) => {
          const angle = spark.userData.angle;
          const distance = 10 + progress * 55;
          spark.position.set(Math.cos(angle) * distance, Math.sin(progress * Math.PI) * (18 + index * 2), Math.sin(angle) * distance);
          spark.scale.setScalar(Math.max(0.1, 9 * (1 - progress)));
        });
      }
    },
    statueAt(point, camera, width, height) {
      return statues.findIndex((group) => {
        if (!group.visible) return false;
        const bottom = group.localToWorld(new THREE.Vector3(0, 0, 0)).project(camera);
        const top = group.localToWorld(new THREE.Vector3(0, DEATH_ANGEL_HEIGHT, 0)).project(camera);
        const x = (bottom.x + 1) * width / 2;
        const bottomY = (1 - bottom.y) * height / 2;
        const topY = (1 - top.y) * height / 2;
        const y = Math.max(Math.min(topY, bottomY), Math.min(Math.max(topY, bottomY), point.y));
        return bottom.z >= -1 && bottom.z <= 1 && Math.hypot(point.x - x, point.y - y) <= 22;
      });
    },
    dispose() {
      sphere.dispose(); cone.dispose(); tendrils.forEach((geometry) => geometry.dispose()); deathAngel.dispose();
      glowMaterial.dispose(); glowTexture.dispose();
      materials.forEach((item) => item.dispose());
    }
  };
}

export function drawChimychomp(ctx, chomp) {
  const spectral = isSpectralChimychomp(chomp);
  const color = (value) => chimyColor(value, spectral);
  ctx.save(); ctx.scale(CHOMPY_SCALE, CHOMPY_SCALE);
  if (spectral) {
    ctx.globalAlpha *= 0.9;
    ctx.shadowColor = '#65e6fa'; ctx.shadowBlur = 7;
  }
  ctx.strokeStyle = color('#392f29'); ctx.lineWidth = 2;
  for (const [index, featherColor] of ['#bf3b35', '#e26a35', '#e5b459', '#bf3b35', '#e26a35'].entries()) {
    ctx.fillStyle = color(featherColor); ctx.beginPath(); ctx.moveTo(8, -12);
    ctx.lineTo(22 + index * 2, -23 + index * 4); ctx.lineTo(13, -5); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = color('#514b3c'); ctx.beginPath(); ctx.ellipse(0, -16, 16, 17, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color('#39382e'); ctx.beginPath(); ctx.ellipse(0, -13, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = color('#4b4037'); ctx.beginPath(); ctx.ellipse(side * 10, -47, 4.5, 13, side * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color('#c83e3d'); ctx.beginPath(); ctx.moveTo(side * 10, -55); ctx.lineTo(side * 15, -64);
    ctx.lineTo(side * 15, -53); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color('#6f6552'); ctx.beginPath(); ctx.ellipse(side * 10, -4, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = color('#9b9074'); ctx.beginPath(); ctx.ellipse(0, -31, 14, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color('#282521'); ctx.beginPath(); ctx.ellipse(0, -20, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color('#cc5260'); ctx.beginPath(); ctx.ellipse(0, -15, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color('#c2b59a'); ctx.beginPath(); ctx.ellipse(0, -26, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    ctx.fillStyle = color('#211e1a'); ctx.beginPath(); ctx.ellipse(side * 7, -32, 3, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color('#eee5d3'); ctx.beginPath(); ctx.arc(side * 7 - 0.7, -33, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color('#d75e6b'); ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(side * 4, -25); ctx.bezierCurveTo(side * 11, -25, side * 16, -18, side * 20, -21);
    ctx.quadraticCurveTo(side * 23, -22, side * 23, -18); ctx.stroke();
  }
  ctx.fillStyle = color('#40342d'); ctx.beginPath(); ctx.ellipse(0, -27, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
