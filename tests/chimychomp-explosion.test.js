import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CHOMPY_EXPLOSION_DURATION, createChimychompExplosion, drawChimychompExplosion, explosionFrame } from '../js/world/chimychomp-explosion.js';
import { createChimychompArt } from '../js/world/chimychomp-art.js';

test('the fire blooms, leaves smoke and embers, and fades within the existing death delay', () => {
  assert.equal(CHOMPY_EXPLOSION_DURATION, 800);
  const start = explosionFrame(1000, 1000);
  const peak = explosionFrame(1000, 1300);
  const end = explosionFrame(1000, 1800);
  assert.ok(peak.radius > start.radius * 3);
  assert.ok(peak.fire > 0 && peak.smoke > 0 && peak.sparks > 0);
  assert.deepEqual([end.fire, end.glow, end.smoke, end.ring, end.sparks], [0, 0, 0, 0, 0]);
  assert.equal(explosionFrame(1000, 500).progress, 0);
  assert.equal(explosionFrame(1000, 3000).progress, 1);
});

test('3D explosion updates all layers, resets between encounters and disposes resources', () => {
  const scene = new THREE.Scene();
  const art = createChimychompExplosion(scene);
  const burst = scene.getObjectByName('chimychomp-explosion');
  const fire = burst.getObjectByName('fireball');
  const smoke = burst.getObjectByName('smoke');
  const embers = burst.getObjectByName('embers');
  const ring = burst.getObjectByName('shockwave');
  assert.equal(burst.visible, false);
  assert.equal(embers.children.length, 16);
  art.update({ x: 120, y: 180, started: 1000 }, 1300);
  assert.equal(burst.visible, true);
  assert.deepEqual(burst.position.toArray(), [120, 0, 180]);
  assert.ok(fire.visible && smoke.visible && embers.visible && ring.visible);
  const peakRadius = fire.scale.x;
  art.update(null, 1800);
  assert.equal(burst.visible, false);
  art.update({ x: 10, y: 20, started: 2000 }, 2000);
  assert.ok(fire.scale.x < peakRadius);
  assert.deepEqual(burst.position.toArray(), [10, 0, 20]);
  let geometryDisposed = false, materialDisposed = false, textureDisposed = false;
  fire.children[0].geometry.addEventListener('dispose', () => { geometryDisposed = true; });
  fire.children[0].material.addEventListener('dispose', () => { materialDisposed = true; });
  burst.getObjectByName('fire-glow').material.map.addEventListener('dispose', () => { textureDisposed = true; });
  art.dispose();
  assert.ok(geometryDisposed && materialDisposed && textureDisposed);
  assert.equal(scene.getObjectByName('chimychomp-explosion'), undefined);
});

test('reduced motion uses a steady, softer effect without moving embers or a shockwave', () => {
  const scene = new THREE.Scene();
  const art = createChimychompExplosion(scene);
  const burst = scene.getObjectByName('chimychomp-explosion');
  const explosion = { x: 0, y: 0, started: 1000 };
  art.update(explosion, 1000, true);
  const fire = burst.getObjectByName('fireball');
  const smoke = burst.getObjectByName('smoke');
  const before = { scale: fire.scale.x, opacity: fire.children[0].material.opacity, cloud: smoke.children[0].position.toArray() };
  art.update(explosion, 1700, true);
  assert.deepEqual({ scale: fire.scale.x, opacity: fire.children[0].material.opacity, cloud: smoke.children[0].position.toArray() }, before);
  assert.equal(burst.getObjectByName('embers').visible, false);
  assert.equal(burst.getObjectByName('shockwave').visible, false);
  art.dispose();
});

test('the illustrated explosion draws its layers and restores canvas state', () => {
  const calls = [];
  const gradient = { addColorStop: (...args) => calls.push(['colorStop', ...args]) };
  const ctx = new Proxy({ globalAlpha: 1, createRadialGradient: () => gradient }, {
    get(target, property) { return target[property] ?? ((...args) => calls.push([property, ...args])); }
  });
  drawChimychompExplosion(ctx, 1000, 1300);
  assert.deepEqual(calls[0], ['save']);
  assert.deepEqual(calls.at(-1), ['restore']);
  assert.ok(calls.filter(([name]) => name === 'arc').length >= 10);
  assert.ok(calls.filter(([name]) => name === 'stroke').length >= 16);
});

test('encounter artwork switches the explosion on and off without changing the defeated creature', () => {
  const scene = new THREE.Scene();
  const art = createChimychompArt(scene);
  const encounters = { defeated: ['chomp-0'], statues: [] };
  art.update(encounters, { x: 50, y: 75, started: 100 }, 200);
  assert.equal(scene.getObjectByName('chimychomp-explosion').visible, true);
  assert.equal(scene.children.find((child) => child.name === 'chimychomp').visible, false);
  art.update(encounters, null, 900);
  assert.equal(scene.getObjectByName('chimychomp-explosion').visible, false);
  assert.equal(scene.children.find((child) => child.name === 'chimychomp').visible, false);
  art.dispose();
});
