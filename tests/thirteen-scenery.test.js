import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COASTER_TREATS, coasterDirection, coasterLanePosition, coasterPosition } from '../js/games/coaster-course.js';
import { THIRTEEN_RUINS, THIRTEEN_RUNESTONES, THIRTEEN_TREES, addThirteenRuins, addThirteenStation, addThirteenVault, drawThirteenScenery, drawThirteenVault, paintThirteenSign } from '../js/games/thirteen-scenery.js';

function artRecorder() {
  const scene = new THREE.Group(), pieces = [];
  function record(kind, x, y, z, width, height, depth, color, parent = scene, glow = false) {
    const object = new THREE.Object3D();
    object.position.set(x, y, z); parent.add(object);
    pieces.push({ kind, x, y, z, width, height, depth, color, parent, glow });
    return object;
  }
  return {
    scene, pieces, cylinder: {}, sphere: {},
    box: (...args) => record('box', ...args),
    round: (_geometry, ...args) => record('round', ...args)
  };
}

function canvasRecorder() {
  const images = [], texts = [], fills = [];
  const ctx = {
    images, texts, fills,
    fillRect(...args) { fills.push({ color: this.fillStyle, args }); },
    drawImage(...args) { images.push(args); },
    fillText(text) { texts.push(text); },
    beginPath() {}, arc() {}, ellipse() {}, fill() {}, strokeRect() {}, moveTo() {}, lineTo() {}, stroke() {}
  };
  return ctx;
}

test('Thirteen forest and ruins are varied, deterministic and away from the station walkway', () => {
  assert.ok(THIRTEEN_TREES.length >= 16);
  assert.equal(new Set(THIRTEEN_TREES.map((tree) => tree.variant)).size, 3);
  assert.ok(THIRTEEN_TREES.every(({ y }) => y < 580));
  assert.ok(THIRTEEN_RUINS.every(({ y }) => y < 580));
  const first = artRecorder(), second = artRecorder();
  addThirteenRuins(first); addThirteenRuins(second);
  assert.deepEqual(first.pieces.map(({ parent, ...piece }) => piece), second.pieces.map(({ parent, ...piece }) => piece));
  assert.equal(first.pieces.filter(({ color }) => color === '#c0b791').length, THIRTEEN_RUNESTONES.length * 3);
});

test('the drop vault frames the ride without blocking its central carriage', () => {
  const art = artRecorder(), top = coasterPosition('dropping', 0), direction = coasterDirection('dropping', 0);
  const vault = addThirteenVault(art, top, direction);
  assert.deepEqual(vault.position.toArray(), [top.x, 0, top.y]);
  vault.updateMatrixWorld(true);
  const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(vault.quaternion);
  assert.ok(Math.abs(axis.x + direction.y) < 1e-10);
  assert.ok(Math.abs(axis.z - direction.x) < 1e-10);
  const posts = art.pieces.filter(({ color, parent }) => color === '#514e42' && parent === vault);
  assert.deepEqual(posts.map(({ x }) => x), [-72, 72]);
  assert.ok(posts.every(({ height }) => height === top.height + 105));
  for (const piece of art.pieces.filter(({ parent }) => parent === vault)) {
    if (piece.y - piece.height / 2 <= top.height + 85) {
      assert.ok(Math.abs(piece.x) - piece.width / 2 > 35, 'vault detail clears the carriage and riders');
    }
  }
  assert.equal(art.pieces.filter(({ glow }) => glow).length, 2);
});

test('the drop vault leaves the map and all item centers visible from the ride camera', () => {
  const scene = new THREE.Group(), geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
  function mesh(x, y, z, width, height, depth, _color, parent = scene) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z); object.scale.set(width, height, depth); parent.add(object);
    return object;
  }
  const vault = addThirteenVault({
    scene, box: mesh, round: (_geometry, ...args) => mesh(...args), cylinder: geometry, sphere: geometry
  }, coasterPosition('dropping', 0), coasterDirection('dropping', 0));
  scene.updateMatrixWorld(true);
  const towardCamera = new THREE.Vector3(500, 1100, 950).normalize();
  const ray = new THREE.Raycaster();
  function clear(point) {
    ray.set(point.clone().addScaledVector(towardCamera, 2000), towardCamera.clone().negate());
    const hit = ray.intersectObject(vault, true)[0];
    return !hit || hit.distance >= 2000;
  }
  for (const treat of COASTER_TREATS) {
    const point = coasterLanePosition(treat.progress, treat.lane);
    assert.ok(clear(new THREE.Vector3(point.x, point.height, point.y)), `${treat.name} is visible`);
  }
  const map = COASTER_TREATS.find(({ kind }) => kind === 'map');
  const point = coasterLanePosition(map.progress, map.lane);
  for (let x = -25; x <= 25; x += 5) for (let y = -15; y <= 15; y += 5) {
    assert.ok(clear(new THREE.Vector3(point.x + x, point.height + y, point.y + 2)), 'the map is not behind the vault');
  }
  geometry.dispose(); material.dispose();
});

test('station and fallback share their woodland theme and sign artwork', () => {
  const art = artRecorder(); addThirteenStation(art);
  assert.equal(art.pieces.filter(({ glow }) => glow).length, 2);
  assert.ok(art.pieces.some(({ color, z }) => color === '#685746' && z === 694));
  const ctx = canvasRecorder(), sign = {};
  paintThirteenSign(ctx);
  assert.deepEqual(ctx.texts, ['TH13TEEN', 'DARK FOREST']);
  drawThirteenScenery(ctx, (x) => x, (y) => y, 1, sign);
  assert.deepEqual(ctx.images, [[sign, 62, 548, 132, 34]]);
  assert.ok(ctx.fills.some(({ color }) => color === '#5e6052'));
  drawThirteenVault(ctx, (x) => x, (y) => y, 1, coasterPosition('dropping', 0), coasterDirection('dropping', 0));
  assert.equal(ctx.fills.filter(({ color }) => color === '#4c4e41').length, 2);
});
