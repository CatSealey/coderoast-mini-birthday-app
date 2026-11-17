import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBirthdayDogModel, drawBirthdayDog, STAFF_COLORS } from '../js/games/birthday-dog.js';
import { BIRTHDAY_FAMILY } from '../js/games/birthday-ending.js';

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
  const { model, legs, tail } = createBirthdayDogModel(box, round, orb);
  try {
    assert.equal(legs.length, 4);
    assert.ok(legs.every((leg) => leg.parent === model && leg.children.length === 2));
    assert.equal(tail.parent, model);
    assert.ok(model.children.some((part) => part.material === material(STAFF_COLORS.coat)));
    assert.ok(model.children.some((part) => part.material === material(STAFF_COLORS.chest) && part.position.z > 0));
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
});
