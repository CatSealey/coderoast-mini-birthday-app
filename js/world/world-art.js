import { QUEST_LOCATIONS, WORLD_ROUTES, WORLD_SCALE, WORLD_SIZE, WORLD_SPAWN } from './world-data.js';

const TILT = 0.68;
const CACHE_SCALE = 0.5;

export function projectWorld(position, camera, zoom) {
  return { x: (position.x - camera.x) * zoom, y: (position.y - camera.y) * zoom * TILT };
}

export function unprojectWorld(position, camera, zoom) {
  return { x: position.x / zoom + camera.x, y: position.y / (zoom * TILT) + camera.y };
}

export function cameraFor(player, width, height, zoom) {
  const viewWidth = width / zoom;
  const viewHeight = height / (zoom * TILT);
  const axis = (position, view, size, offset) => view >= size
    ? (size - view) / 2
    : Math.max(0, Math.min(size - view, position - view * offset));
  return {
    x: axis(player.x, viewWidth, WORLD_SIZE.width, 0.5),
    y: axis(player.y, viewHeight, WORLD_SIZE.height, 0.62)
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

function roadDistance(point) {
  return Math.min(...roadSegments.map(([a, b]) => distanceToSegment(point, a, b)));
}

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function path(ctx, points) {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
}

function makeGround() {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_SIZE.width * CACHE_SCALE;
  canvas.height = WORLD_SIZE.height * CACHE_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('The browser could not initialize the landscape.');
  ctx.scale(CACHE_SCALE, CACHE_SCALE);
  const grass = ctx.createLinearGradient(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
  grass.addColorStop(0, '#667e46');
  grass.addColorStop(0.43, '#71874b');
  grass.addColorStop(1, '#3f6041');
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, WORLD_SIZE.width, WORLD_SIZE.height);

  const regions = [
    [QUEST_LOCATIONS[0], 500, '#87905b'], [QUEST_LOCATIONS[1], 630, '#8a8b61'],
    [QUEST_LOCATIONS[2], 590, '#677a50'], [QUEST_LOCATIONS[3], 650, '#355c42'],
    [QUEST_LOCATIONS[4], 610, '#8c8247']
  ];
  regions.forEach(([center, radius, color]) => {
    const gradient = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(80, 110, 67, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(center.x - radius, center.y - radius, radius * 2, radius * 2);
  });

  for (let i = 0; i < 16000; i += 1) {
    const x = random(i, 1) * WORLD_SIZE.width;
    const y = random(i, 2) * WORLD_SIZE.height;
    const size = 2 + random(i, 3) * 11;
    ellipse(ctx, x, y, size * 2.2, size * 0.7,
      i % 4 === 0 ? 'rgba(207, 204, 132, 0.12)' : 'rgba(29, 65, 36, 0.10)');
  }

  routes.forEach((route) => {
    path(ctx, route);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 116;
    ctx.strokeStyle = '#4d593b';
    ctx.stroke();
    ctx.lineWidth = 98;
    ctx.strokeStyle = '#88785a';
    ctx.stroke();
    ctx.lineWidth = 78;
    ctx.strokeStyle = '#a49978';
    ctx.stroke();
    ctx.lineWidth = 68;
    ctx.strokeStyle = '#979478';
    ctx.stroke();
  });

  roadSegments.forEach(([a, b], segment) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / length;
    const ny = (b.x - a.x) / length;
    for (let i = 0; i < Math.floor(length / 15); i += 1) {
      const t = (i + random(i, segment)) / (length / 15);
      const offset = (random(i, segment + 7) - 0.5) * 70;
      const x = a.x + (b.x - a.x) * t + nx * offset;
      const y = a.y + (b.y - a.y) * t + ny * offset;
      ellipse(ctx, x, y, 4 + random(i, 4) * 6, 2 + random(i, 5) * 3,
        i % 2 ? 'rgba(51, 53, 42, .20)' : 'rgba(217, 208, 167, .25)');
    }
  });

  for (let i = 0; i < 9000; i += 1) {
    const x = random(i, 13) * WORLD_SIZE.width;
    const y = random(i, 14) * WORLD_SIZE.height;
    if (roadDistance({ x, y }) < 60) continue;
    ctx.strokeStyle = i % 3 ? 'rgba(31, 68, 34, .27)' : 'rgba(202, 202, 122, .22)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y - 5 - random(i, 15) * 7);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y - 4 - random(i, 16) * 5);
    ctx.stroke();
  }
  return canvas;
}

function addProps() {
  const props = [];
  function add(type, x, y, size = 1, variant = 0) {
    props.push({ type, x, y, size, variant });
  }
  const [escape, inn, ride, canopy, field] = QUEST_LOCATIONS;
  add('castle', inn.x + 120, inn.y - 240, 1.45);
  add('house', inn.x - 125, inn.y - 105, 1.1, 0);
  add('house', inn.x + 210, inn.y + 80, 0.85, 1);
  add('stall', inn.x - 155, inn.y + 75, 1);
  add('stall', inn.x - 95, inn.y + 95, 1, 1);
  add('house', escape.x - 95, escape.y - 110, 1.15, 2);
  add('ruin', escape.x + 160, escape.y - 155, 1);
  add('house', ride.x - 140, ride.y - 120, 1, 2);
  add('ruin', ride.x + 100, ride.y - 100, 1.25);
  add('platform', canopy.x - 140, canopy.y - 85, 1);
  add('platform', canopy.x + 160, canopy.y - 130, 1.1);
  add('house', field.x - 180, field.y - 120, 0.9, 1);
  add('field', field.x + 140, field.y - 100, 1.5);
  [escape, inn, ride, canopy, field].forEach((quest) => {
    add('lamp', quest.x - 75, quest.y - 38);
    add('lamp', quest.x + 80, quest.y + 55);
  });
  add('sign', WORLD_SPAWN.x - 120, WORLD_SPAWN.y + 20);
  for (let i = 0; i < 950; i += 1) {
    const x = 70 + random(i, 20) * (WORLD_SIZE.width - 140);
    const y = 70 + random(i, 21) * (WORLD_SIZE.height - 140);
    if (roadDistance({ x, y }) < 100 || QUEST_LOCATIONS.some((quest) => Math.hypot(x - quest.x, y - quest.y) < 280)
      || Math.hypot(x - WORLD_SPAWN.x, y - WORLD_SPAWN.y) < 220) continue;
    const inForest = x > 3400 && y > 1800;
    add(i % 11 === 0 ? 'rock' : inForest && i % 3 === 0 ? 'pine' : 'tree', x, y,
      0.7 + random(i, 22) * 0.65, i % 3);
  }
  return props;
}

function tree(ctx, pine, variant) {
  ellipse(ctx, 10, 4, 37, 12, 'rgba(11, 24, 17, .32)');
  ctx.fillStyle = '#463728';
  ctx.beginPath();
  ctx.moveTo(-7, 0); ctx.lineTo(-5, -65); ctx.lineTo(7, -65); ctx.lineTo(9, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8d7852'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-2, -4); ctx.lineTo(-1, -60); ctx.stroke();
  if (pine) {
    ['#244d35', '#315d3b', '#496e42'].forEach((color, i) => {
      ctx.fillStyle = color; ctx.beginPath();
      ctx.moveTo(-36 + i * 4, -35 - i * 24); ctx.lineTo(0, -112 - i * 12);
      ctx.lineTo(36 - i * 4, -35 - i * 24); ctx.closePath(); ctx.fill();
    });
  } else {
    const colors = variant === 1 ? ['#274a30', '#3c653b', '#779252'] : ['#264d35', '#416c40', '#82a15d'];
    ellipse(ctx, 2, -80, 46, 31, colors[0]);
    ellipse(ctx, -20, -93, 30, 25, colors[1]);
    ellipse(ctx, 19, -96, 33, 25, colors[1]);
    ellipse(ctx, -5, -111, 32, 23, colors[2]);
    for (let i = 0; i < 13; i += 1) {
      ellipse(ctx, (random(i, variant) - 0.5) * 64, -80 - random(i, 8) * 39, 7, 4, 'rgba(208, 216, 145, .16)');
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

function drawProp(ctx, prop) {
  ctx.save();
  ctx.scale(prop.size, prop.size);
  if (prop.type === 'tree' || prop.type === 'pine') tree(ctx, prop.type === 'pine', prop.variant);
  else if (prop.type === 'house' || prop.type === 'castle') building(ctx, prop.variant, prop.type === 'castle');
  else if (prop.type === 'rock') {
    ellipse(ctx, 4, 3, 26, 10, 'rgba(12, 25, 17, .3)');
    ctx.fillStyle = '#777c69'; ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-14, -20); ctx.lineTo(2, -27); ctx.lineTo(20, -16); ctx.lineTo(24, 0); ctx.fill();
    ctx.fillStyle = '#a5a58b'; ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(2, -27); ctx.lineTo(12, -20); ctx.lineTo(-3, -17); ctx.fill();
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
  } else if (prop.type === 'ruin') {
    ctx.fillStyle = '#777b6e'; ctx.fillRect(-48, -80, 24, 80); ctx.fillRect(24, -80, 24, 80);
    ctx.fillRect(-48, -95, 96, 18); ctx.fillStyle = '#b2ae98'; ctx.fillRect(-48, -95, 96, 5);
  } else if (prop.type === 'platform') {
    ctx.fillStyle = '#4c3928'; ctx.fillRect(-36, -52, 8, 52); ctx.fillRect(28, -52, 8, 52);
    ctx.fillStyle = '#a28355'; ctx.fillRect(-48, -59, 96, 12);
    ctx.strokeStyle = '#ceb177'; ctx.strokeRect(-48, -59, 96, 12);
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
  const ground = makeGround();
  const props = addProps();
  return {
    ground,
    draw(ctx, camera, zoom, width, height, actors) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#283e30';
      ctx.fillRect(0, 0, width, height);
      ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom * TILT, -camera.x * dpr * zoom, -camera.y * dpr * zoom * TILT);
      ctx.drawImage(ground, 0, 0, WORLD_SIZE.width, WORLD_SIZE.height);
      const visible = props.filter((prop) => {
        const point = projectWorld(prop, camera, zoom);
        return point.x > -180 && point.x < width + 180 && point.y > -100 && point.y < height + 200;
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
