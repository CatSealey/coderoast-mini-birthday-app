import test from 'node:test';
import assert from 'node:assert/strict';
import { CAT_OUTFIT, CAT_STYLE, CHARACTER_HAIR, PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker, facingForMovement } from '../js/character-appearance.js';
import { createCharacterLegs, createPlayerLegs } from '../js/games/character-legs.js';
import { TATTOO_ACCENT, TATTOO_INK, addJapaneseSleeve, createCharacterArms, createCharacterTorsoGeometry, swingCharacterArms } from '../js/character-body.js';
import * as THREE from 'three';

test('movement determines facing in all directions and idle keeps the last direction', () => {
  const origin = { x: 10, y: 20 };
  assert.equal(facingForMovement(null, origin), 0);
  for (const [position, angle] of [
    [{ x: 10, y: 21 }, 0], [{ x: 11, y: 20 }, Math.PI / 2],
    [{ x: 10, y: 19 }, Math.PI], [{ x: 9, y: 20 }, -Math.PI / 2],
    [{ x: 11, y: 19 }, 3 * Math.PI / 4]
  ]) {
    assert.equal(facingForMovement(origin, position), angle);
  }
  assert.equal(facingForMovement(origin, origin, -Math.PI / 2), -Math.PI / 2);
  assert.equal(facingForMovement(origin, { x: 10.001, y: 20 }, Math.PI), Math.PI);
});

test('fallback character shows a back or profile and keeps the rear tattoo visible', () => {
  const rectangles = [];
  const context = {
    fillRect(x, y, width, height) { rectangles.push({ x, y, color: this.fillStyle }); },
    beginPath() {}, ellipse() {}, arc() {}, fill() {}
  };
  drawCharacterMarker(context, 0, 0, PLAYER_OUTFIT, { ...PLAYER_STYLE, facing: Math.PI });
  assert.equal(rectangles.filter((part) => part.color === '#49382f').length, 0);
  assert.ok(rectangles.some((part) => part.color === TATTOO_INK && part.x < 0));
  rectangles.length = 0;
  drawCharacterMarker(context, 0, 0, PLAYER_OUTFIT, { ...PLAYER_STYLE, facing: Math.PI / 2 });
  assert.equal(rectangles.filter((part) => part.color === '#49382f').length, 1);
  assert.ok(rectangles.some((part) => part.color === '#49382f' && part.x > 0));
  rectangles.length = 0;
  drawCharacterMarker(context, 0, 0, CAT_OUTFIT, { ...CAT_STYLE, facing: Math.PI });
  assert.ok(rectangles.some((part) => part.color === TATTOO_INK && part.x > 0));
  assert.ok(!rectangles.some((part) => part.color === CAT_STYLE.buckle));
});

test('heads are proportionate and the player has longer hair than Cat', () => {
  const parts = [];
  const record = (kind) => (x, y, z, width, height, depth, color) => {
    parts.push({ kind, x, y, z, width, height, depth, color });
  };
  addCharacterHeadDetails(record('box'), record('round'),
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hairLength: PLAYER_STYLE.hairLength });

  const head = parts.find((part) => part.color === '#dfb38c' && part.kind === 'round');
  assert.equal(head.width, 18 * 0.96);
  assert.ok(head.width / 24 >= 0.7 && head.width / 24 <= 0.8);
  const sideLocks = parts.filter((part) => part.color === CHARACTER_HAIR && Math.abs(part.x) === head.width * 0.48);
  assert.equal(sideLocks.length, 2);
  const eyes = parts.filter((part) => part.color === '#49382f');
  assert.equal(eyes.length, 2);
  assert.ok(eyes.every((eye) => Math.abs(eye.x) < head.width / 2 && eye.z > 0));
  const fringe = parts.filter((part) => part.color === CHARACTER_HAIR && part.z > 0);
  assert.ok(fringe.every((part) => part.y - part.height / 2 > eyes[0].y + eyes[0].height / 2));
  const playerBottom = sideLocks[0].y - sideLocks[0].height / 2;
  parts.length = 0;
  addCharacterHeadDetails(record('box'), record('round'),
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hairLength: CAT_STYLE.hairLength });
  const catSide = parts.find((part) => part.color === CHARACTER_HAIR && Math.abs(part.x) === head.width * 0.48);
  assert.ok(playerBottom < catSide.y - catSide.height / 2);
});

test('short and custom-coloured hair retains its own shape and colour', () => {
  const parts = [];
  const record = (x, y, z, width, height, depth, color) => {
    parts.push({ x, y, z, width, height, depth, color });
  };
  addCharacterHeadDetails(record, record,
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hair: '#c4beb2' });
  const sideLocks = parts.filter((part) => part.color === '#c4beb2' && Math.abs(part.x) === 18 * 0.96 * 0.48);
  assert.equal(sideLocks.length, 2);
  assert.ok(sideLocks.every((part) => part.y - part.height / 2 > 57));
});

test('fallback characters show the player’s left leg tattoo and Cat’s right arm tattoo', () => {
  const colors = [];
  const rectangles = [];
  const context = {
    fillRect(x, y, width, height) { colors.push(this.fillStyle); rectangles.push({ x, y, width, height, color: this.fillStyle }); },
    beginPath() {}, ellipse() {}, arc() {}, fill() { colors.push(this.fillStyle); }
  };
  drawCharacterMarker(context, 0, 0, PLAYER_OUTFIT, PLAYER_STYLE);
  assert.ok(colors.includes(PLAYER_STYLE.belt));
  assert.ok(rectangles.some((part) => part.color === TATTOO_INK && part.x > 0));
  assert.ok(rectangles.some((part) => part.color === '#dfb38c' && part.y >= 20));
  colors.length = 0;
  rectangles.length = 0;
  drawCharacterMarker(context, 0, 0, CAT_OUTFIT, CAT_STYLE);
  for (const color of [CAT_OUTFIT, CAT_STYLE.trousers, CAT_STYLE.belt, CAT_STYLE.buckle]) {
    assert.ok(colors.includes(color));
  }
  assert.ok(rectangles.some((part) => part.color === TATTOO_INK && part.x < 0));
  assert.ok(rectangles.some((part) => part.color === TATTOO_ACCENT && part.x < 0));
});

test('player shorts and tattoo move with the anatomically left leg', () => {
  const parent = new THREE.Group();
  const parts = [];
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Object3D();
    part.position.set(x, y, z); part.userData = { width, height, depth, color };
    owner.add(part); parts.push(part);
    return part;
  };
  const legs = createPlayerLegs(parent, box, { offset: 6, shoeColor: '#594336', shortsColor: PLAYER_STYLE.shorts, skin: '#dfb38c' });
  assert.deepEqual(legs.map((leg) => leg.position.x), [-6, 6]);
  assert.ok(legs.every((leg) => leg.children.some((part) => part.userData.color === PLAYER_STYLE.shorts)));
  assert.ok(legs.every((leg) => leg.children.some((part) => part.userData.color === '#dfb38c')));
  assert.ok(!legs[0].children.some((part) => part.userData.color === TATTOO_INK));
  assert.ok(legs[1].children.some((part) => part.userData.color === TATTOO_INK && part.position.x > 4.5));
  assert.ok(legs[1].children.some((part) => part.userData.color === TATTOO_INK && part.position.z < -5));
  for (const leg of legs) {
    const shoe = leg.children.find((part) => part.userData.color === '#594336');
    const skin = leg.children.find((part) => part.userData.color === '#dfb38c');
    assert.ok(shoe.position.z - shoe.userData.depth / 2 < skin.position.z - skin.userData.depth / 2);
    assert.ok(shoe.position.z + shoe.userData.depth / 2 > skin.position.z + skin.userData.depth / 2);
  }
  legs[1].rotation.x = 0.4;
  assert.equal(parts.find((part) => part.userData.color === TATTOO_ACCENT).parent.rotation.x, 0.4);
});

test('fallback limbs and the leg tattoo move with the walking stride', () => {
  const rectangles = [];
  const context = {
    fillRect(x, y, width, height) { rectangles.push({ x, y, width, height, color: this.fillStyle }); },
    beginPath() {}, ellipse() {}, arc() {}, fill() {}
  };
  drawCharacterMarker(context, 0, 0, PLAYER_OUTFIT, { ...PLAYER_STYLE, stride: 0.4 });
  const tattoo = rectangles.find((part) => part.color === TATTOO_INK && part.x > 0);
  const leftArm = rectangles.find((part) => part.color === PLAYER_OUTFIT && part.x === 7);
  assert.equal(tattoo.y, 20.2);
  assert.equal(leftArm.y, 7.8);
});

test('arms swing from the shoulder opposite their legs and can keep a hand still', () => {
  const parent = new THREE.Group();
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Object3D();
    part.position.set(x, y, z); part.userData.color = color; owner.add(part);
    return part;
  };
  const arms = createCharacterArms(parent, box, { offset: 15, shoulderY: 54, length: 28, width: 7, depth: 8,
    color: CAT_OUTFIT, skin: '#dfb38c', shortSleeves: true, tattoo: true });
  assert.ok(arms[0].children.some((part) => part.userData.color === TATTOO_INK && part.position.z > 4));
  assert.ok(arms[0].children.some((part) => part.userData.color === TATTOO_INK && part.position.z < -4));
  assert.ok(!arms[1].children.some((part) => part.userData.color === TATTOO_INK));
  swingCharacterArms(arms, 0.4);
  assert.deepEqual(arms.map((arm) => arm.rotation.x), [-0.4, 0.4]);
  swingCharacterArms(arms, 0.4, 1);
  assert.deepEqual(arms.map((arm) => arm.rotation.x), [-0.4, 0]);
  swingCharacterArms(arms, 0);
  assert.deepEqual(arms.map((arm) => arm.rotation.x), [-0, 0]);
});

test('rounded torsos and Japanese-inspired sleeve add character detail', () => {
  const geometry = createCharacterTorsoGeometry();
  geometry.computeBoundingBox();
  assert.ok(geometry.boundingBox.max.x < 0.5);
  assert.ok(geometry.getAttribute('position').count > 100);
  geometry.dispose();

  const parts = [];
  addJapaneseSleeve((x, y, z, width, height, depth, color) => {
    const part = { x, y, z, width, height, depth, color, rotation: { z: 0 } };
    parts.push(part);
    return part;
  }, { x: -17, y: 33, z: 0, width: 7, height: 14, depth: 8 });
  assert.equal(parts.filter((part) => part.color === TATTOO_INK).length, 15);
  assert.equal(parts.filter((part) => part.color === TATTOO_ACCENT).length, 2);
  assert.ok(parts.every((part) => part.x < 0));
  assert.ok(parts.some((part) => part.z > 4) && parts.some((part) => part.z < -4) && parts.some((part) => part.x < -20.5));
});

test('Cat’s animated legs retain dark green trousers', () => {
  const colors = [];
  const parent = new THREE.Group();
  const legs = createCharacterLegs(parent, (x, y, z, width, height, depth, color) => {
    colors.push(color);
  }, 6, '#594336', CAT_STYLE.trousers);
  assert.equal(legs.length, 2);
  assert.equal(colors.filter((color) => color === CAT_STYLE.trousers).length, 2);
});
