import * as THREE from 'three';
import { addJapaneseSleeve } from '../character-body.js';

export function createCharacterLegs(parent, box, offset, shoeColor, trouserColor = '#302d2a') {
  return [-offset, offset].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 22, 0);
    parent.add(leg);
    box(0, -11, 0, 9, 22, 10, trouserColor, leg);
    box(0, -20, 2, 10, 4, 13, shoeColor, leg);
    return leg;
  });
}

export function createPlayerLegs(parent, box, { offset, height = 22, width = 9, depth = 10, shoeColor, shortsColor, skin }) {
  return [-offset, offset].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, height, 0);
    parent.add(leg);
    const shortsHeight = height * 0.42;
    const exposedHeight = height - shortsHeight;
    box(0, -shortsHeight / 2, 0, width, shortsHeight, depth, shortsColor, leg);
    box(0, -shortsHeight - exposedHeight / 2, 0, width, exposedHeight, depth, skin, leg);
    if (x > 0) addJapaneseSleeve((...args) => box(...args, leg), {
      x: 0, y: -shortsHeight - exposedHeight / 2, z: 0, width, height: exposedHeight, depth, outerSide: 1
    });
    box(0, -height + 2, 1, width + 1, 4, depth + 3, shoeColor, leg);
    return leg;
  });
}
