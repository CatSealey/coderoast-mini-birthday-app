import * as THREE from 'three';

export function createCharacterHeadGeometry() {
  return new THREE.IcosahedronGeometry(0.5, 1);
}

export function createCharacterLimbGeometry() {
  const source = new THREE.CylinderGeometry(0.5, 0.39, 1, 6);
  const geometry = source.toNonIndexed();
  source.dispose();
  geometry.computeVertexNormals();
  return geometry;
}

export function shapeCharacterLimb(part, geometry, width, height, depth) {
  if (!geometry || !part?.isMesh) return;
  part.geometry = geometry;
  part.scale.set(width, height, depth);
}

export function createCharacterTorsoGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.31, -0.44);
  shape.lineTo(0.31, -0.44);
  shape.quadraticCurveTo(0.37, -0.44, 0.37, -0.35);
  shape.lineTo(0.44, 0.27);
  shape.quadraticCurveTo(0.45, 0.43, 0.3, 0.44);
  shape.lineTo(-0.3, 0.44);
  shape.quadraticCurveTo(-0.45, 0.43, -0.44, 0.27);
  shape.lineTo(-0.37, -0.35);
  shape.quadraticCurveTo(-0.37, -0.44, -0.31, -0.44);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.8, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 2, curveSegments: 4
  });
  geometry.translate(0, 0, -0.4);
  return geometry;
}

function shade(color, lightness) {
  return `#${new THREE.Color(color).offsetHSL(0, 0, lightness).getHexString()}`;
}

export function addCharacterClothingDetails(box, { width, height, depth, centerY, color, kind = 'npc', variant = 0 }) {
  const front = depth / 2 + 0.3;
  const trim = shade(color, kind === 'npc' ? 0.13 : 0.07);
  const shadow = shade(color, -0.08);
  const leather = kind === 'npc' ? '#70513a' : '#181b1c';
  const metal = kind === 'npc' ? '#d3b47a' : '#969b96';

  for (const side of [-1, 1]) {
    box(side * width * 0.36, centerY, front, width * 0.035, height * 0.72, 0.6, shadow);
    const collar = box(side * width * 0.16, centerY + height * 0.32, front + 0.5,
      width * 0.23, height * 0.09, 1, trim);
    collar.rotation.z = side * 0.45;
    box(side * width * 0.3, centerY - height * 0.18, front + 0.4,
      width * 0.19, height * 0.14, 0.8, shadow);
    box(side * width * 0.3, centerY - height * 0.12, front + 0.9,
      width * 0.19, height * 0.025, 0.8, trim);
  }
  box(0, centerY + height * 0.02, front + 0.4, width * 0.025, height * 0.52, 0.8, trim);
  if (kind === 'npc') {
    const direction = variant % 2 ? 1 : -1;
    const strap = box(direction * width * 0.07, centerY + height * 0.03, front + 1,
      width * 0.16, height * 0.82, 1.4, leather);
    strap.rotation.z = direction * 0.4;
    const clasp = box(direction * width * 0.05, centerY + height * 0.08, front + 1.9,
      width * 0.17, height * 0.1, 0.6, metal);
    clasp.rotation.z = direction * 0.4;
    box(0, centerY - height * 0.4, front + 1, width * 0.18, height * 0.09, 1, metal);
    box(0, centerY - height * 0.4, front + 1.6, width * 0.09, height * 0.04, 0.5, leather);
    box(0, centerY - height * 0.32, -front, width * 0.68, height * 0.08, 0.8, trim);
    for (const side of [-1, 1]) {
      const panel = box(side * width * 0.29, centerY - height * 0.52, front * 0.7,
        width * 0.28, height * 0.26, 1.5, shadow);
      panel.rotation.z = side * 0.1;
      box(side * width * 0.29, centerY - height * 0.63, front * 0.7 + 0.9,
        width * 0.27, height * 0.035, 0.7, trim);
    }
    if (variant % 3 === 1) {
      box(0, centerY + height * 0.28, -front * 0.85, width * 0.82, height * 0.18, 1.2, shadow);
      box(0, centerY + height * 0.24, front + 0.8, width * 0.18, height * 0.08, 1.2, metal);
    } else if (variant % 3 === 2) {
      box(width * 0.33, centerY - height * 0.4, front + 1.1, width * 0.24, height * 0.19, 1.4, leather);
      box(width * 0.33, centerY - height * 0.36, front + 1.9, width * 0.2, height * 0.035, 0.5, metal);
    }
  } else {
    for (const side of [-1, 1]) for (const offset of [-0.12, 0.06, 0.24]) {
      box(side * width * 0.065, centerY + height * offset, front + 1,
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

export function createCharacterArms(parent, box, { offset, shoulderY, length, width, depth, color, skin, shortSleeves = false, tattoo = false, limbGeometry }) {
  return [-offset, offset].map((x) => {
    const arm = new THREE.Group();
    arm.position.set(x, shoulderY, 0);
    parent.add(arm);
    const sleeveLength = shortSleeves ? length / 2 : length;
    const sleeve = box(0, -sleeveLength / 2, 0, width, sleeveLength, depth, color, arm);
    shapeCharacterLimb(sleeve, limbGeometry, width, sleeveLength, depth);
    const seam = shade(color, 0.09);
    box(0, -sleeveLength + 1, 0, width + 0.5, 2, depth + 0.5, seam, arm);
    box(0, -sleeveLength * 0.35, depth / 2 + 0.3, width * 0.6, 1, 0.5, seam, arm);
    if (shortSleeves) {
      box(0, -length * 0.75, 0, width, length / 2, depth, skin, arm);
      if (tattoo && x < 0) addJapaneseSleeve((...args) => box(...args, arm),
        { x: 0, y: -length * 0.75, z: 0, width, height: length / 2, depth });
    }
    box(0, -length - 2, 0, width, 5, depth, skin, arm);
    box(0, -length - 2, depth / 2 + 0.25, width * 0.65, 1, 0.5, shade(skin, 0.05), arm);
    return arm;
  });
}

export function swingCharacterArms(arms, stride, heldArm = -1) {
  arms.forEach((arm, index) => {
    arm.rotation.x = index === heldArm ? 0 : (index === 0 ? -stride : stride);
  });
}
