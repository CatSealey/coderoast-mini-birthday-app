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
    box(0, -height + 2, 2, width + 1, 4, depth + 3, shoeColor, leg);
    box(0, -height * 0.45, depth / 2 + 0.2, width * 0.75, 1, 0.5, '#465047', leg);
    box(0, -height + 5, 0, width + 0.5, 3, depth + 0.5, '#3c3832', leg);
    box(0, -height + 0.4, 2, width + 1.2, 0.8, depth + 3.2, '#302925', leg);
    for (const z of [1, 4]) box(0, -height + 4.2, z, width * 0.55, 0.5, 1, '#b7a795', leg);
    return leg;
  });
}

export function createPlayerLegs(parent, box, { offset, height = 22, width = 9, depth = 10, shoeColor, shortsColor, skin, limbGeometry }) {
  return [-offset, offset].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, height, 0);
    parent.add(leg);
    const shortsHeight = height * 0.42;
    const exposedHeight = height - shortsHeight;
    const shorts = box(0, -shortsHeight / 2, 0, width, shortsHeight, depth, shortsColor, leg);
    shapeCharacterLimb(shorts, limbGeometry, width, shortsHeight, depth);
    box(0, -shortsHeight + 0.6, 0, width + 0.3, 1, depth + 0.3, '#34373a', leg);
    box(0, -shortsHeight - exposedHeight / 2, 0, width, exposedHeight, depth, skin, leg);
    if (x > 0) addJapaneseSleeve((...args) => box(...args, leg), {
      x: 0, y: -shortsHeight - exposedHeight / 2, z: 0, width, height: exposedHeight, depth, outerSide: 1
    });
    box(0, -height + 2, 1, width + 1, 4, depth + 3, shoeColor, leg);
    box(0, -height + 0.4, 1, width + 1.2, 0.8, depth + 3.2, '#302925', leg);
    for (const z of [0, 3]) box(0, -height + 4.1, z, width * 0.55, 0.5, 1, '#c2b5a2', leg);
    return leg;
  });
}
