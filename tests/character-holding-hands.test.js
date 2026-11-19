import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCharacterArms, createCharacterLimbGeometry, createCharacterSkinGeometry, poseCharacterHoldingHand, swingCharacterArms } from '../js/character-body.js';
import { couplePartnerPosition, PUB_PARTNER_OFFSET } from '../js/games/adventure-logic.js';

test('the actual hands overlap on either side while walking, turning and stopping', () => {
  const scene = new THREE.Group(), player = new THREE.Group(), cat = new THREE.Group();
  scene.add(player, cat);
  const cube = new THREE.BoxGeometry(), limb = createCharacterLimbGeometry(), skin = createCharacterSkinGeometry();
  const material = new THREE.MeshBasicMaterial();
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Mesh(cube, material);
    part.position.set(x, y, z); part.scale.set(width, height, depth);
    part.userData.color = color; owner.add(part); return part;
  };
  const options = { offset: 16, shoulderY: 63, length: 28, width: 7, depth: 8,
    color: '#25272b', skin: '#dfb38c', limbGeometry: limb, skinGeometry: skin };
  const playerArms = createCharacterArms(player, box, options);
  const catArms = createCharacterArms(cat, box, { ...options, shortSleeves: true, tattoo: true });
  for (const offset of [PUB_PARTNER_OFFSET, -PUB_PARTNER_OFFSET]) {
    const playerHeld = offset > 0 ? 1 : 0, catHeld = 1 - playerHeld;
    for (const facing of [0, Math.PI / 4, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const start = { x: 300, y: 400 };
      const partner = couplePartnerPosition(start, facing, offset);
      player.position.set(start.x, 0, start.y);
      cat.position.set(partner.x, 0, partner.y);
      player.rotation.y = cat.rotation.y = facing;
      for (const [phase, moving] of [[0, false], [0, true], [Math.PI / 2, true], [Math.PI, true], [3 * Math.PI / 2, true]]) {
        swingCharacterArms(playerArms, phase, moving, playerHeld);
        swingCharacterArms(catArms, phase, moving, catHeld);
        poseCharacterHoldingHand(playerArms[playerHeld], Math.abs(offset));
        poseCharacterHoldingHand(catArms[catHeld], Math.abs(offset));
        scene.updateMatrixWorld(true);
        const playerHand = playerArms[playerHeld].userData.hand, catHand = catArms[catHeld].userData.hand;
        const distance = playerHand.getWorldPosition(new THREE.Vector3()).distanceTo(catHand.getWorldPosition(new THREE.Vector3()));
        assert.ok(Math.abs(distance - 2) < 1e-8);
        assert.ok(new THREE.Box3().setFromObject(playerHand).intersectsBox(new THREE.Box3().setFromObject(catHand)));
        assert.equal(playerArms[playerHeld].userData.elbow.rotation.x, 0);
        assert.equal(catArms[catHeld].userData.elbow.rotation.x, 0);
      }
      swingCharacterArms(playerArms, 0, false);
      swingCharacterArms(catArms, 0, false);
      assert.equal(playerArms[playerHeld].rotation.z, playerArms[playerHeld].userData.restRotation);
      assert.equal(catArms[catHeld].rotation.z, catArms[catHeld].userData.restRotation);
    }
  }
  cube.dispose(); limb.dispose(); skin.dispose(); material.dispose();
});
