import * as THREE from 'three';

export function createCharacterLegs(parent, box, offset, shoeColor) {
  return [-offset, offset].map((x) => {
    const leg = new THREE.Group();
    leg.position.set(x, 22, 0);
    parent.add(leg);
    box(0, -11, 0, 9, 22, 10, '#302d2a', leg);
    box(0, -20, 2, 10, 4, 13, shoeColor, leg);
    return leg;
  });
}
