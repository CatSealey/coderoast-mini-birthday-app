import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBirthdayDogModel, drawBirthdayDog, findVinnieApproach, STAFF_COLORS, VINNIE_HEAD_OFFSET, VINNIE_HEAD_RADIUS, VINNIE_PET_RANGE, vinnieObstacles, vinniePetFacing } from '../js/games/birthday-dog.js';
import { BIRTHDAY_FAMILY, birthdayGuestObstacles } from '../js/games/birthday-ending.js';
import { createCollision } from '../js/world/world-collision.js';

test('the birthday staff has a grey body, white chest, four moving legs and a tail', () => {
  const cube = new THREE.BoxGeometry(1, 1, 1), orb = new THREE.SphereGeometry(0.5);
  const materials = new Map();
  const material = (color) => {
    if (!materials.has(color)) materials.set(color, new THREE.MeshBasicMaterial({ color }));
    return materials.get(color);
  };
  const box = (x, y, z, w, h, d, color, parent) => {
    const part = new THREE.Mesh(cube, material(color));
    part.position.set(x, y, z); part.scale.set(w, h, d); parent.add(part); return part;
  };
  const round = (shape, x, y, z, w, h, d, color, parent) => {
    const part = new THREE.Mesh(shape, material(color));
    part.position.set(x, y, z); part.scale.set(w, h, d); parent.add(part); return part;
  };
  const { model, legs, tail, head } = createBirthdayDogModel(box, round, orb);
  try {
    assert.equal(legs.length, 4);
    assert.ok(legs.every((leg) => leg.parent === model && leg.userData.foot.parent === leg));
    assert.equal(tail.parent, model);
    assert.equal(head.parent, model);
    assert.ok(head.children.some((part) => part.material === material(STAFF_COLORS.eye)));
    assert.ok(head.children.some((part) => part.material === material(STAFF_COLORS.eyeLight)));
    assert.ok(model.children.some((part) => part.material === material(STAFF_COLORS.coat)));
    assert.ok(model.children.some((part) => part.material === material(STAFF_COLORS.chest) && part.position.z > 0));
    assert.ok(model.children.some((part) => part.material === material(STAFF_COLORS.collar)));
    assert.equal(BIRTHDAY_FAMILY.find((member) => member.id === 'dog')?.kind, 'dog');
    model.position.set(700, 0, 450);
    for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      model.rotation.y = facing;
      for (const tilt of [0, -0.2]) {
        head.rotation.x = tilt;
        model.updateMatrixWorld(true);
        const obstacles = vinnieObstacles({ x: 700, y: 450 }, facing);
        head.traverse((part) => {
          if (!part.isMesh) return;
          const vertices = part.geometry.getAttribute('position');
          for (let i = 0; i < vertices.count; i += 1) {
            const point = part.localToWorld(new THREE.Vector3().fromBufferAttribute(vertices, i));
            assert.ok(obstacles.some((obstacle) => Math.hypot(point.x - obstacle.x, point.z - obstacle.y) <= obstacle.radius + 0.01),
              `head geometry extends outside its collision at facing ${facing}, tilt ${tilt}`);
          }
        });
      }
    }
  } finally {
    model.traverse((part) => {
      if (part.isMesh && part.geometry !== cube && part.geometry !== orb) part.geometry.dispose();
    });
    cube.dispose(); orb.dispose(); materials.forEach((value) => value.dispose());
  }
});

test('the illustrated dog turns with its route and retains its white chest', () => {
  const calls = [], colors = [];
  const ctx = {
    save() {}, restore() {}, scale() {}, beginPath() {}, ellipse() {}, moveTo() {}, lineTo() {}, stroke() {},
    translate: (...args) => calls.push(['translate', ...args]),
    rotate: (...args) => calls.push(['rotate', ...args]),
    fill() { colors.push(this.fillStyle); },
    fillRect() { colors.push(this.fillStyle); }
  };
  drawBirthdayDog(ctx, 90, 120, Math.PI / 2, 0.3);
  assert.deepEqual(calls, [['translate', 90, 120], ['rotate', -Math.PI / 2]]);
  assert.ok(colors.includes(STAFF_COLORS.coat));
  assert.ok(colors.includes(STAFF_COLORS.chest));
  assert.ok(colors.includes(STAFF_COLORS.nose));
  assert.ok(colors.includes(STAFF_COLORS.collar));
});

test('Vinnie can be approached without walking through him or nearby furniture', () => {
  const dog = { x: 700, y: 450 }, start = { x: 550, y: 450 };
  const collision = createCollision([...vinnieObstacles(dog, -Math.PI / 2), { x: 640, y: 450, radius: 20 }], 10);
  assert.deepEqual(findVinnieApproach({ x: 660, y: 470 }, dog, collision), []);
  const route = findVinnieApproach(start, dog, collision);
  assert.ok(route?.length);
  assert.ok(Math.hypot(route.at(-1).x - dog.x, route.at(-1).y - dog.y) <= VINNIE_PET_RANGE);
  let from = start;
  for (const point of route) {
    assert.ok(collision.clearSegment(from, point));
    from = point;
  }
});

test('Vinnie’s rotated head and body block the player before and after the celebration', () => {
  const dog = { x: 700, y: 450 };
  const member = BIRTHDAY_FAMILY.find((entry) => entry.kind === 'dog');
  for (const facing of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const direction = { x: Math.sin(facing), y: Math.cos(facing) };
    const guest = { member, visible: true, position: dog, facing };
    for (const phase of ['idle', 'finished']) {
      const obstacles = birthdayGuestObstacles(phase, { x: 100, y: 100 }, [guest]);
      const collision = createCollision(obstacles, 10);
      const nose = { x: dog.x + direction.x * 35, y: dog.y + direction.y * 35 };
      const outside = { x: dog.x + direction.x * (VINNIE_HEAD_OFFSET + VINNIE_HEAD_RADIUS + 11),
        y: dog.y + direction.y * (VINNIE_HEAD_OFFSET + VINNIE_HEAD_RADIUS + 11) };
      assert.equal(collision.blocked(nose), true, `${phase}: nose is solid at ${facing}`);
      assert.equal(collision.blocked(outside), false, `${phase}: space in front remains walkable`);
      assert.equal(collision.clearSegment(outside, nose), false);
      assert.notDeepEqual(collision.move(outside, nose.x - outside.x, nose.y - outside.y), nose);
      const path = findVinnieApproach(outside, dog, collision);
      assert.ok(path, `${phase}: Vinnie can still be petted`);
    }
    guest.visible = false;
    assert.deepEqual(birthdayGuestObstacles('idle', { x: 100, y: 100 }, [guest]), []);
  }
});

test('petting does not turn Vinnie’s head into a nearby player', () => {
  const dog = { x: 700, y: 450 };
  const closeBehind = { x: 700, y: 423 };
  assert.equal(vinniePetFacing(dog, 0, closeBehind), 0);
  const fartherBehind = { x: 700, y: 400 };
  const facing = vinniePetFacing(dog, 0, fartherBehind);
  assert.equal(Math.abs(facing), Math.PI);
  assert.equal(createCollision(vinnieObstacles(dog, facing), 10).blocked(fartherBehind), false);
});

test('clicking Vinnie finds a safe petting approach from every direction', () => {
  const dog = { x: 700, y: 450 };
  for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const collision = createCollision(vinnieObstacles(dog, facing), 10);
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      const start = { x: dog.x + Math.cos(angle) * 180, y: dog.y + Math.sin(angle) * 180 };
      const route = findVinnieApproach(start, dog, collision);
      assert.ok(route?.length, `no approach from angle ${angle}, facing ${facing}`);
      let previous = start;
      for (const waypoint of route) {
        assert.ok(collision.clearSegment(previous, waypoint));
        previous = waypoint;
      }
      assert.ok(Math.hypot(previous.x - dog.x, previous.y - dog.y) <= VINNIE_PET_RANGE);
      const petFacing = vinniePetFacing(dog, facing, previous);
      assert.equal(createCollision(vinnieObstacles(dog, petFacing), 10).blocked(previous), false);
    }
  }
});
