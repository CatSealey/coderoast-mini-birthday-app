import test from 'node:test';
import assert from 'node:assert/strict';
import { CAT_OUTFIT, CAT_STYLE, CHARACTER_HAIR, CHARACTER_HEAD_SCALE, PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker, facingForMovement } from '../js/character-appearance.js';
import { newHouseState } from '../js/games/abigail-house.js';
import { createAbigailScene } from '../js/games/abigail-scene.js';
import { createCharacterLegs, createPlayerLegs } from '../js/games/character-legs.js';
import { CHARACTER_RISE, TATTOO_ACCENT, TATTOO_INK, addCharacterBelt, addCharacterClothingDetails, addJapaneseSleeve, createCharacterArms, createCharacterFaceGeometry, createCharacterHeadGeometry, createCharacterLimbGeometry, createCharacterSkinGeometry, createCharacterTorsoGeometry, swingCharacterArms } from '../js/character-body.js';
import * as THREE from 'three';

test('Abigail walking stride follows distance instead of frame rate and rests when stopped', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const shoes = [];
  const context = {
    setTransform() {}, fillRect(x, y) { if (this.fillStyle === '#594336') shoes.push({ x, y }); },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {}, ellipse() {}, arc() {}, fill() {},
    save() {}, restore() {}, translate() {}, scale() {}
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

test('fallback side profiles shape the player and Cat without changing other characters', () => {
  for (const [outfit, style] of [[PLAYER_OUTFIT, PLAYER_STYLE], [CAT_OUTFIT, CAT_STYLE]]) {
    for (const direction of [-1, 1]) {
      const ellipses = [], rectangles = [];
      const context = {
        fillRect(x, y, width, height) { rectangles.push({ x, y, width, height, color: this.fillStyle }); },
        beginPath() {}, ellipse(x, y, rx, ry) { ellipses.push({ x, y, rx, ry, color: this.fillStyle }); },
        arc() {}, fill() {}
      };
      drawCharacterMarker(context, 0, 0, outfit, { ...style, facing: direction * Math.PI / 2 });
      assert.ok(ellipses.some((part) => part.color === outfit && part.y === 9 && part.x === direction));
      assert.ok(rectangles.some((part) => part.color === (style.shorts || style.trousers)
        && part.y === 16 && Math.abs(part.x - (-8 - direction * 0.6)) < 1e-8));
    }
  }
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
  assert.equal(head.width, 18 * 0.96 * CHARACTER_HEAD_SCALE);
  assert.ok(head.width / 24 >= 0.66 && head.width / 24 <= 0.68);
  const sideLocks = parts.filter((part) => part.color === CHARACTER_HAIR && Math.abs(part.x) === head.width * 0.43);
  assert.equal(sideLocks.length, 2);
  const eyes = parts.filter((part) => part.color === '#49382f');
  assert.equal(eyes.length, 2);
  assert.ok(eyes.every((eye) => Math.abs(eye.x) < head.width / 2 && eye.z > 0));
  assert.equal(parts.filter((part) => part.color === '#e3d2ba' && part.z > eyes[0].z).length, 2);
  const back = parts.find((part) => part.color === CHARACTER_HAIR && part.x === 0 && part.z < 0 && part.height > head.height);
  assert.ok(back && sideLocks.every((part) => part.z - part.depth / 2 < back.z + back.depth / 2));
  const fringe = parts.filter((part) => part.color === CHARACTER_HAIR && part.z > 0);
  assert.ok(fringe.every((part) => part.y - part.height / 2 > eyes[0].y + eyes[0].height / 2));
  const playerBottom = sideLocks[0].y - sideLocks[0].height / 2;
  parts.length = 0;
  addCharacterHeadDetails(record('box'), record('round'),
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hairLength: CAT_STYLE.hairLength });
  const catSide = parts.find((part) => part.color === CHARACTER_HAIR && Math.abs(part.x) === head.width * 0.43);
  assert.ok(playerBottom < catSide.y - catSide.height / 2);
});

test('short and custom-coloured hair retains its own shape and colour', () => {
  const parts = [];
  const record = (x, y, z, width, height, depth, color) => {
    parts.push({ x, y, z, width, height, depth, color });
  };
  addCharacterHeadDetails(record, record,
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hair: '#c4beb2' });
  const sideLocks = parts.filter((part) => part.color === '#c4beb2' && Math.abs(part.x) === 18 * 0.96 * CHARACTER_HEAD_SCALE * 0.43);
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
  assert.ok(!legs[0].userData.knee.children.some((part) => part.userData.color === TATTOO_INK));
  assert.ok(legs[1].userData.knee.children.some((part) => part.userData.color === TATTOO_INK && part.position.x > 3.5));
  assert.ok(legs[1].userData.knee.children.some((part) => part.userData.color === TATTOO_INK && part.position.z < -4));
  for (const leg of legs) {
    const shoe = leg.userData.foot.children.find((part) => part.userData.color === '#594336');
    const skin = leg.children.find((part) => part.userData.color === '#dfb38c');
    assert.ok(shoe.position.z - shoe.userData.depth / 2 < skin.position.z - skin.userData.depth / 2);
    assert.ok(shoe.position.z + shoe.userData.depth / 2 > skin.position.z + skin.userData.depth / 2);
  }
  const tattoo = parts.find((part) => part.userData.color === TATTOO_ACCENT);
  assert.equal(tattoo.parent, legs[1].userData.knee);
  legs[1].userData.knee.rotation.x = 0.4;
  assert.equal(tattoo.parent.rotation.x, 0.4);
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
  assert.ok(arms[0].userData.elbow.children.some((part) => part.userData.color === TATTOO_INK && part.position.z > 3));
  assert.ok(arms[0].userData.elbow.children.some((part) => part.userData.color === TATTOO_INK && part.position.z < -3));
  assert.ok(!arms[1].userData.elbow.children.some((part) => part.userData.color === TATTOO_INK));
  swingCharacterArms(arms, Math.PI / 2, true);
  assert.ok(Math.abs(arms[0].rotation.x + 0.2) < 1e-10 && Math.abs(arms[1].rotation.x - 0.2) < 1e-10);
  assert.ok(arms[1].userData.elbow.rotation.x < 0);
  swingCharacterArms(arms, Math.PI / 2, true, 1);
  assert.ok(Math.abs(arms[0].rotation.x + 0.2) < 1e-10 && arms[1].rotation.x === 0);
  assert.equal(arms[1].userData.elbow.rotation.x, 0);
  swingCharacterArms(arms, 3 * Math.PI / 2, true);
  assert.ok(arms[0].userData.elbow.rotation.x < 0);
  swingCharacterArms(arms, Math.PI / 2, false);
  assert.ok(arms.every((arm) => arm.rotation.x === 0));
  assert.ok(arms.every((arm) => arm.userData.elbow.rotation.x === 0));
});

test('paired walkers keep either joined hand fixed while their other elbows move', () => {
  const parent = new THREE.Group();
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Object3D();
    part.position.set(x, y, z); owner.add(part); return part;
  };
  const arms = createCharacterArms(parent, box, { offset: 15, shoulderY: 54, length: 28, width: 7, depth: 8,
    color: CAT_OUTFIT, skin: '#dfb38c' });
  for (const held of [0, 1]) {
    swingCharacterArms(arms, 0, false, held);
    parent.updateMatrixWorld(true);
    const fixedHand = arms[held].userData.hand.getWorldPosition(new THREE.Vector3());
    let freeElbowBends = false;
    for (const phase of [Math.PI / 2, 3 * Math.PI / 2]) {
      swingCharacterArms(arms, phase, true, held);
      parent.updateMatrixWorld(true);
      assert.ok(arms[held].userData.hand.getWorldPosition(new THREE.Vector3()).distanceTo(fixedHand) < 1e-10);
      assert.equal(arms[held].userData.elbow.rotation.x, 0);
      freeElbowBends ||= arms[1 - held].userData.elbow.rotation.x < 0;
    }
    assert.ok(freeElbowBends);
  }
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
  assert.ok(colors.filter((color) => color === CAT_STYLE.trousers).length >= 5);
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
  assert.deepEqual(arms[0].children[0].scale.toArray(), [7, 28 * 0.46, 8]);
  assert.ok(arms[0].userData.elbow.children.some((part) => part.userData.color === TATTOO_INK));
  swingCharacterArms(arms, Math.PI / 2, true);
  assert.equal(arms[0].rotation.x, -0.2);
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
      assert.equal(shoulder.scale.x, armWidth * 0.72);
      assert.equal(shoulder.scale.y, armWidth * 0.8);
      assert.ok(Math.abs(arms[1].position.x - (offset - armWidth * 0.65)) < 1e-10);
      assert.ok(Math.abs(arms[0].position.x + arms[1].position.x) < 1e-10);
      parent.updateMatrixWorld(true);
      const y = shoulderY + shoulder.position.y + shoulder.scale.y * 0.22;
      const ray = new THREE.Raycaster(new THREE.Vector3(-100, y, 0), new THREE.Vector3(1, 0, 0));
      const torsoHits = ray.intersectObject(torso), shoulderHits = ray.intersectObject(shoulder);
      assert.ok(torsoHits.length > 0 && shoulderHits.length > 0);
      const torsoEdge = Math.max(...torsoHits.map((hit) => hit.point.x));
      const shoulderEdge = Math.min(...shoulderHits.map((hit) => hit.point.x));
      assert.ok(torsoEdge >= shoulderEdge, `torso ${torsoWidth}x${torsoHeight}, short sleeves ${shortSleeves}: ${torsoEdge} < ${shoulderEdge}`);
      const outerEdge = () => Math.max(...ray.intersectObjects([torso, shoulder, arms[1].children[0]]).map((hit) => hit.point.x));
      const narrowerEdge = outerEdge();
      arms[1].position.x += armWidth * 0.07;
      shoulder.scale.x = armWidth * 0.76;
      parent.updateMatrixWorld(true);
      const previousEdge = outerEdge();
      assert.ok(previousEdge - narrowerEdge >= armWidth * 0.06, 'shoulder silhouette is slightly narrower on each side');
      assert.ok(previousEdge - narrowerEdge <= armWidth * 0.09, 'shoulder reduction remains subtle');
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
  const depths = Array.from({ length: positions.count }, (_, i) => positions.getZ(i));
  assert.ok(Math.max(...depths) - Math.min(...depths) < 0.75, 'torso profile stays slimmer than the old 0.96-depth body');
  assert.ok(Math.max(...depths) > -Math.min(...depths), 'chest and back have distinct profiles');
  const normals = geometry.getAttribute('normal');
  assert.ok(Array.from({ length: normals.count }, (_, i) => normals.getY(i)).some((y) => Math.abs(y) > 0.1 && Math.abs(y) < 0.95));
  geometry.dispose();
});

test('player and Cat torsos have a modest shaped chest without changing other characters', () => {
  const normal = createCharacterTorsoGeometry(), shaped = createCharacterTorsoGeometry({ shaped: true });
  const depthAt = (geometry, height) => {
    const positions = geometry.getAttribute('position');
    let front = -Infinity;
    for (let i = 0; i < positions.count; i += 1) {
      if (Math.abs(positions.getY(i) - height) < 0.0001) front = Math.max(front, positions.getZ(i));
    }
    return front;
  };
  const chestIncrease = depthAt(shaped, 0.23) - depthAt(normal, 0.23);
  assert.ok(chestIncrease > 0.1 && chestIncrease < 0.11);
  const positions = shaped.getAttribute('position');
  const chestVertices = Array.from({ length: positions.count }, (_, i) =>
    ({ x: positions.getX(i), y: positions.getY(i), z: positions.getZ(i) }))
    .filter((point) => Math.abs(point.y - 0.23) < 1e-4);
  assert.ok(chestVertices.some((point) => point.x < -0.1 && Math.abs(point.z - depthAt(shaped, 0.23)) < 1e-4));
  assert.ok(chestVertices.some((point) => point.x > 0.1 && Math.abs(point.z - depthAt(shaped, 0.23)) < 1e-4));
  assert.ok(chestVertices.some((point) => point.x === 0 && point.z < depthAt(shaped, 0.23)));
  assert.ok(Math.abs(depthAt(shaped, -0.25) - depthAt(normal, -0.25)) < 1e-6);
  assert.ok(Math.abs(depthAt(shaped, 0.47) - depthAt(normal, 0.47)) < 1e-6);
  normal.dispose(); shaped.dispose();
});

test('player and Cat clothing details remain on the shaped torso in every scene size', () => {
  const cube = new THREE.BoxGeometry(), torso = createCharacterTorsoGeometry({ shaped: true });
  const limb = createCharacterLimbGeometry(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const [width, height, depth] of [[20, 30, 12], [24, 36, 17], [25, 38, 15], [25, 36, 17], [26, 38, 17]]) {
    for (const kind of ['player', 'cat']) {
      const parent = new THREE.Group(), body = new THREE.Mesh(torso, material);
      body.scale.set(width, height, depth); parent.add(body);
      const box = (x, y, z, w, h, d) => {
        const mesh = new THREE.Mesh(cube, material);
        mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
      };
      addCharacterClothingDetails(box, { width, height, depth, centerY: 0, color: '#25272b',
        kind, limbGeometry: limb, torsoGeometry: torso });
      const shirt = parent.children.find((part) => part !== body && part.geometry === torso);
      parent.updateMatrixWorld(true);
      const seams = parent.children.filter((part) => part.geometry === cube && part.position.x === 0
        && Math.abs(part.scale.x - width * 0.02) < 1e-8 && Math.abs(part.scale.y - height * 0.13) < 1e-8);
      assert.equal(seams.length, 3);
      for (const seam of seams) {
        const ray = new THREE.Raycaster(new THREE.Vector3(0, seam.position.y, 100), new THREE.Vector3(0, 0, -1));
        const front = Math.max(...[...ray.intersectObject(body), ...ray.intersectObject(shirt)].map((hit) => hit.point.z));
        assert.ok(seam.position.z - front > 0 && seam.position.z - front < 0.8);
      }
    }
  }
  cube.dispose(); torso.dispose(); limb.dispose(); material.dispose();
});

test('face geometry has a shaped jaw and layered clothing follows the torso', () => {
  const face = createCharacterFaceGeometry(), positions = face.getAttribute('position');
  const halfWidthAt = (height) => {
    let result = 0;
    for (let i = 0; i < positions.count; i += 1) {
      if (Math.abs(positions.getY(i) - height) < 0.0001) result = Math.max(result, Math.abs(positions.getX(i)));
    }
    return result;
  };
  assert.ok(halfWidthAt(-0.5) < halfWidthAt(0.22) * 0.6);
  assert.ok(halfWidthAt(-0.38) < halfWidthAt(-0.1));
  assert.ok(positions.count > 200);
  const normals = face.getAttribute('normal');
  for (let i = 0; i < positions.count; i += 1) {
    if (positions.getY(i) < -0.1 && positions.getZ(i) > 0.27 && normals.getZ(i) > 0.8) {
      assert.ok(normals.getY(i) >= 0);
    }
  }

  const parent = new THREE.Group(), cube = new THREE.BoxGeometry(), torso = createCharacterTorsoGeometry();
  const limb = createCharacterLimbGeometry(), material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth); part.userData.color = color;
    parent.add(part); return part;
  };
  addCharacterClothingDetails(box, { width: 26, height: 38, depth: 17, centerY: 39 + CHARACTER_RISE,
    color: '#789164', kind: 'npc', limbGeometry: limb, torsoGeometry: torso });
  const shirt = parent.children.find((part) => part.userData.color === '#d3c5a6');
  assert.equal(shirt.geometry, torso);
  assert.ok(shirt.scale.x < 26 && shirt.scale.y < 38 && shirt.scale.z < 17);
  assert.ok(shirt.position.z > 0);
  const body = new THREE.Mesh(torso, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  body.position.y = 39 + CHARACTER_RISE; body.scale.set(26, 38, 17); parent.add(body);
  material.side = THREE.DoubleSide;
  parent.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(0, body.position.y, -100), new THREE.Vector3(0, 0, 1));
  const torsoHits = ray.intersectObject(body).map((hit) => hit.point.z);
  const shirtHits = ray.intersectObject(shirt).map((hit) => hit.point.z);
  assert.ok(Math.min(...shirtHits) > Math.min(...torsoHits));
  assert.ok(Math.max(...shirtHits) > Math.max(...torsoHits));
  const collars = parent.children.filter((part) => part.geometry === limb && part.position.y > 39 + CHARACTER_RISE);
  assert.ok(collars.length >= 2 && collars.some((part) => part.rotation.z > 0) && collars.some((part) => part.rotation.z < 0));
  face.dispose(); cube.dispose(); torso.dispose(); limb.dispose(); material.dispose(); body.material.dispose();
});

test('clothing follows the torso surface for each scene size', () => {
  const cube = new THREE.BoxGeometry(), torso = createCharacterTorsoGeometry(), limb = createCharacterLimbGeometry();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  for (const [width, height, depth] of [[20, 30, 12], [24, 36, 17], [25, 38, 17], [26, 38, 17]]) {
    for (const variant of [0, 1, 2]) {
      const parent = new THREE.Group();
      const body = new THREE.Mesh(torso, material); body.scale.set(width, height, depth); parent.add(body);
      const box = (x, y, z, w, h, d, color) => {
        assert.ok([x, y, z, w, h, d].every(Number.isFinite));
        const mesh = new THREE.Mesh(cube, material);
        mesh.position.set(x, y, z); mesh.scale.set(w, h, d); mesh.userData.color = color;
        parent.add(mesh); return mesh;
      };
      addCharacterClothingDetails(box, { width, height, depth, centerY: 0, color: '#789164',
        kind: 'npc', variant, limbGeometry: limb, torsoGeometry: torso });
      const shirt = parent.children.find((part) => part.userData.color === ['#d3c5a6', '#a7b8ab', '#c4b39b'][variant]);
      parent.updateMatrixWorld(true);
      const straps = parent.children.filter((part) => part.userData.color === '#70513a' && Math.abs(part.rotation.z) === 0.4);
      assert.equal(straps.length, 5);
      for (const strap of straps) {
        const ray = new THREE.Raycaster(new THREE.Vector3(strap.position.x, strap.position.y, 100), new THREE.Vector3(0, 0, -1));
        const hits = [...ray.intersectObject(body), ...ray.intersectObject(shirt)];
        assert.ok(hits.length > 0);
        const front = Math.max(...hits.map((hit) => hit.point.z));
        assert.ok(strap.position.z - front > 0 && strap.position.z - front < 0.5);
      }
    }
  }
  cube.dispose(); torso.dispose(); limb.dispose(); material.dispose();
});

test('elbows and wrists connect tapered forearms to hands in both sleeve styles', () => {
  const parent = new THREE.Group(), cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry();
  const skin = createCharacterSkinGeometry(), material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth); owner.add(part); return part;
  };
  for (const shortSleeves of [false, true]) {
    const arms = createCharacterArms(parent, box, { offset: 16, shoulderY: 63, length: 28, width: 7, depth: 8,
      color: CAT_OUTFIT, skin: '#dfb38c', shortSleeves, limbGeometry: limb, skinGeometry: skin });
    for (const arm of arms) {
      const [sleeve, , , , elbow] = arm.children;
      const [forearm, wrist, hand] = arm.userData.elbow.children;
      parent.updateMatrixWorld(true);
      const bounds = (part) => new THREE.Box3().setFromObject(part);
      assert.ok(bounds(elbow).intersectsBox(bounds(sleeve)) && bounds(elbow).intersectsBox(bounds(forearm)));
      assert.ok(bounds(wrist).intersectsBox(bounds(forearm)) && bounds(wrist).intersectsBox(bounds(hand)));
      assert.ok(wrist.scale.x < forearm.scale.x && hand.scale.x < sleeve.scale.x);
      assert.ok(bounds(elbow).max.z > bounds(forearm).max.z, 'elbow extends beyond the forearm profile');
      arm.userData.elbow.rotation.x = -0.27;
      parent.updateMatrixWorld(true);
      assert.ok(bounds(elbow).intersectsBox(bounds(forearm)));
    }
  }
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
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
  assert.ok(arms[0].userData.elbow.children.some((part) => part.geometry === skin && part.userData.color === '#dfb38c'));
  assert.ok(arms[0].userData.elbow.children.some((part) => part.userData.color === TATTOO_INK && part.position.z > 2.5));
  const legs = createPlayerLegs(parent, box, { offset: 7, shoeColor: '#594336', shortsColor: PLAYER_STYLE.shorts,
    skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin });
  assert.ok(legs[1].userData.knee.children.some((part) => part.geometry === skin && part.userData.color === '#dfb38c'));
  assert.ok(legs[1].userData.knee.children.some((part) => part.userData.color === TATTOO_INK));
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});

test('tattoos follow the front, back and outside of tapered moving limbs', () => {
  const parent = new THREE.Group(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const cube = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const box = (x, y, z, width, height, depth, color, owner = parent) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth);
    part.userData.color = color; owner.add(part); return part;
  };
  const arms = createCharacterArms(parent, box, { offset: 16, shoulderY: 63, length: 28, width: 7, depth: 8,
    color: CAT_OUTFIT, skin: '#dfb38c', shortSleeves: true, tattoo: true, limbGeometry: limb, skinGeometry: skin });
  const legs = createPlayerLegs(parent, box, { offset: 7, height: 31, shoeColor: '#594336',
    shortsColor: PLAYER_STYLE.shorts, skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin });
  for (const owner of [arms[0].userData.elbow, legs[1].userData.knee]) {
    const exposed = owner.children.find((part) => part.geometry === skin);
    const ink = owner.children.filter((part) => part.userData.color === TATTOO_INK);
    assert.equal(ink.length, 15);
    parent.updateMatrixWorld(true);
    for (const mark of ink) {
      const side = Math.abs(mark.position.z) < 0.01;
      const direction = side
        ? new THREE.Vector3(-Math.sign(mark.position.x), 0, 0)
        : new THREE.Vector3(0, 0, -Math.sign(mark.position.z));
      const origin = mark.position.clone().addScaledVector(direction, -10);
      owner.localToWorld(origin);
      direction.transformDirection(owner.matrixWorld);
      const hits = new THREE.Raycaster(origin, direction).intersectObject(exposed);
      assert.ok(hits.length > 0, 'tattoo projects onto exposed skin');
      const markWorld = owner.localToWorld(mark.position.clone());
      assert.ok(markWorld.distanceTo(hits[0].point) < 0.22, 'tattoo remains close to the skin surface');
    }
    owner.rotation.x = 0.4;
    assert.ok(ink.every((mark) => mark.parent === owner));
  }
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});
