import * as THREE from 'three';

export function createFrightMarkerGeometries() {
  return {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    cone: new THREE.ConeGeometry(0.5, 1, 4),
    sphere: new THREE.SphereGeometry(0.5, 14, 10),
    ring: new THREE.TorusGeometry(0.5, 0.1, 8, 24)
  };
}

export function createFrightMaterial(color, glow = false, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.9, ...(glow ? { emissive: color, emissiveIntensity: 0.6 } : {}),
    ...(opacity < 1 ? { transparent: true, opacity, depthWrite: false } : {})
  });
}

export function frightMarkerVisible(object, state) {
  if (object.kind === 'clue') return !state.clues.includes(object.id);
  if (object.kind === 'tool') return !state.tools.includes(object.theme) && !state.collected.includes(object.theme);
  if (object.kind === 'cache') return !state.collected.includes(object.theme);
  return true;
}

export function createFrightMarker(object, color, geometries, material) {
  const marker = new THREE.Group();
  marker.userData.objectId = object.id;
  const add = (geometry, x, y, z, width, height, depth, shade = color, glow = true) => {
    const mesh = new THREE.Mesh(geometry, material(shade, glow));
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    marker.add(mesh);
    return mesh;
  };
  const box = (x, y, z, w, h, d, shade, glow) => add(geometries.box, x, y, z, w, h, d, shade, glow);
  const cyl = (x, y, z, w, h, d, shade, glow) => add(geometries.cylinder, x, y, z, w, h, d, shade, glow);
  const ball = (x, y, z, size, shade, glow) => add(geometries.sphere, x, y, z, size, size, size, shade, glow);
  const ring = (x, y, z, size, shade) => add(geometries.ring, x, y, z, size, size, size, shade);
  const detail = '#f9f0d7', dark = '#344448';

  if (object.kind === 'clue') {
    box(0, 0, 0, 20, 26, 3);
    box(0, 8, 2, 14, 2, 1, detail);
    for (const y of [3, -1, -5]) box(-1, y, 2, y === -5 ? 9 : 14, 1.5, 1, dark, false);
    box(5, -9, 2, 3, 3, 1, detail);
  } else if (object.kind === 'tool') {
    if (object.theme === 'disease') {
      box(0, -2, 0, 13, 14, 4);
      for (const [x, h] of [[-5, 8], [-1.7, 11], [1.7, 12], [5, 9]]) box(x, 6 + h / 2, 0, 3, h, 4);
      box(-8, -1, 0, 4, 9, 4).rotation.z = -0.5;
      box(0, -10, 1, 13, 3, 3, detail);
    } else if (object.theme === 'ai') {
      ring(-8, 5, 0, 14);
      box(2, 5, 0, 19, 3, 3);
      box(9, 1, 0, 3, 8, 3);
      box(4, 2, 0, 3, 6, 3);
    } else if (object.theme === 'darkness') {
      box(0, -2, 0, 20, 15, 7);
      box(0, -2, 4, 16, 10, 1, detail);
      for (const x of [-5, 0, 5]) {
        box(x, 8, 0, 2, 11, 2, detail);
        ball(x, 14, 0, 4);
      }
    } else if (object.theme === 'chainsaws') {
      ring(-10, -7, 0, 11);
      box(0, 0, 0, 4, 22, 4).rotation.z = -0.75;
      for (const x of [6, 12]) box(x, 9, 0, 3, 9, 4).rotation.z = -0.3;
    } else if (object.theme === 'bogeymen') {
      cyl(0, 0, 0, 14, 18, 14);
      for (const y of [-10, 10]) cyl(0, y, 0, 17, 3, 17, detail);
      for (const x of [-6, 6]) box(x, 0, 7, 2, 16, 2, detail);
      ring(0, 15, 0, 10, detail);
      ball(0, 1, 7, 5, detail);
    } else if (object.theme === 'claustrophobia') {
      box(0, 0, 0, 4, 25, 4).rotation.z = -0.7;
      box(10, 10, 0, 13, 3, 4).rotation.z = -0.2;
      box(-10, -10, 0, 10, 3, 4).rotation.z = -0.2;
      box(12, 12, 0, 3, 7, 4, detail);
    } else if (object.theme === 'clowns') {
      cyl(0, -2, 0, 3, 23, 3, detail);
      ball(0, 12, 0, 10);
      ball(-2, 14, 4, 3, detail);
      const tip = add(geometries.cone, 0, -16, 0, 4, 7, 4, detail);
      tip.rotation.z = Math.PI;
    }
  } else if (object.kind === 'cache') {
    if (object.theme === 'disease') {
      cyl(0, -2, 0, 15, 18, 15);
      cyl(0, 9, 0, 8, 5, 8, detail);
      cyl(0, 13, 0, 10, 4, 10, dark, false);
      box(0, -2, 8, 11, 9, 1, detail);
      box(0, -2, 9, 2, 7, 1, dark, false);
      box(0, -2, 9, 7, 2, 1, dark, false);
    } else if (object.theme === 'ai') {
      box(0, 0, 0, 18, 18, 4);
      box(0, 0, 3, 12, 12, 2, dark, false);
      box(0, 0, 4, 7, 7, 1, detail);
      for (const i of [-6, 0, 6]) {
        box(i, 11, 0, 2, 5, 3, detail); box(i, -11, 0, 2, 5, 3, detail);
        box(11, i, 0, 5, 2, 3, detail); box(-11, i, 0, 5, 2, 3, detail);
      }
    } else if (object.theme === 'darkness') {
      ring(0, 0, 0, 25, detail);
      const lens = cyl(0, 0, 0, 18, 3, 18);
      lens.rotation.x = Math.PI / 2;
      box(0, 0, 3, 3, 13, 1, detail);
      box(0, 0, 3, 13, 3, 1, detail);
    } else if (object.theme === 'chainsaws') {
      ring(0, 0, 0, 20);
      for (let i = 0; i < 8; i += 1) {
        const angle = i * Math.PI / 4;
        box(Math.sin(angle) * 12, Math.cos(angle) * 12, 0, 5, 6, 4).rotation.z = -angle;
      }
      ball(0, 0, 1, 6, detail);
      for (const angle of [0, Math.PI / 2]) box(0, 0, 0, 3, 19, 3, detail).rotation.z = angle;
    } else if (object.theme === 'bogeymen') {
      ring(0, 4, 0, 22);
      for (const angle of [-0.8, 0, 0.8]) box(0, 4, 0, 2, 18, 2, detail).rotation.z = angle;
      for (const x of [-7, 0, 7]) {
        box(x, -10, 0, 1.5, 8, 2, detail);
        ball(x, -15, 0, 4);
      }
    } else if (object.theme === 'claustrophobia') {
      ring(0, 0, 0, 24, detail);
      box(0, 0, 0, 15, 2, 2);
      box(-2, 5, 0, 12, 2, 2);
      box(2, -5, 0, 12, 2, 2);
      ring(7, 7, 0, 7);
    } else if (object.theme === 'clowns') {
      box(0, 0, 0, 23, 15, 4);
      for (const x of [-6, 6]) {
        box(x, 2, 3, 6, 3, 2, dark, false);
        ball(x, 8, 0, 5, detail);
      }
      ball(0, -1, 3, 5, detail);
      box(0, -5, 3, 12, 2, 2, dark, false);
      box(-7, -3, 3, 2, 4, 2, dark, false);
      box(7, -3, 3, 2, 4, 2, dark, false);
    }
  }

  const hitbox = new THREE.Mesh(geometries.box, material('#ffffff', false, 0));
  hitbox.scale.set(34, 44, 24);
  hitbox.userData.objectId = object.id;
  marker.add(hitbox);
  marker.userData.hitbox = hitbox;
  return marker;
}
