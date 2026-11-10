import { QUEST_LOCATIONS } from './world-data.js';

const park = QUEST_LOCATIONS[2];

export const PARK_RIDES = Object.freeze([
  Object.freeze({ type: 'loopCoaster', x: park.x - 600, y: park.y - 350, size: 1 }),
  Object.freeze({ type: 'woodCoaster', x: park.x + 540, y: park.y - 310, size: 1 }),
  Object.freeze({ type: 'loopCoaster', x: park.x + 480, y: park.y + 450, size: 0.85 }),
  Object.freeze({ type: 'dropTower', x: park.x - 450, y: park.y + 500, size: 1 })
]);

function shadow(ctx, width) {
  ctx.fillStyle = 'rgba(27, 24, 21, .3)';
  ctx.beginPath(); ctx.ellipse(0, 3, width, 18, 0, 0, Math.PI * 2); ctx.fill();
}

function track(ctx, outline, color, trace) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = outline; ctx.lineWidth = 12;
  ctx.beginPath(); trace(ctx); ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = 5;
  ctx.beginPath(); trace(ctx); ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 242, 210, .4)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); trace(ctx); ctx.stroke();
}

function train(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = color; ctx.fillRect(i * 16, -14, 14, 12);
    ctx.fillStyle = '#e5c88c'; ctx.fillRect(i * 16 + 4, -11, 6, 4);
    ctx.fillStyle = '#292a28'; ctx.fillRect(i * 16 + 2, -2, 4, 4); ctx.fillRect(i * 16 + 10, -2, 4, 4);
  }
  ctx.restore();
}

function drawLoopCoaster(ctx) {
  shadow(ctx, 210);
  ctx.strokeStyle = '#535358'; ctx.lineWidth = 7;
  for (const [x, y] of [[-170, -45], [-105, -75], [-55, -65], [35, -130], [125, -55], [180, -35]]) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y); ctx.stroke();
  }
  const trace = (c) => {
    c.moveTo(-210, -40); c.lineTo(-125, -82);
    c.quadraticCurveTo(-85, -100, -55, -67);
    c.bezierCurveTo(-10, -10, 78, -15, 75, -93);
    c.bezierCurveTo(72, -177, -10, -168, -8, -91);
    c.bezierCurveTo(-5, -35, 75, -29, 125, -55);
    c.quadraticCurveTo(170, -80, 210, -35);
  };
  track(ctx, '#30383c', '#9c4c45', trace);
  train(ctx, -139, -77, -0.46, '#542d2c');
}

function drawWoodCoaster(ctx) {
  shadow(ctx, 200);
  ctx.strokeStyle = '#755839'; ctx.lineWidth = 5;
  for (let x = -180; x <= 180; x += 30) {
    const height = 50 + 100 * Math.exp(-(((x + 65) / 85) ** 2)) + 60 * Math.exp(-(((x - 120) / 60) ** 2));
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -height);
    ctx.moveTo(x, 0); ctx.lineTo(x + 30, -height + 5); ctx.stroke();
  }
  const trace = (c) => {
    c.moveTo(-210, -45); c.quadraticCurveTo(-155, -53, -100, -145);
    c.quadraticCurveTo(-75, -180, -45, -135); c.quadraticCurveTo(10, -38, 50, -67);
    c.quadraticCurveTo(105, -145, 130, -110); c.quadraticCurveTo(165, -50, 210, -38);
  };
  track(ctx, '#4b352a', '#c4a06b', trace);
  train(ctx, -103, -147, -0.35, '#6d4934');
}

function drawDropTower(ctx) {
  shadow(ctx, 70);
  ctx.fillStyle = '#66584d'; ctx.fillRect(-18, -205, 36, 205);
  ctx.strokeStyle = '#b7a089'; ctx.lineWidth = 2;
  for (let y = -192; y < -20; y += 24) {
    ctx.beginPath(); ctx.moveTo(-16, y); ctx.lineTo(16, y + 24);
    ctx.moveTo(16, y); ctx.lineTo(-16, y + 24); ctx.stroke();
  }
  ctx.fillStyle = '#744a44'; ctx.fillRect(-50, -105, 100, 18);
  for (let x = -42; x <= 34; x += 19) {
    ctx.fillStyle = '#d8bd8b'; ctx.fillRect(x, -112, 11, 13);
    ctx.fillStyle = '#39434a'; ctx.fillRect(x, -98, 11, 9);
  }
  ctx.fillStyle = '#ad8060'; ctx.fillRect(-27, -215, 54, 12);
}

export function drawParkRide(ctx, type) {
  if (type === 'loopCoaster') drawLoopCoaster(ctx);
  else if (type === 'woodCoaster') drawWoodCoaster(ctx);
  else if (type === 'dropTower') drawDropTower(ctx);
  else throw new Error(`Unknown park ride: ${type}`);
}
