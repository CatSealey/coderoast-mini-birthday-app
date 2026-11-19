import * as THREE from 'three';

export function createCharacterHeadGeometry() {
  return new THREE.IcosahedronGeometry(0.5, 1);
}

function facetedBodyGeometry(profile) {
  const positions = [];
  const ring = ({ y, width, depth }) => [
    [-width * 0.62, y, depth], [width * 0.62, y, depth],
    [width, y, depth * 0.56], [width, y, -depth * 0.56],
    [width * 0.62, y, -depth], [-width * 0.62, y, -depth],
    [-width, y, -depth * 0.56], [-width, y, depth * 0.56]
  ];
  const rings = profile.map(ring);
  const triangle = (a, b, c) => positions.push(...a, ...b, ...c);
  for (let layer = 0; layer < rings.length - 1; layer += 1) {
    for (let i = 0; i < 8; i += 1) {
      const next = (i + 1) % 8;
      triangle(rings[layer][i], rings[layer][next], rings[layer + 1][next]);
      triangle(rings[layer][i], rings[layer + 1][next], rings[layer + 1][i]);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    const next = (i + 1) % 8;
    triangle([0, profile[0].y, 0], rings[0][next], rings[0][i]);
    triangle([0, profile.at(-1).y, 0], rings.at(-1)[i], rings.at(-1)[next]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createCharacterLimbGeometry() {
  return facetedBodyGeometry([
    { y: -0.5, width: 0.36, depth: 0.4 },
    { y: -0.22, width: 0.4, depth: 0.44 },
    { y: 0.22, width: 0.48, depth: 0.48 },
    { y: 0.5, width: 0.42, depth: 0.43 }
  ]);
}

export function createCharacterSkinGeometry() {
  return facetedBodyGeometry([
    { y: -0.5, width: 0.5, depth: 0.5 },
    { y: 0.5, width: 0.5, depth: 0.5 }
  ]);
}

export function shapeCharacterLimb(part, geometry, width, height, depth) {
  if (!geometry || !part?.isMesh) return;
  part.geometry = geometry;
  part.scale.set(width, height, depth);
}

const TORSO_PROFILE = [
  { y: -0.45, width: 0.34, depth: 0.4 },
  { y: -0.25, width: 0.29, depth: 0.4 },
  { y: 0.02, width: 0.35, depth: 0.45 },
  { y: 0.23, width: 0.43, depth: 0.48 },
  { y: 0.37, width: 0.39, depth: 0.42 },
  { y: 0.47, width: 0.25, depth: 0.32 }
];

export function createCharacterTorsoGeometry() {
  return facetedBodyGeometry(TORSO_PROFILE);
}

function torsoFront(offset, depth) {
  if (offset <= TORSO_PROFILE[0].y) return depth * TORSO_PROFILE[0].depth;
  if (offset >= TORSO_PROFILE.at(-1).y) return depth * TORSO_PROFILE.at(-1).depth;
  const upper = TORSO_PROFILE.findIndex((point) => point.y >= offset);
  const a = TORSO_PROFILE[upper - 1], b = TORSO_PROFILE[upper];
  return depth * (a.depth + (b.depth - a.depth) * (offset - a.y) / (b.y - a.y));
}

function shade(color, lightness) {
  return `#${new THREE.Color(color).offsetHSL(0, 0, lightness).getHexString()}`;
}

export function addCharacterBelt(box, { width, depth, y, color, buckle, limbGeometry }) {
  const beltWidth = width * 0.72, beltDepth = depth * 0.88;
  const belt = box(0, y, 0, beltWidth, 3.5, beltDepth, color);
  shapeCharacterLimb(belt, limbGeometry, beltWidth, 3.5, beltDepth);
  if (buckle) {
    const z = beltDepth * 0.46;
    box(0, y, z + 0.35, width * 0.16, 2.8, 0.8, buckle);
    box(0, y, z + 0.8, width * 0.07, 1.2, 0.3, color);
  }
}

export function addCharacterClothingDetails(box, { width, height, depth, centerY, color, kind = 'npc', variant = 0, limbGeometry }) {
  const surface = (offset) => torsoFront(offset, depth) + 0.3;
  const front = surface(0);
  const trim = shade(color, kind === 'npc' ? 0.13 : 0.07);
  const shadow = shade(color, -0.08);
  const leather = kind === 'npc' ? '#70513a' : '#181b1c';
  const metal = kind === 'npc' ? '#d3b47a' : '#969b96';

  for (const side of [-1, 1]) {
    const collar = box(side * width * 0.12, centerY + height * 0.32, surface(0.32) + 0.25,
      width * 0.2, height * 0.07, 0.7, trim);
    collar.rotation.z = side * 0.6;
    box(side * width * 0.19, centerY - height * 0.18, surface(-0.18) + 0.2,
      width * 0.15, height * 0.09, 0.5, shadow);
    box(side * width * 0.19, centerY - height * 0.13, surface(-0.13) + 0.4,
      width * 0.15, height * 0.018, 0.5, trim);
    box(side * width * 0.19, centerY - height * 0.18, surface(-0.18) + 0.55,
      width * 0.035, height * 0.025, 0.3, metal);
    for (const offset of [-0.08, 0.06, 0.2]) {
      const fold = box(side * width * 0.24, centerY + height * offset, surface(offset),
        width * 0.1, height * 0.025, 0.35, trim);
      fold.rotation.z = side * 0.18;
    }
  }
  box(0, centerY, front + 0.2, width * 0.02, height * 0.36, 0.5, trim);
  if (kind === 'npc') {
    const direction = variant % 2 ? 1 : -1;
    const strap = box(direction * width * 0.05, centerY + height * 0.03, front + 0.8,
      width * 0.13, height * 0.68, 0.8, leather);
    strap.rotation.z = direction * 0.4;
    const clasp = box(direction * width * 0.05, centerY + height * 0.08, front + 1.9,
      width * 0.17, height * 0.1, 0.6, metal);
    clasp.rotation.z = direction * 0.4;
    box(direction * width * 0.05, centerY + height * 0.08, front + 2.25,
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
    const apronWidth = width * 0.27, apronHeight = height * 0.32;
    const apronColor = variant % 3 === 0 ? '#b7a788' : variant % 3 === 1 ? shade(color, -0.12) : '#a79270';
    const apron = box(0, centerY - height * 0.52, front * 0.69, apronWidth, apronHeight, 1.1, apronColor);
    shapeCharacterLimb(apron, limbGeometry, apronWidth, apronHeight, 1.1);
    box(0, centerY - height * 0.63, front * 0.69 + 0.7,
      apronWidth * 0.62, height * 0.025, 0.35, trim);
    if (variant % 3 === 1) {
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

export function addJapaneseSleeve(box, { x, y, z, width, height, depth, outerSide = -1 }) {
  for (const offset of [-0.3, 0, 0.3]) {
    for (const face of [-1, 1]) {
      const faceZ = z + face * (depth / 2 + 0.08);
      const wave = box(x - width * 0.14, y + height * offset, faceZ,
        width * 0.42, height * 0.1, 0.16, TATTOO_INK);
      wave.rotation.z = 0.22;
      const crest = box(x + width * 0.18, y + height * (offset + 0.045), faceZ,
        width * 0.25, height * 0.1, 0.16, TATTOO_INK);
      crest.rotation.z = -0.3;
    }
    box(x + outerSide * (width / 2 + 0.08), y + height * offset, z,
      0.16, height * 0.1, depth * 0.7, TATTOO_INK);
  }

  for (const face of [-1, 1]) {
    box(x + width * 0.12, y + height * 0.14, z + face * (depth / 2 + 0.18),
      width * 0.22, height * 0.12, 0.16, TATTOO_ACCENT);
    box(x + width * 0.12, y + height * 0.14, z + face * (depth / 2 + 0.28),
      width * 0.07, height * 0.05, 0.08, '#e8b6a3');
  }
}

export function characterArmOffset(offset, width) {
  return offset - width * 0.18;
}

export function createCharacterArms(parent, box, { offset, shoulderY, length, width, depth, color, skin, shortSleeves = false, tattoo = false, limbGeometry, skinGeometry }) {
  return [-offset, offset].map((x) => {
    const arm = new THREE.Group();
    arm.position.set(Math.sign(x) * characterArmOffset(offset, width), shoulderY, 0);
    parent.add(arm);
    const sleeveLength = shortSleeves ? length / 2 : length;
    const sleeve = box(0, -sleeveLength / 2, 0, width, sleeveLength, depth, color, arm);
    shapeCharacterLimb(sleeve, limbGeometry, width, sleeveLength, depth);
    const shoulderWidth = width * 1.2, shoulderHeight = sleeveLength * 0.28, shoulderDepth = depth * 1.02;
    const shoulder = box(x < 0 ? width * 0.42 : -width * 0.42, -sleeveLength * 0.14, 0,
      shoulderWidth, shoulderHeight, shoulderDepth, color, arm);
    shapeCharacterLimb(shoulder, limbGeometry, shoulderWidth, shoulderHeight, shoulderDepth);
    const seam = shade(color, 0.09);
    const cuff = box(0, -sleeveLength + 1, 0, width * 0.83, 2, depth * 0.87, seam, arm);
    shapeCharacterLimb(cuff, limbGeometry, width * 0.83, 2, depth * 0.87);
    box(0, -sleeveLength * 0.35, depth * 0.46, width * 0.45, 0.7, 0.5, seam, arm);
    box(0, -sleeveLength * 0.58, depth * 0.45, width * 0.38, 0.5, 0.4, seam, arm);
    box(0, -sleeveLength + 1, depth * 0.41, width * 0.35, 0.45, 0.3, shade(color, 0.13), arm);
    if (shortSleeves) {
      const forearm = box(0, -length * 0.75, 0, width, length / 2, depth, skin, arm);
      shapeCharacterLimb(forearm, skinGeometry, width, length / 2, depth);
      if (tattoo && x < 0) addJapaneseSleeve((...args) => box(...args, arm),
        { x: 0, y: -length * 0.75, z: 0, width, height: length / 2, depth });
    }
    const hand = box(0, -length - 2, 0, width * 0.85, 5, depth * 0.8, skin, arm);
    shapeCharacterLimb(hand, limbGeometry, width * 0.85, 5, depth * 0.8);
    const thumb = box(x < 0 ? width * 0.42 : -width * 0.42, -length - 1.5, depth * 0.08,
      width * 0.3, 3.2, depth * 0.37, skin, arm);
    shapeCharacterLimb(thumb, skinGeometry, width * 0.3, 3.2, depth * 0.37);
    box(0, -length - 2, depth * 0.37 + 0.15, width * 0.55, 1, 0.4, shade(skin, 0.05), arm);
    return arm;
  });
}

export function swingCharacterArms(arms, stride, heldArm = -1) {
  arms.forEach((arm, index) => {
    arm.rotation.x = index === heldArm ? 0 : (index === 0 ? -stride : stride);
  });
}
