import test from 'node:test';
import assert from 'node:assert/strict';
import { CAT_OUTFIT, CAT_STYLE, CHARACTER_HAIR, PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker, facingForMovement } from '../js/character-appearance.js';
import { newHouseState } from '../js/games/abigail-house.js';
import { createAbigailScene } from '../js/games/abigail-scene.js';
import { createCharacterLegs, createPlayerLegs } from '../js/games/character-legs.js';
import { TATTOO_ACCENT, TATTOO_INK, addCharacterBelt, addCharacterClothingDetails, addJapaneseSleeve, createCharacterArms, createCharacterHeadGeometry, createCharacterLimbGeometry, createCharacterSkinGeometry, createCharacterTorsoGeometry, swingCharacterArms } from '../js/character-body.js';
import * as THREE from 'three';

test('Abigail walking stride follows distance instead of frame rate and rests when stopped', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const shoes = [];
  const context = {
    setTransform() {}, fillRect(x, y) { if (this.fillStyle === '#594336') shoes.push({ x, y }); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {}, ellipse() {}, arc() {}, fill() {}
  };
  const canvas = { getContext: () => context, addEventListener() {}, removeEventListener() {} };
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  globalThis.window = { devicePixelRatio: 1, matchMedia: () => ({ matches: false }) };
  try {
    for (const frames of [30, 60, 120]) {
      const scene = createAbigailScene(canvas, () => {});
      scene.resize(1000, 1060);
      const state = newHouseState();
      scene.draw(state);
      for (let frame = 1; frame <= frames; frame += 1) {
        shoes.length = 0;
        scene.draw({ ...state, player: { ...state.player, x: state.player.x + 210 * frame / frames } });
      }
      const scale = 970 / 1100;
      assert.equal(shoes.length, 2);
      const stride = (shoes[0].y - shoes[1].y) / (4 * scale);
      assert.ok(Math.abs(stride - Math.sin(210 * 0.04) * 0.4) < 1e-10);
      shoes.length = 0;
      scene.draw({ ...state, player: { ...state.player, x: state.player.x + 210 } });
      assert.equal(shoes[0].y, shoes[1].y);
      scene.dispose();
    }
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

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

test('fallback zip-line rider raises both arms without changing the walking pose', () => {
  const rectangles = [], context = {
    fillRect(x, y, width, height) { rectangles.push({ x, y, width, height, color: this.fillStyle }); },
    beginPath() {}, ellipse() {}, arc() {}, fill() {}
  };
  drawCharacterMarker(context, 0, 0, PLAYER_OUTFIT, { ...PLAYER_STYLE, zipline: true });
  for (const x of [-10, 7]) {
    assert.ok(rectangles.some((part) => part.x === x && part.y === -10 && part.height === 20 && part.color === PLAYER_OUTFIT));
    assert.ok(rectangles.some((part) => part.x === x && part.y === -12 && part.color === '#dfb38c'));
  }
  rectangles.length = 0;
  drawCharacterMarker(context, 0, 0, PLAYER_OUTFIT, PLAYER_STYLE);
  assert.ok(rectangles.some((part) => part.x === -10 && part.y === 7 && part.height === 9 && part.color === PLAYER_OUTFIT));
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
  assert.equal(parts.filter((part) => part.color === '#e3d2ba' && part.z > eyes[0].z).length, 2);
  const lockColor = `#${new THREE.Color(CHARACTER_HAIR).offsetHSL(0, 0, 0.025).getHexString()}`;
  assert.equal(parts.filter((part) => part.color === lockColor && part.kind === 'round' && part.z < -head.depth / 2).length, 2);
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

test('faceted limbs remain attached to animated arms and preserve Cat’s tattoo', () => {
  const parent = new THREE.Group(), limb = createCharacterLimbGeometry();
  const cube = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth);
    part.userData.color = color; owner.add(part); return part;
  };
  const arms = createCharacterArms(parent, box, { offset: 15, shoulderY: 54, length: 28, width: 7, depth: 8,
    color: CAT_OUTFIT, skin: '#dfb38c', shortSleeves: true, tattoo: true, limbGeometry: limb });
  assert.ok(arms.every((arm) => arm.children[0].geometry === limb));
  assert.deepEqual(arms[0].children[0].scale.toArray(), [7, 14, 8]);
  assert.ok(arms[0].children.some((part) => part.userData.color === TATTOO_INK));
  swingCharacterArms(arms, 0.4);
  assert.equal(arms[0].rotation.x, -0.4);
  const legs = createCharacterLegs(parent, box, 6, '#594336', CAT_STYLE.trousers, limb);
  assert.ok(legs.every((leg) => leg.children[0].geometry === limb && leg.children[0].userData.color === CAT_STYLE.trousers));
  cube.dispose(); limb.dispose(); material.dispose();
});

test('shoulders are compact and remain joined to each scene’s torso', () => {
  const limb = createCharacterLimbGeometry(), torsoGeometry = createCharacterTorsoGeometry();
  const cube = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth); owner.add(part); return part;
  };
  for (const [torsoWidth, torsoHeight, torsoY, offset, shoulderY, length, armWidth] of [
    [20, 30, 37, 12.5, 48.5, 25, 6],
    [26, 38, 39, 16, 54, 28, 7],
    [25, 38, 40, 15.5, 57, 30, 7],
    [25, 36, 42, 15, 57, 28, 7],
    [24, 36, 37, 15, 54, 28, 7]
  ]) {
    for (const shortSleeves of [false, true]) {
      const parent = new THREE.Group();
      const torso = new THREE.Mesh(torsoGeometry, material);
      torso.position.y = torsoY; torso.scale.set(torsoWidth, torsoHeight, 17); parent.add(torso);
      const arms = createCharacterArms(parent, box, { offset, shoulderY, length, width: armWidth, depth: 8,
        color: CAT_OUTFIT, skin: '#dfb38c', shortSleeves, limbGeometry: limb });
      const shoulder = arms[1].children[1];
      assert.equal(shoulder.scale.x, armWidth * 1.2);
      assert.equal(shoulder.scale.y, length * (shortSleeves ? 0.5 : 1) * 0.28);
      assert.ok(arms[1].position.x + armWidth * 0.48 < offset + armWidth * 0.48);
      parent.updateMatrixWorld(true);
      const y = shoulderY + shoulder.position.y + shoulder.scale.y * 0.22;
      const ray = new THREE.Raycaster(new THREE.Vector3(-100, y, 0), new THREE.Vector3(1, 0, 0));
      const torsoHits = ray.intersectObject(torso), shoulderHits = ray.intersectObject(shoulder);
      assert.ok(torsoHits.length > 0 && shoulderHits.length > 0);
      const torsoEdge = Math.max(...torsoHits.map((hit) => hit.point.x));
      const shoulderEdge = Math.min(...shoulderHits.map((hit) => hit.point.x));
      assert.ok(torsoEdge >= shoulderEdge, `torso ${torsoWidth}x${torsoHeight}, short sleeves ${shortSleeves}: ${torsoEdge} < ${shoulderEdge}`);
    }
  }
  cube.dispose(); limb.dispose(); torsoGeometry.dispose(); material.dispose();
});

test('character details distinguish fantasy NPC outfits from the player and Cat', () => {
  const collect = (kind, variant = 0) => {
    const parts = [];
    addCharacterClothingDetails((x, y, z, width, height, depth, color) => {
      const part = { x, y, z, width, height, depth, color, rotation: { z: 0 } };
      parts.push(part); return part;
    }, { width: 24, height: 36, depth: 17, centerY: 37, color: kind === 'npc' ? '#789164' : PLAYER_OUTFIT, kind, variant });
    return parts;
  };
  const first = collect('npc'), second = collect('npc', 1), third = collect('npc', 2);
  assert.ok(first.some((part) => part.color === '#70513a' && part.rotation.z < 0));
  assert.ok(second.some((part) => part.color === '#70513a' && part.rotation.z > 0));
  assert.ok(third.length > first.length);
  assert.ok(first.some((part) => part.color === '#b7a788'));
  assert.ok(third.some((part) => part.color === '#a79270'));
  for (const kind of ['player', 'cat']) {
    const parts = collect(kind);
    assert.ok(parts.some((part) => part.color === '#969b96'));
    assert.ok(!parts.some((part) => ['#70513a', '#b7a788', '#a79270'].includes(part.color)));
  }
  const head = createCharacterHeadGeometry();
  assert.ok(head.getAttribute('position').count > 0);
  head.dispose();
});

test('faceted torso narrows at the waist and slopes at the shoulders', () => {
  const geometry = createCharacterTorsoGeometry();
  const positions = geometry.getAttribute('position');
  const halfWidthAt = (height) => {
    let result = 0;
    for (let i = 0; i < positions.count; i += 1) {
      if (Math.abs(positions.getY(i) - height) < 0.0001) result = Math.max(result, Math.abs(positions.getX(i)));
    }
    return result;
  };
  const waist = halfWidthAt(-0.25), chest = halfWidthAt(0.23), neck = halfWidthAt(0.47);
  assert.ok(waist < chest * 0.7);
  assert.ok(neck < chest * 0.6);
  const normals = geometry.getAttribute('normal');
  assert.ok(Array.from({ length: normals.count }, (_, i) => normals.getY(i)).some((y) => Math.abs(y) > 0.1 && Math.abs(y) < 0.95));
  geometry.dispose();
});

test('belts follow the narrowed torso and tattooed skin stays faceted', () => {
  const parent = new THREE.Group(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const cube = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, owner = parent) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth);
    part.userData.color = color; owner.add(part); return part;
  };
  addCharacterBelt(box, { width: 26, depth: 17, y: 27, color: CAT_STYLE.belt, buckle: CAT_STYLE.buckle, limbGeometry: limb });
  const bounds = new THREE.Box3().setFromObject(parent.children[0]);
  assert.ok(bounds.getSize(new THREE.Vector3()).x < 26 * 0.75);
  assert.ok(parent.children.some((part) => part.userData.color === CAT_STYLE.buckle));
  const arms = createCharacterArms(parent, box, { offset: 16, shoulderY: 54, length: 28, width: 7, depth: 8,
    color: CAT_OUTFIT, skin: '#dfb38c', shortSleeves: true, tattoo: true, limbGeometry: limb, skinGeometry: skin });
  assert.ok(arms[0].children.some((part) => part.geometry === skin && part.userData.color === '#dfb38c'));
  assert.ok(arms[0].children.some((part) => part.userData.color === TATTOO_INK && part.position.z > 4));
  const legs = createPlayerLegs(parent, box, { offset: 7, shoeColor: '#594336', shortsColor: PLAYER_STYLE.shorts,
    skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin });
  assert.ok(legs[1].children.some((part) => part.geometry === skin && part.userData.color === '#dfb38c'));
  assert.ok(legs[1].children.some((part) => part.userData.color === TATTOO_INK));
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});
