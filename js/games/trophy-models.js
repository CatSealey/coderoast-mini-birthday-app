import * as THREE from 'three';

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
  } else if (index === 1) {
    sphere(25, '#191c20', 0, 116, 0);
    part(new THREE.CircleGeometry(10, 32), '#f2eee0', 0, 118, 24.7);
    ring(3, 1.15, '#1b1b1b', 0, 121, 24.9);
    ring(3.5, 1.15, '#1b1b1b', 0, 114, 24.9);
    sphere(3, '#ffffff', -10, 128, 19);
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
  } else if (index === 3) {
    const base = part(new THREE.CylinderGeometry(23, 23, 8, 32), '#526f65', 0, 112, 0);
    base.rotation.x = Math.PI / 2;
    const moon = new THREE.Shape();
    moon.moveTo(5, 20); moon.bezierCurveTo(-22, 18, -22, -18, 5, -20);
    moon.bezierCurveTo(-5, -12, -5, 12, 5, 20);
    part(new THREE.ExtrudeGeometry(moon, { depth: 3, bevelEnabled: false }), '#e7cc7c', 0, 112, 5);
    sphere(2.5, '#fff1be', 11, 122, 6);
    sphere(2, '#fff1be', 12, 104, 6);
  } else if (index === 4) {
    sphere(21, '#c77532', 0, 109, 0).scale.set(1.15, 0.85, 0.9);
    for (const x of [-12, 12]) sphere(15, '#d98235', x, 109, 0).scale.set(0.65, 1.05, 0.95);
    box(6, 10, 6, '#52643c', 0, 129, 0);
    for (const x of [-7, 7]) {
      const eye = part(new THREE.ConeGeometry(3.5, 6, 3), '#382b25', x, 112, 19);
      eye.rotation.z = Math.PI;
    }
    box(15, 3, 3, '#382b25', 0, 101, 19);
  } else {
    throw new RangeError('Unknown trophy model.');
  }
  return model;
}
