import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBirthdayDogModel, drawBirthdayDog, findVinnieApproach, STAFF_COLORS, VINNIE_PET_RANGE } from '../js/games/birthday-dog.js';
import { BIRTHDAY_FAMILY } from '../js/games/birthday-ending.js';
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
  } finally {
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
  const collision = createCollision([{ ...dog, radius: 16 }, { x: 640, y: 450, radius: 20 }], 10);
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
