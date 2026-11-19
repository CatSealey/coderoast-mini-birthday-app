import * as THREE from 'three';
import { addJapaneseSleeve, shapeCharacterLimb } from '../character-body.js';

export function createCharacterLegs(parent, box, offset, shoeColor, trouserColor = '#302d2a', limbGeometry,
  { height = 22, width = 9, depth = 10 } = {}) {
  return [-offset, offset].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, height, 0);
    parent.add(leg);
    const trouser = box(0, -height / 2, 0, width, height, depth, trouserColor, leg);
    shapeCharacterLimb(trouser, limbGeometry, width, height, depth);
    const shoe = box(0, -height + 2, 2, width + 1, 4, depth + 3, shoeColor, leg);
    shapeCharacterLimb(shoe, limbGeometry, width + 1, 4, depth + 3);
    box(0, -height * 0.45, depth / 2 + 0.2, width * 0.75, 1, 0.5, '#465047', leg);
    box(0, -height * 0.38, depth * 0.45, width * 0.45, 0.5, 0.4, '#697569', leg);
    const cuff = box(0, -height + 5, 0, width + 0.5, 3, depth + 0.5, '#3c3832', leg);
    shapeCharacterLimb(cuff, limbGeometry, width + 0.5, 3, depth + 0.5);
    const sole = box(0, -height + 0.4, 2, width + 1.2, 0.8, depth + 3.2, '#302925', leg);
    shapeCharacterLimb(sole, limbGeometry, width + 1.2, 0.8, depth + 3.2);
    for (const z of [1, 4]) box(0, -height + 4.2, z, width * 0.55, 0.5, 1, '#b7a795', leg);
    box(0, -height + 1.5, 2 + (depth + 3) * 0.41, width * 0.58, 0.5, 0.35, '#8c7764', leg);
    return leg;
  });
}

export function createPlayerLegs(parent, box, { offset, height = 22, width = 9, depth = 10, shoeColor, shortsColor, skin, limbGeometry, skinGeometry }) {
  return [-offset, offset].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, height, 0);
    parent.add(leg);
    const shortsHeight = height * 0.42;
    const exposedHeight = height - shortsHeight;
    const shorts = box(0, -shortsHeight / 2, 0, width, shortsHeight, depth, shortsColor, leg);
    shapeCharacterLimb(shorts, limbGeometry, width, shortsHeight, depth);
    const hem = box(0, -shortsHeight + 0.6, 0, width + 0.3, 1, depth + 0.3, '#34373a', leg);
    shapeCharacterLimb(hem, limbGeometry, width + 0.3, 1, depth + 0.3);
    const calf = box(0, -shortsHeight - exposedHeight / 2, 0, width, exposedHeight, depth, skin, leg);
    shapeCharacterLimb(calf, skinGeometry, width, exposedHeight, depth);
    if (x > 0) addJapaneseSleeve((...args) => box(...args, leg), {
      x: 0, y: -shortsHeight - exposedHeight / 2, z: 0, width, height: exposedHeight, depth, outerSide: 1
    });
    const shoe = box(0, -height + 2, 1, width + 1, 4, depth + 3, shoeColor, leg);
    shapeCharacterLimb(shoe, limbGeometry, width + 1, 4, depth + 3);
    const sole = box(0, -height + 0.4, 1, width + 1.2, 0.8, depth + 3.2, '#302925', leg);
    shapeCharacterLimb(sole, limbGeometry, width + 1.2, 0.8, depth + 3.2);
    for (const z of [0, 3]) box(0, -height + 4.1, z, width * 0.55, 0.5, 1, '#c2b5a2', leg);
    box(0, -height + 1.5, 1 + (depth + 3) * 0.41, width * 0.58, 0.5, 0.35, '#8c7764', leg);
    return leg;
  });
}
