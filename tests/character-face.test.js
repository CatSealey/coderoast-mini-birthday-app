import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CHARACTER_HEAD_SCALE, addCharacterHeadDetails } from '../js/character-appearance.js';
import { CHARACTER_RISE, createCharacterFaceGeometry, createCharacterHeadGeometry, createCharacterTorsoGeometry } from '../js/character-body.js';

test('face has a continuous, projecting nose and shaped cheeks and jaw', () => {
  const geometry = createCharacterFaceGeometry();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const face = new THREE.Mesh(geometry, material);
  face.updateMatrixWorld(true);
  const surface = (x, y) => {
    const hit = new THREE.Raycaster(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1)).intersectObject(face)[0];
    assert.ok(hit, `face is missing at ${x}, ${y}`);
    return hit.point.z;
  };
  assert.ok(surface(0, -0.1) - surface(0.2, -0.1) > 0.08);
  assert.ok(surface(0, -0.1) - surface(0, 0.22) > 0.08);
  assert.ok(surface(0, -0.1) - surface(0, -0.23) > 0.1);
  assert.ok(surface(0.12, -0.1) > surface(0.2, -0.1));
  assert.ok(surface(0, -0.38) < surface(0, -0.23));
  assert.ok(surface(0, -0.235) - surface(0.2, -0.235) > 0.015, 'mouth projects from the surrounding face');
  assert.ok(surface(0, -0.235) - surface(0, -0.26) > 0.015, 'lip has a distinct lower edge');
  assert.ok(surface(0, -0.32) - surface(0.2, -0.32) > 0.03, 'chin projects forward');
  assert.ok(surface(0, -0.32) - surface(0, -0.28) > 0.01, 'chin has a transition beneath the mouth');
  for (const y of [-0.44, -0.38, -0.32, -0.26, -0.235, -0.21, -0.1, 0.05, 0.22]) {
    assert.ok(Math.abs(surface(-0.12, y) - surface(0.12, y)) < 0.001);
  }
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
  for (let i = 0; i < positions.count; i += 3) {
    const x = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
    const y = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3;
    if (Math.abs(x) < 0.14 && y > -0.19 && y < -0.08 && normals.getZ(i) > 0.3) {
      assert.ok(normals.getY(i) >= -0.2, 'nose underside avoids a dark moustache-like shadow');
    }
  }
  geometry.dispose(); material.dispose();
});

test('face retains shape while avoiding harsh one-sided directional shading', () => {
  const geometry = createCharacterFaceGeometry();
  const geometric = geometry.clone();
  geometric.computeVertexNormals();
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const originalNormals = geometric.getAttribute('normal');
  const facets = [], lowerFacets = [];
  for (let i = 0; i < positions.count; i += 3) {
    const x = (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3;
    const y = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3;
    if (Math.abs(x) < 0.14 && y > -0.14 && y < 0.12 && originalNormals.getZ(i) > 0.3) {
      facets.push({
        side: x < 0 ? 0 : 1,
        normal: new THREE.Vector3().fromBufferAttribute(normals, i),
        original: new THREE.Vector3().fromBufferAttribute(originalNormals, i)
      });
    }
    if (Math.abs(x) < 0.14 && y > -0.4 && y < -0.21 && originalNormals.getZ(i) > 0.3) {
      lowerFacets.push({
        side: x < 0 ? 0 : 1,
        normal: new THREE.Vector3().fromBufferAttribute(normals, i)
      });
    }
    if (originalNormals.getZ(i) < -0.3) {
      assert.ok(new THREE.Vector3().fromBufferAttribute(normals, i)
        .distanceTo(new THREE.Vector3().fromBufferAttribute(originalNormals, i)) < 0.00001);
    }
  }
  assert.ok(facets.length > 0);
  assert.ok(Math.min(...facets.map(({ normal }) => normal.x)) < -0.1);
  assert.ok(Math.max(...facets.map(({ normal }) => normal.x)) > 0.1);
  for (const yaw of [-Math.PI / 4, 0, Math.PI / 4]) {
    for (const lightPosition of [[-500, 900, 400], [-300, 900, 600], [-500, 1000, 500]]) {
      const light = new THREE.Vector3(...lightPosition).normalize();
      const averages = (region, key) => [0, 1].map((side) => {
        const values = region.filter((facet) => facet.side === side).map((facet) =>
          Math.max(0, facet[key].clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).dot(light)));
        assert.ok(values.length > 0);
        return values.reduce((sum, value) => sum + value, 0) / values.length;
      });
      const [left, right] = averages(facets, 'normal');
      const [originalLeft, originalRight] = averages(facets, 'original');
      assert.ok(Math.abs(left - right) < 0.2, 'facial lighting stays balanced');
      assert.ok(Math.abs(left - right) < Math.abs(originalLeft - originalRight), 'softens the original contrast');
      const [lowerLeft, lowerRight] = averages(lowerFacets, 'normal');
      assert.ok(Math.abs(lowerLeft - lowerRight) < 0.04, 'mouth and chin avoid uneven shading');
    }
  }
  geometry.dispose(); geometric.dispose();
});

test('eyes and mouth remain visible and attached to the face at each scene size', () => {
  const cube = new THREE.BoxGeometry(), head = createCharacterHeadGeometry(), faceGeometry = createCharacterFaceGeometry();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const [width, height, depth, skin, hairLength] of [
    [14, 14, 14, '#d7aa83', 'short'],
    [17, 18, 17, '#dfb38c', 'short'],
    [18, 18, 18, '#dfb38c', 'long'],
    [18, 19, 18, '#dfb38c', 'long'],
    [19, 20, 19, '#dfb38c', 'shoulder']
  ]) {
    const parent = new THREE.Group();
    const part = (geometry, x, y, z, w, h, d, color) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.userData.color = color;
      parent.add(mesh); return mesh;
    };
    addCharacterHeadDetails((...args) => part(cube, ...args), (...args) => part(head, ...args), {
      headY: 0, width, height, depth, skin, hairLength, face: (...args) => part(faceGeometry, ...args)
    });
    parent.updateMatrixWorld(true);
    const face = parent.children.find((mesh) => mesh.geometry === faceGeometry);
    const features = parent.children.filter((mesh) =>
      ['#49382f', '#a66f67', '#bd8981'].includes(mesh.userData.color) || mesh.rotation.z !== 0);
    assert.equal(features.length, 6);
    for (const feature of features) {
      const ray = new THREE.Raycaster(new THREE.Vector3(feature.position.x, feature.position.y, 100), new THREE.Vector3(0, 0, -1));
      const hit = ray.intersectObject(face)[0];
      assert.ok(hit, 'feature is in front of the face');
      const bounds = new THREE.Box3().setFromObject(feature);
      assert.ok(bounds.min.z <= hit.point.z, 'feature is not floating');
      assert.ok(bounds.max.z > hit.point.z + 0.1, 'feature remains visible');
      assert.ok(bounds.max.z < hit.point.z + 0.6, 'feature does not protrude excessively');
    }
    const upperLip = features.find((mesh) => mesh.userData.color === '#a66f67');
    const lowerLip = features.find((mesh) => mesh.userData.color === '#bd8981');
    assert.equal(upperLip.geometry, head);
    assert.equal(lowerLip.geometry, head);
    assert.ok(lowerLip.position.y < upperLip.position.y && lowerLip.scale.x < upperLip.scale.x);
    assert.equal(parent.children.filter((mesh) => mesh.userData.color === '#e3d2ba').length, 2);
  }
  cube.dispose(); head.dispose(); faceGeometry.dispose(); material.dispose();
});

test('slightly smaller heads keep their neck attached in each scene', () => {
  const cube = new THREE.BoxGeometry(), head = createCharacterHeadGeometry();
  const face = createCharacterFaceGeometry(), torso = createCharacterTorsoGeometry();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const [torsoWidth, torsoHeight, torsoY, headY, width, height, depth] of [
    [20, 30, 37, 60, 14, 14, 14],
    [25, 38, 40, 68, 17, 18, 17],
    [24, 36, 37, 66, 18, 18, 18],
    [25, 36, 42, 70, 18, 19, 18],
    [26, 38, 39, 70, 19, 20, 19]
  ]) {
    const parent = new THREE.Group(), body = new THREE.Mesh(torso, material);
    body.position.y = torsoY + CHARACTER_RISE; body.scale.set(torsoWidth, torsoHeight, 17); parent.add(body);
    const part = (geometry, x, y, z, w, h, d) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
    };
    addCharacterHeadDetails((...args) => part(cube, ...args), (...args) => part(head, ...args), {
      headY: headY + CHARACTER_RISE, width, height, depth, skin: '#dfb38c',
      face: (...args) => part(face, ...args)
    });
    const neck = parent.children.find((mesh) => mesh.geometry === cube);
    const faceMesh = parent.children.find((mesh) => mesh.geometry === face);
    assert.ok(Math.abs(faceMesh.scale.x / (width * 0.96) - 0.93) < 1e-8);
    assert.equal(CHARACTER_HEAD_SCALE, 0.93);
    parent.updateMatrixWorld(true);
    const neckBounds = new THREE.Box3().setFromObject(neck);
    assert.ok(neckBounds.intersectsBox(new THREE.Box3().setFromObject(body)), 'neck reaches the torso');
    assert.ok(neckBounds.intersectsBox(new THREE.Box3().setFromObject(faceMesh)), 'neck reaches the face');
  }
  cube.dispose(); head.dispose(); face.dispose(); torso.dispose(); material.dispose();
});
