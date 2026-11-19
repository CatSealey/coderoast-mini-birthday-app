import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CHARACTER_RISE, createCharacterArms, swingCharacterArms } from '../js/character-body.js';
import { CANOPY_CROSSINGS, CANOPY_PLATFORMS, CANOPY_ZIPLINE, LEGACY_CANOPY_ZIPLINE, canopyZipPosition, interactAdventure, newAdventureState, restoreAdventureState } from '../js/games/adventure-logic.js';
import { CANOPY_SAFETY_WIRE, ZIP_CABLE_SCREEN_OFFSET, addZipCable, canopySafetyAnchor, createZipRide, drawZipCable, drawZipHarness, drawZipTether, setZipRiderPose } from '../js/games/canopy-zipline.js';

function box(x, y, z, width, height, depth, color, parent) {
  const part = new THREE.Object3D();
  part.position.set(x, y, z); part.scale.set(width, height, depth);
  part.userData.color = color;
  parent.add(part);
  return part;
}
function round(geometry, ...args) {
  return box(...args);
}

test('zip-line cable is round and follows its endpoints above the rider', () => {
  const scene = new THREE.Group();
  const cable = addZipCable({ round, cylinder: {}, parent: scene }, [0, 125, 0], [100, 75, 50]);
  assert.deepEqual(cable.position.toArray(), [50, 100, 25]);
  const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(cable.quaternion);
  assert.ok(axis.distanceTo(new THREE.Vector3(100, -50, 50).normalize()) < 1e-10);
  assert.ok(CANOPY_ZIPLINE.cableHeight > 80 + 30, 'cable clears the head with room for a tether');
  for (const progress of [0, 0.15, 0.3, 0.5, 0.9, 1]) {
    const position = canopyZipPosition(progress);
    const from = progress <= CANOPY_ZIPLINE.departureProgress ? CANOPY_ZIPLINE.start : CANOPY_ZIPLINE.departure;
    const to = progress <= CANOPY_ZIPLINE.departureProgress ? CANOPY_ZIPLINE.departure : CANOPY_ZIPLINE.end;
    const start = new THREE.Vector3(from.x, from.height + CANOPY_ZIPLINE.cableHeight, from.y);
    const end = new THREE.Vector3(to.x, to.height + CANOPY_ZIPLINE.cableHeight, to.y);
    const trolley = new THREE.Vector3(position.x, position.height + CANOPY_ZIPLINE.cableHeight, position.y);
    const fraction = trolley.clone().sub(start).dot(end.clone().sub(start)) / start.distanceToSquared(end);
    assert.ok(trolley.distanceTo(start.clone().lerp(end, fraction)) < 1e-9);
  }
});

test('zip rider grips the tether and returns to a normal walking pose after the ride', () => {
  const scene = new THREE.Group(), player = new THREE.Group();
  scene.add(player);
  player.userData.arms = createCharacterArms(player, box, {
    offset: 16, shoulderY: 54, length: 28, width: 7, depth: 8, color: '#263d30', skin: '#dfb38c'
  });
  const ride = createZipRide({ box, round, cylinder: {}, sphere: {}, player, scene, cableHeight: CANOPY_ZIPLINE.cableHeight });
  assert.equal(ride.harness.visible, true);
  assert.equal(ride.trolley.visible, false);
  assert.ok(ride.harness.children.some((part) => part.userData.color === '#3986c5'));
  const direction = new THREE.Vector3(350, -190, 195);
  for (const progress of [0, 0.15, 0.5, 1]) {
    const point = canopyZipPosition(progress);
    player.position.set(point.x, point.height, point.y);
    swingCharacterArms(player.userData.arms, 0.4, true);
    setZipRiderPose(player, ride, true, { ...point, height: point.height + CANOPY_ZIPLINE.cableHeight }, direction);
    scene.updateMatrixWorld(true);
    assert.equal(ride.harness.visible, true);
    assert.deepEqual(ride.trolley.position.toArray(), [point.x, point.height + CANOPY_ZIPLINE.cableHeight, point.y]);
    for (const arm of player.userData.arms) {
      const hand = player.worldToLocal(arm.userData.hand.getWorldPosition(new THREE.Vector3()));
      assert.ok(Math.abs(hand.x) < 3 && hand.y > 75 && hand.y < 80 && Math.abs(hand.z - 13) < 1);
      assert.equal(arm.userData.elbow.rotation.x, 0);
    }
  }
  swingCharacterArms(player.userData.arms, 0.3, true);
  const anchor = canopySafetyAnchor(player.position.x);
  setZipRiderPose(player, ride, false, anchor, direction);
  scene.updateMatrixWorld(true);
  assert.equal(ride.harness.visible, true);
  assert.equal(ride.trolley.visible, false);
  assert.equal(ride.clip.visible, true);
  assert.ok(ride.tether.localToWorld(new THREE.Vector3(0, 0.5, 0)).distanceTo(new THREE.Vector3(anchor.x, anchor.height, anchor.y)) < 1e-8);
  assert.deepEqual(player.userData.arms.map((arm) => arm.rotation.z), [-0.08, 0.08]);
  assert.ok(Math.abs(player.userData.arms[0].rotation.x + Math.sin(0.3) * 0.2) < 1e-10);
  assert.ok(Math.abs(player.userData.arms[1].rotation.x - Math.sin(0.3) * 0.2) < 1e-10);
  assert.ok(player.userData.arms[1].userData.elbow.rotation.x < 0);
  for (const platform of CANOPY_PLATFORMS) {
    for (const z of [platform.top + 20, platform.bottom - 20]) {
      player.position.set((platform.left + platform.right) / 2, platform.height, z);
      for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        player.rotation.y = facing;
        const target = canopySafetyAnchor(player.position.x);
        setZipRiderPose(player, ride, false, target, direction);
        scene.updateMatrixWorld(true);
        const expected = new THREE.Vector3(target.x, target.height, target.y);
        assert.ok(ride.tether.localToWorld(new THREE.Vector3(0, 0.5, 0)).distanceTo(expected) < 1e-8);
        assert.ok(ride.clip.position.distanceTo(expected) < 1e-8);
      }
    }
  }
});

test('raised character harness and tether stay attached during and after a zip-line ride', () => {
  const scene = new THREE.Group(), player = new THREE.Group();
  scene.add(player);
  player.userData.arms = createCharacterArms(player, box, {
    offset: 16, shoulderY: 54 + CHARACTER_RISE, length: 28, width: 7, depth: 8, color: '#263d30', skin: '#dfb38c'
  });
  const ride = createZipRide({ box, round, cylinder: {}, sphere: {}, player, scene,
    cableHeight: CANOPY_ZIPLINE.cableHeight, bodyRise: CHARACTER_RISE });
  assert.equal(ride.harness.position.y, CHARACTER_RISE);
  player.position.set(200, 130, 350);
  player.rotation.y = Math.PI / 3;
  for (const active of [true, false]) {
    const anchor = { x: 200, y: 350, height: 130 + CANOPY_ZIPLINE.cableHeight };
    setZipRiderPose(player, ride, active, anchor, new THREE.Vector3(1, -0.2, 0));
    scene.updateMatrixWorld(true);
    assert.ok(ride.tether.localToWorld(new THREE.Vector3(0, 0.5, 0))
      .distanceTo(new THREE.Vector3(anchor.x, anchor.height, anchor.y)) < 1e-8);
    if (active) {
      for (const arm of player.userData.arms) {
        const hand = player.worldToLocal(arm.userData.hand.getWorldPosition(new THREE.Vector3()));
        assert.ok(Math.abs(hand.x) < 3 && hand.y > 75 + CHARACTER_RISE && hand.y < 80 + CHARACTER_RISE);
      }
    } else {
      assert.deepEqual(player.userData.arms.map((arm) => arm.rotation.z), [-0.08, 0.08]);
    }
  }
});

test('starting the zip-line attaches the player immediately without changing the saved ride path', () => {
  const state = {
    ...newAdventureState(3), player: { ...CANOPY_ZIPLINE.start, x: CANOPY_ZIPLINE.start.x - 20 },
    collected: ['leaf', 'feather', 'acorn', 'star'], lanterns: ['lantern-1', 'lantern-2', 'lantern-3']
  };
  const started = interactAdventure(3, state, 'zipline');
  assert.equal(started.zipline, true);
  assert.deepEqual(started.player, canopyZipPosition(0));
  const savedBeforeAttachment = { ...started, player: { ...started.player, x: started.player.x - 20 } };
  assert.deepEqual(restoreAdventureState(3, savedBeforeAttachment).player, canopyZipPosition(0));
  assert.deepEqual(LEGACY_CANOPY_ZIPLINE.start, { x: 900, y: 350, height: 130 });
  assert.deepEqual(LEGACY_CANOPY_ZIPLINE.end, { x: 960, y: 570, height: 0 });
});

test('illustrated zip-line includes a cable, trolley, tether and harness', () => {
  const calls = [];
  const ctx = {
    beginPath() {}, moveTo(x, y) { calls.push(['move', x, y]); },
    lineTo(x, y) { calls.push(['line', x, y]); }, stroke() { calls.push(['stroke', this.strokeStyle]); },
    fillRect(x, y, width, height) { calls.push(['rect', this.fillStyle, x, y, width, height]); }
  };
  drawZipCable(ctx, [CANOPY_ZIPLINE.start, CANOPY_ZIPLINE.departure, CANOPY_ZIPLINE.end], (x) => x, (y) => y);
  assert.ok(calls.some(([type, x, y]) => type === 'move' && x === CANOPY_ZIPLINE.start.x && y === CANOPY_ZIPLINE.start.y - ZIP_CABLE_SCREEN_OFFSET));
  assert.equal(calls.filter(([type]) => type === 'stroke').length, 3);
  drawZipTether(ctx, 100, 100);
  drawZipHarness(ctx, 100, 100);
  assert.ok(calls.some(([type, color]) => type === 'rect' && color === '#354b50'));
  assert.ok(calls.some(([type, color]) => type === 'rect' && color === '#3986c5'));
});

test('continuous safety wire stays above platforms, jumps and every crossing', () => {
  assert.equal(CANOPY_SAFETY_WIRE.length, CANOPY_PLATFORMS.length * 2);
  for (const platform of CANOPY_PLATFORMS) {
    for (const x of [platform.left, (platform.left + platform.right) / 2, platform.right]) {
      const anchor = canopySafetyAnchor(x);
      assert.equal(anchor.x, x);
      assert.equal(anchor.y, 350);
      assert.ok(anchor.height - (platform.height + 62.5) > 80);
    }
  }
  for (const crossing of Object.values(CANOPY_CROSSINGS)) {
    for (let i = 0; i <= 100; i += 1) {
      const t = i / 100, x = crossing.start[0] + (crossing.end[0] - crossing.start[0]) * t;
      const height = crossing.start[2] + (crossing.end[2] - crossing.start[2]) * t;
      assert.ok(canopySafetyAnchor(x).height - height > 100);
    }
  }
});
