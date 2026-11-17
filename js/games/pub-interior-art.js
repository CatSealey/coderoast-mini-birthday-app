import { PUB_STOOLS } from './adventure-logic.js';

export const PUB_RUG = Object.freeze({ x: 530, y: 520, width: 340, depth: 195 });
export const PUB_STOOL_SEAT_COLOR = '#722c3a';
export const PUB_SHORT_CUE_SCALE = 0.85;
export const PUB_RACK_CUES = Object.freeze([
  Object.freeze({ offset: -25, taken: false, short: false }),
  Object.freeze({ offset: -5, taken: true, short: true }),
  Object.freeze({ offset: 15, taken: true, short: false }),
  Object.freeze({ offset: 30, taken: false, short: false })
]);
export const PUB_CAMERA_OFFSET = Object.freeze({ x: 0, y: 950, z: 1200 });
export const PUB_POOL_LIGHTS = Object.freeze([440, 500, 560].map((x) => Object.freeze({ x, y: 154, z: 197 })));
export const PUB_FURNITURE_PALETTE = Object.freeze({
  tools: Object.freeze({ body: '#352017', frame: '#c69a68', door: '#754b31', inset: '#b88b5d', detail: '#4c3021' }),
  cabinet: Object.freeze({ body: '#3b261b', frame: '#d0a575', door: '#805638', inset: '#c0976b', detail: '#523524' }),
  box: Object.freeze({ body: '#66473b', frame: '#e6c594', door: '#a66f4c', inset: '#d1a878', detail: '#744b39' })
});

export function pubCatHoldsCue(state) {
  return Boolean(state.catCueGiven && !state.pubEnding && !state.pubTogether);
}

export function pubCuesTaken(state) {
  return Boolean(state.cues || state.cuesPlaced || state.catCueGiven);
}

export function pubCameraFraming(width, height) {
  const { x, y, z } = PUB_CAMERA_OFFSET;
  const horizontal = Math.hypot(x, z), distance = Math.hypot(horizontal, y);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const bounds = [
    { xs: [0, 1000], zs: [0, 700], ys: [0] },
    { xs: [-10, 1010], zs: [-10, 10], ys: [0, 165] },
    { xs: [435, 565], zs: [183, 211], ys: [150, 205] }
  ];
  for (const { xs, zs, ys } of bounds) for (const px of xs) for (const pz of zs) for (const py of ys) {
    const dx = px - 500, dz = pz - 350;
    const projectedX = (z * dx - x * dz) / horizontal;
    const projectedY = (-x * y * dx - z * y * dz) / (horizontal * distance) + horizontal * py / distance;
    minX = Math.min(minX, projectedX); maxX = Math.max(maxX, projectedX);
    minY = Math.min(minY, projectedY); maxY = Math.max(maxY, projectedY);
  }
  const top = Math.min(16, height * 0.04), bottom = Math.min(76, height * 0.12);
  const viewHeight = Math.max((maxX - minX) * height / width, (maxY - minY) * height / (height - top - bottom)) * 1.04;
  return {
    height: viewHeight,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2 + (top - bottom) * viewHeight / (2 * height)
  };
}

const noise = (a, b) => {
  const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

function woodGrainSegments(width, depth, count) {
  return Array.from({ length: count }, (_, i) => ({
    x: (noise(i, 3) - 0.5) * width * 0.75,
    y: (noise(i, 7) - 0.5) * depth * 0.8,
    length: width * (0.05 + noise(i, 11) * 0.1),
    color: i % 2 ? '#be946a' : '#805b40'
  }));
}

function drawWoodGrain(ctx, x, y, width, depth, count) {
  for (const grain of woodGrainSegments(width, depth, count)) {
    ctx.fillStyle = grain.color;
    ctx.fillRect(x + grain.x, y + grain.y, grain.length, 0.7);
  }
}

export function paintPubFloor(ctx) {
  ctx.fillStyle = '#514238'; ctx.fillRect(0, 0, 1000, 700);
  for (let row = 0; row < 25; row += 1) {
    const y = row * 28;
    for (let col = -1; col < 9; col += 1) {
      const x = col * 140 + (row % 2) * 70;
      const tone = ['#715745', '#77604b', '#806650', '#6b5343', '#866c52'][Math.floor(noise(row, col + 5) * 5)];
      ctx.fillStyle = tone; ctx.fillRect(x + 1, y + 1, 138, 26);
      ctx.fillStyle = 'rgba(230,185,128,.10)';
      for (let i = 0; i < 4; i += 1) {
        const gx = x + 8 + noise(row * 13 + col, i) * 115;
        const gy = y + 4 + noise(col * 7 + row, i + 8) * 19;
        ctx.fillRect(gx, gy, 8 + noise(row + i, col) * 25, 0.8);
      }
      ctx.fillStyle = '#513a2b';
      for (const dx of [5, 133]) for (const dy of [5, 23]) ctx.fillRect(x + dx, y + dy, 1.5, 1.5);
    }
  }
}

export function paintPubRug(ctx) {
  ctx.fillStyle = '#263d4c'; ctx.fillRect(0, 0, 340, 195);
  ctx.fillStyle = '#52778a'; ctx.fillRect(6, 6, 328, 183);
  ctx.fillStyle = '#34586e'; ctx.fillRect(13, 13, 314, 169);
  ctx.strokeStyle = '#c49b68'; ctx.lineWidth = 2;
  ctx.strokeRect(17, 17, 306, 161);
  ctx.strokeStyle = '#947252'; ctx.lineWidth = 1;
  ctx.strokeRect(23, 23, 294, 149);
  for (let x = 33; x < 310; x += 16) for (const y of [11, 184]) {
    ctx.fillStyle = '#d1ac76'; ctx.fillRect(x, y, 3, 2);
  }
  for (let y = 33; y < 165; y += 16) for (const x of [11, 327]) {
    ctx.fillStyle = '#d1ac76'; ctx.fillRect(x, y, 2, 3);
  }
  for (const x of [62, 170, 278]) {
    ctx.strokeStyle = '#a87e5c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x, 66); ctx.lineTo(x + 27, 97.5);
    ctx.lineTo(x, 129); ctx.lineTo(x - 27, 97.5); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, 77); ctx.lineTo(x + 17, 97.5);
    ctx.lineTo(x, 118); ctx.lineTo(x - 17, 97.5); ctx.closePath(); ctx.stroke();
  }
  for (let i = 0; i < 550; i += 1) {
    ctx.fillStyle = i % 2 ? 'rgba(239,211,170,.06)' : 'rgba(16,28,40,.08)';
    ctx.fillRect(26 + noise(i, 2) * 288, 26 + noise(i, 3) * 143, 2, 1);
  }
}

export function addPubWallDetails({ box, round, cylinder, sphere, parent }) {
  for (let x = 35; x < 980; x += 55) {
    box(x, 26, 17, 44, 37, 2, '#694a36', parent);
    box(x, 26, 18.5, 37, 29, 1, '#805a40', parent);
    box(x, 26, 19.2, 32, 24, 0.5, '#70503a', parent);
  }
  box(500, 54, 18, 1000, 5, 8, '#b49161', parent);
  box(500, 62, 16, 1000, 8, 8, '#574032', parent);
  box(500, 155, 16, 1000, 8, 13, '#654b38', parent);
  box(500, 162, 16, 1000, 3, 14, '#c2a171', parent);
  for (const x of [405, 700, 880]) {
    for (const dx of [-47, 47]) box(x + dx, 105, 26, 5, 74, 4, '#a27e55', parent);
    box(x, 69, 26, 101, 5, 6, '#a27e55', parent);
    box(x, 141, 26, 101, 5, 6, '#b79565', parent);
    for (const [dx, dy] of [[-30, 18], [-10, 25], [25, 12], [35, -16]]) {
      round(sphere, x + dx, 105 + dy, 25, 2.5, 2.5, 1, '#e6d5aa', parent);
    }
  }
  for (const x of [320, 610, 960]) {
    box(x, 91, 24, 6, 150, 6, '#77543b', parent);
    for (const y of [30, 55, 145]) box(x, y, 28, 16, 5, 5, '#c09b65', parent);
  }
  for (const x of [360, 660, 920]) {
    round(cylinder, x, 125, 100, 40, 4, 40, '#80623d', parent);
    round(cylinder, x, 130, 100, 25, 4, 25, '#b99a63', parent);
  }
  for (const { x } of PUB_POOL_LIGHTS) {
    box(x, 183, 197, 3, 42, 3, '#735a3f', parent);
    round(cylinder, x, 161, 197, 28, 5, 28, '#b39562', parent);
    round(cylinder, x, 158, 197, 22, 5, 22, '#385443', parent);
    round(cylinder, x, 164, 197, 14, 1, 14, '#ffe4a0', parent, true);
    round(sphere, x, 154, 197, 10, 7, 10, '#ffe4a0', parent, true);
  }
}

export function addPubFurnitureDetails(object, { box, round, cylinder, sphere, parent }) {
  const x = object.x, z = object.y;
  if (object.kind === 'bar') {
    for (const dx of [-60, 0, 60]) {
      box(x + dx, 39, z + 31, 42, 48, 1, '#714b35', parent);
      for (const edge of [-18, 18]) box(x + dx + edge, 39, z + 32, 2, 43, 1, '#c19b6b', parent);
      for (const y of [18, 60]) box(x + dx, y, z + 32, 38, 2, 1, '#c19b6b', parent);
      box(x + dx, 39, z + 31.7, 29, 32, 0.4, '#a47652', parent);
      for (const edge of [-12, 12]) box(x + dx + edge, 39, z + 32, 1, 28, 0.4, '#d4ad79', parent);
      for (const y of [26, 52]) box(x + dx, y, z + 32, 25, 1, 0.4, '#d4ad79', parent);
    }
    box(x, 89, z, 178, 2, 54, '#d3b184', parent);
    for (const grain of woodGrainSegments(160, 42, 28)) {
      box(x + grain.x, 90.1, z + grain.y, grain.length, 0.2, 0.5, grain.color, parent);
    }
    box(x, 9, z + 31, 166, 3, 3, '#b99a68', parent);
    box(x, 14, z + 30.5, 164, 3, 3, '#62422f', parent);
    for (const dx of [-70, -35, 35, 70]) {
      box(x + dx, 90.2, z, 0.8, 0.4, 48, '#9a714d', parent);
      box(x + dx, 7, z + 31, 3, 9, 2, '#d4ae73', parent);
    }
    box(x, 90.2, z - 10, 52, 0.4, 14, '#513b31', parent);
    for (const dx of [-21, -14, -7, 0, 7, 14, 21]) box(x + dx, 90.5, z - 10, 1, 0.3, 11, '#a1815d', parent);
    for (const dx of [-65, -44, -23, 15, 36, 57]) {
      round(cylinder, x + dx, 91, z + 17, 12, 1, 12, '#7b5440', parent);
    }
    for (const dx of [-13, 0, 13]) {
      round(cylinder, x + dx, 99, z - 11, 4, 20, 4, '#caa66d', parent);
      box(x + dx, 107, z - 6, 3, 3, 12, '#e0c58c', parent);
      round(sphere, x + dx, 111, z - 11, 5, 5, 5, '#533d30', parent);
      round(cylinder, x + dx, 92, z - 3, 9, 2, 9, '#957449', parent);
    }
    for (const dx of [-60, 0, 60]) {
      for (const dz of [-16, 16]) box(x + dx, 90.5, z + dz, 45, 0.6, 0.8, '#e8c99a', parent);
      round(sphere, x + dx, 39, z + 31.4, 7, 7, 1, '#d6b77c', parent);
      round(sphere, x + dx, 39, z + 32, 3, 3, 1, '#765239', parent);
    }
  } else if (object.kind === 'pool') {
    box(x - 55, 72.1, z, 1.0, 0.1, 100, '#eeeae0', parent);
    for (const dz of [-61, 61]) {
      box(x, 82.5, z + dz, 204, 1, 2, '#e1c184', parent);
      for (const dx of [-72, -36, 36, 72]) {
        const diamond = box(x + dx, 83, z + dz, 2.5, 1, 2.5, '#f2dfaf', parent);
        diamond.rotation.y = Math.PI / 4;
      }
    }
    for (const dx of [-108, 108]) {
      box(x + dx, 82.5, z, 2, 1, 108, '#e1c184', parent);
      for (const dz of [-25, 0, 25]) {
        const diamond = box(x + dx, 83, z + dz, 2.5, 1, 2.5, '#f2dfaf', parent);
        diamond.rotation.y = Math.PI / 4;
      }
    }
    for (const dx of [-94, 0, 94]) for (const dz of [-47, 47]) {
      round(cylinder, x + dx, 75.5, z + dz, 15, 1.2, 15, '#20221d', parent);
      round(cylinder, x + dx, 76.2, z + dz, 10, 1, 10, '#10140f', parent);
    }
    for (const dx of [-80, 80]) for (const dz of [-40, 40]) {
      box(x + dx, 3, z + dz, 20, 6, 20, '#62432e', parent);
      box(x + dx, 7, z + dz, 18, 2, 18, '#b48b58', parent);
      box(x + dx, 17, z + dz, 17, 18, 17, '#745034', parent);
      box(x + dx, 17, z + dz + 8.6, 11, 14, 0.2, '#a2794f', parent);
      box(x + dx, 27, z + dz, 20, 3, 20, '#b48b58', parent);
    }
    for (const dz of [-40, 40]) box(x, 12, z + dz, 142, 5, 6, '#593e2c', parent);
    for (const dx of [-80, 80]) box(x + dx, 12, z, 6, 5, 62, '#593e2c', parent);
    for (const side of [-1, 1]) {
      for (const dx of [-53, 53]) {
        box(x + dx, 44, z + side * 62.6, 88, 34, 1, '#4e3428', parent);
        box(x + dx, 44, z + side * 63.15, 82, 28, 0.6, '#926745', parent);
        box(x + dx, 44, z + side * 63.55, 73, 20, 0.2, '#694831', parent);
        box(x + dx, 44, z + side * 63.7, 67, 14, 0.1, '#80583b', parent);
        for (const edge of [-1, 1]) {
          box(x + dx + edge * 38, 44, z + side * 63.85, 1, 25, 0.3, '#d2ad75', parent);
          box(x + dx, 44 + edge * 12, z + side * 63.85, 77, 1, 0.3, '#d2ad75', parent);
          for (const dy of [-9, 9]) {
            round(sphere, x + dx + edge * 33, 44 + dy, z + side * 64, 2.5, 2.5, 0.5, '#d8b980', parent);
          }
        }
        for (const grain of woodGrainSegments(58, 11, 12)) {
          box(x + dx + grain.x, 44 + grain.y, z + side * 63.85, grain.length, 0.6, 0.1, grain.color, parent);
        }
      }
      box(x, 44, z + side * 63.75, 12, 24, 0.5, '#694831', parent);
      const badge = box(x, 44, z + side * 64.1, 6, 6, 0.2, '#d3b17a', parent);
      badge.rotation.z = Math.PI / 4;
    }
    for (const dx of [-75, -45, -15, 15, 45, 75]) {
      round(sphere, x + dx, 48, z + 63, 3, 3, 1, '#c9a56d', parent);
    }
    for (const dz of [-54, 54]) {
      box(x, 74, z + dz, 172, 4, 3, '#27583c', parent);
      box(x, 76.2, z + dz, 172, 0.5, 1, '#80a974', parent);
    }
    for (const dx of [-100, 100]) {
      box(x + dx, 74, z, 3, 4, 72, '#27583c', parent);
      box(x + dx, 76.2, z, 1, 0.5, 72, '#80a974', parent);
    }
    for (const dx of [-103, 103]) for (const dz of [-59, 59]) {
      round(cylinder, x + dx, 83, z + dz, 9, 1.5, 9, '#d1ae77', parent);
      round(cylinder, x + dx, 84, z + dz, 4, 1, 4, '#70503a', parent);
    }
    box(x - 70, 84, z + 60, 8, 3, 7, '#cbb89c', parent);
    box(x - 70, 86, z + 60, 6, 2, 5, '#597f9a', parent);
  } else if (object.kind === 'rack') {
    box(x, 49, z + 6, 70, 72, 2, '#8e6544', parent);
    box(x, 49, z + 7.2, 64, 66, 0.4, '#ac8157', parent);
    for (const dx of [-36, 36]) {
      box(x + dx, 49, z + 7, 5, 74, 4, '#c39a66', parent);
      box(x + dx, 49, z + 9.2, 1, 66, 0.4, '#674833', parent);
    }
    box(x, 89, z, 80, 5, 19, '#a98152', parent);
    box(x, 91.7, z, 72, 0.4, 16, '#d0aa76', parent);
    box(x, 76, z + 6.5, 68, 6, 4, '#674630', parent);
    box(x, 78.9, z + 6.5, 64, 0.5, 3, '#c8a06a', parent);
    box(x, 14, z + 9, 76, 8, 3, '#9b7549', parent);
    box(x, 10.5, z + 10.5, 72, 1, 1, '#d1ac76', parent);
    for (const dx of [-25, -5, 15, 30]) {
      box(x + dx, 24, z + 10, 4, 16, 2, '#755038', parent);
      round(sphere, x + dx, 76, z + 9, 7, 7, 1, '#3f2d23', parent);
      round(sphere, x + dx, 17, z + 10.5, 5, 5, 1, '#d9bb7b', parent);
    }
    for (const dx of [-35, 35]) for (const y of [10, 80]) {
      round(sphere, x + dx, y, z + 10, 3, 3, 2, '#d9bb7b', parent);
    }
  } else if (object.kind === 'table') {
    box(x, 65, z, 93, 2, 63, '#c39a68', parent);
    box(x, 66.5, z, 85, 1, 55, '#9f754d', parent);
    for (const grain of woodGrainSegments(75, 43, 22)) {
      box(x + grain.x, 67.1, z + grain.y, grain.length, 0.2, 0.5, grain.color, parent);
    }
    for (const dx of [-39, 39]) for (const dz of [-24, 24]) {
      round(sphere, x + dx, 67, z + dz, 3, 1, 3, '#e3c88e', parent);
    }
  } else if (object.kind === 'note') {
    box(x, 5, z, 50, 7, 27, '#5b3e2c', parent);
    box(x, 9, z, 45, 2, 23, '#bb9365', parent);
    box(x, 40, z, 17, 62, 15, '#785238', parent);
    for (const dx of [-6, 6]) box(x + dx, 40, z + 7.7, 1, 50, 0.5, '#c49b6a', parent);
    const angle = 0.32;
    const sloped = (dx, lift, dz, w, h, d, color) => {
      const piece = box(x + dx, 77 + lift * Math.cos(angle) - dz * Math.sin(angle),
        z + lift * Math.sin(angle) + dz * Math.cos(angle), w, h, d, color, parent);
      piece.rotation.x = angle;
    };
    sloped(0, 2.5, 0, 47, 1, 23, '#aa8157');
    sloped(0, 3.2, 0, 41, 0.8, 20, '#efe2c4');
    sloped(0, 3.8, 0, 1, 0.6, 20, '#aa9270');
    for (const dx of [-10, 10]) for (const dz of [-6, -2, 2, 6]) {
      sloped(dx, 4, dz, 15, 0.4, 0.7, '#a18c6d');
    }
    sloped(21, 4.2, 1, 1.5, 1, 16, '#584536');
    sloped(0, 4.5, 12, 49, 4, 3, '#65452f');
  } else if (object.kind === 'tools' || object.kind === 'cabinet' || object.kind === 'box') {
    const width = object.footprint.width, depth = object.footprint.depth;
    const height = object.kind === 'tools' ? 90 : 56;
    const palette = PUB_FURNITURE_PALETTE[object.kind], front = z + depth / 2;
    box(x, height / 2, front - 1.6, width - 6, height - 8, 1, palette.frame, parent);
    for (const side of [-1, 1]) {
      const dx = side * (width - 10) / 4;
      box(x + dx, height / 2, front - 0.85, (width - 14) / 2, height - 13, 0.5, palette.door, parent);
      box(x + dx, height / 2, front - 0.5, (width - 22) / 2, height - 23, 0.3, palette.inset, parent);
      for (const grain of woodGrainSegments(height - 30, (width - 26) / 2, 8)) {
        box(x + dx + grain.y, height / 2 + grain.x, front - 0.3, 0.5, grain.length, 0.1, palette.door, parent);
      }
      for (const edge of [-1, 1]) {
        box(x + dx + edge * (width - 26) / 4, height / 2, front - 0.3, 0.7, height - 28, 0.2, palette.door, parent);
      }
      for (const dy of [height * 0.25, height * 0.75]) {
        box(x + dx + side * (width - 16) / 4, dy, front - 0.25, 2, 5, 0.5, palette.frame, parent);
      }
      for (const dy of [height / 2 - 9, height / 2 + 9]) {
        box(x + dx, dy, front - 0.2, (width - 28) / 2, 1, 0.3, palette.detail, parent);
      }
      round(sphere, x + dx - side * 5, height / 2, front - 0.5, 6, 6, 0.4, palette.detail, parent);
      round(sphere, x + dx - side * 5, height / 2, front - 0.2, 3, 3, 0.3, palette.frame, parent);
    }
    box(x, height + 0.3, z, width - 4, 0.6, depth - 3, palette.frame, parent);
    box(x, height + 0.7, z, width - 10, 0.2, depth - 9, palette.door, parent);
    for (const dx of [-1, 1]) {
      box(x + dx * (width - 18) / 4, height + 0.85, z, 0.7, 0.1, depth - 13, palette.inset, parent);
    }
    for (const [i, grain] of woodGrainSegments(width - 18, depth - 15, 20).entries()) {
      box(x + grain.x, height + 1.05, z + grain.y, grain.length, 0.2, 0.5,
        i % 2 ? palette.inset : palette.detail, parent);
    }
    box(x, height - 4, front - 1, width - 6, 1, 1, palette.detail, parent);
    box(x, 4, front - 1, width - 6, 3, 1, palette.detail, parent);
    for (const side of [-1, 1]) {
      box(x + side * (width / 2 - 2), height / 2, z, 1, height - 16, depth - 12, palette.door, parent);
      box(x + side * (width / 2 - 1.4), height / 2, z, 0.2, height - 24, depth - 20, palette.inset, parent);
    }
  }
}

export function addPubCue({ box, round, cylinder, parent }, x, y, z, horizontal = false) {
  const axis = (offset, length, thickness, color) => {
    const stretch = horizontal ? 145 / 90 : 1;
    const cue = round(cylinder, x + (horizontal ? offset * stretch : 0), y + (horizontal ? 0 : offset), z,
      thickness, length * stretch, thickness, color, parent);
    if (horizontal) cue.rotation.z = Math.PI / 2;
  };
  axis(0, 90, 3, '#dfc18d');
  axis(-32, 26, 4, '#76503a');
  for (const offset of [-42, -22]) axis(offset, 1.5, 4.2, '#d7b97e');
  axis(43, 4, 3.2, '#f0e2c6');
  axis(45, 1, 3.2, '#597184');
  if (!horizontal) box(x, y - 32, z + 1.8, 1, 12, 0.5, '#b48b5e', parent);
}

export function positionPubCatCue(cue) {
  cue.position.set(0, -30, 4);
  cue.rotation.z = 0.16;
}

export function drawPubHeldCue(ctx, x, y) {
  ctx.fillStyle = '#dfc18d'; ctx.fillRect(x - 10, y - 15, 2, 40);
  ctx.fillStyle = '#76503a'; ctx.fillRect(x - 10.5, y + 12, 3, 10);
  ctx.fillStyle = '#e8d7b8'; ctx.fillRect(x - 10, y - 15, 2, 2);
  ctx.fillStyle = '#597184'; ctx.fillRect(x - 10, y - 16, 2, 1);
}

export function addPubStoolDetails({ box, round, cylinder, sphere, parent }) {
  for (const stool of PUB_STOOLS) {
    const { x, y: z, radius } = stool;
    const seat = radius === 17.5 ? 46 : 40;
    round(cylinder, x, seat + 1, z, radius * 2 - 4, 2, radius * 2 - 4, PUB_STOOL_SEAT_COLOR, parent);
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      round(sphere, x + Math.cos(angle) * (radius - 3), seat + 2, z + Math.sin(angle) * (radius - 3),
        2, 1, 2, '#d9b67f', parent);
    }
    if (radius !== 17.5) {
      for (const dz of [-7, 7]) box(x, 14, z + dz, 16, 3, 2, '#b59364', parent);
      for (const dx of [-7, 7]) box(x + dx, 14, z, 2, 3, 16, '#b59364', parent);
    }
  }
}

export function drawPubInterior(ctx, floor, rug) {
  ctx.drawImage(floor, 0, 0, 1000, 700);
  ctx.fillStyle = '#3d3029'; ctx.fillRect(0, 0, 1000, 18);
  ctx.fillStyle = '#a98a66'; ctx.fillRect(0, 18, 1000, 5);
  ctx.drawImage(rug, PUB_RUG.x - PUB_RUG.width / 2, PUB_RUG.y - PUB_RUG.depth / 2, PUB_RUG.width, PUB_RUG.depth);
  for (const { x, y, radius } of PUB_STOOLS) {
    ctx.fillStyle = '#3d2c25'; ctx.beginPath(); ctx.arc(x + 2, y + 3, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b28b5b'; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PUB_STOOL_SEAT_COLOR; ctx.beginPath(); ctx.arc(x, y, radius - 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#d4ae7a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, radius - 5, 0, Math.PI * 2); ctx.stroke();
  }
}

export function drawPubObject(ctx, object, state, ballAnimation) {
  const { x, y, kind, footprint } = object;
  const w = footprint.width, d = footprint.depth;
  ctx.fillStyle = 'rgba(25,18,14,.32)'; ctx.fillRect(x - w / 2 + 4, y - d / 2 + 5, w, d);
  if (kind === 'pool') {
    ctx.fillStyle = '#4d3025'; ctx.fillRect(x - w / 2, y - d / 2, w, d);
    ctx.fillStyle = '#b28a58'; ctx.fillRect(x - w / 2 + 3, y - d / 2 + 3, w - 6, d - 6);
    ctx.fillStyle = '#365940'; ctx.fillRect(x - 102, y - 54, 204, 108);
    ctx.fillStyle = '#397852'; ctx.fillRect(x - 98, y - 50, 196, 100);
    ctx.fillStyle = '#eeeae0'; ctx.fillRect(x - 55.75, y - 50, 1.5, 100);
    for (const light of PUB_POOL_LIGHTS) {
      const glow = ctx.createRadialGradient(light.x, light.z + 24, 0, light.x, light.z + 24, 35);
      glow.addColorStop(0, 'rgba(255,221,149,.16)');
      glow.addColorStop(1, 'rgba(255,221,149,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(light.x, light.z + 24, 35, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#6d9a6c'; ctx.lineWidth = 1; ctx.strokeRect(x - 96, y - 48, 192, 96);
    for (const dx of [-94, 0, 94]) for (const dz of [-47, 47]) {
      ctx.fillStyle = '#17201a'; ctx.beginPath(); ctx.arc(x + dx, y + dz, 6, 0, Math.PI * 2); ctx.fill();
    }
    for (const dx of [-72, -36, 36, 72]) for (const dz of [-60, 60]) {
      ctx.fillStyle = '#f1dca5'; ctx.fillRect(x + dx - 2, y + dz - 2, 4, 4);
    }
    if (state.ballsPlaced) {
      const t = state.ballLost ? ballAnimation : 0;
      for (let row = 0; row < 4; row += 1) for (let col = 0; col <= row; col += 1) {
        const bx = x + 24 + row * 9 + (row - 1.5) * 8 * t;
        const by = y + (col - row / 2) * (10 + 9 * t);
        ctx.fillStyle = ['#dcaa49', '#c5574a', '#527db1', '#ead6a4'][(row + col) % 4];
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(bx - 1.5, by - 1.5, 1, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#f2ead8'; ctx.beginPath(); ctx.arc(x - 65 + 45 * t, y - 16 * t, 5, 0, Math.PI * 2); ctx.fill();
      if (!state.ballFound && !state.pubEnding && (!state.ballLost || ballAnimation < 1)) {
        const tBall = state.ballLost ? ballAnimation : 0;
        ctx.fillStyle = '#141a1c'; ctx.beginPath(); ctx.arc(x + 12 + 388 * tBall, y + 70 * tBall, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (state.cuesPlaced) {
      const tipX = x - 125 + 15 * PUB_SHORT_CUE_SCALE, tipY = y + 10 - 10 * PUB_SHORT_CUE_SCALE;
      ctx.strokeStyle = '#dfc18d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 125, y + 10); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.strokeStyle = '#76503a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 125, y + 10); ctx.lineTo(x - 125 + 5 * PUB_SHORT_CUE_SCALE, y + 10 - 3.3 * PUB_SHORT_CUE_SCALE); ctx.stroke();
      ctx.fillStyle = '#597184'; ctx.fillRect(tipX - 1, tipY - 1, 2, 2);
    }
  } else {
    ctx.fillStyle = kind === 'bar' ? '#54392d' : '#513a2c'; ctx.fillRect(x - w / 2, y - d / 2, w, d);
    ctx.fillStyle = kind === 'bar' ? '#c19a6b' : '#a37b52'; ctx.fillRect(x - w / 2 + 4, y - d / 2 + 4, w - 8, d - 8);
    ctx.strokeStyle = '#dfbf8a'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + 7, y - d / 2 + 7, w - 14, d - 14);
    if (kind === 'bar') {
      drawWoodGrain(ctx, x, y, 160, 42, 28);
      for (const dx of [-70, -35, 35, 70]) {
        ctx.fillStyle = '#9b7652'; ctx.fillRect(x + dx, y - 25, 1, 39);
      }
      ctx.fillStyle = '#513b31'; ctx.fillRect(x - 26, y - 17, 52, 12);
      for (const dx of [-21, -14, -7, 0, 7, 14, 21]) {
        ctx.fillStyle = '#a1815d'; ctx.fillRect(x + dx, y - 16, 1, 10);
      }
      ctx.fillStyle = '#816044'; ctx.fillRect(x - 84, y + 15, 168, 5);
      for (const dx of [-60, 0, 60]) {
        ctx.fillStyle = '#e1c49a'; ctx.fillRect(x + dx - 22, y + 8, 44, 1);
        ctx.fillStyle = '#724d35'; ctx.fillRect(x + dx - 22, y + 20, 44, 2);
      }
      for (const dx of [-60, -35, -10, 25, 50]) {
        ctx.fillStyle = '#567b62'; ctx.beginPath(); ctx.arc(x + dx, y - 8, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e0c794'; ctx.beginPath(); ctx.arc(x + dx, y - 8, 2, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 'rack') {
      ctx.fillStyle = '#674630'; ctx.fillRect(x - 37, y - 9, 74, 5);
      ctx.fillStyle = '#c9a16f'; ctx.fillRect(x - 37, y - 9, 74, 1);
      ctx.fillStyle = '#674630'; ctx.fillRect(x - 37, y + 6, 74, 4);
      for (const dx of [-35, 35]) {
        ctx.fillStyle = '#e0bd88'; ctx.fillRect(x + dx - 1, y - 8, 2, 16);
      }
      for (const { offset: dx, taken, short } of PUB_RACK_CUES) {
        ctx.fillStyle = '#3f2d23'; ctx.beginPath(); ctx.arc(x + dx, y - 6, 3, 0, Math.PI * 2); ctx.fill();
        if (taken && pubCuesTaken(state)) continue;
        const top = short ? -5.5 : -8;
        ctx.fillStyle = '#e2c38a'; ctx.fillRect(x + dx - 1.5, y + top, 3, 8 - top);
        ctx.fillStyle = '#76503a'; ctx.fillRect(x + dx - 2, y + 3, 4, 5);
        ctx.fillStyle = '#edf0e3'; ctx.fillRect(x + dx - 1.5, y + top, 3, 2);
        ctx.fillStyle = '#d9bb7b'; ctx.fillRect(x + dx - 1, y + 8, 2, 1);
      }
    } else if (kind === 'note') {
      ctx.fillStyle = '#664730'; ctx.fillRect(x - 25, y - 13, 50, 26);
      ctx.fillStyle = '#b58d60'; ctx.fillRect(x - 23, y - 12, 46, 22);
      ctx.fillStyle = '#efe2c2'; ctx.fillRect(x - 20, y - 10, 40, 19);
      ctx.fillStyle = '#ac997a'; ctx.fillRect(x, y - 10, 1, 19);
      for (const dx of [-16, 4]) for (const dy of [-6, -2, 2, 6]) ctx.fillRect(x + dx, y + dy, 12, 1);
      ctx.fillStyle = '#65452f'; ctx.fillRect(x - 24, y + 10, 48, 3);
    } else if (kind === 'table') {
      drawWoodGrain(ctx, x, y, 75, 43, 22);
      if (state.drinksPlaced) {
        for (const dx of [-18, 18]) {
          ctx.fillStyle = '#e3c68d'; ctx.beginPath(); ctx.arc(x + dx, y, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b37f3d'; ctx.beginPath(); ctx.arc(x + dx, y, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
    } else if (kind === 'tools' || kind === 'cabinet' || kind === 'box') {
      const palette = PUB_FURNITURE_PALETTE[kind];
      ctx.fillStyle = palette.body; ctx.fillRect(x - w / 2, y - d / 2, w, d);
      ctx.fillStyle = palette.frame; ctx.fillRect(x - w / 2 + 3, y - d / 2 + 3, w - 6, d - 6);
      for (const side of [-1, 1]) {
        const dx = side * (w - 10) / 4;
        ctx.fillStyle = palette.door; ctx.fillRect(x + dx - (w - 14) / 4, y - d / 2 + 6, (w - 14) / 2, d - 12);
        ctx.fillStyle = palette.inset; ctx.fillRect(x + dx - (w - 22) / 4, y - d / 2 + 10, (w - 22) / 2, d - 20);
        for (const grain of woodGrainSegments(d - 24, (w - 26) / 2, 8)) {
          ctx.fillStyle = palette.door; ctx.fillRect(x + dx + grain.y, y + grain.x, 0.6, grain.length);
        }
        ctx.fillStyle = palette.door;
        for (const edge of [-1, 1]) ctx.fillRect(x + dx + edge * (w - 26) / 4, y - d / 2 + 12, 1, d - 24);
        ctx.fillStyle = palette.frame;
        for (const dy of [-1, 1]) ctx.fillRect(x + dx + side * (w - 16) / 4 - 1, y + dy * (d / 2 - 9), 2, 3);
        ctx.fillStyle = palette.detail; ctx.fillRect(x + dx - side * 5 - 1, y - 2, 2, 4);
      }
    }
  }
}
