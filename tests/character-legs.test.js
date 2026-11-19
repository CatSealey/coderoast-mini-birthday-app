import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterLegs, createPlayerLegs, swingCharacterLegs } from '../js/games/character-legs.js';
import { CHARACTER_RISE, createCharacterLimbGeometry, createCharacterSkinGeometry, createCharacterTorsoGeometry } from '../js/character-body.js';

test('character shoes keep their intended size and move with their legs', () => {
  const parent = new THREE.Group();
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, container) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(width, height, depth);
    container.add(mesh);
    return mesh;
  };
  for (const offset of [6, 7]) {
    const legs = createCharacterLegs(parent, box, offset, '#594336');
    assert.equal(legs.length, 2);
    for (const leg of legs) {
      const shoe = leg.userData.foot.children[0];
      parent.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(shoe);
      const size = bounds.getSize(new THREE.Vector3());
      assert.deepEqual(size.toArray(), [10, 4, 13]);
      assert.equal(bounds.min.y, 0);
      leg.rotation.x = 0.45;
      parent.updateMatrixWorld(true);
      assert.ok(new THREE.Box3().setFromObject(shoe).min.y > -4);
      leg.rotation.x = -Math.PI / 2;
      parent.updateMatrixWorld(true);
      assert.ok(new THREE.Box3().setFromObject(shoe).min.y > 0);
    }
    legs.forEach((leg) => parent.remove(leg));
  }
  geometry.dispose();
  material.dispose();
});

test('longer legs keep fitted boots grounded and attached to the walking limbs', () => {
  const parent = new THREE.Group(), cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry();
  const material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, container) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth); part.userData.color = color;
    container.add(part); return part;
  };
  const height = 22 + CHARACTER_RISE;
  const legs = createCharacterLegs(parent, box, 7, '#594336', '#263d30', limb, { height });
  for (const leg of legs) {
    const shoe = leg.userData.foot.children[0];
    const boot = leg.userData.knee.children.find((part) => part.userData.color === '#594336');
    assert.equal(leg.position.y, height);
    assert.equal(boot.geometry, limb);
    assert.equal(boot.userData.color, '#594336');
    parent.updateMatrixWorld(true);
    assert.ok(boot.getWorldPosition(new THREE.Vector3()).y > shoe.getWorldPosition(new THREE.Vector3()).y);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(shoe).min.y) < 1e-8);
    const shoeSize = new THREE.Box3().setFromObject(shoe).getSize(new THREE.Vector3());
    assert.ok(shoeSize.z > shoeSize.x && shoeSize.y < shoeSize.x);
    leg.rotation.x = 0.4;
    assert.equal(boot.parent, leg.userData.knee);
  }
  cube.dispose(); limb.dispose(); material.dispose();
});

test('pelvis joins the torso to both legs while the legs remain animated', () => {
  const cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const torsoGeometry = createCharacterTorsoGeometry(), material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const box = (x, y, z, width, height, depth, color, container) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth); container.add(part); return part;
  };
  for (const [torsoWidth, torsoHeight, torsoY, offset, height, width, depth] of [
    [20, 30, 37 + CHARACTER_RISE, 5, 32, 7, 8],
    [20, 30, 37 + CHARACTER_RISE, 5, 31, 9, 10],
    [26, 38, 39 + CHARACTER_RISE, 7, 31, 9, 10],
    [25, 38, 40 + CHARACTER_RISE, 7, 30, 9, 10],
    [25, 36, 42 + CHARACTER_RISE, 7, 33, 9, 10],
    [24, 36, 37 + CHARACTER_RISE, 6, 31, 9, 10]
  ]) {
    for (const player of [false, true]) {
      const parent = new THREE.Group();
      const torso = new THREE.Mesh(torsoGeometry, material);
      torso.position.y = torsoY; torso.scale.set(torsoWidth, torsoHeight, 17); parent.add(torso);
      const legs = player
        ? createPlayerLegs(parent, box, { offset, height, width, depth, shoeColor: '#594336',
          shortsColor: '#141619', skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin })
        : createCharacterLegs(parent, box, offset, '#594336', '#263d30', limb, { height, width, depth });
      const hips = parent.children.find((part) => part.isMesh && part.geometry === limb);
      assert.equal(hips.scale.x, offset * 2 + width * 0.62);
      assert.ok(hips.scale.x < offset * 2 + width * 0.75);
      assert.deepEqual(legs.map((leg) => leg.position.x), [-offset, offset], 'foot stance remains unchanged');
      parent.updateMatrixWorld(true);
      assert.ok(new THREE.Box3().setFromObject(hips).intersectsBox(new THREE.Box3().setFromObject(torso)));
      for (const leg of legs) {
        assert.equal(leg.children[0].scale.x, width * 0.92);
        const ray = new THREE.Raycaster(new THREE.Vector3(leg.position.x, height - 1, 100), new THREE.Vector3(0, 0, -1));
        assert.ok(ray.intersectObject(hips).length && ray.intersectObject(leg.children[0]).length);
        leg.rotation.x = 0.4;
        assert.equal(hips.parent, parent);
        assert.equal(leg.children[0].parent, leg);
      }
    }
  }
  cube.dispose(); limb.dispose(); skin.dispose(); torsoGeometry.dispose(); material.dispose();
});

test('player and Cat hips have a modest rearward shape while ordinary hips stay unchanged', () => {
  const cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const material = new THREE.MeshBasicMaterial();
  const make = (kind) => {
    const parent = new THREE.Group();
    const box = (x, y, z, width, height, depth, color, owner) => {
      const mesh = new THREE.Mesh(cube, material);
      mesh.position.set(x, y, z); mesh.scale.set(width, height, depth); owner.add(mesh); return mesh;
    };
    const legs = kind === 'player'
      ? createPlayerLegs(parent, box, { offset: 6, height: 31, shoeColor: '#594336',
        shortsColor: '#141619', skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin })
      : createCharacterLegs(parent, box, 6, '#594336', '#263d30', limb, { height: 31, shapedHips: kind === 'cat' });
    const hips = parent.children.find((part) => part.isMesh);
    parent.updateMatrixWorld(true);
    return { hips, legs, bounds: new THREE.Box3().setFromObject(hips) };
  };
  const npc = make('npc'), player = make('player'), cat = make('cat');
  for (const character of [player, cat]) {
    const increase = npc.bounds.min.z - character.bounds.min.z;
    assert.ok(increase > 1 && increase < 2, 'rear silhouette extends modestly beyond the ordinary hips');
    assert.equal(character.hips.scale.x, npc.hips.scale.x);
    swingCharacterLegs(character.legs, 1, true);
    assert.notEqual(character.legs[0].rotation.x, 0);
    assert.equal(character.hips.parent, character.legs[0].parent);
  }
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});

test('player knees and ankles stay connected and shoes have an instep and heel', () => {
  const cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const material = new THREE.MeshBasicMaterial();
  for (const [height, width, depth] of [[30, 9, 10], [31, 9, 10], [32, 7, 8], [33, 9, 10]]) {
    const parent = new THREE.Group();
    const box = (x, y, z, w, h, d, color, owner) => {
      const part = new THREE.Mesh(cube, material); part.position.set(x, y, z); part.scale.set(w, h, d);
      part.userData.color = color; owner.add(part); return part;
    };
    const legs = createPlayerLegs(parent, box, { offset: 6, height, width, depth,
      shoeColor: '#594336', shortsColor: '#141619', skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin });
    for (const leg of legs) {
      const [shorts, , knee] = leg.children;
      const [, calf, ankle] = leg.userData.knee.children;
      const [shoe, instep, heel] = leg.userData.foot.children;
      parent.updateMatrixWorld(true);
      const bounds = (part) => new THREE.Box3().setFromObject(part);
      assert.ok(bounds(knee).intersectsBox(bounds(shorts)) && bounds(knee).intersectsBox(bounds(calf)));
      assert.ok(bounds(ankle).intersectsBox(bounds(calf)) && bounds(ankle).intersectsBox(bounds(instep)));
      assert.ok(bounds(knee).max.z > bounds(calf).max.z && ankle.scale.x < calf.scale.x);
      assert.ok(bounds(heel).intersectsBox(bounds(shoe)) && bounds(instep).intersectsBox(bounds(shoe)));
      assert.ok(Math.abs(bounds(shoe).min.y) < 1e-8);
    }
  }
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});

test('walking bends alternating knees, keeps soles level and above ground, and resets at rest', () => {
  const cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, w, h, d, color, owner) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(w, h, d);
    part.userData.color = color; owner.add(part); return part;
  };
  for (const [height, width, depth] of [[22, 9, 10], [30, 9, 10], [31, 9, 10], [32, 7, 8], [33, 9, 10]]) {
    for (const player of [false, true]) {
      const parent = new THREE.Group();
      const legs = player
        ? createPlayerLegs(parent, box, { offset: 6, height, width, depth, shoeColor: '#594336',
          shortsColor: '#141619', skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin })
        : createCharacterLegs(parent, box, 6, '#594336', '#263d30', limb, { height, width, depth });
      const hips = parent.children.find((part) => part.isMesh);
      let previous = null;
      for (let frame = 0; frame <= 80; frame++) {
        const phase = frame * Math.PI / 40;
        swingCharacterLegs(legs, phase, true);
        parent.updateMatrixWorld(true);
        assert.ok(Math.abs(legs[0].rotation.x + legs[1].rotation.x) < 1e-10);
        for (const [index, leg] of legs.entries()) {
          const { knee, foot } = leg.userData;
          const legPhase = phase + index * Math.PI;
          assert.ok(knee.rotation.x >= 0 && knee.rotation.x <= 0.48 + 1e-10);
          assert.ok(Math.abs(leg.rotation.x + knee.rotation.x + foot.rotation.x) < 1e-10);
          const bounds = new THREE.Box3().setFromObject(foot);
          assert.ok(bounds.min.y >= -1e-8, `foot clips ground at phase ${phase}: ${bounds.min.y}`);
          if (Math.cos(legPhase) > 0) {
            assert.ok(knee.rotation.x < 1e-10, 'support leg stays extended');
            assert.ok(bounds.min.y < 1e-8, `support foot lifts off at phase ${phase}`);
          }
          const cap = new THREE.Box3().setFromObject(leg.children[2]);
          const lower = new THREE.Box3().setFromObject(knee.children[1]);
          assert.ok(cap.intersectsBox(lower), `knee separates at phase ${phase}`);
          assert.ok(new THREE.Box3().setFromObject(hips).intersectsBox(new THREE.Box3().setFromObject(leg.children[0])),
            `thigh separates from the hips at phase ${phase}`);
          if (player) {
            const ankle = new THREE.Box3().setFromObject(knee.children[2]);
            assert.ok(ankle.intersectsBox(bounds), `ankle separates from shoe at phase ${phase}`);
          }
          if (previous) {
            assert.ok(Math.abs(knee.rotation.x - previous[index].knee) < 0.05);
            assert.ok(Math.abs(leg.position.y - previous[index].height) < 0.19);
          }
        }
        previous = legs.map((leg) => ({ knee: leg.userData.knee.rotation.x, height: leg.position.y }));
      }
      swingCharacterLegs(legs, Math.PI, true);
      parent.updateMatrixWorld(true);
      assert.ok(Math.abs(legs[0].rotation.x) < 1e-10 && legs[0].userData.knee.rotation.x > 0.4,
        'the knee lifts as the forward-moving leg passes beneath the body');
      assert.ok(new THREE.Box3().setFromObject(legs[0].userData.foot).min.y > 0.5,
        'the swinging foot clears the ground');
      swingCharacterLegs(legs, Math.PI, false);
      assert.ok(legs.every((leg) => leg.rotation.x === 0 && leg.userData.knee.rotation.x === 0
        && leg.userData.foot.rotation.x === 0 && leg.position.y === height));
    }
  }
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});
