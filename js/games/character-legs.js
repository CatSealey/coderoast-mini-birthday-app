import * as THREE from 'three';
import { addJapaneseSleeve, shapeCharacterLimb } from '../character-body.js';

function addHips(parent, box, offset, height, width, depth, color, limbGeometry) {
  const hipWidth = offset * 2 + width * 0.75, hipHeight = width * 0.85, hipDepth = depth * 1.12;
  const hips = box(0, height + hipHeight * 0.12, -depth * 0.05, hipWidth, hipHeight, hipDepth, color, parent);
  shapeCharacterLimb(hips, limbGeometry, hipWidth, hipHeight, hipDepth);
}

function addShoe(box, leg, height, width, depth, color, limbGeometry, z) {
  const shoeWidth = width + 1, shoeDepth = depth + 3;
  const shoe = box(0, -height + 2, z, shoeWidth, 4, shoeDepth, color, leg);
  if (limbGeometry && shoe?.isMesh) {
    shoe.geometry = limbGeometry;
    shoe.scale.set(shoeWidth, shoeDepth, 4);
    shoe.rotation.x = Math.PI / 2;
    if (!limbGeometry.boundingBox) limbGeometry.computeBoundingBox();
    shoe.position.y = -height + 4 * limbGeometry.boundingBox.max.z;
  }
  const instep = box(0, -height + 3.1, z - depth * 0.12, width * 0.78, 3.5, depth * 0.66, color, leg);
  shapeCharacterLimb(instep, limbGeometry, width * 0.78, 3.5, depth * 0.66);
  const heel = box(0, -height + 0.65, z - depth * 0.34, width * 0.66, 1.3, depth * 0.3, '#302925', leg);
  shapeCharacterLimb(heel, limbGeometry, width * 0.66, 1.3, depth * 0.3);
  return shoe;
}

export function createCharacterLegs(parent, box, offset, shoeColor, trouserColor = '#302d2a', limbGeometry,
  { height = 22, width = 9, depth = 10 } = {}) {
  addHips(parent, box, offset, height, width, depth, trouserColor, limbGeometry);
  return [-offset, offset].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, height, 0);
    parent.add(leg);
    const upperHeight = height * 0.55;
    const trouser = box(0, -upperHeight / 2, 0, width, upperHeight, depth, trouserColor, leg);
    shapeCharacterLimb(trouser, limbGeometry, width, upperHeight, depth);
    addShoe(box, leg, height, width, depth, shoeColor, limbGeometry, 2);
    const bootHeight = height * 0.24;
    const lowerHeight = height - upperHeight - bootHeight - 1;
    const lower = box(0, -upperHeight - lowerHeight / 2, 0, width * 0.8, lowerHeight, depth * 0.86, trouserColor, leg);
    shapeCharacterLimb(lower, limbGeometry, width * 0.8, lowerHeight, depth * 0.86);
    const knee = box(0, -upperHeight, depth * 0.17, width * 0.77, height * 0.15, depth * 0.85, trouserColor, leg);
    shapeCharacterLimb(knee, limbGeometry, width * 0.77, height * 0.15, depth * 0.85);
    const trouserSeam = `#${new THREE.Color(trouserColor).offsetHSL(0, 0, 0.08).getHexString()}`;
    box(0, -height * 0.55, depth * 0.39, width * 0.38, 0.5, 0.3, trouserSeam, leg);
    const boot = box(0, -height + bootHeight / 2 + 2, 0, width * 0.78, bootHeight, depth * 0.78, shoeColor, leg);
    shapeCharacterLimb(boot, limbGeometry, width * 0.78, bootHeight, depth * 0.78);
    const cuff = box(0, -height + bootHeight + 1.4, 0, width * 0.8, 1, depth * 0.8, '#3c3832', leg);
    shapeCharacterLimb(cuff, limbGeometry, width * 0.8, 1, depth * 0.8);
    const sole = box(0, -height + 0.25, 2, width + 0.5, 0.5, depth + 3, '#302925', leg);
    shapeCharacterLimb(sole, limbGeometry, width + 0.5, 0.5, depth + 3);
    for (const z of [1, 3]) box(0, -height + 3.7, z, width * 0.4, 0.4, 0.6, '#b7a795', leg);
    return leg;
  });
}

export function createPlayerLegs(parent, box, { offset, height = 22, width = 9, depth = 10, shoeColor, shortsColor, skin, limbGeometry, skinGeometry }) {
  addHips(parent, box, offset, height, width, depth, shortsColor, limbGeometry);
  return [-offset, offset].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, height, 0);
    parent.add(leg);
    const shortsHeight = height * 0.36;
    const shorts = box(0, -shortsHeight / 2, 0, width, shortsHeight, depth, shortsColor, leg);
    shapeCharacterLimb(shorts, limbGeometry, width, shortsHeight, depth);
    const hem = box(0, -shortsHeight + 0.6, 0, width + 0.3, 1, depth + 0.3, '#34373a', leg);
    shapeCharacterLimb(hem, limbGeometry, width + 0.3, 1, depth + 0.3);
    const kneeY = -shortsHeight - height * 0.08;
    const knee = box(0, kneeY, depth * 0.16, width * 0.82, height * 0.2, depth * 0.8, skin, leg);
    shapeCharacterLimb(knee, limbGeometry, width * 0.82, height * 0.2, depth * 0.8);
    const calfTop = kneeY - height * 0.04, calfBottom = -height + 4.5;
    const calfHeight = calfTop - calfBottom, calfY = (calfTop + calfBottom) / 2;
    const calfWidth = width * 0.78, calfDepth = depth * 0.8;
    const calf = box(0, calfY, 0, calfWidth, calfHeight, calfDepth, skin, leg);
    shapeCharacterLimb(calf, skinGeometry, calfWidth, calfHeight, calfDepth);
    const ankle = box(0, -height + 4.2, 0, width * 0.44, 4, depth * 0.44, skin, leg);
    shapeCharacterLimb(ankle, limbGeometry, width * 0.44, 4, depth * 0.44);
    if (x > 0) addJapaneseSleeve((...args) => box(...args, leg), {
      x: 0, y: calfY, z: 0, width: calfWidth, height: calfHeight, depth: calfDepth, outerSide: 1,
      tapered: Boolean(skinGeometry)
    });
    addShoe(box, leg, height, width, depth, shoeColor, limbGeometry, 1);
    const sole = box(0, -height + 0.25, 1, width + 0.5, 0.5, depth + 3, '#302925', leg);
    shapeCharacterLimb(sole, limbGeometry, width + 0.5, 0.5, depth + 3);
    for (const z of [0, 2]) box(0, -height + 3.7, z, width * 0.4, 0.4, 0.6, '#c2b5a2', leg);
    return leg;
  });
}
