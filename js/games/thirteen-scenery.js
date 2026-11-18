import * as THREE from 'three';

export const THIRTEEN_TREES = Object.freeze([
  [15, 5, 0.9], [105, -25, 1.12], [190, 15, 0.86], [285, -30, 1.05],
  [365, 12, 0.91], [455, -35, 1.15], [540, 8, 0.89], [625, -28, 1.08],
  [710, 12, 0.94], [795, -30, 1.12], [875, 8, 0.92], [970, -20, 1.04],
  [5, 105, 0.9], [990, 115, 0.94], [10, 250, 0.83], [995, 265, 0.88],
  [65, 40, 0.9], [245, 40, 0.9], [410, 40, 0.9], [590, 40, 0.9], [760, 40, 0.9], [935, 40, 0.9]
].map(([x, y, size], i) => Object.freeze({ x, y, size, variant: i % 3, angle: i * 0.73 })));

export const THIRTEEN_RUINS = Object.freeze([
  [85, 180, 1], [190, 240, 0.8], [320, 82, 0.7], [410, 365, 0.9],
  [560, 330, 0.7], [645, 65, 0.8], [885, 190, 1], [930, 500, 0.8],
  [140, 470, 0.9], [250, 500, 0.7], [620, 480, 0.8]
].map(([x, y, size], i) => Object.freeze({ x, y, size, variant: i % 3 })));

export const THIRTEEN_RUNESTONES = Object.freeze([
  { x: 90, y: 180 }, { x: 410, y: 365 }, { x: 885, y: 190 }, { x: 140, y: 470 }
].map(Object.freeze));

const VAULT_SIDE = 72;

export function paintThirteenSign(ctx) {
  ctx.fillStyle = '#292a23'; ctx.fillRect(0, 0, 512, 200);
  ctx.fillStyle = '#6f674f'; ctx.fillRect(8, 8, 496, 184);
  ctx.fillStyle = '#353a2d'; ctx.fillRect(15, 15, 482, 170);
  ctx.strokeStyle = '#b6a47b'; ctx.lineWidth = 3; ctx.strokeRect(25, 25, 462, 150);
  ctx.textAlign = 'center'; ctx.fillStyle = '#e2d1a2';
  ctx.font = 'bold 76px Georgia, serif'; ctx.fillText('TH13TEEN', 256, 105);
  ctx.fillStyle = '#b6aa80'; ctx.font = '24px Georgia, serif'; ctx.fillText('DARK FOREST', 256, 147);
  for (const x of [37, 475]) for (const y of [37, 163]) {
    ctx.fillStyle = '#d5c294'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
}

export function addThirteenStation({ box, round, cylinder, sphere, scene }) {
  for (const x of [325, 925]) {
    box(x, 6, 610, 18, 12, 18, '#514a3c');
    box(x, 34, 610, 8, 56, 8, '#493e31');
    for (const y of [13, 55]) box(x, y, 610, 12, 4, 12, '#a08d67');
    box(x, 62, 610, 22, 4, 22, '#4b4032');
    round(sphere, x, 73, 610, 17, 18, 17, '#e8c67d', scene, true);
    box(x, 84, 610, 22, 4, 22, '#514331');
    round(cylinder, x, 88, 610, 8, 5, 8, '#ad986c');
  }
  for (let x = 70; x < 955; x += 35) {
    box(x, 0.8, 584, 20, 0.5, 3, '#d4b87b');
    for (const z of [600, 677]) {
      box(x, 0.8, z, 2, 0.5, 2, '#c6b89a');
    }
  }
  for (const x of [65, 190]) {
    box(x, 45, 561, 8, 90, 8, '#4b3b2d');
    box(x, 4, 561, 17, 8, 17, '#655c4b');
    box(x, 86, 561, 14, 6, 14, '#9d8e6e');
  }
  box(127.5, 72, 561, 132, 57, 8, '#453a2d');
  for (let x = 35; x <= 965; x += 62) {
    box(x, 14, 694, 5, 28, 5, '#4d4336');
    box(x, 29, 694, 8, 3, 8, '#b1a07c');
    if (x + 62 <= 965) box(x + 31, 24, 694, 62, 4, 4, '#685746');
  }
}

export function addThirteenVault({ box, round, cylinder, sphere, scene }, top, direction) {
  const vault = new THREE.Group();
  vault.position.set(top.x, 0, top.y);
  vault.rotation.y = Math.atan2(-direction.x, -direction.y);
  scene.add(vault);
  const height = top.height + 105;
  for (const side of [-1, 1]) {
    const x = side * VAULT_SIDE;
    box(x, height / 2, 0, 22, height, 24, '#514e42', vault);
    box(x, 7, 0, 34, 14, 36, '#706b59', vault);
    box(x, height - 12, 0, 30, 12, 30, '#847c64', vault);
    for (let y = 28; y < height - 20; y += 28) {
      box(x, y, 12.5, 21, 2, 1, '#373d34', vault);
      box(x + (y % 56 ? -5 : 5), y + 13, 12.5, 2, 24, 1, '#44483b', vault);
    }
    box(x + side * 6, height * 0.42, 12.8, 5, 30, 1, '#6d8055', vault);
    box(x, height + 9, 0, 25, 18, 27, '#625e4f', vault);
    box(x, height + 20, 0, 31, 5, 32, '#88816b', vault);
    box(side * 50, top.height + 27, 4, 6, 36, 6, '#514432', vault);
    round(sphere, side * 50, top.height + 16, 5, 11, 13, 11, '#eac37a', vault, true);
  }
  box(0, height - 4, 0, VAULT_SIDE * 2 + 6, 18, 26, '#696455', vault);
  box(0, height + 7, 0, VAULT_SIDE * 2 - 16, 5, 30, '#8a8269', vault);
  for (const x of [-45, -15, 15, 45]) box(x, height + 14, 0, 20, 10, 25, '#696455', vault);
  box(0, height - 5, 13.5, 27, 16, 2, '#45483a', vault);
  for (const x of [-6, 1]) box(x, height - 5, 15, 2, 11, 1, '#c6b995', vault);
  for (const y of [-10, -5, 0]) box(5, height + y, 15, 8, 2, 1, '#c6b995', vault);
  for (const side of [-1, 1]) {
    round(cylinder, side * (VAULT_SIDE - 7), 4, 0, 42, 8, 42, '#5c5b4b', vault);
  }
  return vault;
}

export function addThirteenRuins({ box, round, sphere, scene }) {
  for (const { x, y, size, variant } of THIRTEEN_RUINS) {
    const stone = ['#686a59', '#797867', '#5b6254'][variant];
    round(sphere, x, 2, y, 52 * size, 4, 31 * size, '#394c36', scene);
    box(x, 7 * size, y, 25 * size, 14 * size, 18 * size, stone);
    box(x + 13 * size, 4 * size, y + 8 * size, 14 * size, 8 * size, 14 * size, '#555b4d');
    box(x - 3 * size, 14 * size, y, 13 * size, 2 * size, 14 * size, '#788765');
    for (const side of [-1, 1]) {
      box(x + side * 21 * size, 5 * size, y - 10 * size, 3 * size, 10 * size, 3 * size, '#718761');
    }
    for (const [dx, dz, shade] of [[-25, 10, '#456345'], [21, 17, '#536f4c'], [17, -19, '#3a593e']]) {
      round(sphere, x + dx * size, 5 * size, y + dz * size, 21 * size, 10 * size, 15 * size, shade);
      round(sphere, x + dx * size - 2, 10 * size, y + dz * size - 2, 11 * size, 5 * size, 9 * size, '#6d825c');
    }
  }
  for (const { x, y } of THIRTEEN_RUNESTONES) {
    box(x, 19, y, 18, 38, 12, '#5e6052');
    box(x, 37, y, 16, 4, 12, '#7b7c69');
    box(x, 23, y + 6.5, 2, 16, 1, '#c0b791');
    box(x, 25, y + 7, 10, 2, 1, '#c0b791');
    box(x, 18, y + 7, 8, 2, 1, '#c0b791');
  }
}

export function drawThirteenScenery(ctx, sx, sy, scale, sign) {
  for (const { x, y, size, variant } of THIRTEEN_RUINS) {
    ctx.fillStyle = '#344a35'; ctx.beginPath(); ctx.ellipse(sx(x), sy(y), 26 * size * scale, 16 * size * scale, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ['#686a59', '#797867', '#5b6254'][variant];
    ctx.fillRect(sx(x - 12 * size), sy(y - 9 * size), 25 * size * scale, 18 * size * scale);
    ctx.fillStyle = '#788765'; ctx.fillRect(sx(x - 9 * size), sy(y - 8 * size), 13 * size * scale, 3 * size * scale);
    ctx.fillStyle = '#555b4d'; ctx.fillRect(sx(x + 7 * size), sy(y + 3 * size), 14 * size * scale, 8 * size * scale);
    for (const [dx, dy, color] of [[-25, 10, '#456345'], [21, 17, '#536f4c'], [17, -19, '#3a593e']]) {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx(x + dx * size), sy(y + dy * size), 9 * size * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6d825c'; ctx.beginPath(); ctx.arc(sx(x + dx * size - 2), sy(y + dy * size - 2), 4 * size * scale, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const { x, y } of THIRTEEN_RUNESTONES) {
    ctx.fillStyle = '#5e6052'; ctx.fillRect(sx(x - 9), sy(y - 6), 18 * scale, 12 * scale);
    ctx.fillStyle = '#c0b791'; ctx.fillRect(sx(x - 4), sy(y - 2), 8 * scale, 2 * scale);
  }
  for (const { x, y, size, variant } of THIRTEEN_TREES) {
    const palette = ['#223b2c', ['#35553d', '#406346', '#31533f'][variant], '#577756'];
    for (let layer = 0; layer < 3; layer += 1) {
      const radius = (36 - layer * 10) * size * scale;
      ctx.fillStyle = palette[layer]; ctx.beginPath();
      for (let i = 0; i <= 32; i += 1) {
        const angle = i * Math.PI / 16 + layer * 0.16 + variant * 0.12;
        const length = radius * (i % 2 ? 0.64 : 1);
        const px = sx(x) + Math.cos(angle) * length, py = sy(y) + Math.sin(angle) * length;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.fill();
    }
    ctx.strokeStyle = '#78926a'; ctx.lineWidth = Math.max(0.5, scale);
    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4 + variant * 0.12;
      ctx.moveTo(sx(x) + Math.cos(angle) * 5 * size * scale, sy(y) + Math.sin(angle) * 5 * size * scale);
      ctx.lineTo(sx(x) + Math.cos(angle) * 19 * size * scale, sy(y) + Math.sin(angle) * 19 * size * scale);
    }
    ctx.stroke();
  }
  ctx.drawImage(sign, sx(62), sy(548), 132 * scale, 34 * scale);
}

export function drawThirteenVault(ctx, sx, sy, scale, top, direction) {
  const side = { x: -direction.y, y: direction.x };
  for (const offset of [-VAULT_SIDE, VAULT_SIDE]) {
    const x = sx(top.x + side.x * offset), y = sy(top.y + side.y * offset);
    ctx.fillStyle = '#4c4e41'; ctx.fillRect(x - 17 * scale, y - 17 * scale, 34 * scale, 34 * scale);
    ctx.fillStyle = '#777360'; ctx.fillRect(x - 11 * scale, y - 11 * scale, 22 * scale, 22 * scale);
    ctx.fillStyle = '#9b9679'; ctx.fillRect(x - 8 * scale, y - 8 * scale, 16 * scale, 3 * scale);
  }
}
