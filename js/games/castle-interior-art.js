import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { HALL_EXIT_MAT } from './trophy-logic.js';

export const HALL_TABLE_X = Object.freeze([205, 835]);
export const HALL_PLANTER_X = Object.freeze([192, 848]);
export const HALL_SCONCE_X = Object.freeze([68, 972]);
export const HALL_PILLAR_X = Object.freeze([152, 303, 447, 593, 737, 888]);
export const HALL_BOOKCASE_X = Object.freeze([65, 975]);
export const HALL_BOOKCASE_Z = Object.freeze([200, 367.5, 535]);
export const HALL_BOOKCASE_WIDTH = 92;
export const HALL_BANNER_HEIGHT = 105;
export const HALL_RUG = Object.freeze({ width: 360, depth: 250, z: 320 });
export const HALL_TROPHY_ACCENTS = Object.freeze(['#688f89', '#a96f62', '#8875a2', '#668c72', '#bd815b']);
export const HALL_PEDESTAL_WIDTH = 84;
export const HALL_PEDESTAL_DEPTH = 86;

function grain(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function createHallPedestalGeometry() {
  return new RoundedBoxGeometry(1, 1, 1, 4, 0.1);
}

export function addHallPedestal(x, z, index, { box, roundedBox, round, cylinder, orb, parent }) {
  const accent = HALL_TROPHY_ACCENTS[index];
  if (!accent) throw new RangeError('Unknown hall pedestal.');
  roundedBox(x, 3, z + 4, HALL_PEDESTAL_WIDTH, 6, 78, '#3e281c', parent);
  roundedBox(x, 7, z + 4, 80, 2, 74, '#d3b983', parent);
  roundedBox(x, 11, z + 4, 74, 6, 68, '#885d3b', parent);
  roundedBox(x, 15, z + 2, 66, 3, 60, '#513323', parent);
  roundedBox(x, 42, z + 2, 56, 51, 46, '#795035', parent);
  roundedBox(x, 42, z + 26, 48, 42, 2, '#452c20', parent);
  roundedBox(x, 42, z + 27.5, 43, 37, 1, '#b18a5c', parent);
  roundedBox(x, 42, z + 28.5, 39, 33, 1, '#70492f', parent);
  for (const [dx, y, height] of [[-17, 35, 10], [-12, 51, 8], [-7, 32, 6], [8, 52, 7], [13, 33, 9], [17, 48, 12]]) {
    box(x + dx, y, z + 29.1, 0.7, height, 0.3, '#98704b', parent);
  }
  for (const dx of [-25, 25]) {
    box(x + dx, 43, z + 27, 2, 39, 2, '#d3b983', parent);
    round(orb, x + dx, 62, z + 28, 3, 3, 3, '#ead29b', parent);
    for (const y of [28, 35, 42, 49, 56]) {
      round(orb, x + dx, y, z + 28.5, 2, 2, 1, '#e6cc92', parent);
    }
  }
  for (const y of [27, 57]) box(x, y, z + 29.5, 31, 1, 1, '#c6a778', parent);
  const medallion = box(x, 42, z + 30, 12, 12, 1, '#d3b983', parent);
  medallion.rotation.z = Math.PI / 4;
  const inset = box(x, 42, z + 30.7, 7, 7, 1, accent, parent);
  inset.rotation.z = Math.PI / 4;
  for (const dx of [-14, 14]) {
    box(x + dx, 42, z + 30, 8, 1, 1, '#d3b983', parent);
    round(orb, x + dx, 42, z + 30.7, 3, 3, 1, '#e6cc92', parent);
  }
  roundedBox(x, 66, z + 4, 64, 3, 58, '#513323', parent);
  roundedBox(x, 69, z + 5, 74, 4, 70, '#885d3b', parent);
  roundedBox(x, 72, z + 5, 78, 2, 74, '#e0c99a', parent);
  roundedBox(x, 74, z + 5, 72, 2, 68, '#67432d', parent);
  round(cylinder, x, 80, z + 16, 55, 8, 48, '#513323', parent);
  round(cylinder, x, 86, z + 16, 48, 5, 42, accent, parent);
  roundedBox(x, 123, z - 1, 68, 70, 5, '#452c20', parent);
  roundedBox(x, 123, z + 3, 60, 62, 4, '#b18a5c', parent);
  roundedBox(x, 123, z + 6, 54, 56, 4, '#2f3b38', parent);
  for (const dx of [-29, 29]) for (const y of [92, 154]) {
    round(orb, x + dx, y, z + 8, 6, 6, 6, '#e8cd8e', parent);
  }
  const halo = round(cylinder, x, 123, z + 8.5, 44, 1, 44, accent, parent, true);
  halo.rotation.x = Math.PI / 2;
  return halo;
}

export function addHallPresent({ box, round, orb, parent }) {
  box(0, 23, 0, 56, 46, 56, '#315a87', parent);
  box(0, 44, 0, 57, 3, 57, '#203e65', parent);
  box(0, 49, 0, 62, 8, 62, '#4577aa', parent);
  box(0, 53.5, 0, 60, 1, 60, '#8cb3d3', parent);
  for (const side of [-1, 1]) {
    box(0, 24, side * 28.2, 10, 45, 1, '#e8c879', parent);
    box(side * 28.2, 24, 0, 1, 45, 10, '#e8c879', parent);
    for (const dx of [-19, 19]) for (const y of [15, 32]) {
      round(orb, dx, y, side * 28.4, 3, 3, 1, '#a9c7d9', parent);
      round(orb, side * 28.4, y, dx, 1, 3, 3, '#a9c7d9', parent);
    }
    const bow = round(orb, side * 10, 60, 0, 20, 10, 10, '#e8c879', parent);
    bow.rotation.z = side * 0.3;
    const bowFold = round(orb, side * 10, 60, 5, 12, 4, 1, '#bd9251', parent);
    bowFold.rotation.z = side * 0.3;
    const tail = box(side * 8, 55, 9, 8, 1, 18, '#e8c879', parent);
    tail.rotation.y = side * 0.4;
  }
  box(0, 54.5, 0, 62, 1, 10, '#e8c879', parent);
  box(0, 54.6, 0, 10, 1, 62, '#e8c879', parent);
  round(orb, 0, 60, 0, 9, 9, 10, '#f6d991', parent);
}

export function createHallBannerGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-35.5, HALL_BANNER_HEIGHT); shape.lineTo(35.5, HALL_BANNER_HEIGHT);
  shape.lineTo(35.5, HALL_BANNER_HEIGHT * 10 / 72);
  shape.lineTo(0, 0); shape.lineTo(-35.5, HALL_BANNER_HEIGHT * 10 / 72); shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i += 1) {
    uv.setXY(i, (position.getX(i) + 35.5) / 71, position.getY(i) / HALL_BANNER_HEIGHT);
  }
  geometry.computeBoundingBox();
  return geometry;
}

export function createHallExitMatGeometry() {
  const { width, depth } = HALL_EXIT_MAT;
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.absellipse(0, -depth / 2, width / 2, depth, Math.PI, 0, true, 0);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 32);
  const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
  for (let i = 0; i < position.count; i += 1) {
    uv.setXY(i, (position.getX(i) + width / 2) / width, (position.getY(i) + depth / 2) / depth);
  }
  geometry.computeBoundingBox();
  return geometry;
}

export function addHallSconce(x, z, { box, round, cylinder, cone, orb, parent }) {
  const scale = 0.7, originalBox = box, originalRound = round;
  box = (px, py, pz, w, h, d, color, target, glow) =>
    originalBox(x + (px - x) * scale, 118 + (py - 118) * scale, z + (pz - z) * scale,
      w * scale, h * scale, d * scale, color, target, glow);
  round = (shape, px, py, pz, w, h, d, color, target, glow) =>
    originalRound(shape, x + (px - x) * scale, 118 + (py - 118) * scale, z + (pz - z) * scale,
      w * scale, h * scale, d * scale, color, target, glow);
  box(x, 118, z, 20, 48, 5, '#5a4331', parent);
  box(x, 118, z + 3, 16, 43, 2, '#97754b', parent);
  box(x, 118, z + 4.5, 11, 34, 1, '#4d3a2f', parent);
  for (const y of [101, 135]) round(orb, x, y, z + 6, 5, 5, 3, '#eed092', parent);
  for (const dx of [-5, 5]) box(x + dx, 118, z + 5.5, 1, 25, 1, '#d3b479', parent);
  round(orb, x, 118, z + 7, 7, 7, 4, '#b99661', parent);
  box(x, 104, z + 12, 5, 5, 20, '#856640', parent);
  round(orb, x, 104, z + 21, 7, 7, 7, '#c5a36d', parent);
  round(cylinder, x, 109, z + 21, 22, 3, 22, '#80633e', parent);
  round(cylinder, x, 111, z + 21, 19, 3, 19, '#dfc184', parent);
  round(cylinder, x, 119, z + 21, 10, 16, 10, '#f2e4c5', parent);
  round(cylinder, x, 127.5, z + 21, 8, 1, 8, '#fff1d2', parent);
  for (const [dx, dz, height] of [[-4, 2, 6], [3, 3, 4], [1, -4, 5]]) {
    round(cylinder, x + dx, 122 - height / 2, z + 21 + dz, 2.5, height, 2.5, '#fff1d2', parent);
  }
  box(x, 130, z + 21, 1.5, 4, 1.5, '#40342b', parent);
  const flame = round(cone, x, 137, z + 21, 8, 14, 8, '#ffc86b', parent, true);
  round(orb, x, 134, z + 21, 4, 6, 4, '#fff0b5', parent, true);
  return flame;
}

const HALL_BOOK_COLORS = Object.freeze(['#824b49', '#4f6b5b', '#a47e50', '#53647a', '#754f72', '#6f6748', '#995c42', '#3e5b61', '#706048', '#633f48']);

export function hallShelfStack(x, z, shelf) {
  const seed = x * 7 + z * 3 + shelf * 53;
  if (grain(seed, 36) <= 0.55) return null;
  const width = 15 + Math.floor(grain(seed, 37) * 6);
  const left = [-41, -10, 41 - width][Math.floor(grain(seed, 38) * 3)];
  const count = 1 + Math.floor(grain(seed, 39) * 3);
  const books = Array.from({ length: count }, (_, i) => ({
    width: width - 2 - Math.floor(grain(seed + i, 40) * 4),
    color: HALL_BOOK_COLORS[Math.floor(grain(seed + i, 41) * HALL_BOOK_COLORS.length)],
    height: 2.5 + Math.floor(grain(seed + i, 42) * 2)
  }));
  return { left, width, books };
}

export function hallShelfBooks(x, z, shelf) {
  const seed = x * 7 + z * 3 + shelf * 53;
  const books = [];
  const stack = hallShelfStack(x, z, shelf);
  let left = -41;
  for (let i = 0; i < 16; i += 1) {
    const width = 4 + Math.floor(grain(seed + i, 31) * 5);
    if (stack && left < stack.left + stack.width && left + width > stack.left) {
      left = stack.left + stack.width + 1;
    }
    if (left + width > 41) break;
    books.push({
      left, width, height: 13 + Math.floor(grain(seed + i, 32) * 12),
      color: HALL_BOOK_COLORS[Math.floor(grain(seed + i, 33) * HALL_BOOK_COLORS.length)],
      style: Math.floor(grain(seed + i, 34) * 4)
    });
    left += width + 0.5 + Math.floor(grain(seed + i, 35) * 2);
  }
  return books;
}

export function addHallBookcase(x, z, { box, orb, round, parent }) {
  box(x, 65, z, HALL_BOOKCASE_WIDTH - 2, 126, 16, '#49372b', parent);
  box(x, 67, z + 8.5, 84, 112, 2, '#302a27', parent);
  for (const dx of [-44, 44]) box(x + dx, 65, z + 10, 4, 124, 5, '#896344', parent);
  for (const y of [8, 36, 64, 92, 120]) {
    box(x, y, z + 10, HALL_BOOKCASE_WIDTH, 4, 7, '#aa8051', parent);
    box(x, y + 2.5, z + 14, 88, 1, 1, '#d1ae73', parent);
  }
  for (let shelf = 0; shelf < 4; shelf += 1) {
    for (const book of hallShelfBooks(x, z, shelf)) {
      const bx = x + book.left + book.width / 2, bottom = 10 + shelf * 28;
      box(bx, bottom + book.height / 2, z + 10, book.width, book.height, 5, book.color, parent);
      box(bx, bottom + book.height + 0.4, z + 10, book.width - 1, 0.8, 4, '#d8c49f', parent);
      if (book.style !== 1) box(bx, bottom + book.height - 4, z + 13, book.width - 1, 1, 1, '#d5b87d', parent);
      if (book.style === 0 || book.style === 2) box(bx, bottom + 4, z + 13, book.width - 1, 1, 1, '#ba9869', parent);
      if (book.style === 2) round(orb, bx, bottom + book.height / 2, z + 13, 2.5, 3, 1, '#e1c68d', parent);
      if (book.style === 3) box(bx, bottom + book.height / 2, z + 13, 1, book.height - 8, 1, '#c9ad7b', parent);
    }
    const stack = hallShelfStack(x, z, shelf);
    if (stack) {
      const bottom = 10 + shelf * 28;
      let level = bottom;
      for (const book of stack.books) {
        const bx = x + stack.left + stack.width / 2;
        box(bx, level + book.height / 2, z + 10, book.width, book.height, 5, book.color, parent);
        box(bx, level + book.height / 2, z + 13, book.width - 2, 1, 1, '#d8c49f', parent);
        level += book.height + 0.5;
      }
    }
  }
  for (const dx of [-41, 41]) round(orb, x + dx, 122, z + 14, 3, 3, 2, '#e0bd79', parent);
}

export function addHallTable(x, z, index, { box, round, cylinder, cone, orb, parent }) {
  box(x, 34, z, 76, 8, 50, '#765238', parent);
  box(x, 38.5, z, 70, 1, 44, '#a77e52', parent);
  for (const dz of [-17, -8, 1, 10, 19]) box(x, 39.2, z + dz, 68, 0.6, 1, '#c8a373', parent);
  for (const dx of [-29, 29]) for (const dz of [-18, 18]) {
    box(x + dx, 17, z + dz, 7, 34, 7, '#5a4231', parent);
    box(x + dx, 6, z + dz, 8, 3, 8, '#a18055', parent);
    round(orb, x + dx, 40, z + dz, 3, 2, 3, '#d8ba7c', parent);
  }
  box(x, 23, z + 19, 58, 4, 4, '#674832', parent);
  box(x, 29, z + 23, 64, 4, 2, '#4d382b', parent);
  for (const dx of [-22, 0, 22]) round(orb, x + dx, 29, z + 24.5, 3, 3, 1, '#c6a575', parent);
  for (const dx of [-25, -5, 14]) for (const dz of [-13, 6, 16]) {
    box(x + dx, 39.4, z + dz, 9 + (dx + dz + 40) % 6, 0.3, 0.5, '#8e6949', parent);
  }
  if (index === 0) {
    box(x - 9, 41, z, 35, 3, 27, '#593e36', parent);
    for (const dx of [-8, 8]) {
      box(x - 9 + dx, 43, z, 15, 2, 24, '#e2d0aa', parent);
      for (const dz of [-7, -3, 1, 5]) box(x - 9 + dx, 44.2, z + dz, 10, 0.5, 0.7, '#988267', parent);
    }
    box(x - 9, 44, z, 1, 2, 24, '#a38a6a', parent);
    box(x - 9, 44.6, z + 9, 2, 0.6, 7, '#b95e55', parent);
    round(cylinder, x - 17, 44.5, z - 7, 5, 0.7, 5, '#aa916d', parent);
    box(x - 17, 45, z - 7, 1, 0.5, 4, '#765f4b', parent);
    round(cylinder, x + 23, 45, z - 10, 9, 12, 9, '#6d9990', parent);
    round(orb, x + 23, 44, z - 10, 11, 10, 11, '#55b6a1', parent);
    round(orb, x + 21, 46, z - 5, 2, 5, 1, '#d5efe1', parent);
    round(cylinder, x + 23, 52, z - 10, 4, 4, 4, '#aa8358', parent);
    round(cylinder, x + 22, 42, z + 12, 7, 6, 7, '#343a3b', parent);
    const quill = box(x + 19, 48, z + 10, 1, 15, 1, '#d9c9a7', parent);
    quill.rotation.z = -0.5;
    const feather = round(cone, x + 16, 54, z + 10, 5, 10, 2, '#ece0c7', parent);
    feather.rotation.z = -0.5;
  } else {
    for (const [index, [dx, dz, color]] of [[-22, -9, '#718eb6'], [-2, -11, '#ba6b58'], [18, -10, '#8eaf91']].entries()) {
      round(cylinder, x + dx, 41, z + dz, 14, 3, 14, '#6f6a5d', parent);
      round(cylinder, x + dx, 43, z + dz, 10, 1, 10, color, parent, true);
      box(x + dx, 44, z + dz, 2, 1, 6, '#e9dfba', parent);
      if (index !== 1) box(x + dx, 44, z + dz + (index === 2 ? 2 : 0), 6, 1, 2, '#e9dfba', parent);
      if (index === 1) for (const side of [-1, 1]) box(x + dx + side * 2, 44, z + dz - 2, 2, 1, 2, '#e9dfba', parent);
    }
    box(x - 5, 41, z + 10, 34, 2, 11, '#ddcda6', parent);
    for (const dx of [-22, 12]) {
      const roll = round(cylinder, x + dx, 42, z + 10, 4, 14, 4, '#e8d8ae', parent);
      roll.rotation.x = Math.PI / 2;
    }
    for (const dx of [-13, -7, -1, 5]) box(x + dx, 42.5, z + 10, 1, 0.5, 7, '#a98c65', parent);
    round(orb, x + 25, 43, z + 11, 9, 8, 9, '#8b589b', parent);
    round(orb, x + 23, 45, z + 15, 2, 3, 1, '#e0c3e8', parent);
    round(cylinder, x + 25, 48, z + 11, 3, 3, 3, '#b69266', parent);
  }
}

const HALL_BOUQUET = Object.freeze([
  { kind: 'tulip', dx: -10, dz: -8, height: 92 },
  { kind: 'tulip', dx: 4, dz: -10, height: 100 },
  { kind: 'tulip', dx: 12, dz: 3, height: 85 },
  { kind: 'tulip', dx: -4, dz: 9, height: 78 },
  { kind: 'lisianthus', dx: -13, dz: 3, height: 82 },
  { kind: 'lisianthus', dx: -3, dz: -2, height: 88 },
  { kind: 'lisianthus', dx: 8, dz: -3, height: 76 },
  { kind: 'lisianthus', dx: 8, dz: 10, height: 72 },
  { kind: 'bud', dx: -12, dz: -13, height: 102 },
  { kind: 'bud', dx: 13, dz: -10, height: 96 }
]);

export function addHallPlanter(x, z, index, { round, cylinder, orb, parent }) {
  const greens = index ? ['#3e5e43', '#5b7752', '#819270'] : ['#385a40', '#587552', '#839475'];
  round(cylinder, x, 4, z, 43, 8, 43, '#584437', parent);
  round(cylinder, x, 11, z, 48, 12, 48, '#725746', parent);
  round(cylinder, x, 19, z, 52, 8, 52, '#80614b', parent);
  round(cylinder, x, 4, z, 47, 3, 47, '#ad8b65', parent);
  round(cylinder, x, 6, z, 48, 1, 48, '#d0ae7a', parent);
  round(cylinder, x, 21, z, 54, 3, 54, '#5c4436', parent);
  round(cylinder, x, 23, z, 56, 2, 56, '#c19c6c', parent);
  round(cylinder, x, 26, z, 58, 5, 58, '#9d7958', parent);
  round(cylinder, x, 28.5, z, 58, 1, 58, '#dbc095', parent);
  round(cylinder, x, 29, z, 49, 1, 49, '#5a4536', parent);
  round(cylinder, x, 29.5, z, 44, 1, 44, '#433c30', parent);
  for (let i = 0; i < 12; i += 1) {
    const a = i * Math.PI / 6;
    round(orb, x + Math.cos(a) * 25, 17, z + Math.sin(a) * 25, 2.5, 7, 2.5, '#ab8968', parent);
    round(orb, x + Math.cos(a) * 26, 22, z + Math.sin(a) * 26, 2.5, 2.5, 2.5, '#dcc094', parent);
    round(orb, x + Math.cos(a) * 27, 28.5, z + Math.sin(a) * 27, 2, 1, 2, '#f0d7a4', parent);
  }
  for (let i = 0; i < 9; i += 1) {
    const a = i * Math.PI * 2 / 9 + index * 0.3;
    const radius = 9 + i % 3 * 2, height = 49 + i % 4 * 6;
    const leaf = round(orb, x + Math.cos(a) * radius, height, z + Math.sin(a) * radius,
      13 + i % 2 * 3, 31 + i % 3 * 3, 10, greens[i % greens.length], parent);
    leaf.rotation.z = -Math.cos(a) * 0.4;
    leaf.rotation.x = Math.sin(a) * 0.4;
    const highlight = round(orb, x + Math.cos(a) * radius, height + 3, z + Math.sin(a) * radius,
      3, 19, 3, greens[2], parent);
    highlight.rotation.z = leaf.rotation.z;
    highlight.rotation.x = leaf.rotation.x;
  }
  for (const [i, flower] of HALL_BOUQUET.entries()) {
    const fx = x + flower.dx, fz = z + flower.dz, base = flower.height - 6;
    round(cylinder, fx, (27 + base) / 2, fz, 1.8, base - 27, 1.8, '#5e7944', parent);
    if (flower.kind === 'tulip') {
      round(orb, fx, flower.height - 1, fz, 10, 13, 10, '#9d361b', parent);
      for (let p = 0; p < 6; p += 1) {
        const a = p * Math.PI / 3 + i * 0.25;
        const petal = round(orb, fx + Math.cos(a) * 3, flower.height + 1, fz + Math.sin(a) * 3,
          6, 13 + p % 2, 5, ['#d95518', '#e87922', '#bd421b'][p % 3], parent);
        petal.rotation.z = -Math.cos(a) * 0.25;
        petal.rotation.x = Math.sin(a) * 0.25;
      }
      round(orb, fx, flower.height + 3, fz, 4, 8, 4, '#f29132', parent);
    } else if (flower.kind === 'lisianthus') {
      round(orb, fx, flower.height - 1, fz, 12, 8, 12, '#35173a', parent);
      for (let p = 0; p < 8; p += 1) {
        const a = p * Math.PI / 4 + i * 0.3;
        const petal = round(orb, fx + Math.cos(a) * 4, flower.height + 1, fz + Math.sin(a) * 4,
          6, 6, 5, ['#48204e', '#62306b', '#77417a', '#502457'][p % 4], parent);
        petal.rotation.y = -a;
      }
      for (let p = 0; p < 5; p += 1) {
        const a = p * Math.PI * 2 / 5;
        round(orb, fx + Math.cos(a) * 2, flower.height + 3, fz + Math.sin(a) * 2,
          4, 5, 4, p % 2 ? '#522657' : '#713875', parent);
      }
      round(orb, fx, flower.height + 4, fz, 3, 2, 3, '#d0ac72', parent);
    } else {
      round(orb, fx, flower.height, fz, 6, 11, 6, '#4b2852', parent);
      round(orb, fx, flower.height - 4, fz, 7, 5, 7, '#607a4d', parent);
      round(orb, fx + 1, flower.height + 2, fz, 2, 5, 2, '#784982', parent);
    }
  }
}

export function paintHallBanner(ctx, index) {
  if (!Number.isInteger(index) || index < 0 || index >= HALL_TROPHY_ACCENTS.length) {
    throw new RangeError('Unknown hall banner.');
  }
  const color = HALL_TROPHY_ACCENTS[index];
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(256, 0); ctx.lineTo(256, 275);
  ctx.lineTo(128, 320); ctx.lineTo(0, 275); ctx.closePath(); ctx.clip();
  ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 320);
  for (let x = 10; x < 256; x += 32) {
    ctx.fillStyle = x % 64 === 10 ? 'rgba(255,244,215,.08)' : 'rgba(29,25,29,.10)';
    ctx.fillRect(x, 0, 11, 320);
  }
  for (let i = 0; i < 450; i += 1) {
    ctx.fillStyle = i % 2 ? 'rgba(39,30,30,.09)' : 'rgba(255,239,195,.13)';
    ctx.fillRect(grain(i, 20) * 256, grain(i, 21) * 320, 1, 2 + grain(i, 22) * 5);
  }
  ctx.strokeStyle = '#e2c68d'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(16, 11); ctx.lineTo(16, 264); ctx.lineTo(128, 302);
  ctx.lineTo(240, 264); ctx.lineTo(240, 11); ctx.stroke();
  ctx.strokeStyle = '#a27d50'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(25, 16); ctx.lineTo(25, 257); ctx.lineTo(128, 290);
  ctx.lineTo(231, 257); ctx.lineTo(231, 16); ctx.stroke();
  ctx.fillStyle = '#e7cd92';
  for (let y = 30; y < 250; y += 18) for (const x of [31, 223]) ctx.fillRect(x - 1, y, 2, 5);
  ctx.beginPath(); ctx.arc(128, 139, 62, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(34,30,32,.24)'; ctx.fill();
  ctx.strokeStyle = '#e2c68d'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = '#f3dfab'; ctx.fillStyle = '#f3dfab'; ctx.lineWidth = 7;
  if (index === 0) {
    ctx.beginPath(); ctx.arc(128, 108, 19, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, 127); ctx.lineTo(128, 185); ctx.lineTo(151, 185);
    ctx.moveTo(128, 171); ctx.lineTo(145, 171); ctx.stroke();
  } else if (index === 1) {
    ctx.beginPath(); ctx.arc(128, 139, 40, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#594941'; ctx.font = 'bold 62px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText('8', 128, 160);
  } else if (index === 2) {
    ctx.beginPath(); ctx.moveTo(107, 101); ctx.lineTo(149, 101); ctx.lineTo(165, 181);
    ctx.lineTo(128, 169); ctx.lineTo(91, 181); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, 121); ctx.lineTo(140, 136); ctx.lineTo(128, 151);
    ctx.lineTo(116, 136); ctx.closePath(); ctx.fill();
  } else if (index === 3) {
    ctx.beginPath(); ctx.moveTo(141, 100); ctx.bezierCurveTo(91, 104, 91, 174, 141, 178);
    ctx.bezierCurveTo(119, 163, 119, 116, 141, 100); ctx.closePath(); ctx.fill();
    for (const [x, y] of [[155, 117], [161, 154]]) {
      ctx.fillRect(x - 2, y - 9, 4, 18); ctx.fillRect(x - 9, y - 2, 18, 4);
    }
  } else {
    ctx.beginPath(); ctx.ellipse(128, 148, 42, 30, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(128, 148, 18, 30, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillRect(125, 108, 7, 11);
    ctx.beginPath(); ctx.moveTo(129, 109); ctx.lineTo(145, 101); ctx.lineTo(148, 110); ctx.stroke();
  }
  ctx.fillStyle = '#ead39c';
  for (const x of [91, 128, 165]) {
    ctx.fillRect(x - 2, 223, 4, 13); ctx.fillRect(x - 6, 227, 12, 4);
  }
  ctx.restore();
}

export function paintHallStone(ctx) {
  ctx.fillStyle = '#77766a'; ctx.fillRect(0, 0, 512, 512);
  const colors = ['#969184', '#8d8a7e', '#a29b8c', '#858579', '#9c988b'];
  for (let row = 0; row < 8; row += 1) for (let col = -1; col < 5; col += 1) {
    const x = col * 128 + (row % 2) * 64, y = row * 64, seed = row * 7 + col + 1;
    ctx.fillStyle = colors[seed % colors.length]; ctx.fillRect(x + 2, y + 2, 124, 60);
    ctx.fillStyle = 'rgba(255,235,202,.16)'; ctx.fillRect(x + 5, y + 5, 117, 2);
    ctx.fillStyle = 'rgba(45,40,32,.15)'; ctx.fillRect(x + 4, y + 58, 119, 2);
    for (let i = 0; i < 12; i += 1) {
      ctx.fillStyle = i % 3 ? 'rgba(50,45,38,.10)' : 'rgba(244,231,207,.18)';
      ctx.fillRect(x + 7 + grain(seed * 20 + i, 1) * 110, y + 9 + grain(seed * 20 + i, 2) * 45,
        1 + grain(i, 3) * 6, 1 + grain(i, 4) * 2);
    }
    if (seed % 3 === 0) {
      ctx.strokeStyle = 'rgba(59,55,47,.23)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 60, y + 3); ctx.lineTo(x + 57, y + 13);
      ctx.lineTo(x + 61, y + 18); ctx.lineTo(x + 58, y + 25); ctx.stroke();
    }
  }
}

export function paintHallFloor(ctx) {
  ctx.fillStyle = '#514b40'; ctx.fillRect(0, 0, 1024, 768);
  const colors = ['#aaa08b', '#a19884', '#b2a68e', '#96917f', '#aaa28f', '#b7ab96'];
  for (let row = 0; row < 8; row += 1) for (let col = 0; col < 8; col += 1) {
    const x = col * 128, y = row * 96, seed = col * 7 + row * 13;
    ctx.fillStyle = colors[seed % colors.length]; ctx.fillRect(x + 2, y + 2, 124, 92);
    ctx.strokeStyle = 'rgba(227,211,178,.3)'; ctx.lineWidth = 1; ctx.strokeRect(x + 5, y + 5, 118, 86);
    ctx.fillStyle = 'rgba(45,40,34,.10)'; ctx.fillRect(x + 5, y + 88, 117, 2);
    for (let i = 0; i < 18; i += 1) {
      ctx.fillStyle = i % 3 ? 'rgba(68,59,48,.09)' : 'rgba(244,229,199,.16)';
      ctx.fillRect(x + 8 + grain(seed * 20 + i, 5) * 108, y + 9 + grain(seed * 20 + i, 6) * 75,
        2 + grain(i, 7) * 8, 1 + grain(i, 8) * 2);
    }
    ctx.strokeStyle = 'rgba(62,56,48,.22)'; ctx.beginPath();
    ctx.moveTo(x + 12, y + 27 + seed % 5 * 5);
    ctx.lineTo(x + 45, y + 30 + seed % 5 * 5); ctx.lineTo(x + 58, y + 26 + seed % 5 * 5); ctx.stroke();
    if (seed % 4 === 0) {
      ctx.beginPath(); ctx.moveTo(x + 96, y + 5); ctx.lineTo(x + 91, y + 17);
      ctx.lineTo(x + 95, y + 23); ctx.lineTo(x + 90, y + 31); ctx.stroke();
    }
  }
  ctx.strokeStyle = '#6e5f4b'; ctx.lineWidth = 12; ctx.strokeRect(22, 22, 980, 724);
  ctx.strokeStyle = '#c9b380'; ctx.lineWidth = 3; ctx.strokeRect(33, 33, 958, 702);
  ctx.fillStyle = '#d5bf8d';
  for (let x = 56; x < 980; x += 32) for (const y of [33, 735]) ctx.fillRect(x, y - 2, 3, 4);
  for (let y = 55; y < 720; y += 32) for (const x of [33, 991]) ctx.fillRect(x - 2, y, 4, 3);
}

export function paintHallRug(ctx) {
  ctx.fillStyle = '#492c2d'; ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = '#782e38'; ctx.fillRect(10, 10, 236, 492);
  for (let i = 0; i < 1400; i += 1) {
    ctx.fillStyle = i % 2 ? 'rgba(34,18,24,.10)' : 'rgba(247,192,143,.08)';
    ctx.fillRect(11 + grain(i, 11) * 234, 11 + grain(i, 12) * 490, 1, 2 + grain(i, 13) * 4);
  }
  ctx.strokeStyle = '#c7a86c'; ctx.lineWidth = 3; ctx.strokeRect(18, 18, 220, 476);
  ctx.strokeStyle = '#d7ba78'; ctx.lineWidth = 1; ctx.strokeRect(25, 25, 206, 462);
  for (let y = 50; y < 470; y += 90) {
    ctx.beginPath(); ctx.moveTo(128, y); ctx.lineTo(150, y + 28); ctx.lineTo(128, y + 56);
    ctx.lineTo(106, y + 28); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(128, y + 17); ctx.lineTo(136, y + 28); ctx.lineTo(128, y + 39); ctx.lineTo(120, y + 28); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#d1b576';
    for (const x of [78, 178]) {
      ctx.fillRect(x - 1, y + 23, 2, 10); ctx.fillRect(x - 5, y + 27, 10, 2);
    }
  }
  for (let y = 36; y < 485; y += 16) for (const x of [35, 221]) {
    ctx.fillStyle = y % 32 === 4 ? '#dfc48c' : '#9d7958';
    ctx.fillRect(x - 2, y, 4, 4);
  }
}

export function paintHallExitMat(ctx) {
  ctx.save();
  ctx.beginPath(); ctx.ellipse(128, 96, 128, 96, 0, Math.PI, 2 * Math.PI);
  ctx.closePath(); ctx.clip();
  ctx.fillStyle = '#49322c'; ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#803b3d'; ctx.fillRect(7, 7, 242, 89);
  for (let i = 0; i < 500; i += 1) {
    ctx.fillStyle = i % 2 ? 'rgba(255,218,156,.12)' : 'rgba(32,20,19,.14)';
    ctx.fillRect(8 + grain(i, 50) * 240, 8 + grain(i, 51) * 80, 2, 1 + grain(i, 52) * 3);
  }
  for (const [radiusX, radiusY, color, width] of [[115, 83, '#d7b87a', 3], [107, 77, '#bc9564', 1]]) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    ctx.ellipse(128, 94, radiusX, radiusY, 0, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.stroke();
  }
  ctx.strokeStyle = '#e2c992'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(128, 35); ctx.lineTo(146, 54); ctx.lineTo(128, 73); ctx.lineTo(110, 54); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = '#e2c992';
  for (const x of [65, 191]) {
    ctx.fillRect(x - 1, 49, 2, 10); ctx.fillRect(x - 5, 53, 10, 2);
  }
  ctx.restore();
}

export function drawHallFurniture(ctx) {
  for (const x of HALL_BOOKCASE_X) for (const z of HALL_BOOKCASE_Z) {
    ctx.fillStyle = '#49372b'; ctx.fillRect(x - 46, z - 8, HALL_BOOKCASE_WIDTH, 22);
    ctx.fillStyle = '#aa8051'; ctx.fillRect(x - 44, z - 6, 88, 18);
    ctx.fillStyle = '#302a27'; ctx.fillRect(x - 42, z - 4, 84, 14);
    for (const book of hallShelfBooks(x, z, 0)) {
      const depth = 7 + Math.floor((book.height - 13) / 3);
      ctx.fillStyle = book.color; ctx.fillRect(x + book.left, z + 8 - depth, book.width, depth);
      ctx.fillStyle = '#d8c49f'; ctx.fillRect(x + book.left, z + 8, book.width, 1);
      if (book.style !== 1) {
        ctx.fillStyle = '#d5b87d'; ctx.fillRect(x + book.left + 1, z + 9 - depth, book.width - 2, 1);
      }
      if (book.style === 2) {
        ctx.fillStyle = '#e1c68d'; ctx.fillRect(x + book.left + book.width / 2 - 0.5, z + 5 - depth / 2, 1, 2);
      }
    }
    const stack = hallShelfStack(x, z, 0);
    if (stack) {
      const top = stack.books.at(-1), left = x + stack.left + (stack.width - top.width) / 2;
      ctx.fillStyle = top.color; ctx.fillRect(left, z - 3, top.width, 11);
      ctx.fillStyle = '#d8c49f'; ctx.fillRect(left + 1, z + 6, top.width - 2, 1);
      ctx.fillStyle = '#c9ad7b'; ctx.fillRect(left + 3, z, top.width - 6, 1);
    }
  }
  for (const [index, x] of HALL_TABLE_X.entries()) {
    ctx.fillStyle = 'rgba(20,18,14,.28)'; ctx.fillRect(x - 36, 308, 76, 49);
    ctx.fillStyle = '#4a3b30'; ctx.fillRect(x - 38, 305, 76, 50);
    ctx.fillStyle = '#a18055'; ctx.fillRect(x - 35, 309, 70, 42);
    ctx.strokeStyle = '#dec093'; ctx.lineWidth = 1; ctx.strokeRect(x - 32, 312, 64, 36);
    ctx.fillStyle = '#8e6949';
    for (const dx of [-25, -5, 14]) for (const dz of [-13, 6, 16]) ctx.fillRect(x + dx, 330 + dz, 8, 0.7);
    for (const dx of [-33, 33]) for (const dz of [-21, 21]) {
      ctx.fillStyle = '#d8ba7c'; ctx.beginPath(); ctx.arc(x + dx, 330 + dz, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    if (index === 0) {
      ctx.fillStyle = '#593e36'; ctx.fillRect(x - 27, 316, 35, 28);
      ctx.fillStyle = '#e2d0aa'; ctx.fillRect(x - 25, 318, 15, 24); ctx.fillRect(x - 8, 318, 14, 24);
      ctx.fillStyle = '#988267';
      for (const dz of [-7, -3, 1, 5]) {
        ctx.fillRect(x - 23, 330 + dz, 10, 1); ctx.fillRect(x - 6, 330 + dz, 10, 1);
      }
      ctx.strokeStyle = '#aa916d'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x - 17, 323, 3, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#b95e55'; ctx.fillRect(x - 10, 335, 2, 7);
      ctx.fillStyle = '#55b6a1'; ctx.beginPath(); ctx.arc(x + 23, 320, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d5efe1'; ctx.fillRect(x + 20, 317, 2, 4);
      ctx.fillStyle = '#343a3b'; ctx.beginPath(); ctx.arc(x + 22, 342, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ece0c7'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 22, 342); ctx.lineTo(x + 15, 334); ctx.stroke();
    } else {
      for (const [rune, [dx, color]] of [[-22, '#718eb6'], [-2, '#ba6b58'], [18, '#8eaf91']].entries()) {
        ctx.fillStyle = '#6f6a5d'; ctx.beginPath(); ctx.arc(x + dx, 320, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + dx, 320, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e9dfba'; ctx.fillRect(x + dx - 1, 317, 2, 6);
        if (rune !== 1) ctx.fillRect(x + dx - 3, rune === 2 ? 321 : 319, 6, 2);
        if (rune === 1) { ctx.fillRect(x + dx - 3, 317, 2, 2); ctx.fillRect(x + dx + 1, 317, 2, 2); }
      }
      ctx.fillStyle = '#ddcda6'; ctx.fillRect(x - 22, 335, 34, 11);
      ctx.fillStyle = '#a98c65';
      for (const dx of [-13, -7, -1, 5]) ctx.fillRect(x + dx, 337, 1, 7);
      ctx.fillStyle = '#8b589b'; ctx.beginPath(); ctx.arc(x + 25, 341, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e0c3e8'; ctx.fillRect(x + 23, 338, 2, 3);
    }
  }
  for (const [index, x] of HALL_PLANTER_X.entries()) {
    ctx.fillStyle = 'rgba(20,18,14,.3)'; ctx.beginPath(); ctx.ellipse(x + 4, 514, 32, 28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5c4436'; ctx.beginPath(); ctx.arc(x, 510, 29, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#9d7958'; ctx.beginPath(); ctx.arc(x, 510, 27.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#dbc095'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#5a4536'; ctx.beginPath(); ctx.arc(x, 510, 24.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#433c30'; ctx.beginPath(); ctx.arc(x, 510, 22, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 12; i += 1) {
      const a = i * Math.PI / 6;
      ctx.fillStyle = '#f0d7a4'; ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 26.5, 510 + Math.sin(a) * 26.5, 1, 0, Math.PI * 2); ctx.fill();
    }
    const greens = index ? ['#3e5e43', '#5b7752', '#819270'] : ['#385a40', '#587552', '#839475'];
    for (let i = 0; i < 9; i += 1) {
      const a = i * Math.PI * 2 / 9 + index * 0.3, radius = 9 + i % 3 * 2;
      ctx.fillStyle = greens[i % 3]; ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * radius, 510 + Math.sin(a) * radius, 5, 10 + i % 3, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = greens[2]; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (radius - 6), 510 + Math.sin(a) * (radius - 6));
      ctx.lineTo(x + Math.cos(a) * (radius + 7), 510 + Math.sin(a) * (radius + 7)); ctx.stroke();
    }
    for (const flower of HALL_BOUQUET) {
      const fx = x + flower.dx, fz = 510 + flower.dz;
      if (flower.kind === 'tulip') {
        ctx.fillStyle = '#9d361b'; ctx.beginPath(); ctx.arc(fx, fz, 5, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 5; i += 1) {
          const a = i * Math.PI * 2 / 5;
          ctx.fillStyle = ['#d95518', '#e87922', '#bd421b'][i % 3];
          ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 2.5, fz + Math.sin(a) * 2.5, 2.5, 4, a + Math.PI / 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#f29132'; ctx.beginPath(); ctx.arc(fx, fz, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (flower.kind === 'lisianthus') {
        ctx.fillStyle = '#35173a'; ctx.beginPath(); ctx.arc(fx, fz, 6, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 8; i += 1) {
          const a = i * Math.PI / 4;
          ctx.fillStyle = ['#48204e', '#62306b', '#77417a', '#502457'][i % 4];
          ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 3.5, fz + Math.sin(a) * 3.5, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#d0ac72'; ctx.beginPath(); ctx.arc(fx, fz, 1.2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = '#4b2852'; ctx.beginPath(); ctx.ellipse(fx, fz, 2.5, 3.5, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#784982'; ctx.beginPath(); ctx.arc(fx, fz, 1, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  for (const [xs, z] of [[HALL_SCONCE_X, 35], [HALL_PILLAR_X, 56]]) for (const x of xs) {
    ctx.fillStyle = '#5a4331'; ctx.fillRect(x - 7, z, 14, 6);
    ctx.fillStyle = '#c5a36d'; ctx.fillRect(x - 5.5, z + 1.5, 11, 3.5);
    ctx.fillStyle = '#80633e'; ctx.fillRect(x - 7, z + 6, 14, 3);
    ctx.fillStyle = '#f2e4c5'; ctx.beginPath(); ctx.arc(x, z + 7, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffc86b'; ctx.beginPath(); ctx.ellipse(x, z + 6.5, 2.1, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff0b5'; ctx.beginPath(); ctx.arc(x, z + 7, 1.4, 0, Math.PI * 2); ctx.fill();
  }
}

export function drawHallDisplay(ctx, x, z, index, image) {
  const accent = HALL_TROPHY_ACCENTS[index];
  if (!accent) throw new RangeError('Unknown hall pedestal.');
  for (const [left, top, width, depth, radius, color] of [
    [-40, -31, 86, 78, 8, 'rgba(20,18,14,.3)'],
    [-42, -35, 84, 78, 8, '#3e281c'],
    [-40, -33, 80, 74, 7, '#d3b983'],
    [-38, -31, 76, 70, 7, '#885d3b'],
    [-36, -29, 72, 66, 6, '#513323']
  ]) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x + left, z + top, width, depth, radius); ctx.fill();
  }
  ctx.strokeStyle = '#e0c99a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x - 34, z - 27, 68, 62, 5); ctx.stroke();
  ctx.strokeStyle = '#b18a5c';
  ctx.beginPath(); ctx.roundRect(x - 31, z - 24, 62, 56, 4); ctx.stroke();
  for (const [dx, dz, length] of [[-29, -18, 12], [-28, 12, 12], [27, -17, 14], [28, 10, 11]]) {
    ctx.fillStyle = '#98704b'; ctx.fillRect(x + dx, z + dz, 0.8, length);
  }
  ctx.fillStyle = accent; ctx.beginPath(); ctx.ellipse(x, z + 4, 29, 27, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#34423c'; ctx.beginPath(); ctx.ellipse(x, z + 4, 25, 23, 0, 0, Math.PI * 2); ctx.fill();
  for (const dx of [-32, 32]) for (const dz of [-25, 33]) {
    ctx.fillStyle = '#e8cd8e'; ctx.beginPath(); ctx.arc(x + dx, z + dz, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  if (image) ctx.drawImage(image, x - 23, z - 19, 46, 46);
  else {
    ctx.strokeStyle = '#c9ae79'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, z - 3); ctx.lineTo(x + 7, z + 4);
    ctx.lineTo(x, z + 11); ctx.lineTo(x - 7, z + 4); ctx.closePath(); ctx.stroke();
  }
}

export function drawHallPresent(ctx, x, z) {
  ctx.fillStyle = 'rgba(20,18,14,.3)'; ctx.fillRect(x - 21, z - 20, 52, 52);
  ctx.fillStyle = '#315a87'; ctx.fillRect(x - 25, z - 25, 50, 50);
  ctx.fillStyle = '#4577aa'; ctx.fillRect(x - 24, z - 24, 48, 48);
  ctx.strokeStyle = '#8cb3d3'; ctx.lineWidth = 1; ctx.strokeRect(x - 23, z - 23, 46, 46);
  for (const dx of [-17, 17]) for (const dz of [-17, 17]) {
    ctx.fillStyle = '#a9c7d9'; ctx.beginPath(); ctx.arc(x + dx, z + dz, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#e8c879'; ctx.fillRect(x - 5, z - 25, 10, 50); ctx.fillRect(x - 25, z - 5, 50, 10);
  ctx.strokeStyle = '#f5dc9a'; ctx.lineWidth = 4;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(x + side * 9, z, 8, 5, side * 0.4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = '#f6d991'; ctx.beginPath(); ctx.arc(x, z, 3.5, 0, Math.PI * 2); ctx.fill();
}
