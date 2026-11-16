import * as THREE from 'three';
import { CASTLE_ROOF_SUPPLIES } from './world-data.js';

export const CASTLE_PALETTE = Object.freeze({
  wall: '#c6c3b4',
  tower: '#b8bcad',
  trim: '#c7bfaa',
  shadow: '#777d72',
  roof: '#a7ab9c',
  roofTrim: '#878d81',
  gate: '#493d32',
  gateIron: '#515149',
  windowGlass: '#3e5b61',
  metal: '#9a845e',
  royalBlue: '#2854a2',
  heraldryGold: '#dfc48c'
});

export const CASTLE_TOWER_WINDOWS = Object.freeze({
  upper: Object.freeze({ width: 22, spring: 24, height: 34, innerWidth: 14, innerSpring: 21, innerHeight: 29, bottomOffset: -100 }),
  lower: Object.freeze({ width: 18, spring: 16, height: 24, innerWidth: 10, innerSpring: 13, innerHeight: 19, bottomOffset: -145 }),
  rear: Object.freeze({ width: 16, spring: 12, height: 19, innerWidth: 10, innerSpring: 10, innerHeight: 15, bottomOffset: -50 })
});

// Align the pole foot with the tower roof's center in the elevated world-camera view.
export function castleFlagPosition(tower) {
  return { x: tower.x, z: tower.z + 15.5 * 970 / 650 };
}

export const CASTLE_GATE_PLANKS = Object.freeze([
  Object.freeze({ x: -20, top: 64, color: '#76553a' }),
  Object.freeze({ x: -10, top: 74, color: '#684a34' }),
  Object.freeze({ x: 0, top: 79, color: '#79583e' }),
  Object.freeze({ x: 10, top: 74, color: '#684a34' }),
  Object.freeze({ x: 20, top: 64, color: '#76553a' })
]);

const SUPPLY_STYLES = Object.freeze({
  barrel: Object.freeze([
    Object.freeze({ wood: '#8a6344', light: '#b08b60', edge: '#65472f', metal: '#51483e' }),
    Object.freeze({ wood: '#71543d', light: '#9b7954', edge: '#4d382b', metal: '#77746a' }),
    Object.freeze({ wood: '#a2784d', light: '#c19c6e', edge: '#765335', metal: '#675640' })
  ]),
  crate: Object.freeze([
    Object.freeze({ wood: '#a17a50', light: '#c49a68', edge: '#644c35', metal: '#4d4136' }),
    Object.freeze({ wood: '#806244', light: '#aa8760', edge: '#503e2d', metal: '#716b60' }),
    Object.freeze({ wood: '#b18b5f', light: '#d3b07b', edge: '#73563a', metal: '#5d4c38' })
  ])
});

export function castleSupplyStyle(kind, variant) {
  const style = SUPPLY_STYLES[kind]?.[variant];
  if (!style) throw new RangeError('Unknown castle supply style.');
  return style;
}

export function createCastleArchGeometry(width, springHeight, height) {
  if (![width, springHeight, height].every(Number.isFinite)
    || width <= 0 || springHeight <= 0 || height <= springHeight) {
    throw new RangeError('Invalid castle arch dimensions.');
  }
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, springHeight);
  shape.quadraticCurveTo(width / 2, height, 0, height);
  shape.quadraticCurveTo(-width / 2, height, -width / 2, springHeight);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 16);
  geometry.computeBoundingBox();
  return geometry;
}

export function createCastleBannerGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-10, 0);
  shape.lineTo(0, -6);
  shape.lineTo(10, 0);
  shape.lineTo(10, 34);
  shape.lineTo(-10, 34);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.computeBoundingBox();
  return geometry;
}

export function createCastleFlagGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(32, 1);
  shape.lineTo(26, 9);
  shape.lineTo(32, 17);
  shape.lineTo(0, 18);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.computeBoundingBox();
  return geometry;
}

export function drawCastleSupply(ctx, kind, variant = 0) {
  const { wood, light, edge, metal } = castleSupplyStyle(kind, variant);
  if (kind === 'barrel') {
    ctx.fillStyle = wood; ctx.fillRect(-9, -24, 18, 24);
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(0, -24, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = metal; ctx.lineWidth = 2;
    for (const y of [-18, -6]) {
      ctx.beginPath(); ctx.moveTo(-9, y); ctx.lineTo(9, y); ctx.stroke();
    }
    ctx.strokeStyle = edge; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3, -23); ctx.lineTo(-3, 0); ctx.moveTo(3, -23); ctx.lineTo(3, 0); ctx.stroke();
    ctx.fillStyle = light;
    for (const y of [-18, -6]) ctx.fillRect(4, y - 0.5, 1, 1);
  } else {
    ctx.fillStyle = wood; ctx.fillRect(-10, -20, 20, 20);
    ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.strokeRect(-9, -19, 18, 18);
    ctx.lineWidth = 1;
    for (const y of [-14, -8]) {
      ctx.beginPath(); ctx.moveTo(-8, y); ctx.lineTo(8, y); ctx.stroke();
    }
    ctx.strokeStyle = light; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(8, -18);
    if (variant === 2) { ctx.moveTo(-8, -18); ctx.lineTo(8, -2); }
    ctx.stroke();
    ctx.fillStyle = metal;
    for (const x of [-7, 6]) for (const y of [-17, -4]) ctx.fillRect(x, y, 1.5, 1.5);
  }
}

export function drawCastle(ctx) {
  const { wall, tower, trim, shadow, gate, gateIron, windowGlass, metal, roof, roofTrim, royalBlue, heraldryGold } = CASTLE_PALETTE;
  ctx.fillStyle = 'rgba(15, 22, 18, .35)';
  ctx.beginPath(); ctx.ellipse(0, 4, 130, 23, 0, 0, Math.PI * 2); ctx.fill();
  function drawTowerWindow(x, top) {
    ctx.fillStyle = trim;
    ctx.beginPath(); ctx.moveTo(x - 7, top + 20); ctx.lineTo(x - 7, top + 7);
    ctx.quadraticCurveTo(x - 7, top, x, top); ctx.quadraticCurveTo(x + 7, top, x + 7, top + 7);
    ctx.lineTo(x + 7, top + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = windowGlass;
    ctx.beginPath(); ctx.moveTo(x - 4, top + 18); ctx.lineTo(x - 4, top + 8);
    ctx.quadraticCurveTo(x - 4, top + 3, x, top + 3); ctx.quadraticCurveTo(x + 4, top + 3, x + 4, top + 8);
    ctx.lineTo(x + 4, top + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = trim; ctx.fillRect(x - 8, top + 19, 16, 3);
    ctx.fillStyle = '#b7c1ad'; ctx.fillRect(x - 0.5, top + 5, 1, 13); ctx.fillRect(x - 4, top + 11, 8, 1);
  }
  function drawTower(x, bottom, height, hasBanner) {
    const top = bottom - height;
    ctx.fillStyle = tower; ctx.fillRect(x - 22, top, 44, height);
    ctx.strokeStyle = 'rgba(73, 78, 70, .3)';
    for (let y = top + 7; y < bottom; y += 14) {
      ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x + 22, y); ctx.stroke();
    }
    ctx.fillStyle = shadow; ctx.fillRect(x - 23, top - 4, 46, 8);
    ctx.fillStyle = trim;
    for (let dx = -18; dx <= 18; dx += 12) ctx.fillRect(x + dx - 4, top - 16, 8, 13);
    // The illustrated foreground battlements overlap the lower part of the rear towers.
    for (const y of hasBanner ? [top + 55, top + 95] : [top + 35]) {
      drawTowerWindow(x, y);
    }
    if (hasBanner) {
      ctx.fillStyle = royalBlue; ctx.strokeStyle = heraldryGold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 8, top + 5); ctx.lineTo(x + 8, top + 5);
      ctx.lineTo(x + 8, top + 27); ctx.lineTo(x, top + 32); ctx.lineTo(x - 8, top + 27); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = heraldryGold; ctx.fillRect(x - 1, top + 9, 2, 15); ctx.fillRect(x - 4, top + 14, 8, 2);
    }
    const flagX = x;
    const flagTop = top - (hasBanner ? 53 : 39);
    ctx.strokeStyle = '#6f5c45'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(flagX, top - 16); ctx.lineTo(flagX, flagTop - 2); ctx.stroke();
    ctx.fillStyle = royalBlue;
    ctx.beginPath(); ctx.moveTo(flagX, flagTop); ctx.lineTo(flagX + 21, flagTop + 1);
    ctx.lineTo(flagX + 17, flagTop + 6); ctx.lineTo(flagX + 21, flagTop + 11);
    ctx.lineTo(flagX, flagTop + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = heraldryGold;
    ctx.fillRect(flagX + 2, flagTop + 1, 1, 10); ctx.fillRect(flagX + 9, flagTop + 3, 1, 7);
    ctx.fillRect(flagX + 6, flagTop + 6, 7, 1);
  }
  for (const side of [-1, 1]) drawTower(side * 103, -72, 175, false);
  ctx.fillStyle = roof;
  ctx.fillRect(-90, -180, 180, 52);
  ctx.strokeStyle = roofTrim; ctx.lineWidth = 1;
  for (let row = 0; row < 4; row += 1) {
    const y = -178 + row * 13;
    ctx.beginPath(); ctx.moveTo(-90, y); ctx.lineTo(90, y);
    for (let x = -80 + (row % 2) * 10; x < 90; x += 20) {
      ctx.moveTo(x, y); ctx.lineTo(x, y + 13);
    }
    ctx.stroke();
  }
  for (const item of CASTLE_ROOF_SUPPLIES) {
    ctx.save(); ctx.translate(item.x * 0.75, -140 + (item.z + 47.5) * 0.27);
    ctx.scale(0.65 * item.size, 0.65 * item.size);
    drawCastleSupply(ctx, item.kind, item.variant); ctx.restore();
  }
  ctx.fillStyle = shadow; ctx.fillRect(-98, -128, 196, 128);
  ctx.fillStyle = wall; ctx.fillRect(-90, -122, 180, 118);
  ctx.strokeStyle = 'rgba(72, 73, 62, .32)'; ctx.lineWidth = 1;
  for (let row = 0; row < 9; row += 1) {
    const y = -118 + row * 13;
    ctx.beginPath(); ctx.moveTo(-90, y); ctx.lineTo(90, y);
    for (let x = -90 + (row % 2) * 11; x < 90; x += 22) {
      ctx.moveTo(x, y); ctx.lineTo(x, y + 13);
    }
    ctx.stroke();
  }
  ctx.fillStyle = shadow; ctx.fillRect(-92, -130, 184, 8);
  ctx.fillStyle = trim;
  for (let x = -80; x <= 80; x += 20) ctx.fillRect(x - 6, -140, 12, 12);
  for (const side of [-1, 1]) drawTower(side * 85, 0, 175, true);
  for (const top of [-109, -60]) for (const x of [-55, -39, 39, 55]) {
    ctx.fillStyle = '#394c4c'; ctx.fillRect(x - 6, top, 12, 19);
    ctx.strokeStyle = trim; ctx.lineWidth = 2; ctx.strokeRect(x - 6, top, 12, 19);
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + 19);
    ctx.moveTo(x - 6, top + 10); ctx.lineTo(x + 6, top + 10); ctx.stroke();
  }
  ctx.fillStyle = royalBlue; ctx.fillRect(-7, -113, 14, 18);
  ctx.fillStyle = heraldryGold; ctx.fillRect(-1, -110, 2, 12); ctx.fillRect(-4, -105, 8, 2);
  ctx.fillStyle = trim;
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-30, -45);
  ctx.quadraticCurveTo(-30, -72, 0, -72); ctx.quadraticCurveTo(30, -72, 30, -45);
  ctx.lineTo(30, 0); ctx.closePath(); ctx.fill();
  for (let i = 0; i <= 8; i += 1) {
    const angle = i * Math.PI / 8;
    ctx.save(); ctx.translate(27 * Math.cos(angle), -45 - 22 * Math.sin(angle)); ctx.rotate(Math.PI / 2 - angle);
    ctx.fillStyle = i % 2 ? '#c1b6a0' : '#b4aa95'; ctx.fillRect(-3, -4, 6, 8); ctx.restore();
  }
  ctx.fillStyle = gate;
  ctx.beginPath(); ctx.moveTo(-23, 0); ctx.lineTo(-23, -45);
  ctx.quadraticCurveTo(-23, -65, 0, -65); ctx.quadraticCurveTo(23, -65, 23, -45);
  ctx.lineTo(23, 0); ctx.closePath(); ctx.fill();
  for (const plank of CASTLE_GATE_PLANKS) {
    const x = plank.x * 0.9, height = (plank.top - 9) * 0.8;
    ctx.fillStyle = plank.color; ctx.fillRect(x - 4.1, -height, 8.2, height);
    ctx.fillStyle = '#947354'; ctx.fillRect(x - 2.5, -height + 3, 0.8, height - 4);
    ctx.fillStyle = gateIron; ctx.fillRect(x - 0.8, -height, 1.6, height);
  }
  for (const y of [-40, -25, -10]) {
    ctx.fillStyle = gateIron; ctx.fillRect(-22, y, 44, 2);
    ctx.fillStyle = metal;
    for (const x of [-18, -9, 0, 9, 18]) ctx.fillRect(x - 0.8, y, 1.6, 1.6);
  }
  ctx.fillStyle = trim; ctx.fillRect(-32, 0, 64, 3);
}
