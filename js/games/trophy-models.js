import * as THREE from 'three';
import { createPumpkinGeometry } from '../world/pumpkin-scenery.js';

export function createTrophyModel(index, material) {
  const model = new THREE.Group();
  function part(geometry, color, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material(color));
    mesh.position.set(x, y, z);
    model.add(mesh);
    return mesh;
  }
  const box = (w, h, d, color, x, y, z) => part(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  const sphere = (r, color, x, y, z) => part(new THREE.SphereGeometry(r, 24, 16), color, x, y, z);
  const ring = (radius, tube, color, x, y, z) => part(new THREE.TorusGeometry(radius, tube, 8, 24), color, x, y, z);

  if (index === 0) {
    ring(12, 4, '#e2bc60', 0, 130, 0);
    box(7, 32, 7, '#cfa750', 0, 106, 0);
    box(17, 5, 7, '#e2bc60', 5, 92, 0);
    box(5, 8, 7, '#e2bc60', 11, 96, 0);
    sphere(3, '#f4df9b', 0, 130, 4);
    ring(12, 0.9, '#fae5a5', 0, 130, 4);
    box(2, 24, 1, '#f3db91', -2, 106, 4);
    for (const y of [100, 111]) box(8, 2, 8, '#b58c40', 0, y, 0);
    box(4, 4, 8, '#cfa750', 15, 88, 0);
    ring(8.5, 0.6, '#a67b36', 0, 130, 4.2);
    for (const [x, y] of [[0, 142], [-12, 130], [12, 130], [0, 118]]) {
      sphere(1.5, '#fff0b8', x, y, 4.3);
    }
    box(9, 3, 8, '#e8c878', 0, 115, 0);
    box(3, 19, 1, '#a97d37', 2, 104, 4);
    box(8, 1, 1, '#fff0b8', 7, 94, 4);
    box(2, 4, 1, '#a97d37', 12, 91, 4);
  } else if (index === 1) {
    sphere(25, '#191c20', 0, 116, 0);
    part(new THREE.CircleGeometry(10, 32), '#f2eee0', 0, 118, 24.7);
    ring(3, 1.15, '#1b1b1b', 0, 121, 24.9);
    ring(3.5, 1.15, '#1b1b1b', 0, 114, 24.9);
    sphere(3, '#ffffff', -10, 128, 19);
    ring(10, 0.7, '#c9c4b4', 0, 118, 24.9);
    sphere(1.5, '#d7e4dc', -5, 133, 16);
    sphere(1, '#d7e4dc', -13, 124, 19);
    ring(10.8, 0.45, '#a09f98', 0, 118, 24.7);
    const sheen = sphere(3, '#93a7aa', -13, 131, 15);
    sheen.scale.set(1.7, 0.45, 0.35); sheen.rotation.z = Math.PI / 4;
    for (const [x, y, z] of [[-16, 123, 17], [-18, 117, 16], [11, 99, 14], [-8, 136, 13], [14, 110, 17]]) {
      sphere(0.7, '#89999a', x, y, z);
    }
  } else if (index === 2) {
    const shape = new THREE.Shape();
    shape.moveTo(-14, 54); shape.lineTo(14, 54); shape.lineTo(26, 0);
    shape.lineTo(0, 8); shape.lineTo(-26, 0); shape.closePath();
    const cape = part(new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: false }), '#645080', 0, 91, -2);
    cape.rotation.x = -0.08;
    box(27, 6, 8, '#d1b879', 0, 143, 0);
    const emblem = box(12, 12, 3, '#d5bd79', 0, 121, 4);
    emblem.rotation.z = Math.PI / 4;
    sphere(3, '#ead895', -11, 144, 5); sphere(3, '#ead895', 11, 144, 5);
    for (const x of [-10, 10]) {
      box(2, 31, 1, '#a08ab1', x, 119, 3.2);
      sphere(1.4, '#e0c984', x, 107, 3.5);
    }
    box(17, 2, 2, '#cdb77d', 0, 96, 3);
    for (const [x, angle] of [[-19, -0.22], [19, 0.22]]) {
      const trim = box(2, 37, 1, '#d0b77b', x, 111, 3);
      trim.rotation.z = angle;
      for (const y of [102, 110, 118, 126]) sphere(0.8, '#e8d59a', x, y, 3.8);
    }
    const innerEmblem = box(7, 7, 1, '#58416d', 0, 121, 5.7);
    innerEmblem.rotation.z = Math.PI / 4;
    sphere(1.8, '#f6e5aa', 0, 121, 6.5);
    box(18, 2, 2, '#f0d998', 0, 145, 4);
    for (const x of [-14, -7, 0, 7, 14]) sphere(1, '#e2cc92', x, 97, 3.5);
  } else if (index === 3) {
    const base = part(new THREE.CylinderGeometry(23, 23, 8, 32), '#526f65', 0, 112, 0);
    base.rotation.x = Math.PI / 2;
    const moon = new THREE.Shape();
    moon.moveTo(5, 20); moon.bezierCurveTo(-22, 18, -22, -18, 5, -20);
    moon.bezierCurveTo(-5, -12, -5, 12, 5, 20);
    part(new THREE.ExtrudeGeometry(moon, { depth: 3, bevelEnabled: false }), '#e7cc7c', 0, 112, 5);
    sphere(2.5, '#fff1be', 11, 122, 6);
    sphere(2, '#fff1be', 12, 104, 6);
    ring(21, 0.8, '#94a998', 0, 112, 4.5);
    sphere(1.5, '#fff1be', 15, 113, 6);
    box(1, 7, 1, '#fff1be', -10, 117, 6);
    box(7, 1, 1, '#fff1be', -10, 117, 6);
    ring(18.5, 0.45, '#c8c194', 0, 112, 5);
    for (let i = 0; i < 12; i += 1) {
      const angle = i * Math.PI / 6;
      sphere(0.8, '#e5d39a', Math.cos(angle) * 20, 112 + Math.sin(angle) * 20, 5.2);
    }
    for (const [x, y, size] of [[11, 122, 5], [12, 104, 4], [15, 113, 3]]) {
      box(size, 0.7, 1, '#fff1be', x, y, 7);
      box(0.7, size, 1, '#fff1be', x, y, 7);
    }
  } else if (index === 4) {
    const body = new THREE.Mesh(createPumpkinGeometry(0), material('#ffffff', false, true));
    body.position.set(0, 108, 0); body.scale.set(1.35, 1.6, 1.35); model.add(body);
    const stem = part(new THREE.CylinderGeometry(2.2, 3.5, 9, 7), '#607044', 1, 129, 0);
    stem.rotation.z = -0.18;
    const eyeShape = new THREE.Shape();
    eyeShape.moveTo(-3, 2); eyeShape.lineTo(3, 2); eyeShape.lineTo(0, -3); eyeShape.closePath();
    for (const x of [-7, 7]) {
      const eye = part(new THREE.ShapeGeometry(eyeShape), '#4d3827', x, 118, 19);
      eye.rotation.x = -Math.PI / 4;
    }
    const mouthShape = new THREE.Shape();
    mouthShape.moveTo(-8, 2); mouthShape.quadraticCurveTo(0, -5, 8, 2);
    mouthShape.quadraticCurveTo(0, -7, -8, 2);
    const mouth = part(new THREE.ShapeGeometry(mouthShape), '#4d3827', 0, 111, 23.5);
    mouth.rotation.x = -Math.PI / 4;
    for (const [x, y, z] of [[-12, 119, 12], [-9, 122, 11], [10, 121, 11], [14, 115, 11]]) {
      const highlight = sphere(1, '#e99a4e', x, y, z);
      highlight.scale.set(1.4, 0.65, 0.55);
    }
    const leaf = sphere(6, '#79915a', 7, 128, 0);
    leaf.scale.set(1.1, 0.24, 0.6); leaf.rotation.z = 0.25;
    box(7, 0.7, 1, '#b3bd80', 7, 129, 3);
    for (const [x, y] of [[-4, 130], [4, 130], [-3, 126], [3, 126], [0, 126]]) {
      sphere(0.9, '#71814c', x, y, 0);
    }
  } else {
    throw new RangeError('Unknown trophy model.');
  }
  return model;
}
