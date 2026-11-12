import * as THREE from 'three';

export function createCharacterTorsoGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.35, -0.44);
  shape.lineTo(0.35, -0.44);
  shape.quadraticCurveTo(0.43, -0.44, 0.43, -0.35);
  shape.lineTo(0.44, 0.28);
  shape.quadraticCurveTo(0.44, 0.44, 0.31, 0.44);
  shape.lineTo(-0.31, 0.44);
  shape.quadraticCurveTo(-0.44, 0.44, -0.44, 0.28);
  shape.lineTo(-0.43, -0.35);
  shape.quadraticCurveTo(-0.43, -0.44, -0.35, -0.44);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.8, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.05, bevelSegments: 2, curveSegments: 4
  });
  geometry.translate(0, 0, -0.4);
  return geometry;
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

export function createCharacterArms(parent, box, { offset, shoulderY, length, width, depth, color, skin, shortSleeves = false, tattoo = false }) {
  return [-offset, offset].map((x) => {
    const arm = new THREE.Group();
    arm.position.set(x, shoulderY, 0);
    parent.add(arm);
    const sleeveLength = shortSleeves ? length / 2 : length;
    box(0, -sleeveLength / 2, 0, width, sleeveLength, depth, color, arm);
    if (shortSleeves) {
      box(0, -length * 0.75, 0, width, length / 2, depth, skin, arm);
      if (tattoo && x < 0) addJapaneseSleeve((...args) => box(...args, arm),
        { x: 0, y: -length * 0.75, z: 0, width, height: length / 2, depth });
    }
    box(0, -length - 2, 0, width, 5, depth, skin, arm);
    return arm;
  });
}

export function swingCharacterArms(arms, stride, heldArm = -1) {
  arms.forEach((arm, index) => {
    arm.rotation.x = index === heldArm ? 0 : (index === 0 ? -stride : stride);
  });
}
