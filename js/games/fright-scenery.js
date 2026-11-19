import { CELL, frightRandom } from './fright-logic.js';

export const FRIGHT_PALETTES = Object.freeze({
  disease: ['#536e48', '#34493a'], ai: ['#243f4b', '#1b303a'],
  darkness: ['#363145', '#201d2b'], chainsaws: ['#70523b', '#453328'],
  bogeymen: ['#52415b', '#33283c'], claustrophobia: ['#4d6158', '#303e39'],
  clowns: ['#96566a', '#59313f']
});

const PROP_INK = Object.freeze({
  disease: '#547d4f', ai: '#4bd8e6', darkness: '#b5a6de', chainsaws: '#9a6242',
  bogeymen: '#8f719c', claustrophobia: '#668d7e', clowns: '#c54660'
});

export function paintFrightDocument(ctx, theme, variant) {
  const digital = theme === 'ai';
  ctx.fillStyle = digital ? '#122932' : '#cbbd98';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = digital ? '#254957' : '#eadfc0';
  ctx.fillRect(7, 7, 114, 114);
  ctx.fillStyle = PROP_INK[theme];
  ctx.fillRect(15, 15, 98, 7);
  if (theme === 'disease') {
    ctx.fillRect(26, 34, 12, 38); ctx.fillRect(13, 47, 38, 12);
  } else if (theme === 'ai') {
    for (let i = 0; i < 4; i += 1) ctx.fillRect(15 + i * 10, 70 - i * 9, 6, 12 + i * 9);
  } else if (theme === 'darkness') {
    ctx.fillRect(29, 34, 8, 40); ctx.fillRect(13, 50, 40, 8);
    ctx.fillRect(20, 42, 26, 3); ctx.fillRect(20, 64, 26, 3);
  } else if (theme === 'chainsaws') {
    ctx.fillRect(18, 38, 30, 30); ctx.fillRect(13, 48, 40, 10);
    ctx.fillStyle = '#eadfc0'; ctx.fillRect(27, 47, 12, 12);
    ctx.fillStyle = PROP_INK[theme];
  } else if (theme === 'bogeymen') {
    ctx.fillRect(14, 53, 38, 17); ctx.fillRect(17, 43, 14, 10);
    ctx.fillRect(14, 70, 5, 6); ctx.fillRect(47, 70, 5, 6);
  } else if (theme === 'claustrophobia') {
    ctx.fillRect(18, 35, 29, 40); ctx.fillStyle = '#eadfc0';
    for (let i = 0; i < 4; i += 1) ctx.fillRect(23, 41 + i * 7, 19, 3);
    ctx.fillStyle = PROP_INK[theme];
  } else if (theme === 'clowns') {
    for (let i = 0; i < 3; i += 1) {
      ctx.fillRect(15 + i * 13, 38, 10, 17); ctx.fillRect(19 + i * 13, 55, 2, 19);
    }
  }
  for (let i = 0; i < 4; i += 1) {
    ctx.fillRect(62, 36 + i * 10, 43 - ((i + variant) % 3) * 7, 3);
  }
  ctx.fillStyle = digital ? '#89e9e9' : '#ae9b77';
  for (let i = 0; i <= variant; i += 1) ctx.fillRect(17 + i * 11, 99, 7, 7);
  ctx.fillRect(60, 94, 43, 3); ctx.fillRect(60, 103, 30, 3);
}

export function paintFrightConsole(ctx, theme) {
  ctx.fillStyle = '#20272a'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#56605b'; ctx.fillRect(7, 7, 114, 114);
  ctx.fillStyle = '#182123'; ctx.fillRect(12, 12, 104, 104);
  ctx.fillStyle = PROP_INK[theme]; ctx.fillRect(20, 20, 88, 42);
  ctx.fillStyle = '#d9d3b6';
  for (let row = 0; row < 2; row += 1) for (let col = 0; col < 4; col += 1) {
    ctx.fillRect(23 + col * 22, 75 + row * 17, 11, 8);
  }
  ctx.fillStyle = 'rgba(255,255,255,.32)';
  ctx.fillRect(25, 26, 55, 3); ctx.fillRect(25, 34, 35, 3);
  ctx.fillStyle = '#d1be85';
  for (const x of [8, 115]) for (const y of [8, 115]) ctx.fillRect(x, y, 4, 4);
}

export const FRIGHT_WALL_WIDTH = 36;

export function frightWallSegments(maze, x, y) {
  if (maze[y]?.[x] !== '#') return [];
  const left = maze[y]?.[x - 1] === '#', right = maze[y]?.[x + 1] === '#';
  const up = maze[y - 1]?.[x] === '#', down = maze[y + 1]?.[x] === '#';
  const halfCell = CELL / 2, halfWall = FRIGHT_WALL_WIDTH / 2;
  const segments = [];
  if (left || right) {
    const start = left ? -halfCell : -halfWall, end = right ? halfCell : halfWall;
    segments.push({ x: (start + end) / 2, z: 0, width: end - start, depth: FRIGHT_WALL_WIDTH });
    const armLength = halfCell - halfWall, armCenter = (halfCell + halfWall) / 2;
    if (up) segments.push({ x: 0, z: -armCenter, width: FRIGHT_WALL_WIDTH, depth: armLength });
    if (down) segments.push({ x: 0, z: armCenter, width: FRIGHT_WALL_WIDTH, depth: armLength });
  } else {
    const start = up ? -halfCell : -halfWall, end = down ? halfCell : halfWall;
    segments.push({ x: 0, z: (start + end) / 2, width: FRIGHT_WALL_WIDTH, depth: end - start });
  }
  return segments;
}

export function paintFrightWall(ctx, theme, variant = 0, top = false) {
  const base = theme ? FRIGHT_PALETTES[theme][1] : ['#454b34', '#4b5037', '#525838'][variant];
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 128);
  if (!theme) {
    for (let x = 0; x < 128; x += 32) {
      ctx.fillStyle = 'rgba(17,21,17,.36)'; ctx.fillRect(x, 0, 3, 128);
      ctx.fillStyle = 'rgba(197,186,133,.10)'; ctx.fillRect(x + 4, 0, 3, 128);
      for (let i = 0; i < 6; i += 1) {
        const px = x + 7 + frightRandom(x, i, variant + 1) * 20;
        const py = frightRandom(i, x, variant + 5) * 116;
        ctx.fillStyle = i % 2 ? 'rgba(18,22,17,.20)' : 'rgba(194,185,137,.12)';
        ctx.fillRect(px, py, 1, 8 + i * 2);
      }
    }
    if (!top) {
      ctx.fillStyle = '#363b30';
      for (const y of [20, 98]) {
        ctx.fillRect(0, y, 128, 9);
        ctx.fillStyle = '#a19c77';
        for (let x = 15; x < 128; x += 32) ctx.fillRect(x, y + 3, 3, 3);
        ctx.fillStyle = '#363b30';
      }
    }
    return;
  }
  ctx.fillStyle = 'rgba(8,10,14,.32)';
  ctx.fillRect(4, 5, 120, 118);
  ctx.fillStyle = 'rgba(220,225,209,.10)';
  ctx.fillRect(8, 9, 112, 110);
  ctx.fillStyle = base;
  ctx.fillRect(12, 13, 104, 102);
  ctx.fillStyle = 'rgba(225,219,192,.27)';
  for (const x of [8, 116]) for (const y of [9, 115]) ctx.fillRect(x, y, 4, 4);
  if (theme === 'disease') {
    ctx.fillStyle = 'rgba(152,206,142,.37)';
    ctx.fillRect(54, 27, 20, 72); ctx.fillRect(28, 53, 72, 20);
    ctx.fillStyle = 'rgba(186,221,167,.18)';
    for (let y = 16; y < 112; y += 24) ctx.fillRect(16, y, 96, 2);
  } else if (theme === 'ai') {
    ctx.fillStyle = 'rgba(73,228,237,.45)';
    for (let y = 29; y < 100; y += 18) {
      ctx.fillRect(25, y, 66, 3); ctx.fillRect(91, y - 5, 5, 12);
      ctx.fillRect(32 + (y % 3) * 10, y + 5, 25, 2);
    }
  } else if (theme === 'darkness') {
    ctx.fillStyle = 'rgba(178,165,216,.27)';
    for (const [x, y] of [[29, 34], [77, 25], [97, 70], [46, 89]]) {
      ctx.fillRect(x, y - 5, 2, 12); ctx.fillRect(x - 5, y, 12, 2);
    }
  } else if (theme === 'chainsaws') {
    ctx.fillStyle = 'rgba(20,12,8,.35)';
    for (let y = 24; y < 112; y += 25) ctx.fillRect(13, y, 102, 3);
    ctx.fillStyle = 'rgba(212,161,103,.18)';
    for (let y = 32; y < 112; y += 25) ctx.fillRect(20, y, 72, 2);
  } else if (theme === 'bogeymen') {
    ctx.fillStyle = 'rgba(17,11,22,.55)'; ctx.fillRect(27, 26, 74, 80);
    ctx.fillStyle = 'rgba(209,180,118,.55)';
    ctx.fillRect(48, 57, 8, 4); ctx.fillRect(72, 57, 8, 4);
    ctx.fillStyle = 'rgba(168,136,182,.24)'; ctx.fillRect(23, 24, 82, 3);
  } else if (theme === 'claustrophobia') {
    ctx.fillStyle = 'rgba(11,20,19,.48)';
    for (let y = 26; y < 103; y += 12) ctx.fillRect(25, y, 78, 6);
    ctx.fillStyle = 'rgba(204,179,93,.48)';
    ctx.fillRect(16, 105, 96, 5);
  } else if (theme === 'clowns') {
    ctx.fillStyle = 'rgba(244,215,193,.34)';
    for (let x = 16; x < 112; x += 24) ctx.fillRect(x, 15, 11, 96);
    ctx.fillStyle = 'rgba(242,192,87,.55)';
    for (let x = 20; x < 110; x += 22) ctx.fillRect(x, 57, 5, 5);
  }
}

export function paintFrightFloor(ctx, theme, size = 128) {
  ctx.fillStyle = theme ? FRIGHT_PALETTES[theme][0] : '#665d49';
  ctx.fillRect(0, 0, size, size);
  if (theme === 'chainsaws' || theme === 'bogeymen') {
    ctx.fillStyle = 'rgba(25,18,19,.3)';
    for (let y = 0; y < size; y += 24) {
      ctx.fillRect(0, y, size, 3);
      ctx.fillRect((y * 7) % size, y, 2, 24);
    }
    ctx.fillStyle = 'rgba(222,181,125,.13)';
    for (let y = 9; y < size; y += 24) ctx.fillRect(8, y, size - 16, 1);
  } else if (theme === 'ai') {
    ctx.fillStyle = 'rgba(8,20,28,.48)';
    for (let i = 0; i < size; i += 32) { ctx.fillRect(i, 0, 2, size); ctx.fillRect(0, i, size, 2); }
    ctx.fillStyle = 'rgba(85,226,228,.32)';
    ctx.fillRect(15, 15, 42, 2); ctx.fillRect(55, 15, 2, 22); ctx.fillRect(70, 79, 40, 2);
  } else if (theme === 'clowns') {
    ctx.fillStyle = 'rgba(246,224,202,.52)';
    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) {
      if ((x + y) % 2 === 0) ctx.fillRect(x * size / 4, y * size / 4, size / 4, size / 4);
    }
  } else if (theme === 'disease' || theme === 'claustrophobia') {
    ctx.fillStyle = 'rgba(20,30,26,.36)';
    for (let i = 0; i < size; i += 32) { ctx.fillRect(i, 0, 2, size); ctx.fillRect(0, i, size, 2); }
    ctx.fillStyle = theme === 'disease' ? 'rgba(158,194,139,.22)' : 'rgba(209,186,95,.27)';
    ctx.fillRect(9, 9, 14, 2); ctx.fillRect(75, 76, 19, 2);
  } else if (theme === 'darkness') {
    ctx.fillStyle = 'rgba(191,176,220,.25)';
    for (const [x, y] of [[17, 25], [76, 19], [108, 80], [42, 102]]) {
      ctx.fillRect(x, y, 3, 3); ctx.fillRect(x + 1, y - 3, 1, 9);
    }
  } else {
    ctx.fillStyle = 'rgba(40,31,24,.25)';
    for (let i = 0; i < 50; i += 1) {
      ctx.fillRect(frightRandom(i, 4, 1) * size, frightRandom(i, 9, 2) * size, 2 + i % 4, 2);
    }
    ctx.fillStyle = 'rgba(205,176,115,.22)';
    for (let i = 0; i < 22; i += 1) {
      ctx.fillRect(frightRandom(i, 14, 3) * size, frightRandom(i, 7, 4) * size, 4, 1);
    }
  }
}

export function drawFrightTileDetail(ctx, x, y, size, tile, theme, seedX, seedY, depth = size) {
  if (tile === '#') {
    const rect = (dx, dy, w, h) => ctx.fillRect(x + dx * size / CELL, y + dy * depth / CELL, w * size / CELL, h * depth / CELL);
    ctx.fillStyle = 'rgba(12,13,16,.22)';
    for (let i = 0; i < 4; i += 1) rect(4, 8 + i * 25, CELL - 8, 3);
    if (theme === 'disease') {
      ctx.fillStyle = '#9bbd8c'; rect(49, 35, 12, 40); rect(35, 49, 40, 12);
    } else if (theme === 'ai') {
      ctx.fillStyle = '#60d3dd';
      for (let i = 0; i < 3; i += 1) rect(23, 35 + i * 17, 64, 4);
    } else if (theme === 'darkness') {
      ctx.fillStyle = '#aaa0dc';
      for (const [dx, dy] of [[27, 30], [73, 40], [49, 79]]) { rect(dx, dy - 4, 3, 10); rect(dx - 4, dy, 10, 3); }
    } else if (theme === 'chainsaws') {
      ctx.fillStyle = '#ad8655';
      for (const dy of [29, 51, 73]) rect(20, dy, 70, 7);
    } else if (theme === 'bogeymen') {
      ctx.fillStyle = '#27202d'; rect(28, 27, 54, 54);
      ctx.fillStyle = '#d7b977'; rect(40, 49, 8, 5); rect(62, 49, 8, 5);
    } else if (theme === 'claustrophobia') {
      ctx.fillStyle = '#91a59a';
      for (let i = 0; i < 4; i += 1) rect(25, 30 + i * 13, 60, 6);
    } else if (theme === 'clowns') {
      ctx.fillStyle = '#f1ded1';
      for (let i = 0; i < 4; i += 1) rect(13 + i * 24, 8, 9, 94);
    } else {
      ctx.fillStyle = 'rgba(191,185,143,.22)';
      for (let i = 0; i < 3; i += 1) rect(10 + i * 32, 12, 2, 86);
    }
  } else if (tile !== '#') {
    if (theme === 'clowns') {
      ctx.fillStyle = 'rgba(246,224,202,.42)';
      for (let row = 0; row < 4; row += 1) for (let col = 0; col < 4; col += 1) {
        if ((row + col) % 2 === 0) ctx.fillRect(x + col * size / 4, y + row * size / 4, size / 4, size / 4);
      }
    } else if (theme === 'disease' || theme === 'ai' || theme === 'claustrophobia') {
      ctx.fillStyle = theme === 'ai' ? 'rgba(85,226,228,.22)' : 'rgba(20,30,26,.28)';
      for (let i = 1; i < 4; i += 1) {
        ctx.fillRect(x + i * size / 4, y, Math.max(1, size * 0.015), size);
        ctx.fillRect(x, y + i * size / 4, size, Math.max(1, size * 0.015));
      }
    } else if (theme === 'chainsaws' || theme === 'bogeymen') {
      ctx.fillStyle = 'rgba(20,14,16,.25)';
      for (let i = 1; i < 5; i += 1) ctx.fillRect(x, y + i * size / 5, size, Math.max(1, size * 0.02));
    } else if (theme === 'darkness') {
      ctx.fillStyle = 'rgba(191,176,220,.45)';
      for (const [dx, dy] of [[0.2, 0.3], [0.7, 0.2], [0.5, 0.75]]) {
        ctx.fillRect(x + dx * size, y + dy * size, Math.max(1, size * 0.03), Math.max(1, size * 0.03));
      }
    }
    ctx.fillStyle = theme === 'ai' ? 'rgba(85,226,228,.25)' : 'rgba(231,207,158,.17)';
    for (let i = 0; i < 5; i += 1) {
      ctx.fillRect(x + frightRandom(seedX, seedY, i + 1) * size, y + frightRandom(seedX, seedY, i + 8) * size,
        Math.max(1, size * 0.04), Math.max(1, size * 0.015));
    }
  }
}
