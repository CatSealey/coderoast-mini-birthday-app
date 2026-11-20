import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CASTLE_ILLUSTRATION_SCALE, createCastleArchGeometry, illustratedCastleGateHit } from '../js/world/castle-scenery.js';
import { castleGateHit, configureWorldCamera } from '../js/world/world-3d.js';
import { cameraFor, projectWorld } from '../js/world/world-art.js';
import { CASTLE_ENTRANCE, CASTLE_LAYOUT, INTERACTION_RANGE, WORLD_SPAWN } from '../js/world/world-data.js';
import { WORLD_NPCS } from '../js/world/world-npcs.js';
import { mountOverworld } from '../js/world/overworld.js';

test('castle gate hit testing follows the actual gate in both views', () => {
  const origin = { x: 300, y: 200 };
  for (const zoom of [0.65, 1]) {
    const scale = CASTLE_ILLUSTRATION_SCALE * zoom;
    assert.equal(illustratedCastleGateHit({ x: origin.x, y: origin.y - 40 * scale }, origin, zoom), true);
    assert.equal(illustratedCastleGateHit({ x: origin.x + 40 * scale, y: origin.y - 40 * scale }, origin, zoom), false);
    assert.equal(illustratedCastleGateHit({ x: origin.x, y: origin.y - 80 * scale }, origin, zoom), false);
  }

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  configureWorldCamera(camera, 800, 600, 0.9, WORLD_SPAWN);
  const geometry = createCastleArchGeometry(70, 52, 83);
  const material = new THREE.MeshBasicMaterial();
  const gate = new THREE.Mesh(geometry, material);
  gate.position.set(CASTLE_LAYOUT.x, 8, CASTLE_LAYOUT.y + 65.5);
  const screen = (x, y, z) => {
    const point = new THREE.Vector3(x, y, z).project(camera);
    return { x: (point.x + 1) * 400, y: (1 - point.y) * 300 };
  };
  assert.equal(castleGateHit(gate, camera, 800, 600, screen(CASTLE_LAYOUT.x, 45, CASTLE_LAYOUT.y + 65.5)), true);
  assert.equal(castleGateHit(gate, camera, 800, 600, screen(CASTLE_LAYOUT.x + 60, 45, CASTLE_LAYOUT.y + 65.5)), false);
  geometry.dispose(); material.dispose();
});

class FakeElement {
  constructor() {
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.style = { setProperty() {} };
    this.hidden = false;
    this.textContent = '';
    this.parentElement = this;
    this.offsetWidth = 100;
    this.offsetHeight = 50;
  }
  addEventListener(type, handler) { this.listeners.set(type, handler); }
  removeEventListener(type) { this.listeners.delete(type); }
  dispatch(type, data = {}) { this.listeners.get(type)?.({ target: this, preventDefault() {}, ...data }); }
  focus() {}
  contains() { return false; }
  closest() { return null; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name); }
}

function fakeContext() {
  const gradient = { addColorStop() {} };
  return new Proxy({
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    getImageData: (x, y, width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: () => ({ width: 10 })
  }, { get: (target, key) => key in target ? target[key] : () => {} });
}

class FakeCanvas extends FakeElement {
  constructor(width = 800, height = 600) {
    super();
    this.rect = { left: 0, top: 0, width, height };
    this.context = fakeContext();
  }
  getContext(type) { return type === '2d' ? this.context : null; }
  getBoundingClientRect() { return this.rect; }
}

test('castle gate approaches, enforces the quest, and enters after accepting it', () => {
  const original = { window: globalThis.window, document: globalThis.document, Element: globalThis.Element, ResizeObserver: globalThis.ResizeObserver };
  const elements = new Map();
  for (const id of ['worldRenderNotice', 'worldSpeechBubble', 'worldSpeechName', 'worldSpeechText', 'worldSpeechChoices', 'acceptQuestOffer', 'declineQuestOffer']) {
    elements.set(`#${id}`, new FakeElement());
  }
  const document = new FakeElement();
  document.querySelector = (selector) => elements.get(selector);
  document.createElement = () => new FakeCanvas();
  const window = new FakeElement();
  window.devicePixelRatio = 1;
  window.matchMedia = () => ({ matches: false });
  let frame;
  window.requestAnimationFrame = (callback) => { frame = callback; return 1; };
  window.cancelAnimationFrame = () => {};
  globalThis.window = window;
  globalThis.document = document;
  globalThis.Element = FakeElement;
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  const worldCanvas = new FakeCanvas();
  const mapCanvas = new FakeCanvas(200, 150);
  const interactButton = new FakeElement();
  const messageElement = new FakeElement();
  let accepted = false;
  const entries = [];
  let world;
  let time = 0;
  const advance = () => { time += 50; frame(time); };
  const screenPoint = (position, height = 0) => {
    const zoom = Math.max(0.65, Math.min(1, worldCanvas.rect.width / 820));
    const camera = cameraFor(world.getPlayerPosition(), worldCanvas.rect.width, worldCanvas.rect.height, zoom);
    const point = projectWorld(position, camera, zoom);
    return { clientX: point.x, clientY: point.y - height * zoom };
  };
  const gateClick = () => worldCanvas.dispatch('click', screenPoint(CASTLE_LAYOUT, 40 * CASTLE_ILLUSTRATION_SCALE));
  try {
    world = mountOverworld({
      characterName: 'Test', worldCanvas, mapCanvas, interactButton, messageElement,
      locationElement: new FakeElement(), targetElement: new FakeElement(),
      onCastle: () => entries.push(accepted),
      onTrophyGuide: () => world.showTrophySpeech('Accept the Hall?', true),
      onAcceptTrophy: () => { accepted = true; }
    });
    gateClick();
    assert.match(messageElement.textContent, /Walking to the castle/);
    for (let i = 0; i < 80 && !entries.length; i += 1) advance();
    assert.deepEqual(entries, [false], 'the castle callback handles the unaccepted quest');

    document.dispatch('keydown', { key: 'w' });
    for (let i = 0; i < 5; i += 1) advance();
    document.dispatch('keyup', { key: 'w' });
    const elowen = WORLD_NPCS.find((npc) => npc.trophyGuide);
    worldCanvas.dispatch('click', screenPoint(elowen, 36));
    for (let i = 0; i < 80; i += 1) {
      const position = world.getPlayerPosition();
      const toCastle = Math.hypot(position.x - CASTLE_ENTRANCE.x, position.y - CASTLE_ENTRANCE.y);
      const toElowen = Math.hypot(position.x - elowen.x, position.y - elowen.y);
      if (toCastle < INTERACTION_RANGE && toElowen < INTERACTION_RANGE && toCastle < toElowen) break;
      advance();
    }
    const position = world.getPlayerPosition();
    assert.ok(Math.hypot(position.x - CASTLE_ENTRANCE.x, position.y - CASTLE_ENTRANCE.y)
      < Math.hypot(position.x - elowen.x, position.y - elowen.y), 'castle is closer than Elowen');
    interactButton.dispatch('click');
    assert.equal(elements.get('#worldSpeechChoices').hidden, false);
    elements.get('#acceptQuestOffer').dispatch('click');
    assert.equal(accepted, true);
    assert.equal(interactButton.textContent, 'Enter castle trophy room', 'accepting clears the selected NPC');
    gateClick();
    assert.deepEqual(entries, [false, true], 'a nearby gate enters immediately');
    document.dispatch('keydown', { key: 'e' });
    assert.deepEqual(entries, [false, true, true], 'keyboard interaction still enters the castle');

    document.dispatch('keydown', { key: 's' });
    for (let i = 0; i < 50; i += 1) advance();
    document.dispatch('keyup', { key: 's' });
    gateClick();
    assert.match(messageElement.textContent, /Walking to the castle/);
    document.dispatch('keydown', { key: 's' });
    for (let i = 0; i < 10; i += 1) advance();
    document.dispatch('keyup', { key: 's' });
    for (let i = 0; i < 50; i += 1) advance();
    assert.deepEqual(entries, [false, true, true], 'manual movement cancels the pending entry');
    gateClick();
    for (let i = 0; i < 100 && entries.length < 4; i += 1) advance();
    assert.deepEqual(entries, [false, true, true, true], 'a distant gate click approaches and enters');
  } finally {
    world?.dispose();
    Object.assign(globalThis, original);
  }
});
