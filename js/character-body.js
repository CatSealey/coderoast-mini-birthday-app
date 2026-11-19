import * as THREE from 'three';

export const CHARACTER_RISE = 9;

export function createCharacterHeadGeometry() {
  return new THREE.IcosahedronGeometry(0.5, 1);
}

function facetedBodyGeometry(profile) {
  const positions = [];
  const ring = ({ y, width, depth, front = depth, back = depth }) => [
    [-width * 0.52, y, front], [width * 0.52, y, front],
    [width * 0.82, y, front * 0.84], [width, y, front * 0.56],
    [width, y, -back * 0.56], [width * 0.82, y, -back * 0.84],
    [width * 0.52, y, -back], [-width * 0.52, y, -back],
    [-width * 0.82, y, -back * 0.84], [-width, y, -back * 0.56],
    [-width, y, front * 0.56], [-width * 0.82, y, front * 0.84]
  ];
  const rings = profile.map(ring);
  const triangle = (a, b, c) => positions.push(...a, ...b, ...c);
  for (let layer = 0; layer < rings.length - 1; layer += 1) {
    for (let i = 0; i < rings[layer].length; i += 1) {
      const next = (i + 1) % rings[layer].length;
      triangle(rings[layer][i], rings[layer][next], rings[layer + 1][next]);
      triangle(rings[layer][i], rings[layer + 1][next], rings[layer + 1][i]);
    }
  }
  for (let i = 0; i < rings[0].length; i += 1) {
    const next = (i + 1) % rings[0].length;
    triangle([0, profile[0].y, 0], rings[0][next], rings[0][i]);
    triangle([0, profile.at(-1).y, 0], rings.at(-1)[i], rings.at(-1)[next]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createCharacterFaceGeometry() {
  const geometry = facetedBodyGeometry([
    { y: -0.5, width: 0.24, depth: 0.36 },
    { y: -0.38, width: 0.33, depth: 0.42 },
    { y: -0.12, width: 0.42, depth: 0.45 },
    { y: 0.22, width: 0.45, depth: 0.46 },
    { y: 0.4, width: 0.37, depth: 0.4 },
    { y: 0.5, width: 0.25, depth: 0.28 }
  ]);
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
  for (let i = 0; i < positions.count; i += 3) {
    if (normals.getZ(i) > 0.8 && normals.getY(i) < 0 && positions.getY(i) < -0.1) {
      for (let j = 0; j < 3; j += 1) normals.setXYZ(i + j, 0, 0, 1);
    }
  }
  normals.needsUpdate = true;
  return geometry;
}

export function createCharacterLimbGeometry() {
  return facetedBodyGeometry([
    { y: -0.5, width: 0.36, depth: 0.4 },
    { y: -0.22, width: 0.4, depth: 0.44 },
    { y: 0.08, width: 0.43, depth: 0.46 },
    { y: 0.3, width: 0.47, depth: 0.46 },
    { y: 0.5, width: 0.3, depth: 0.34 }
  ]);
}

const SKIN_PROFILE = [
  { y: -0.5, width: 0.32, depth: 0.34 },
  { y: -0.3, width: 0.38, depth: 0.42 },
  { y: 0, width: 0.45, depth: 0.48 },
  { y: 0.3, width: 0.47, depth: 0.49 },
  { y: 0.5, width: 0.43, depth: 0.46 }
];

export function createCharacterSkinGeometry() {
  return facetedBodyGeometry(SKIN_PROFILE);
}

export function shapeCharacterLimb(part, geometry, width, height, depth) {
  if (!geometry || !part?.isMesh) return;
  part.geometry = geometry;
  part.scale.set(width, height, depth);
}

const TORSO_PROFILE = [
  { y: -0.45, width: 0.34, front: 0.31, back: 0.34 },
  { y: -0.25, width: 0.28, front: 0.29, back: 0.31 },
  { y: 0.02, width: 0.35, front: 0.33, back: 0.32 },
  { y: 0.23, width: 0.43, front: 0.38, back: 0.34 },
  { y: 0.37, width: 0.39, front: 0.33, back: 0.31 },
  { y: 0.47, width: 0.25, front: 0.25, back: 0.26 }
];

export function createCharacterTorsoGeometry() {
  return facetedBodyGeometry(TORSO_PROFILE);
}

function torsoFront(offset, depth, width, x = 0) {
  const upper = TORSO_PROFILE.findIndex((point) => point.y >= offset);
  const a = TORSO_PROFILE[upper <= 0 ? 0 : upper === -1 ? TORSO_PROFILE.length - 1 : upper - 1];
  const b = TORSO_PROFILE[upper === -1 ? TORSO_PROFILE.length - 1 : upper];
  const fraction = a === b ? 0 : (offset - a.y) / (b.y - a.y);
  const radius = width * (a.width + (b.width - a.width) * fraction);
  const across = Math.abs(x) / radius;
  if (across > 1) return -Infinity;
  const facet = across <= 0.52 ? 1 : across <= 0.82
    ? 1 - (across - 0.52) * 0.16 / 0.3
    : 0.84 - (across - 0.82) * 0.28 / 0.18;
  return depth * (a.front + (b.front - a.front) * fraction) * facet;
}

function shade(color, lightness) {
  return `#${new THREE.Color(color).offsetHSL(0, 0, lightness).getHexString()}`;
}

export function addCharacterBelt(box, { width, depth, y, color, buckle, limbGeometry }) {
  const beltWidth = width * 0.72, beltDepth = depth * 0.72;
  const belt = box(0, y, 0, beltWidth, 3.5, beltDepth, color);
  shapeCharacterLimb(belt, limbGeometry, beltWidth, 3.5, beltDepth);
  if (buckle) {
    const z = beltDepth * 0.46;
    box(0, y, z + 0.35, width * 0.16, 2.8, 0.8, buckle);
    box(0, y, z + 0.8, width * 0.07, 1.2, 0.3, color);
  }
}

export function addCharacterClothingDetails(box, { width, height, depth, centerY, color, kind = 'npc', variant = 0, limbGeometry, torsoGeometry }) {
  const surface = (offset, x = 0) => Math.max(torsoFront(offset, depth, width, x),
    depth * 0.04 + torsoFront((offset - 0.015) / 0.9, depth * 0.96, width * 0.82, x)) + 0.12;
  const front = surface(0);
  const trim = shade(color, kind === 'npc' ? 0.13 : 0.07);
  const shadow = shade(color, -0.08);
  const leather = kind === 'npc' ? '#70513a' : '#181b1c';
  const metal = kind === 'npc' ? '#d3b47a' : '#969b96';

  const innerColor = kind === 'npc'
    ? ['#d3c5a6', '#a7b8ab', '#c4b39b'][variant % 3]
    : shade(color, kind === 'player' ? 0.045 : 0.025);
  const innerWidth = width * 0.82, innerHeight = height * 0.9, innerDepth = depth * 0.96;
  const inner = box(0, centerY + height * 0.015, depth * 0.04, innerWidth, innerHeight, innerDepth, innerColor);
  shapeCharacterLimb(inner, torsoGeometry, innerWidth, innerHeight, innerDepth);

  for (const side of [-1, 1]) {
    const collarWidth = width * 0.16, collarHeight = height * 0.16;
    const collar = box(side * width * 0.16, centerY + height * 0.28, surface(0.28, width * 0.16) + 0.25,
      collarWidth, collarHeight, 0.8, trim);
    shapeCharacterLimb(collar, limbGeometry, collarWidth, collarHeight, 0.8);
    collar.rotation.z = side * 0.48;
    box(side * width * 0.19, centerY - height * 0.18, surface(-0.18, width * 0.19) + 0.2,
      width * 0.15, height * 0.09, 0.5, shadow);
    box(side * width * 0.19, centerY - height * 0.13, surface(-0.13, width * 0.19) + 0.4,
      width * 0.15, height * 0.018, 0.5, trim);
    box(side * width * 0.19, centerY - height * 0.18, surface(-0.18, width * 0.19) + 0.55,
      width * 0.035, height * 0.025, 0.3, metal);
    for (const offset of [-0.12, 0.01, 0.14]) {
      const seamX = side * (width * 0.28 - height * (offset - 0.01) * Math.tan(0.1));
      const seam = box(seamX, centerY + height * offset, surface(offset, seamX) + 0.2,
        width * 0.035, height * 0.15, 0.4, shadow);
      seam.rotation.z = side * 0.1;
    }
  }
  for (const offset of [-0.12, 0, 0.12]) {
    box(0, centerY + height * offset, surface(offset) + 0.15,
      width * 0.02, height * 0.13, 0.35, trim);
  }
  if (kind === 'npc') {
    const direction = variant % 2 ? 1 : -1;
    for (const offset of [-0.24, -0.105, 0.03, 0.165, 0.3]) {
      const strapX = direction * (width * 0.05 - height * (offset - 0.03) * Math.tan(0.4));
      const strap = box(strapX, centerY + height * offset, surface(offset, strapX) + 0.22,
        width * 0.13, height * 0.16, 0.45, leather);
      strap.rotation.z = direction * 0.4;
    }
    const clasp = box(direction * width * 0.05, centerY + height * 0.08, surface(0.08) + 0.65,
      width * 0.17, height * 0.1, 0.45, metal);
    clasp.rotation.z = direction * 0.4;
    box(direction * width * 0.05, centerY + height * 0.08, surface(0.08) + 0.93,
      width * 0.07, height * 0.04, 0.2, leather);
    box(0, centerY + height * 0.32, surface(0.32) + 0.45,
      width * 0.12, height * 0.07, 0.6, '#d6c6a3');
    box(0, centerY - height * 0.32, -front, width * 0.68, height * 0.08, 0.8, trim);
    for (const side of [-1, 1]) {
      const panelWidth = width * 0.27, panelHeight = height * 0.25;
      const panel = box(side * width * 0.24, centerY - height * 0.5, front * 0.65,
        panelWidth, panelHeight, 1.3, shadow);
      shapeCharacterLimb(panel, limbGeometry, panelWidth, panelHeight, 1.3);
      panel.rotation.z = side * 0.1;
      box(side * width * 0.24, centerY - height * 0.6, front * 0.65 + 0.8,
        width * 0.19, height * 0.025, 0.5, trim);
    }
    if (variant % 3 !== 1) {
      const apronWidth = width * (variant % 3 === 0 ? 0.42 : 0.34), apronHeight = height * 0.42;
      const apronColor = variant % 3 === 0 ? '#b7a788' : '#a79270';
      const apronX = variant % 3 === 0 ? 0 : width * 0.07;
      const apron = box(apronX, centerY - height * 0.54, front * 0.69, apronWidth, apronHeight, 1.1, apronColor);
      shapeCharacterLimb(apron, limbGeometry, apronWidth, apronHeight, 1.1);
      box(apronX, centerY - height * 0.69, front * 0.69 + 0.7,
        apronWidth * 0.62, height * 0.025, 0.35, trim);
    }
    if (variant % 3 === 1) {
      for (const side of [-1, 1]) {
        const coatWidth = width * 0.27, coatHeight = height * 0.4, coatDepth = depth * 0.83;
        const coat = box(side * width * 0.27, centerY - height * 0.43, 0,
          coatWidth, coatHeight, coatDepth, shadow);
        shapeCharacterLimb(coat, limbGeometry, coatWidth, coatHeight, coatDepth);
        coat.rotation.z = side * 0.08;
      }
      box(0, centerY + height * 0.28, -front * 0.85, width * 0.82, height * 0.18, 1.2, shadow);
      box(0, centerY + height * 0.24, front + 0.8, width * 0.18, height * 0.08, 1.2, metal);
    } else if (variant % 3 === 2) {
      box(width * 0.33, centerY - height * 0.4, front + 1.1, width * 0.24, height * 0.19, 1.4, leather);
      box(width * 0.33, centerY - height * 0.36, front + 1.9, width * 0.2, height * 0.035, 0.5, metal);
    }
  } else {
    for (const side of [-1, 1]) for (const offset of [-0.12, 0.06, 0.24]) {
      box(side * width * 0.065, centerY + height * offset, surface(offset) + 0.6,
        width * 0.025, height * 0.025, 0.7, metal);
    }
  }
}

export const TATTOO_INK = '#344b59';
export const TATTOO_ACCENT = '#a9474a';

function skinAt(offset, dimension) {
  const upper = SKIN_PROFILE.findIndex((point) => point.y >= offset);
  if (upper === -1) return SKIN_PROFILE.at(-1)[dimension];
  if (upper === 0) return SKIN_PROFILE[0][dimension];
  const a = SKIN_PROFILE[upper - 1], b = SKIN_PROFILE[upper];
  return a[dimension] + (b[dimension] - a[dimension]) * (offset - a.y) / (b.y - a.y);
}

export function addJapaneseSleeve(box, { x, y, z, width, height, depth, outerSide = -1, tapered = false }) {
  const radius = (offset, dimension) => tapered ? skinAt(offset, dimension) : 0.5;
  const slope = (offset, dimension) => tapered
    ? (skinAt(offset + 0.001, dimension) - skinAt(offset - 0.001, dimension)) / 0.002
    : 0;
  const frontPiece = (face, offset, partX, partWidth, partHeight, color, lift = 0.08) => {
    const piece = box(x + width * partX, y + height * offset, z + face * (depth * radius(offset, 'depth') + lift),
      width * partWidth, height * partHeight, 0.16, color);
    piece.rotation.x = face * Math.atan(depth * slope(offset, 'depth') / height);
    return piece;
  };
  for (const offset of [-0.3, 0, 0.3]) {
    for (const face of [-1, 1]) {
      const wave = frontPiece(face, offset, -0.14, 0.42, 0.1, TATTOO_INK);
      wave.rotation.z = 0.22;
      const crest = frontPiece(face, offset + 0.045, 0.18, 0.25, 0.1, TATTOO_INK);
      crest.rotation.z = -0.3;
    }
    const outer = box(x + outerSide * (width * radius(offset, 'width') + 0.08), y + height * offset, z,
      0.16, height * 0.1, depth * 0.48, TATTOO_INK);
    outer.rotation.z = -outerSide * Math.atan(width * slope(offset, 'width') / height);
  }

  for (const face of [-1, 1]) {
    frontPiece(face, 0.14, 0.12, 0.22, 0.12, TATTOO_ACCENT, 0.18);
    box(x + width * 0.12, y + height * 0.14, z + face * (depth * radius(0.14, 'depth') + 0.28),
      width * 0.07, height * 0.05, 0.08, '#e8b6a3');
  }
}

export function characterArmOffset(offset, width) {
  return offset - width * 0.48;
}

export function createCharacterArms(parent, box, { offset, shoulderY, length, width, depth, color, skin, shortSleeves = false, tattoo = false, limbGeometry, skinGeometry }) {
  return [-offset, offset].map((x) => {
    const arm = new THREE.Group();
    arm.position.set(Math.sign(x) * characterArmOffset(offset, width), shoulderY, 0);
    arm.userData.restRotation = Math.sign(x) * 0.08;
    arm.rotation.z = arm.userData.restRotation;
    parent.add(arm);
    const sleeveLength = shortSleeves ? length * 0.46 : length * 0.54;
    const sleeve = box(0, -sleeveLength / 2, 0, width, sleeveLength, depth, color, arm);
    shapeCharacterLimb(sleeve, limbGeometry, width, sleeveLength, depth);
    const shoulderWidth = width * 0.82, shoulderHeight = width * 0.8, shoulderDepth = depth * 0.85;
    const shoulder = box(x < 0 ? width * 0.42 : -width * 0.42, -shoulderHeight * 0.3, 0,
      shoulderWidth, shoulderHeight, shoulderDepth, color, arm);
    shapeCharacterLimb(shoulder, limbGeometry, shoulderWidth, shoulderHeight, shoulderDepth);
    const seam = shade(color, 0.09);
    const cuff = box(0, -sleeveLength + 1, 0, width * 0.8, 1, depth * 0.84, seam, arm);
    shapeCharacterLimb(cuff, limbGeometry, width * 0.8, 1, depth * 0.84);
    box(0, -sleeveLength * 0.35, depth * 0.46, width * 0.45, 0.7, 0.5, seam, arm);
    const elbow = box(0, -sleeveLength, depth * 0.07, width * 0.78, length * 0.13, depth * 0.86,
      shortSleeves ? skin : color, arm);
    shapeCharacterLimb(elbow, limbGeometry, width * 0.78, length * 0.13, depth * 0.86);
    const lowerHeight = length - sleeveLength - 2;
    const forearmWidth = width * 0.78, forearmDepth = depth * 0.76;
    const forearm = box(0, -sleeveLength - lowerHeight / 2, 0, forearmWidth, lowerHeight, forearmDepth, shortSleeves ? skin : color, arm);
    shapeCharacterLimb(forearm, shortSleeves ? skinGeometry : limbGeometry, forearmWidth, lowerHeight, forearmDepth);
    if (tattoo && shortSleeves && x < 0) addJapaneseSleeve((...args) => box(...args, arm),
      { x: 0, y: -sleeveLength - lowerHeight / 2, z: 0, width: forearmWidth, height: lowerHeight, depth: forearmDepth, tapered: Boolean(skinGeometry) });
    const wrist = box(0, -length + 0.8, 0, width * 0.52, 2.8, depth * 0.5, shortSleeves ? skin : color, arm);
    shapeCharacterLimb(wrist, limbGeometry, width * 0.52, 2.8, depth * 0.5);
    const hand = box(0, -length - 2, 0, width * 0.64, 4.2, depth * 0.55, skin, arm);
    shapeCharacterLimb(hand, limbGeometry, width * 0.64, 4.2, depth * 0.55);
    const thumb = box(x < 0 ? width * 0.26 : -width * 0.26, -length - 1.3, depth * 0.06,
      width * 0.2, 2.3, depth * 0.24, skin, arm);
    shapeCharacterLimb(thumb, limbGeometry, width * 0.2, 2.3, depth * 0.24);
    return arm;
  });
}

export function swingCharacterArms(arms, stride, heldArm = -1) {
  arms.forEach((arm, index) => {
    arm.rotation.x = index === heldArm ? 0 : (index === 0 ? -stride : stride);
  });
}
