import { QUEST_LOCATIONS, WORLD_ROUTES, WORLD_SCALE, WORLD_SIZE, WORLD_SPAWN } from './world-data.js';
import { regionBlendAt } from './world-regions.js';
import { drawParkRide, PARK_RIDES } from './park-scenery.js';
import { WORLD_NPCS } from './world-npcs.js';
import { worldCornWalls, worldTrees } from './world-collision.js';
import { CANOPY_OFFSET, harvestPumpkins, placeQuestDecorations } from './world-scenery-data.js';
import { isTownPlaza, TOWN_BENCHES, TOWN_CHURCH, TOWN_LAMPS, TOWN_PLAZA, TOWN_TABLES, TOWN_VENUES } from './town-scenery.js';
import { createSurroundingTerrain, SURROUNDINGS_BOUNDS, surroundingTrees } from './world-surroundings.js';
import { ESCAPE_DECORATIVE_TREE } from './tree-spacing.js';
import { rockVariant } from './rock-style.js';
import { drawCobblestone } from './cobblestones.js';

const TILT = 0.68;
const CACHE_SCALE = 0.5;
const ROCK_PALETTES = [
  ['#767d70', '#989e89', '#aeb09a'],
  ['#6b7976', '#89978f', '#a4aea0'],
  ['#7e7b6d', '#a09c88', '#b5b19a']
];
const ROCK_GRAIN = [[-9, -15], [-3, -21], [8, -17], [-15, -9], [9, -9], [15, -12]];

export function projectWorld(position, camera, zoom) {
  return { x: (position.x - camera.x) * zoom, y: (position.y - camera.y) * zoom * TILT };
}

export function unprojectWorld(position, camera, zoom) {
  return { x: position.x / zoom + camera.x, y: position.y / (zoom * TILT) + camera.y };
}

export function cameraFor(player, width, height, zoom) {
  const viewWidth = width / zoom;
  const viewHeight = height / (zoom * TILT);
  const axis = (position, view, min, max, offset) => view >= max - min
    ? (min + max - view) / 2
    : Math.max(min, Math.min(max - view, position - view * offset));
  return {
    x: axis(player.x, viewWidth, SURROUNDINGS_BOUNDS.left, SURROUNDINGS_BOUNDS.right, 0.5),
    y: axis(player.y, viewHeight, SURROUNDINGS_BOUNDS.top, SURROUNDINGS_BOUNDS.bottom, 0.62)
  };
}

function random(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

const routes = WORLD_ROUTES.map((route) => route.map(([x, y]) => ({ x: x * WORLD_SCALE, y: y * WORLD_SCALE })));
const roadSegments = routes.flatMap((route) => route.slice(1).map((point, index) => [route[index], point]));

export function roadDistance(point) {
  return Math.min(...roadSegments.map(([a, b]) => distanceToSegment(point, a, b)));
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function makeGround() {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_SIZE.width * CACHE_SCALE;
  canvas.height = WORLD_SIZE.height * CACHE_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The browser could not initialize the landscape.');
  ctx.scale(CACHE_SCALE, CACHE_SCALE);
  const terrain = document.createElement('canvas');
  terrain.width = 270;
  terrain.height = 180;
  const terrainContext = terrain.getContext('2d');
  if (!terrainContext) throw new Error('The browser could not initialize the region terrain.');
  const pixels = terrainContext.createImageData(terrain.width, terrain.height);
  for (let y = 0; y < terrain.height; y += 1) {
    for (let x = 0; x < terrain.width; x += 1) {
      const { region, neighbor, blend } = regionBlendAt({
        x: (x + 0.5) * WORLD_SIZE.width / terrain.width,
        y: (y + 0.5) * WORLD_SIZE.height / terrain.height
      });
      const offset = (y * terrain.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        pixels.data[offset + channel] = region.color[channel] * (1 - blend) + neighbor.color[channel] * blend;
      }
      pixels.data[offset + 3] = 255;
    }
  }
  terrainContext.putImageData(pixels, 0, 0);
  ctx.drawImage(terrain, 0, 0, WORLD_SIZE.width, WORLD_SIZE.height);

  for (let i = 0; i < 16000; i += 1) {
    const x = random(i, 1) * WORLD_SIZE.width;
    const y = random(i, 2) * WORLD_SIZE.height;
    const size = 2 + random(i, 3) * 11;
    ellipse(ctx, x, y, size * 2.2, size * 0.7,
      i % 4 === 0 ? 'rgba(207, 204, 132, 0.12)' : 'rgba(29, 65, 36, 0.10)');
  }

  const minimap = document.createElement('canvas');
  minimap.width = Math.ceil(WORLD_SIZE.width / 10); minimap.height = Math.ceil(WORLD_SIZE.height / 10);
  const mapContext = minimap.getContext('2d');
  if (!mapContext) throw new Error('The browser could not initialize the minimap landscape.');
  mapContext.drawImage(canvas, 0, 0, minimap.width, minimap.height);
  const padding = 30; // Cobblestones extend beyond the plaza's center-point bounds.
  const left = Math.max(0, Math.floor((TOWN_PLAZA.left - padding) / WORLD_SIZE.width * minimap.width));
  const top = Math.max(0, Math.floor((TOWN_PLAZA.top - padding) / WORLD_SIZE.height * minimap.height));
  const right = Math.min(minimap.width, Math.ceil((TOWN_PLAZA.right + padding) / WORLD_SIZE.width * minimap.width));
  const bottom = Math.min(minimap.height, Math.ceil((TOWN_PLAZA.bottom + padding) / WORLD_SIZE.height * minimap.height));
  const townTerrain = mapContext.getImageData(left, top, right - left, bottom - top);

  for (let row = 0; row * 20 < WORLD_SIZE.height; row += 1) {
    for (let col = 0; col * 25 < WORLD_SIZE.width; col += 1) {
      const x = col * 25 + (row % 2) * 12;
      const y = row * 20;
      if (roadDistance({ x, y }) > 40 && !isTownPlaza({ x, y })) continue;
      drawCobblestone(ctx, row, col);
    }
  }

  for (let i = 0; i < 9000; i += 1) {
    const x = random(i, 13) * WORLD_SIZE.width;
    const y = random(i, 14) * WORLD_SIZE.height;
    if (roadDistance({ x, y }) < 60 || isTownPlaza({ x, y })) continue;
    ctx.strokeStyle = i % 3 ? 'rgba(31, 68, 34, .27)' : 'rgba(202, 202, 122, .22)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y - 5 - random(i, 15) * 7);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y - 4 - random(i, 16) * 5);
    ctx.stroke();
  }
  mapContext.drawImage(canvas, 0, 0, minimap.width, minimap.height);
  mapContext.putImageData(townTerrain, left, top);
  mapContext.save();
  mapContext.beginPath();
  mapContext.rect(left, top, right - left, bottom - top);
  mapContext.clip();
  mapContext.beginPath();
  WORLD_ROUTES[1].forEach(([x, y], index) => {
    const mx = x * WORLD_SCALE / WORLD_SIZE.width * minimap.width;
    const my = y * WORLD_SCALE / WORLD_SIZE.height * minimap.height;
    if (index === 0) mapContext.moveTo(mx, my);
    else mapContext.lineTo(mx, my);
  });
  mapContext.strokeStyle = '#aaa58e';
  mapContext.lineWidth = 6;
  mapContext.lineCap = 'round';
  mapContext.lineJoin = 'round';
  mapContext.stroke();
  mapContext.restore();
  return { ground: canvas, minimap };
}

function addProps() {
  const props = [];
  function add(type, x, y, size = 1, variant = 0) {
    props.push({ type, x, y, size, variant });
  }
  const [escape, , park, forest, harvest] = QUEST_LOCATIONS;
  add('castle', WORLD_SPAWN.x + 50, WORLD_SPAWN.y - 250, 1.45);
  add('house', WORLD_SPAWN.x - 205, WORLD_SPAWN.y - 95, 0.85);
  add('lamp', WORLD_SPAWN.x - 70, WORLD_SPAWN.y - 80);
  add('sign', WORLD_SPAWN.x - 120, WORLD_SPAWN.y + 20);

  add('haunted', escape.x - 70, escape.y - 185, 1.25);
  add('deadTree', ESCAPE_DECORATIVE_TREE.x, ESCAPE_DECORATIVE_TREE.z, ESCAPE_DECORATIVE_TREE.size);
  placeQuestDecorations(escape, 'escape', 22, 560, 12).forEach(({ x, y, scale, variant }) => add('grave', x, y, scale, variant));

  TOWN_VENUES.forEach((venue) => props.push({
    ...venue, type: venue.kind === 'games' ? 'tavern' : 'townVenue'
  }));
  add('church', TOWN_CHURCH.x, TOWN_CHURCH.y, 1.3);
  TOWN_TABLES.forEach((table) => add('cafeTable', table.x, table.y));
  TOWN_BENCHES.forEach(({ x, y }) => add('bench', x, y));
  TOWN_LAMPS.forEach(({ x, y }) => add('lamp', x, y));

  add('coaster', park.x + 40, park.y - 185, 1.2);
  add('parkGate', park.x - 180, park.y - 60, 1);
  add('stall', park.x + 205, park.y + 45, 1, 1);
  add('banner', park.x - 135, park.y + 105, 1);
  add('banner', park.x + 140, park.y + 100, 1);
  add('wheel', park.x + 320, park.y - 260, 1.05);
  add('carousel', park.x - 310, park.y - 210, 1);
  add('stall', park.x - 380, park.y + 260, 1, 1);
  add('stall', park.x + 350, park.y + 300, 1);
  add('parkGate', park.x - 475, park.y + 350, 0.8);
  PARK_RIDES.forEach((ride) => add(ride.type, ride.x, ride.y, ride.size));
  add('queue', park.x - 155, park.y + 195, 1);
  add('queue', park.x + 260, park.y + 155, 0.8);
  add('bench', park.x - 290, park.y + 110, 0.9);
  add('banner', park.x - 330, park.y - 30, 0.9, 1);
  add('banner', park.x + 320, park.y - 15, 0.9);
  [[-35, -190, 1.15], [-370, 240, 0.85], [340, 230, 0.9],
    [-350, -440, 0.85], [340, -430, 0.8]].forEach(([dx, dy, scale]) => {
    add('canopy', forest.x + CANOPY_OFFSET.x + dx, forest.y + CANOPY_OFFSET.z + dy, scale);
  });
  [[-165, -20], [155, -65], [-125, 165], [180, 190], [-285, -285], [295, -290]].forEach(([dx, dy], index) => {
    add('fairyLight', forest.x + dx, forest.y + dy, 0.9, index % 4);
  });
  add('mazeGate', harvest.x - 175, harvest.y - 175, 1);
  worldCornWalls().forEach((wall) => add('cornWall', wall.x, wall.y, 1, Number(wall.vertical)));
  harvestPumpkins().forEach(({ x, y, scale }) => add('pumpkin', x, y, scale));
  [WORLD_SPAWN, escape, park, harvest].forEach((quest) => {
    add('lamp', quest.x - 75, quest.y - 50);
    add('lamp', quest.x + 95, quest.y + 75);
  });
  for (let i = 0; i < 950; i += 1) {
    const x = 70 + random(i, 20) * (WORLD_SIZE.width - 140);
    const y = 70 + random(i, 21) * (WORLD_SIZE.height - 140);
    if (roadDistance({ x, y }) < 100 || QUEST_LOCATIONS.some((quest) => Math.hypot(x - quest.x, y - quest.y) < 280)
      || WORLD_NPCS.some((npc) => Math.hypot(x - npc.x, y - npc.y) < 105)
      || Math.hypot(x - WORLD_SPAWN.x, y - WORLD_SPAWN.y) < 220) continue;
    const region = regionBlendAt({ x, y }).region.id;
    if (region === 'park') {
      if (i % 4 === 0) add('banner', x, y, 0.7, Math.floor(i / 4) % 2);
    }
  }
  [...worldTrees(), ...surroundingTrees()].forEach(({ x, z, size, variant, region }) => {
    add(region === 'forest' ? 'pine' : region === 'escape' ? 'deadTree' : 'tree', x, z, size, variant);
    if (variant === 0) add('rock', x + 48, z + 18, 1, rockVariant(x, z));
  });
  return props;
}

function drawFirFoliage(ctx, variant) {
  const palette = variant === 1 ? ['#344f3c', '#526d49'] : variant === 2 ? ['#244b40', '#416c51'] : ['#2c503b', '#496e4a'];
  const width = variant === 1 ? 0.8 : 1;
  for (let tier = 0; tier < 8; tier += 1) {
    const y = -38 - tier * 13;
    const radius = (37 - tier * 4) * width;
    for (const side of [-1, 1]) {
      const tip = side * radius * (0.92 + random(tier, variant + side + 5) * 0.16);
      ctx.fillStyle = palette[(tier + (side === 1 ? 1 : 0)) % 2];
      ctx.beginPath(); ctx.moveTo(0, y - 10); ctx.lineTo(tip * 0.4, y - 8);
      ctx.lineTo(tip, y + 3); ctx.lineTo(tip * 0.78, y + 1);
      ctx.lineTo(tip * 0.86, y + 6); ctx.lineTo(tip * 0.53, y + 2);
      ctx.lineTo(tip * 0.58, y + 7); ctx.lineTo(tip * 0.25, y + 3);
      ctx.lineTo(0, y + 5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(201, 220, 168, .23)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(side * 3, y - 5); ctx.lineTo(tip * 0.8, y + 1);
      ctx.moveTo(tip * 0.32, y - 3); ctx.lineTo(tip * 0.42, y + 1);
      ctx.moveTo(tip * 0.55, y - 1); ctx.lineTo(tip * 0.65, y + 3); ctx.stroke();
    }
  }
}

function tree(ctx, pine, variant) {
  ellipse(ctx, 10, 4, 37, 12, 'rgba(11, 24, 17, .32)');
  ctx.fillStyle = '#463728';
  ctx.beginPath();
  ctx.moveTo(-7, 0); ctx.lineTo(-5, -65); ctx.lineTo(7, -65); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8d7852'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(-1, -60); ctx.stroke();
  if (pine) {
    drawFirFoliage(ctx, variant);
  } else {
    ctx.fillStyle = '#594735';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-7, -13); ctx.lineTo(-5, -58);
    ctx.lineTo(-22, -80); ctx.lineTo(-19, -83); ctx.lineTo(0, -67); ctx.lineTo(18, -85);
    ctx.lineTo(22, -82); ctx.lineTo(7, -58); ctx.lineTo(8, -12); ctx.lineTo(12, 0);
    ctx.lineTo(5, -3); ctx.lineTo(0, 1); ctx.lineTo(-4, -3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8d7852'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-3, -4); ctx.bezierCurveTo(1, -22, -4, -38, -1, -60);
    ctx.moveTo(4, -8); ctx.bezierCurveTo(1, -27, 4, -42, 3, -60); ctx.stroke();
    ctx.fillStyle = variant === 1 ? '#526c3c' : variant === 2 ? '#3d6c51' : '#446c39';
    ctx.beginPath(); ctx.moveTo(-45, -76);
    ctx.bezierCurveTo(-55, -87, -50, -102, -39, -105);
    ctx.bezierCurveTo(-42, -119, -27, -127, -16, -123);
    ctx.bezierCurveTo(-7, -138, 12, -133, 18, -123);
    ctx.bezierCurveTo(33, -130, 45, -117, 43, -107);
    ctx.bezierCurveTo(57, -101, 55, -86, 45, -79);
    ctx.bezierCurveTo(39, -67, 25, -68, 17, -70);
    ctx.bezierCurveTo(8, -62, -5, -64, -12, -70);
    ctx.bezierCurveTo(-23, -65, -38, -67, -45, -76); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 48; i += 1) {
      const x = (random(i, variant + 1) - 0.5) * 76;
      const y = -78 - random(i, 8) * 43;
      if ((x / 43) ** 2 + ((y + 99) / 30) ** 2 > 1) continue;
      ellipse(ctx, x, y, 2 + random(i, 10) * 2, 1.5 + random(i, 11),
        i % 3 ? 'rgba(206, 225, 160, .24)' : 'rgba(24, 55, 33, .24)');
    }
  }
}

function building(ctx, variant, castle = false) {
  const w = castle ? 150 : 116;
  const h = castle ? 120 : 83;
  ellipse(ctx, 25, 4, w * 0.7, 22, 'rgba(15, 22, 18, .35)');
  ctx.fillStyle = '#5c5a50';
  ctx.beginPath(); ctx.moveTo(w / 2, -h); ctx.lineTo(w / 2 + 34, -h - 17);
  ctx.lineTo(w / 2 + 34, -18); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = castle ? '#858579' : '#b0a58a';
  ctx.fillRect(-w / 2, -h, w, h);
  ctx.strokeStyle = 'rgba(59, 61, 52, .33)'; ctx.lineWidth = 1;
  for (let y = -h + 8; y < -4; y += 14) {
    ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke();
    for (let x = -w / 2 + ((Math.round(y / 14) % 2) * 10); x < w / 2; x += 22) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 13); ctx.stroke();
    }
  }
  if (castle) {
    ctx.fillStyle = '#a4a498';
    for (let x = -w / 2; x < w / 2; x += 22) ctx.fillRect(x, -h - 12, 14, 14);
    ctx.fillStyle = '#273940'; ctx.beginPath(); ctx.arc(0, -35, 18, Math.PI, 0); ctx.lineTo(18, 0); ctx.lineTo(-18, 0); ctx.fill();
    ctx.fillStyle = '#395c75'; ctx.fillRect(-48, -h + 19, 16, 29);
    ctx.fillStyle = '#d7d4be'; ctx.beginPath(); ctx.moveTo(-48, -h + 19); ctx.lineTo(-32, -h + 19); ctx.lineTo(-40, -h + 32); ctx.fill();
  } else {
    ctx.fillStyle = variant === 1 ? '#60463c' : '#56473e';
    ctx.beginPath(); ctx.moveTo(-w / 2 - 9, -h); ctx.lineTo(0, -h - 45);
    ctx.lineTo(w / 2 + 9, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#896a50';
    ctx.beginPath(); ctx.moveTo(0, -h - 45); ctx.lineTo(30, -h - 60);
    ctx.lineTo(w / 2 + 42, -h - 16); ctx.lineTo(w / 2 + 9, -h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(225, 194, 143, .25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath(); ctx.moveTo(-w / 2 + i * 18, -h - 2); ctx.lineTo(i * 5, -h - 40); ctx.stroke();
    }
    ctx.fillStyle = '#4c3629'; ctx.fillRect(-9, -38, 21, 38);
    [-39, 30].forEach((x) => {
      ctx.fillStyle = '#354e4b'; ctx.fillRect(x, -57, 15, 19);
      ctx.strokeStyle = '#c9b993'; ctx.strokeRect(x, -57, 15, 19);
      ctx.beginPath(); ctx.moveTo(x + 7, -57); ctx.lineTo(x + 7, -38); ctx.moveTo(x, -48); ctx.lineTo(x + 15, -48); ctx.stroke();
    });
  }
}

function drawSignText(ctx, text, y, width, color = '#ead6a1') {
  ctx.fillStyle = '#342c27';
  ctx.fillRect(-width / 2, y - 15, width, 20);
  ctx.strokeStyle = '#c6a978';
  ctx.lineWidth = 1;
  ctx.strokeRect(-width / 2, y - 15, width, 20);
  ctx.fillStyle = color;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, 0, y);
}

function drawCoaster(ctx) {
  ellipse(ctx, 0, 3, 170, 24, 'rgba(25, 30, 22, .3)');
  ctx.strokeStyle = '#615646';
  ctx.lineWidth = 7;
  for (const [x, top] of [[-145, -45], [-95, -78], [-45, -111], [5, -147], [55, -165], [105, -75], [150, -40]]) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, top); ctx.stroke();
  }
  ctx.strokeStyle = '#43342f'; ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(-165, -35); ctx.lineTo(45, -175);
  ctx.quadraticCurveTo(65, -183, 76, -155); ctx.lineTo(112, -61);
  ctx.quadraticCurveTo(130, -26, 169, -44); ctx.stroke();
  ctx.strokeStyle = '#bc8063'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-165, -35); ctx.lineTo(45, -175);
  ctx.quadraticCurveTo(65, -183, 76, -155); ctx.lineTo(112, -61);
  ctx.quadraticCurveTo(130, -26, 169, -44); ctx.stroke();
  ctx.fillStyle = '#5a2930'; ctx.fillRect(25, -188, 36, 13);
  ctx.fillStyle = '#d4ba87'; ctx.fillRect(29, -184, 8, 5); ctx.fillRect(47, -184, 8, 5);
}

function drawCanopy(ctx) {
  ellipse(ctx, 0, 2, 175, 22, 'rgba(12, 24, 17, .35)');
  [-140, 140].forEach((x, index) => {
    ctx.fillStyle = '#49382b'; ctx.fillRect(x - 9, -185, 18, 185);
    ctx.strokeStyle = '#8d7852'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 3, -4); ctx.lineTo(x - 3, -180);
    ctx.moveTo(x + 4, -10); ctx.lineTo(x + 5, -175); ctx.stroke();
    ctx.save(); ctx.translate(x, -67); ctx.scale(1.35, 1.15);
    drawFirFoliage(ctx, index === 0 ? 0 : 2);
    ctx.restore();
    ctx.fillStyle = '#a18152'; ctx.fillRect(x - 49, -105, 98, 11);
    ctx.strokeStyle = '#dfc795'; ctx.lineWidth = 2; ctx.strokeRect(x - 49, -105, 98, 11);
  });
  ctx.strokeStyle = '#d1b785'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-98, -145); ctx.quadraticCurveTo(0, -117, 98, -145);
  ctx.moveTo(-98, -105); ctx.quadraticCurveTo(0, -77, 98, -105); ctx.stroke();
  for (let x = -90; x <= 90; x += 18) {
    const sag = 27 * (1 - (x / 100) ** 2);
    ctx.beginPath(); ctx.moveTo(x, -145 + sag); ctx.lineTo(x, -105 + sag); ctx.stroke();
  }
  const lights = ['#ffc875', '#e88fbd', '#91d9cb', '#c4b1f4'];
  for (let i = 0; i < 10; i += 1) {
    const x = -90 + i * 20;
    const y = -145 + 27 * (1 - (x / 100) ** 2);
    drawLight(ctx, x, y, lights[i % lights.length]);
  }
}

function drawLight(ctx, x, y, color) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 19);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ellipse(ctx, x, y, 19, 19, glow);
  ellipse(ctx, x, y, 3, 3, color);
}

function drawWheel(ctx) {
  ellipse(ctx, 0, 3, 92, 18, 'rgba(30, 25, 27, .3)');
  ctx.strokeStyle = '#6f5347'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(0, -104); ctx.lineTo(60, 0); ctx.stroke();
  ctx.strokeStyle = '#e0b574'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(0, -115, 86, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    const x = Math.cos(angle) * 86;
    const y = -115 + Math.sin(angle) * 86;
    ctx.strokeStyle = '#ba9370'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -115); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = i % 2 ? '#ad6250' : '#6a8191';
    ctx.fillRect(x - 10, y, 20, 12);
    drawLight(ctx, x, y, '#f2d694');
  }
  ellipse(ctx, 0, -115, 7, 7, '#c9895e');
}

function drawCarousel(ctx) {
  ellipse(ctx, 0, 1, 84, 19, 'rgba(25, 25, 23, .3)');
  ctx.fillStyle = '#8f6048'; ctx.fillRect(-68, -14, 136, 14);
  [-52, -18, 18, 52].forEach((x) => {
    ctx.fillStyle = '#e4c990'; ctx.fillRect(x, -78, 4, 66);
    ctx.fillStyle = '#b7c4a9'; ctx.fillRect(x - 8, -39, 20, 12);
  });
  ctx.fillStyle = '#a35549'; ctx.beginPath(); ctx.moveTo(-78, -74); ctx.lineTo(0, -128);
  ctx.lineTo(78, -74); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e9c388'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-78, -74); ctx.lineTo(78, -74); ctx.stroke();
  for (let x = -65; x <= 65; x += 26) drawLight(ctx, x, -72, '#ffe1a0');
}

function drawCornWall(ctx, vertical) {
  ellipse(ctx, 0, 2, vertical ? 12 : 69, vertical ? 49 : 12, 'rgba(43, 35, 19, .28)');
  for (let i = 0; i < 16; i += 1) {
    const x = vertical ? 0 : -67.5 + i * 9;
    const y = vertical ? -46 + i * 6.1 : 0;
    const height = 38 + random(i, 32) * 20;
    ctx.strokeStyle = i % 2 ? '#c1a34b' : '#dfbf5e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - height);
    ctx.moveTo(x, y - 10); ctx.lineTo(x - 8, y - 30);
    ctx.moveTo(x, y - 15); ctx.lineTo(x + 8, y - 35); ctx.stroke();
    ctx.fillStyle = '#dbc16c'; ctx.fillRect(x - 3, y - height, 5, 9);
  }
}

function drawProp(ctx, prop) {
  ctx.save();
  ctx.scale(prop.size, prop.size);
  if (prop.type === 'tree' || prop.type === 'pine') tree(ctx, prop.type === 'pine', prop.variant);
  else if (prop.type === 'house' || prop.type === 'castle') building(ctx, prop.variant, prop.type === 'castle');
  else if (prop.type === 'church') {
    building(ctx, 0);
    ctx.fillStyle = '#aaa99a'; ctx.fillRect(-53, -146, 45, 93);
    ctx.fillStyle = '#777e77'; ctx.fillRect(-56, -151, 51, 8);
    ctx.fillStyle = '#5c6060';
    ctx.beginPath(); ctx.moveTo(-60, -151); ctx.lineTo(-30, -192); ctx.lineTo(0, -151); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e5d7b4'; ctx.fillRect(-32, -207, 4, 17); ctx.fillRect(-37, -202, 14, 4);
    ctx.fillStyle = '#506c78'; ctx.fillRect(-41, -129, 20, 33);
    ctx.fillStyle = '#d7cba8'; ctx.fillRect(-32, -129, 2, 33); ctx.fillRect(-41, -114, 20, 2);
    ctx.fillStyle = '#d7cba8'; ctx.fillRect(31, -57, 2, 19);
    ellipse(ctx, 32, -63, 8, 8, '#b8c5b6');
  }
  else if (prop.type === 'townVenue') {
    building(ctx, prop.kind === 'bar' ? 1 : 0);
    ctx.fillStyle = prop.awning;
    ctx.fillRect(-52, -44, 104, 10);
    ctx.fillStyle = '#e9d8b8';
    for (let x = -48; x < 50; x += 24) ctx.fillRect(x, -44, 10, 10);
    drawSignText(ctx, prop.name, -68, 108);
  }
  else if (prop.type === 'tavern') {
    building(ctx, 1);
    drawSignText(ctx, 'LUCKY CHUCKS', -67, 94);
    ellipse(ctx, -29, -23, 8, 8, '#244c43');
    ctx.fillStyle = '#f1e2bb'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('8', -29, -19);
    ellipse(ctx, 32, -24, 9, 9, '#ded3b6');
    ellipse(ctx, 32, -24, 7, 7, '#293a33');
    ctx.strokeStyle = '#d7c8a9'; ctx.lineWidth = 0.6;
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(32, -24); ctx.lineTo(32 + Math.cos(angle) * 7, -24 + Math.sin(angle) * 7); ctx.stroke();
    }
    ellipse(ctx, 32, -24, 2, 2, '#b45247');
  } else if (prop.type === 'haunted') {
    building(ctx, 0);
    ctx.fillStyle = 'rgba(29, 34, 36, .65)'; ctx.fillRect(-58, -83, 116, 83);
    ctx.fillStyle = '#a9b07c'; ctx.fillRect(-39, -57, 14, 18); ctx.fillRect(30, -57, 14, 18);
    ctx.strokeStyle = '#313638'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-41, -54); ctx.lineTo(-23, -42); ctx.moveTo(28, -42); ctx.lineTo(46, -54); ctx.stroke();
    drawSignText(ctx, 'ESCAPE ROOM', -89, 92, '#c2caa7');
  } else if (prop.type === 'deadTree') {
    ellipse(ctx, 5, 2, 34, 9, 'rgba(13, 19, 19, .3)');
    ctx.scale(prop.variant === 1 ? -1 : 1, 1);
    ctx.fillStyle = '#57483a';
    ctx.strokeStyle = '#392f29'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 1); ctx.lineTo(-12, -9); ctx.bezierCurveTo(-7, -25, -11, -37, -13, -47);
    ctx.bezierCurveTo(-25, -53, -33, -68, -37, -82); ctx.lineTo(-41, -105);
    ctx.lineTo(-32, -85); ctx.lineTo(-22, -72); ctx.bezierCurveTo(-27, -91, -24, -104, -32, -119);
    ctx.lineTo(-42, -139); ctx.lineTo(-27, -125); ctx.lineTo(-21, -137); ctx.lineTo(-22, -117);
    ctx.bezierCurveTo(-15, -100, -16, -80, -8, -69); ctx.bezierCurveTo(-5, -81, -7, -96, -5, -110);
    ctx.lineTo(-15, -139); ctx.lineTo(-2, -119); ctx.lineTo(5, -144); ctx.lineTo(5, -113);
    ctx.bezierCurveTo(13, -103, 13, -89, 11, -77); ctx.bezierCurveTo(22, -86, 27, -101, 31, -116);
    ctx.lineTo(33, -137); ctx.lineTo(39, -116); ctx.lineTo(48, -129); ctx.lineTo(42, -106);
    ctx.lineTo(54, -116); ctx.lineTo(43, -97); ctx.bezierCurveTo(33, -83, 22, -75, 15, -61);
    ctx.bezierCurveTo(8, -42, 8, -24, 13, -11); ctx.lineTo(22, 1); ctx.lineTo(9, -2);
    ctx.lineTo(4, 3); ctx.lineTo(-2, -2); ctx.lineTo(-10, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8a6c50'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -3); ctx.bezierCurveTo(1, -24, -7, -40, -5, -58);
    ctx.bezierCurveTo(-4, -78, 4, -93, 0, -112);
    ctx.moveTo(5, -4); ctx.bezierCurveTo(0, -26, 6, -45, 10, -59);
    ctx.bezierCurveTo(17, -77, 29, -85, 34, -104);
    ctx.moveTo(-9, -47); ctx.bezierCurveTo(-24, -58, -28, -72, -31, -89); ctx.stroke();
    ctx.strokeStyle = '#382e29'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, -5); ctx.bezierCurveTo(-5, -27, 4, -41, 0, -61);
    ctx.moveTo(6, -64); ctx.bezierCurveTo(3, -81, 5, -96, 3, -104); ctx.stroke();
  } else if (prop.type === 'grave') {
    ellipse(ctx, 0, 2, 22, 7, 'rgba(15, 20, 19, .35)');
    ctx.fillStyle = '#777c72'; ctx.beginPath(); ctx.arc(0, -25, 14, Math.PI, 0);
    ctx.lineTo(14, 0); ctx.lineTo(-14, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#4b514c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -12); ctx.moveTo(-6, -24); ctx.lineTo(6, -24); ctx.stroke();
  } else if (prop.type === 'cafeTable') {
    ellipse(ctx, 0, 3, 32, 10, 'rgba(15, 22, 18, .25)');
    ctx.fillStyle = '#59483b'; ctx.fillRect(-3, -18, 6, 18);
    ellipse(ctx, 0, -20, 20, 8, '#b19269');
    for (const x of [-27, 27]) {
      ctx.fillStyle = '#6f5845'; ctx.fillRect(x - 3, -10, 6, 10);
      ellipse(ctx, x, -11, 7, 4, '#987a59');
    }
    ellipse(ctx, 0, -21, 4, 3, '#d6c6a5');
  } else if (prop.type === 'coaster') drawCoaster(ctx);
  else if (prop.type === 'loopCoaster' || prop.type === 'woodCoaster' || prop.type === 'dropTower') drawParkRide(ctx, prop.type);
  else if (prop.type === 'queue') {
    ctx.strokeStyle = '#705542'; ctx.lineWidth = 4;
    for (let x = -65; x <= 65; x += 26) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -29); ctx.stroke();
      ellipse(ctx, x, -30, 3, 3, '#d6bb86');
    }
    ctx.strokeStyle = '#ba8b5c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-65, -22); ctx.lineTo(65, -22); ctx.stroke();
  }
  else if (prop.type === 'canopy') drawCanopy(ctx);
  else if (prop.type === 'wheel') drawWheel(ctx);
  else if (prop.type === 'carousel') drawCarousel(ctx);
  else if (prop.type === 'cornWall') drawCornWall(ctx, prop.variant === 1);
  else if (prop.type === 'fairyLight') {
    const colors = ['#f9b775', '#d795df', '#8dd8cb', '#e8d585'];
    ctx.strokeStyle = '#4c4a38'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -68); ctx.stroke();
    drawLight(ctx, 0, -68, colors[prop.variant]);
  } else if (prop.type === 'mazeGate') {
    ctx.fillStyle = '#514334'; ctx.fillRect(-57, -100, 10, 100); ctx.fillRect(47, -100, 10, 100);
    ctx.fillStyle = '#9b713a'; ctx.fillRect(-66, -102, 132, 22);
    drawSignText(ctx, 'Fright Nights', -86, 100, '#e8b670');
  } else if (prop.type === 'scarecrow') {
    ctx.strokeStyle = '#59452f'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -70); ctx.moveTo(-30, -45); ctx.lineTo(30, -45); ctx.stroke();
    ctx.fillStyle = '#775148'; ctx.fillRect(-13, -51, 26, 28);
    ellipse(ctx, 0, -68, 11, 12, '#d6bb7c');
    ctx.fillStyle = '#49382c'; ctx.fillRect(-17, -80, 34, 5); ctx.fillRect(-9, -91, 18, 12);
  } else if (prop.type === 'bench') {
    ctx.fillStyle = '#72543c'; ctx.fillRect(-30, -25, 60, 9); ctx.fillRect(-27, -13, 54, 7);
    ctx.fillRect(-23, -8, 5, 8); ctx.fillRect(18, -8, 5, 8);
  } else if (prop.type === 'barrel') {
    ctx.fillStyle = '#876040'; ctx.fillRect(-12, -30, 24, 30);
    ellipse(ctx, 0, -30, 12, 4, '#a67e52');
    ctx.strokeStyle = '#4d4034'; ctx.lineWidth = 2; ctx.strokeRect(-12, -24, 24, 16);
  }
  else if (prop.type === 'parkGate') {
    ctx.fillStyle = '#59504a'; ctx.fillRect(-52, -90, 12, 90); ctx.fillRect(40, -90, 12, 90);
    ctx.strokeStyle = '#784a43'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, -78, 46, Math.PI, 0); ctx.stroke();
    drawSignText(ctx, 'THIRTEEN', -79, 84);
  } else if (prop.type === 'banner') {
    ctx.fillStyle = '#6f5842'; ctx.fillRect(-3, -82, 6, 82);
    ctx.fillStyle = prop.variant ? '#ccad6c' : '#b5614c'; ctx.beginPath(); ctx.moveTo(3, -80); ctx.lineTo(35, -72); ctx.lineTo(3, -58); ctx.fill();
  } else if (prop.type === 'pumpkin') {
    ellipse(ctx, 0, -8, 19, 11, '#b36d2e');
    ellipse(ctx, 0, -8, 9, 11, '#d88a35');
    ctx.fillStyle = '#556241'; ctx.fillRect(-2, -22, 4, 6);
  }
  else if (prop.type === 'rock') {
    ellipse(ctx, 4, 3, 26, 10, 'rgba(12, 25, 17, .3)');
    const [dark, middle, light] = ROCK_PALETTES[prop.variant];
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-21, -1); ctx.lineTo(-19, -10);
    ctx.lineTo(-13, -21); ctx.lineTo(-3, -25 - prop.variant); ctx.lineTo(8, -24);
    ctx.lineTo(19, -17); ctx.lineTo(23, -8); ctx.lineTo(22, 0); ctx.lineTo(8, 2);
    ctx.lineTo(-8, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = middle; ctx.beginPath(); ctx.moveTo(-19, -10); ctx.lineTo(-13, -21);
    ctx.lineTo(-3, -25 - prop.variant); ctx.lineTo(8, -24); ctx.lineTo(19, -17);
    ctx.lineTo(13, -10); ctx.lineTo(2, -8); ctx.lineTo(-8, -11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(-13, -21); ctx.lineTo(-3, -25 - prop.variant);
    ctx.lineTo(8, -24); ctx.lineTo(12, -19); ctx.lineTo(0, -17); ctx.lineTo(-8, -18); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(48, 58, 52, .35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(5, -14); ctx.lineTo(2, -10); ctx.lineTo(4, -7);
    ctx.moveTo(-14, -7); ctx.lineTo(-11, -5); ctx.moveTo(12, -5); ctx.lineTo(15, -4); ctx.stroke();
    ctx.fillStyle = 'rgba(228, 230, 209, .35)';
    ROCK_GRAIN.forEach(([x, y]) => ctx.fillRect(x, y, 1.5, 1));
  } else if (prop.type === 'lamp' || prop.type === 'sign') {
    ctx.fillStyle = '#55442e'; ctx.fillRect(-3, -44, 6, 44);
    ctx.fillStyle = prop.type === 'lamp' ? '#e5c16e' : '#b59a68'; ctx.fillRect(-9, -53, 18, 13);
    ctx.strokeStyle = '#463e2b'; ctx.strokeRect(-9, -53, 18, 13);
  } else if (prop.type === 'stall') {
    ctx.fillStyle = '#59452f'; ctx.fillRect(-24, -31, 4, 31); ctx.fillRect(20, -31, 4, 31);
    ctx.fillStyle = '#8b634b'; ctx.fillRect(-27, -20, 54, 14);
    ctx.fillStyle = prop.variant ? '#a77151' : '#c1a477';
    ctx.beginPath(); ctx.moveTo(-31, -30); ctx.lineTo(-23, -45); ctx.lineTo(25, -45); ctx.lineTo(31, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e2c99a'; ctx.lineWidth = 3; ctx.stroke();
  } else if (prop.type === 'field') {
    ctx.fillStyle = '#6f6b3f'; ctx.fillRect(-90, -35, 180, 35);
    ctx.strokeStyle = '#c8b56b'; ctx.lineWidth = 2;
    for (let x = -85; x < 90; x += 9) {
      ctx.beginPath(); ctx.moveTo(x, -3); ctx.lineTo(x - 3, -24); ctx.moveTo(x, -3); ctx.lineTo(x + 4, -20); ctx.stroke();
    }
  }
  ctx.restore();
}

export function createWorldArt() {
  const { ground, minimap } = makeGround();
  const surroundings = createSurroundingTerrain();
  const props = addProps();
  return {
    ground, minimap, surroundings,
    draw(ctx, camera, zoom, width, height, actors) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#283e30';
      ctx.fillRect(0, 0, width, height);
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom * TILT, -camera.x * dpr * zoom, -camera.y * dpr * zoom * TILT);
      ctx.drawImage(surroundings, SURROUNDINGS_BOUNDS.left, SURROUNDINGS_BOUNDS.top,
        SURROUNDINGS_BOUNDS.right - SURROUNDINGS_BOUNDS.left, SURROUNDINGS_BOUNDS.bottom - SURROUNDINGS_BOUNDS.top);
      ctx.drawImage(ground, 0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
      const visible = props.filter((prop) => {
        const point = projectWorld(prop, camera, zoom);
        return point.x > -300 && point.x < width + 300 && point.y > -120 && point.y < height + 350;
      }).map((prop) => ({ ...prop, draw: () => drawProp(ctx, prop) }));
      const items = [...visible, ...actors].sort((a, b) => a.y - b.y);
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, -camera.x * dpr * zoom, -camera.y * dpr * zoom * TILT);
      items.forEach((item) => {
        ctx.save();
        ctx.translate(item.x, item.y * TILT);
        item.draw(ctx);
        ctx.restore();
      });
    }
  };
}
