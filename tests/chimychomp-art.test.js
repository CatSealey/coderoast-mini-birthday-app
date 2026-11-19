import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createChimychompArt, drawChimychomp } from '../js/world/chimychomp-art.js';
import { CHIMYCHOMPS } from '../js/world/chimychomps.js';
import { CHOMPY_SCALE } from '../js/world/chimy-chase.js';
import { deathMarkerContains, drawDeathMarker } from '../js/world/death-marker.js';

test('chimychomps have ears, eyes, tendrils and a feathered tail without changing their scale', () => {
  const scene = new THREE.Scene();
  const art = createChimychompArt(scene);
  art.update({ defeated: [], statues: [] }, null, 0);
  const creatures = scene.children.filter((child) => child.name === 'chimychomp');
  assert.equal(creatures.length, CHIMYCHOMPS.length);
  const creature = creatures[0];
  for (const name of ['body', 'head', 'mouth', 'ear--1', 'ear-1', 'eye--1', 'eye-1', 'tendril--1', 'tendril-1']) {
    assert.ok(creature.getObjectByName(name), name);
  }
  assert.equal(creature.children.filter((child) => child.name === 'tail-feather').length, 5);
  assert.equal(creature.scale.x, CHOMPY_SCALE);
  art.update({ defeated: [CHIMYCHOMPS[0].id], statues: [] }, null, 100);
  assert.equal(creature.visible, false);
  art.dispose();
});

test('only Abigail area creatures have the translucent blue spectral materials', () => {
  const scene = new THREE.Scene();
  const art = createChimychompArt(scene);
  const positions = CHIMYCHOMPS.map((chomp) => ({ ...chomp, x: chomp.x + 4000 }));
  art.update({ defeated: [], statues: [] }, null, 0, positions);
  const creatures = scene.children.filter((child) => child.name === 'chimychomp');
  assert.equal(CHIMYCHOMPS.filter((chomp) => chomp.region === 'escape').length, 3);
  creatures.forEach((creature, index) => {
    const spectral = CHIMYCHOMPS[index].region === 'escape';
    for (const mesh of creature.children.filter((child) => child.isMesh)) {
      assert.equal(mesh.material.transparent, spectral);
      assert.equal(mesh.material.opacity, spectral ? 0.9 : 1);
      assert.equal(mesh.material.emissiveIntensity, spectral ? 0.35 : 1);
    }
    assert.equal(Boolean(creature.getObjectByName('spectral-glow')), spectral);
    assert.equal(creature.getObjectByName('head').material.color.getHexString(), spectral ? '70d4e4' : '9b9074');
  });
  art.dispose();
});

test('illustrated Abigail creatures use the spectral palette and glow without changing the others', () => {
  function draw(region) {
    const styles = [];
    const ctx = new Proxy({ globalAlpha: 1, shadowColor: '' }, {
      get(target, property) {
        return target[property] ?? (() => {});
      },
      set(target, property, value) {
        if (property === 'fillStyle') styles.push(value);
        target[property] = value;
        return true;
      }
    });
    drawChimychomp(ctx, { region });
    return { styles, alpha: ctx.globalAlpha, shadow: ctx.shadowColor };
  }
  const spectral = draw('escape');
  const normal = draw('home');
  assert.ok(spectral.styles.includes('#70d4e4'));
  assert.ok(!spectral.styles.includes('#9b9074'));
  assert.equal(spectral.alpha, 0.9);
  assert.equal(spectral.shadow, '#65e6fa');
  assert.ok(normal.styles.includes('#9b9074'));
  assert.equal(normal.alpha, 1);
  assert.equal(normal.shadow, '');
});

test('the skull shield marker draws and its full extent is clickable', () => {
  const calls = [];
  const ctx = new Proxy({}, {
    get(target, property) {
      return target[property] ?? ((...args) => calls.push([property, ...args]));
    }
  });
  drawDeathMarker(ctx, 10, 20);
  assert.deepEqual(calls.slice(0, 2), [['save'], ['translate', 10, 20]]);
  assert.ok(calls.some(([name]) => name === 'arc'));
  assert.deepEqual(calls.at(-1), ['restore']);
  for (const [x, y] of [[-10, -12], [10, 12], [0, 0]]) assert.ok(deathMarkerContains(x, y));
  assert.equal(deathMarkerContains(11, 0), false);
  assert.equal(deathMarkerContains(0, 13), false);
});
