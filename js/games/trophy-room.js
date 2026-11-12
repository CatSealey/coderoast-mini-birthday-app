import * as THREE from 'three';
import { nearTrophyExit, placeKeepsake, presentAvailable, TROPHY_EXIT } from './trophy-logic.js';
import { createTrophyModel } from './trophy-models.js';
import { createCollision, findWorldPath } from '../world/world-collision.js';
import { createCharacterLegs, createPlayerLegs } from './character-legs.js';
import { BIRTHDAY_ENTRANCE, BIRTHDAY_FAMILY, BIRTHDAY_PLAYER_POSITION, BIRTHDAY_TICKET_MARKUP, birthdayArrivalPath, birthdayFamilyPaths, createBirthdayEnding } from './birthday-ending.js';
import { CAT_OUTFIT, CAT_STYLE, PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker } from '../character-appearance.js';
import { addJapaneseSleeve, createCharacterArms, createCharacterTorsoGeometry, swingCharacterArms } from '../character-body.js';

const slots = [
  { x: 110, z: 120 }, { x: 255, z: 120 }, { x: 400, z: 120 },
  { x: 545, z: 120 }, { x: 690, z: 120 }
];
const gift = { x: 400, z: 325 };
const directions = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0]
};
const padDirections = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function mountTrophyRoom(root, { characterName, memories, images, completed, displays, onDisplays, onPresent, onLeave, onMessage }) {
  let placed = [...displays], player = { x: 400, z: 490 }, disposed = false, frame = 0, last = 0;
  let width = 1, height = 1, target = null, path = [], pendingExit = false, walkPhase = 0, facing = 0, playerStride = 0;
  let endingPhase = 'idle', endingLine = null, lovePosition = { ...BIRTHDAY_ENTRANCE }, lovePath = [], loveFacing = 0, loveWalk = 0;
  let familyElapsed = 0, endingPlayerPath = [], ticketReceived = false;
  const keys = new Set(), held = new Set(), textures = [], materials = [];
  const furniture = [
    ...slots.map((slot) => ({ x: slot.x, y: slot.z, width: 108, depth: 87 })),
    ...[[85, 330, 76, 50], [715, 330, 76, 50], [72, 510, 58, 58], [728, 510, 58, 58],
    [115, 250, 52, 52], [685, 250, 52, 52]].map(([x, y, width, depth]) => ({ x, y, width, depth })),
    { x: TROPHY_EXIT.x, y: TROPHY_EXIT.z, width: 94, depth: 14 },
    { x: 400, y: 0, width: 800, depth: 120 }, { x: 400, y: 600, width: 800, depth: 50 },
    { x: 0, y: 300, width: 50, depth: 600 }, { x: 800, y: 300, width: 50, depth: 600 }
  ];
  const roomCollision = createCollision(furniture, 10);
  const roomWithPresent = createCollision([...furniture, { x: gift.x, y: gift.z, radius: 47 }], 10);
  const currentCollision = () => presentAvailable(placed, completed) ? roomWithPresent : roomCollision;
  root.innerHTML = `<div class="abigail-world trophy-room">
    <canvas class="abigail-world__canvas" tabindex="0" aria-label="Castle trophy room. Walk with WASD or arrow keys and press E to investigate."></canvas>
    <div class="abigail-world__header trophy-room__header"><strong>✦ THE HALL OF MEMORIES ✦</strong><span data-trophy-status></span><small data-trophy-hint>Explore the hall · E to investigate</small></div>
    <button type="button" class="rs3-btn abigail-world__leave" data-trophy-leave>Leave room</button>
    <div class="world-move-pad abigail-world__pad" role="group" aria-label="Trophy room movement">
      <button type="button" class="rs3-btn" data-trophy-move="up" aria-label="Move up">▲</button>
      <button type="button" class="rs3-btn" data-trophy-move="left" aria-label="Move left">◀</button>
      <button type="button" class="rs3-btn" data-trophy-move="down" aria-label="Move down">▼</button>
      <button type="button" class="rs3-btn" data-trophy-move="right" aria-label="Move right">▶</button>
    </div>
    <div class="adventure-world__actions"><button type="button" class="rs3-btn" data-trophy-interact>Investigate</button></div>
    <div class="abigail-world__dialogue trophy-room__dialogue" data-trophy-message role="status"></div>
    <div class="abigail-world__speech" data-birthday-speech aria-hidden="true" hidden></div>
    <button type="button" class="rs3-btn trophy-room__continue" data-birthday-continue hidden>Continue</button>
    <button type="button" class="rs3-btn trophy-room__ticket-open" data-ticket-open hidden>View ticket</button>
    <section class="trophy-room__ticket" aria-label="Birthday ticket" data-birthday-ticket hidden>
      ${BIRTHDAY_TICKET_MARKUP}
      <button type="button" class="rs3-btn" data-ticket-close>Close ticket</button>
    </section>
  </div>`;
  const canvas = root.querySelector('canvas'), message = root.querySelector('[data-trophy-message]');
  const speech = root.querySelector('[data-birthday-speech]'), continueButton = root.querySelector('[data-birthday-continue]');
  const ticketCard = root.querySelector('[data-birthday-ticket]'), ticketButton = root.querySelector('[data-ticket-open]');
  const probe = document.createElement('canvas').getContext('webgl2');
  const available = Boolean(probe);
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const renderer = available ? new THREE.WebGLRenderer({ canvas, antialias: true }) : null;
  const ctx = renderer ? null : canvas.getContext('2d');
  if (!renderer && !ctx) throw new Error('Could not initialize the trophy room.');
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const torsoGeometry = createCharacterTorsoGeometry();
  const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  const orb = new THREE.SphereGeometry(0.5, 16, 10);
  const cone = new THREE.ConeGeometry(0.5, 1, 8);
  const trophies = [], icons = [], raycaster = new THREE.Raycaster();
  const materialCache = new Map(), flames = [], sparkles = [], displayLights = [];
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  scene.background = new THREE.Color('#202927');
  function material(color, emissive = false) {
    const key = `${color}:${emissive}`;
    if (materialCache.has(key)) return materialCache.get(key);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...(emissive ? { emissive: color, emissiveIntensity: 0.35 } : {}) });
    materials.push(mat); materialCache.set(key, mat); return mat;
  }
  function box(x, y, z, w, h, d, color, parent = scene, glow = false) {
    const mesh = new THREE.Mesh(geometry, material(color, glow));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
  }
  function round(shape, x, y, z, w, h, d, color, parent = scene, glow = false) {
    const mesh = new THREE.Mesh(shape, material(color, glow));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
  }
  function paintedTexture(w, h, paint) {
    const image = document.createElement('canvas'); image.width = w; image.height = h;
    const c = image.getContext('2d');
    if (!c) throw new Error('Could not create the trophy room texture.');
    paint(c, w, h);
    const texture = new THREE.CanvasTexture(image);
    texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    return texture;
  }
  function texturedBox(x, y, z, w, h, d, texture, tint = '#ffffff') {
    const mat = new THREE.MeshStandardMaterial({ color: tint, map: texture, roughness: 1 });
    materials.push(mat);
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); scene.add(mesh);
    return mesh;
  }
  const stone = paintedTexture(512, 512, (c) => {
    c.fillStyle = '#77766a'; c.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 8; row += 1) for (let col = -1; col < 5; col += 1) {
      const x = col * 128 + (row % 2) * 64, y = row * 64;
      c.fillStyle = ['#969184', '#8d8a7e', '#a29b8c', '#858579'][(row * 3 + col + 8) % 4];
      c.fillRect(x + 2, y + 2, 124, 60);
      c.fillStyle = 'rgba(255,235,202,.13)'; c.fillRect(x + 5, y + 5, 117, 2);
      c.fillStyle = 'rgba(32,34,29,.12)';
      c.fillRect(x + 8 + (row * 17 + col * 13 + 128) % 90, y + 24, 23, 1);
      c.fillRect(x + 20, y + 47, 42, 1);
    }
  });
  const floor = paintedTexture(1024, 768, (c) => {
    c.fillStyle = '#514b40'; c.fillRect(0, 0, 1024, 768);
    for (let y = 0; y < 768; y += 96) for (let x = 0; x < 1024; x += 128) {
      const seed = (x / 128 * 7 + y / 96 * 13) % 5;
      c.fillStyle = ['#aaa08b', '#a19884', '#b2a68e', '#96917f', '#aaa28f'][seed];
      c.fillRect(x + 2, y + 2, 124, 92);
      c.strokeStyle = 'rgba(227,211,178,.3)'; c.strokeRect(x + 5, y + 5, 118, 86);
      c.strokeStyle = 'rgba(62,56,48,.15)'; c.beginPath(); c.moveTo(x + 12, y + 27 + seed * 5);
      c.lineTo(x + 45, y + 30 + seed * 5); c.lineTo(x + 58, y + 26 + seed * 5); c.stroke();
    }
    c.strokeStyle = '#6e5f4b'; c.lineWidth = 12; c.strokeRect(22, 22, 980, 724);
    c.strokeStyle = '#c9b380'; c.lineWidth = 3; c.strokeRect(33, 33, 958, 702);
  });
  const rug = paintedTexture(256, 512, (c) => {
    c.fillStyle = '#492c2d'; c.fillRect(0, 0, 256, 512);
    c.fillStyle = '#782e38'; c.fillRect(10, 10, 236, 492);
    c.strokeStyle = '#c7a86c'; c.lineWidth = 3; c.strokeRect(18, 18, 220, 476);
    c.strokeStyle = '#d7ba78'; c.lineWidth = 1; c.strokeRect(25, 25, 206, 462);
    for (let y = 50; y < 510; y += 90) {
      c.beginPath(); c.moveTo(128, y); c.lineTo(150, y + 28); c.lineTo(128, y + 56);
      c.lineTo(106, y + 28); c.closePath(); c.stroke();
      c.beginPath(); c.moveTo(128, y + 17); c.lineTo(136, y + 28); c.lineTo(128, y + 39); c.lineTo(120, y + 28); c.closePath(); c.stroke();
    }
  });
  const shadow = paintedTexture(64, 64, (c) => {
    const gradient = c.createRadialGradient(32, 32, 1, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(20,18,14,.48)'); gradient.addColorStop(1, 'rgba(20,18,14,0)');
    c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
  });
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false });
  materials.push(shadowMaterial);
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  function addShadow(parent, x, z, w, d) {
    const mesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, 2.4, z); mesh.scale.set(w, d, 1); parent.add(mesh);
  }
  scene.add(new THREE.HemisphereLight('#f1e4cd', '#403f45', 1.45));
  const light = new THREE.DirectionalLight('#ffe0a4', 1.9); light.position.set(-200, 650, 400); scene.add(light);
  texturedBox(400, -10, 300, 800, 20, 600, floor);
  texturedBox(400, 110, 22, 800, 220, 24, stone, '#e0d1b3');
  texturedBox(12, 72, 300, 24, 144, 600, stone, '#b4aa95');
  texturedBox(788, 72, 300, 24, 144, 600, stone, '#b4aa95');
  const door = new THREE.Group(); scene.add(door);
  box(TROPHY_EXIT.x, 62, TROPHY_EXIT.z, 72, 124, 7, '#5c4030', door);
  for (const side of [-1, 1]) {
    for (const x of [-27, -9, 9, 27]) box(TROPHY_EXIT.x + x, 62, TROPHY_EXIT.z + side * 5, 15, 117, 3, '#78543a', door);
    for (const y of [24, 88]) box(TROPHY_EXIT.x, y, TROPHY_EXIT.z + side * 7, 71, 7, 4, '#332d28', door);
    round(orb, TROPHY_EXIT.x + 24, 60, TROPHY_EXIT.z + side * 10, 8, 8, 8, '#d7b76a', door);
  }
  for (const x of [-42, 42]) box(TROPHY_EXIT.x + x, 67, TROPHY_EXIT.z, 10, 134, 24, '#b9aa90', door);
  box(TROPHY_EXIT.x, 132, TROPHY_EXIT.z, 94, 12, 24, '#c5b699', door);
  box(TROPHY_EXIT.x, 2, TROPHY_EXIT.z - 15, 84, 4, 32, '#b9aa90', door);
  const exitLabel = paintedTexture(128, 40, (c) => {
    c.fillStyle = '#39332b'; c.fillRect(0, 0, 128, 40);
    c.fillStyle = '#f3dfae'; c.font = 'bold 25px Georgia, serif'; c.textAlign = 'center'; c.fillText('EXIT', 64, 29);
  });
  const exitMaterial = new THREE.MeshBasicMaterial({ map: exitLabel, side: THREE.DoubleSide });
  materials.push(exitMaterial);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(52, 16), exitMaterial);
  exitSign.position.set(TROPHY_EXIT.x, 133, TROPHY_EXIT.z + 13); door.add(exitSign);
  for (const z of [0, 600]) {
    box(400, 4, z, 800, 8, 8, '#5b5140');
  }
  box(400, 12, 40, 800, 24, 15, '#5b5148');
  box(400, 30, 42, 800, 6, 18, '#b7a587');
  box(400, 206, 40, 800, 14, 20, '#6d6151');
  box(400, 218, 40, 800, 9, 24, '#c5b699');
  for (const x of [32, 183, 327, 473, 617, 768]) {
    box(x, 110, 43, 20, 200, 26, '#b2a48d');
    box(x, 110, 58, 12, 180, 7, '#c6b99f');
    box(x, 18, 52, 29, 22, 36, '#74685a');
    box(x, 198, 52, 31, 14, 36, '#d1c1a4');
    box(x, 188, 54, 25, 6, 31, '#857561');
  }
  texturedBox(400, 1.5, 390, 175, 2, 360, rug);
  for (const side of [0, 1]) for (const z of [140, 400, 550]) {
    const x = side ? 766 : 34;
    box(x, 73, z, 12, 116, 56, '#514a42');
    box(x + (side ? -7 : 7), 75, z, 4, 96, 42, '#46616a', scene, true);
    for (const dz of [-19, 0, 19]) box(x + (side ? -10 : 10), 75, z + dz, 5, 97, 3, '#c8b083');
    box(x + (side ? -10 : 10), 75, z, 5, 4, 42, '#c8b083');
    box(x + (side ? -11 : 11), 24, z, 10, 8, 64, '#c1af90');
  }
  for (const x of [183, 327, 473, 617]) {
    box(x, 122, 70, 15, 5, 20, '#594738');
    round(cylinder, x, 136, 75, 12, 23, 12, '#a27947');
    const flame = round(cone, x, 154, 75, 10, 20, 10, '#ffc86b', scene, true); flames.push(flame);
    round(orb, x, 157, 75, 8, 8, 8, '#fff0b5', scene, true);
  }
  for (const [x, color] of [[90, '#6b3540'], [255, '#345d57'], [400, '#684860'], [545, '#345d57'], [710, '#6b3540']]) {
    box(x, 157, 38, 71, 72, 4, color);
    box(x, 190, 43, 78, 5, 8, '#c5a96f');
    box(x, 155, 44, 2, 57, 2, '#cbb47b');
    const diamond = box(x, 157, 46, 22, 22, 2, '#c2a76f'); diamond.rotation.z = Math.PI / 4;
    const inner = box(x, 157, 48, 13, 13, 2, color); inner.rotation.z = Math.PI / 4;
  }
  slots.forEach((slot, index) => {
    const accent = ['#688f89', '#a96f62', '#8875a2', '#668c72', '#bd815b'][index];
    addShadow(scene, slot.x + 5, slot.z + 13, 135, 105);
    box(slot.x, 6, slot.z, 108, 12, 87, '#51493f');
    box(slot.x, 14, slot.z, 98, 7, 77, '#bbab8d');
    box(slot.x, 38, slot.z, 82, 44, 64, '#695b49');
    box(slot.x, 38, slot.z + 33, 70, 32, 3, '#4b4038');
    box(slot.x, 38, slot.z + 35, 54, 22, 3, '#a98e62');
    box(slot.x, 38, slot.z + 37, 48, 16, 2, '#473f36');
    for (const dx of [-35, 35]) {
      box(slot.x + dx, 38, slot.z + 36, 4, 36, 5, '#a38e6c');
      round(orb, slot.x + dx, 56, slot.z + 35, 6, 6, 6, '#d7bd80');
    }
    box(slot.x, 64, slot.z, 96, 8, 76, '#bca783');
    box(slot.x, 70, slot.z, 87, 5, 68, '#75664f');
    box(slot.x, 74, slot.z, 70, 4, 52, '#d0bd90');
    round(cylinder, slot.x, 80, slot.z, 55, 8, 48, '#5d4b3b');
    round(cylinder, slot.x, 86, slot.z, 48, 5, 42, accent);
    box(slot.x, 123, slot.z - 1, 68, 70, 5, '#473b35');
    box(slot.x, 123, slot.z + 3, 60, 62, 4, '#bca574');
    box(slot.x, 123, slot.z + 6, 54, 56, 4, '#2f3b38');
    for (const dx of [-29, 29]) {
      round(orb, slot.x + dx, 154, slot.z + 8, 6, 6, 6, '#e8cd8e');
      round(orb, slot.x + dx, 92, slot.z + 8, 6, 6, 6, '#e8cd8e');
    }
    const halo = round(cylinder, slot.x, 123, slot.z + 8.5, 44, 1, 44, accent, scene, true);
    halo.rotation.x = Math.PI / 2;
    displayLights.push(halo);
    const nameTexture = paintedTexture(256, 64, (c) => {
      c.fillStyle = '#342e29'; c.fillRect(0, 0, 256, 64);
      c.strokeStyle = '#e1c98e'; c.lineWidth = 3; c.strokeRect(3, 3, 250, 58);
      c.fillStyle = '#f4e3b6'; c.font = 'bold 24px Georgia, serif'; c.textAlign = 'center';
      c.fillText(['ABIGAIL', 'LUCKY CHUCKS', 'THIRTEEN', 'GOAPE', 'FRIGHT NIGHTS'][index], 128, 40, 230);
    });
    const nameMaterial = new THREE.MeshBasicMaterial({ map: nameTexture, side: THREE.DoubleSide });
    materials.push(nameMaterial);
    const name = new THREE.Mesh(new THREE.PlaneGeometry(61, 15), nameMaterial);
    name.position.set(slot.x, 39, slot.z + 39); scene.add(name);
    if (!renderer) {
      const image = new Image();
      const icon = { image, loaded: false };
      icons.push(icon);
      image.onload = () => { if (!disposed) { icon.loaded = true; render(); } };
      image.onerror = () => {
        if (!disposed) { console.error(`Could not load keepsake image: ${images[index]}`); say(`Could not load the ${memories[index].title} image.`); }
      };
      image.src = images[index];
    }
    const trophy = createTrophyModel(index, material);
    trophy.position.set(slot.x, 0, slot.z + 16); scene.add(trophy); trophies.push(trophy);
  });
  for (const [x, z] of [[85, 330], [715, 330]]) {
    addShadow(scene, x, z, 90, 75);
    box(x, 15, z, 70, 30, 45, '#4a3b30');
    box(x, 34, z, 76, 8, 50, '#a18055');
    for (const dx of [-24, 24]) for (const dz of [-16, 16]) box(x + dx, 4, z + dz, 8, 8, 8, '#5a4231');
    for (let i = 0; i < 4; i += 1) {
      const book = box(x - 24 + i * 13, 41 + i % 2, z, 11, 6, 28,
        ['#70474a', '#465f51', '#9c8058', '#43565e'][i]);
      book.rotation.y = (i - 1) * 0.1;
    }
    round(cylinder, x + 23, 45, z - 10, 7, 17, 7, '#c6b798');
    flames.push(round(cone, x + 23, 57, z - 10, 7, 12, 7, '#ffc86b', scene, true));
  }
  for (const [x, z] of [[72, 510], [728, 510]]) {
    addShadow(scene, x, z, 95, 70);
    round(cylinder, x, 12, z, 52, 24, 52, '#725746');
    round(cylinder, x, 25, z, 58, 5, 58, '#ad8b65');
    for (let i = 0; i < 7; i += 1) {
      const a = i * Math.PI * 2 / 7;
      const leaf = round(cone, x + Math.cos(a) * 15, 52 + i % 3 * 5, z + Math.sin(a) * 15, 20, 54, 18,
        i % 2 ? '#456c50' : '#567c59');
      leaf.rotation.z = Math.cos(a) * 0.35; leaf.rotation.x = Math.sin(a) * 0.35;
    }
    round(orb, x, 76, z, 13, 13, 13, '#d5a581');
  }
  for (const x of [115, 685]) {
    round(cylinder, x, 8, 250, 52, 16, 52, '#5a5044');
    round(cylinder, x, 43, 250, 20, 66, 20, '#a2947a');
    round(cylinder, x, 79, 250, 44, 8, 44, '#ccb994');
    box(x, 92, 250, 24, 20, 24, '#4e4e45');
    round(orb, x, 108, 250, 20, 22, 20, '#d2bd85', scene, true);
  }
  const present = new THREE.Group(); present.position.set(gift.x, 0, gift.z); scene.add(present);
  addShadow(present, 3, 7, 125, 100);
  round(cylinder, 0, 5, 0, 94, 10, 94, '#5a4940', present);
  round(cylinder, 0, 11, 0, 84, 5, 84, '#d5b66e', present);
  present.position.y = 12;
  box(0, 23, 0, 56, 46, 56, '#a83d51', present);
  box(0, 49, 0, 62, 8, 62, '#c45462', present);
  box(0, 25, 0, 10, 50, 58, '#e8c879', present);
  box(0, 25, 0, 58, 50, 10, '#e8c879', present);
  box(0, 54, 0, 62, 4, 10, '#e8c879', present);
  for (const side of [-1, 1]) {
    const ribbon = box(side * 10, 61, 0, 22, 6, 9, '#e8c879', present);
    ribbon.rotation.z = side * 0.35;
  }
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const sparkle = round(orb, Math.cos(a) * 42, 75 + i % 3 * 10, Math.sin(a) * 42, 5, 5, 5, '#ffe6a3', present, true);
    sparkle.userData.phase = i; sparkles.push(sparkle);
  }
  const person = new THREE.Group(); scene.add(person);
  addShadow(person, 0, 2, 65, 45);
  round(torsoGeometry, 0, 37, 0, 24, 36, 17, PLAYER_OUTFIT, person);
  box(0, 24, 1, 25, 4, 19, PLAYER_STYLE.belt, person);
  addCharacterHeadDetails((x, y, z, w, h, d, shade) => box(x, y, z, w, h, d, shade, person),
    (x, y, z, w, h, d, shade) => round(orb, x, y, z, w, h, d, shade, person),
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hairLength: PLAYER_STYLE.hairLength });
  const arms = createCharacterArms(person, box, { offset: 15, shoulderY: 54, length: 28, width: 7, depth: 8, color: PLAYER_OUTFIT, skin: '#dfb38c' });
  const legs = createPlayerLegs(person, box, { offset: 6, shoeColor: '#5a4434', shortsColor: PLAYER_STYLE.shorts, skin: '#dfb38c' });
  const love = new THREE.Group(); scene.add(love);
  addShadow(love, 0, 2, 65, 45);
  round(torsoGeometry, 0, 37, 0, 24, 36, 17, CAT_OUTFIT, love);
  box(0, 24, 1, 25, 4, 19, CAT_STYLE.belt, love);
  box(0, 24, 11, 5, 3, 2, CAT_STYLE.buckle, love);
  addCharacterHeadDetails((x, y, z, w, h, d, shade) => box(x, y, z, w, h, d, shade, love),
    (x, y, z, w, h, d, shade) => round(orb, x, y, z, w, h, d, shade, love),
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hairLength: CAT_STYLE.hairLength });
  for (const x of [-15, 15]) {
    box(x, 45, 4, 7, 14, 8, CAT_OUTFIT, love);
    box(x, 35, 4, 7, 7, 8, '#dfb38c', love);
    box(x / 2, 30, 14, 17, 7, 7, '#dfb38c', love);
    box(x / 2, 30, 19, 7, 6, 6, '#dfb38c', love);
  }
  addJapaneseSleeve((...args) => box(...args, love),
    { x: -15, y: 35, z: 4, width: 7, height: 7, depth: 8 });
  addJapaneseSleeve((...args) => box(...args, love),
    { x: -7.5, y: 30, z: 14, width: 17, height: 7, depth: 7 });
  const loveLegs = createCharacterLegs(love, box, 6, '#5a4434', CAT_STYLE.trousers);
  const ticket = new THREE.Group(); love.add(ticket);
  box(0, 0, 0, 30, 20, 2, '#f2c56b', ticket);
  for (const x of [-10, 10]) for (const y of [-5, 0, 5]) box(x, y, 2, 2, 2, 1, '#9b6739', ticket);
  ticket.position.set(0, 34, 20);
  const family = BIRTHDAY_FAMILY.map((member) => {
    const model = new THREE.Group(); scene.add(model); model.scale.setScalar(member.size);
    addShadow(model, 0, 2, 65, 45);
    round(torsoGeometry, 0, 37, 0, 24, 36, 17, member.outfit, model);
    box(0, 24, 1, 25, 4, 19, '#bd9e68', model);
    addCharacterHeadDetails((x, y, z, w, h, d, shade) => box(x, y, z, w, h, d, shade, model),
      (x, y, z, w, h, d, shade) => round(orb, x, y, z, w, h, d, shade, model),
      { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hair: member.hair,
        longHair: ['gran', 'mum', 'sister'].includes(member.id) });
    let guestArms = null;
    if (member.id === 'gran') {
      for (const x of [-15, 15]) {
        box(x, 40, 0, 7, 28, 8, member.outfit, model);
        box(x, 35, 12, 7, 7, 24, member.outfit, model);
        box(x, 35, 25, 7, 6, 8, '#dfb38c', model);
      }
    } else guestArms = createCharacterArms(model, box, { offset: 15, shoulderY: 54, length: 28, width: 7, depth: 8, color: member.outfit, skin: '#dfb38c' });
    if (member.id === 'gran') {
      round(cylinder, 0, 40, 25, 36, 3, 36, '#e1cda8', model);
      round(cylinder, 0, 47, 25, 30, 12, 30, '#b77964', model);
      round(cylinder, 0, 54, 25, 31, 3, 31, '#f3debd', model);
      for (const x of [-7, 0, 7]) {
        round(cylinder, x, 59, 25, 2, 8, 2, '#e9b86c', model);
        round(cone, x, 65, 25, 4, 6, 4, '#ffe1a0', model, true);
      }
    }
    return {
      member, model, arms: guestArms, legs: createCharacterLegs(model, box, 6, '#5a4434'),
      position: { ...BIRTHDAY_ENTRANCE }, route: [], visible: false, facing: 0, walk: 0
    };
  });
  const ending = createBirthdayEnding((phase, line) => {
    endingPhase = phase; endingLine = line;
    speech.hidden = !line; continueButton.hidden = !line;
    const active = ['positioning', 'arriving', 'dialogue'].includes(phase);
    root.querySelector('.abigail-world__pad').hidden = active;
    root.querySelector('.adventure-world__actions').hidden = active;
    if (line) {
      if (line.gift === 'ticket') {
        ticketReceived = true; ticketCard.hidden = false; ticketButton.hidden = true;
      }
      speech.textContent = line.message;
      say(`${line.speaker === 'player' ? characterName : line.speaker}: ${line.message}`);
      continueButton.focus();
    } else if (phase === 'positioning') {
      say('Get ready for your birthday surprise!');
    } else if (phase === 'arriving') {
      say('Your girlfriend and your family are arriving with a birthday surprise!');
    } else if (phase === 'finished') {
      say('Happy birthday! Open the present again to replay your celebration.');
      canvas.focus();
    }
  });

  function say(text) { message.textContent = text; onMessage(text); }
  function render() {
    const ready = presentAvailable(placed, completed);
    root.querySelector('[data-trophy-status]').textContent = `${placed.filter(Boolean).length}/5 keepsakes displayed${ready ? ' · A present has appeared!' : ''}`;
    const nearest = slots.map((slot, index) => ({ index, distance: Math.hypot(player.x - slot.x, player.z - slot.z) }))
      .sort((a, b) => a.distance - b.distance)[0];
    root.querySelector('[data-trophy-hint]').textContent = endingPhase === 'positioning' ? 'Getting ready for the celebration'
      : endingPhase === 'arriving' ? 'Your birthday guests are arriving'
      : endingPhase === 'dialogue' ? 'Continue the conversation'
        : nearTrophyExit(player) ? 'Castle door · E to leave'
          : ready && Math.hypot(player.x - gift.x, player.z - gift.z) < 70
            ? 'Birthday present · E to open'
            : nearest.distance <= 85 ? `${memories[nearest.index].title} · E to investigate` : 'Explore the hall · E to investigate';
    trophies.forEach((trophy, i) => {
      trophy.visible = placed[i];
      displayLights[i].visible = placed[i];
    });
    present.visible = ready;
    love.visible = !['idle', 'positioning'].includes(endingPhase);
    ticket.visible = love.visible && !ticketReceived;
    family.forEach((guest) => {
      guest.model.visible = !['idle', 'positioning'].includes(endingPhase) && guest.visible;
      guest.model.position.set(guest.position.x, 0, guest.position.y);
      guest.model.rotation.y = guest.facing;
    });
    if (renderer) {
      person.position.set(player.x, 0, player.z);
      person.rotation.y = facing;
      love.position.set(lovePosition.x, 0, lovePosition.y); love.rotation.y = loveFacing;
      camera.position.set(400, 720, 980); camera.lookAt(400, 35, 285);
      const scale = Math.max(900 / width, 650 / height);
      camera.left = -width * scale / 2; camera.right = width * scale / 2;
      camera.top = height * scale / 2; camera.bottom = -height * scale / 2; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    } else {
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min(width / 800, height / 600), ox = (width - 800 * scale) / 2, oy = (height - 600 * scale) / 2;
      ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
      ctx.drawImage(floor.image, 0, 0, 800, 600);
      ctx.drawImage(stone.image, 0, 0, 800, 65);
      ctx.drawImage(rug.image, 315, 220, 170, 380);
      ctx.fillStyle = '#b9aa90'; ctx.fillRect(TROPHY_EXIT.x - 47, TROPHY_EXIT.z - 14, 94, 28);
      ctx.fillStyle = '#5c4030'; ctx.fillRect(TROPHY_EXIT.x - 36, TROPHY_EXIT.z - 9, 72, 18);
      ctx.fillStyle = '#d7b76a'; ctx.beginPath(); ctx.arc(TROPHY_EXIT.x + 24, TROPHY_EXIT.z - 5, 3, 0, Math.PI * 2); ctx.fill();
      slots.forEach((slot, i) => {
        ctx.fillStyle = 'rgba(20,18,14,.3)'; ctx.fillRect(slot.x - 43, slot.z - 28, 95, 78);
        ctx.fillStyle = '#51463a'; ctx.fillRect(slot.x - 45, slot.z - 35, 90, 70);
        ctx.fillStyle = '#bca783'; ctx.fillRect(slot.x - 41, slot.z - 31, 82, 62);
        ctx.fillStyle = '#34423c'; ctx.fillRect(slot.x - 35, slot.z - 27, 70, 53);
        if (placed[i] && icons[i].loaded) ctx.drawImage(icons[i].image, slot.x - 26, slot.z - 26, 52, 52);
        else {
          ctx.fillStyle = '#e6d3a1'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(String(i + 1), slot.x, slot.z + 8);
        }
      });
      if (ready) { ctx.fillStyle = '#b8495d'; ctx.fillRect(gift.x - 25, gift.z - 25, 50, 50); ctx.fillStyle = '#e8c879'; ctx.fillRect(gift.x - 5, gift.z - 25, 10, 50); }
      drawCharacterMarker(ctx, player.x, player.z, PLAYER_OUTFIT, { ...PLAYER_STYLE, stride: playerStride });
      if (love.visible) {
        drawCharacterMarker(ctx, lovePosition.x, lovePosition.y, CAT_OUTFIT, CAT_STYLE);
        if (ticket.visible) {
          ctx.fillStyle = '#f2c56b'; ctx.fillRect(lovePosition.x - 8, lovePosition.y + 8, 16, 9);
          ctx.fillStyle = '#9b6739'; ctx.fillRect(lovePosition.x - 4, lovePosition.y + 10, 2, 5);
        }
      }
      family.forEach((guest) => {
        if (!guest.model.visible) return;
        drawCharacterMarker(ctx, guest.position.x, guest.position.y, guest.member.outfit,
          { scale: guest.member.size, hair: guest.member.hair, hairLength: ['gran', 'mum', 'sister'].includes(guest.member.id) ? 'long' : 'short',
            stride: guest.member.id === 'gran' ? 0 : guest.legs[0].rotation.x });
        if (guest.member.id === 'gran') {
          ctx.fillStyle = '#f3debd'; ctx.beginPath(); ctx.arc(guest.position.x, guest.position.y + 13, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b77964'; ctx.beginPath(); ctx.arc(guest.position.x, guest.position.y + 13, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffe1a0'; ctx.fillRect(guest.position.x - 1, guest.position.y + 9, 2, 4);
        }
      });
      ctx.restore();
    }
    if (endingLine) {
      const speaker = endingLine.speaker === 'player' ? { x: player.x, y: player.z } : lovePosition;
      let x, y;
      if (renderer) {
        const projected = new THREE.Vector3(speaker.x, 100, speaker.y).project(camera);
        x = (projected.x + 1) * width / 2; y = (1 - projected.y) * height / 2;
      } else {
        const scale = Math.min(width / 800, height / 600);
        x = (width - 800 * scale) / 2 + speaker.x * scale;
        y = (height - 600 * scale) / 2 + speaker.y * scale;
      }
      const margin = speech.offsetWidth / 2 + 8;
      speech.style.left = `${Math.max(margin, Math.min(width - margin, x))}px`;
      speech.style.top = `${Math.max(105, y)}px`;
    }
  }
  function interact() {
    if (endingPhase === 'dialogue') { ending.advance(); return; }
    if (endingPhase === 'positioning' || endingPhase === 'arriving') return;
    target = null; path = []; pendingExit = false;
    if (nearTrophyExit(player)) { onLeave(); return; }
    const nearby = slots.map((slot, index) => ({ index, distance: Math.hypot(player.x - slot.x, player.z - slot.z) }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (presentAvailable(placed, completed) && Math.hypot(player.x - gift.x, player.z - gift.z) < 70) {
      const stagingTarget = { x: BIRTHDAY_PLAYER_POSITION.x, y: BIRTHDAY_PLAYER_POSITION.z };
      const stagingPath = findWorldPath({ x: player.x, y: player.z }, stagingTarget, currentCollision());
      if (!stagingPath?.length || Math.hypot(stagingPath.at(-1).x - stagingTarget.x, stagingPath.at(-1).y - stagingTarget.y) > 1) {
        say('There is no clear route to the celebration. Move clear of the furniture and try again.'); return;
      }
      const arrival = birthdayArrivalPath(BIRTHDAY_PLAYER_POSITION, currentCollision());
      if (!arrival) { say('Cat cannot reach you from the door. Move to another side of the present and try again.'); return; }
      const familyPaths = birthdayFamilyPaths(BIRTHDAY_PLAYER_POSITION, arrival.at(-1), currentCollision());
      if (!familyPaths) { say('Your family cannot reach the celebration. Move to another side of the present and try again.'); return; }
      if (onPresent() !== true) return;
      clearInput(); lovePosition = { ...BIRTHDAY_ENTRANCE }; lovePath = arrival; endingPlayerPath = stagingPath;
      ticketReceived = false; ticketCard.hidden = true; ticketButton.hidden = true;
      familyElapsed = 0;
      family.forEach((guest, index) => {
        guest.position = { ...BIRTHDAY_ENTRANCE }; guest.route = [...familyPaths[index].path];
        guest.visible = false; guest.walk = 0; guest.facing = 0;
      });
      ending.start(); render(); return;
    }
    if (nearby.distance > 85) { say('Walk closer to a pedestal to place a keepsake.'); return; }
    const index = nearby.index;
    if (!completed[index]) { say(`This pedestal awaits the ${memories[index].title}. Complete its quest first.`); return; }
    if (placed[index]) { say(`${memories[index].title} is proudly displayed here.`); return; }
    placed = placeKeepsake(placed, completed, index); onDisplays(placed);
    say(presentAvailable(placed, completed) ? 'All five memories are displayed! A birthday present has appeared.' : `You display the ${memories[index].title}.`);
    render();
  }
  function keydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey
      || document.querySelector('[data-modal-backdrop]:not(.hidden), #removeQuestDialog[open]')
      || (event.target instanceof Element && event.target.closest('input, textarea, select, [role="dialog"]'))) return;
    if (['positioning', 'arriving', 'dialogue'].includes(endingPhase)) {
      if (!event.repeat && (event.code === 'KeyE' || (event.code === 'Space'
        && !(event.target instanceof Element && event.target.closest('button'))))) {
        event.preventDefault(); interact();
      }
      return;
    }
    if (directions[event.code]) { event.preventDefault(); target = null; path = []; pendingExit = false; keys.add(event.code); }
    else if (event.code === 'KeyE' && !event.repeat) { event.preventDefault(); interact(); }
  }
  function keyup(event) { keys.delete(event.code); }
  function clearInput() { keys.clear(); held.clear(); }
  function pointerDown(event) {
    if (['positioning', 'arriving', 'dialogue'].includes(endingPhase)) return;
    const button = event.target.closest('[data-trophy-move]');
    if (!button) return;
    event.preventDefault(); target = null; path = []; pendingExit = false; button.setPointerCapture?.(event.pointerId); held.add(button.dataset.trophyMove);
  }
  function pointerUp(event) { const button = event.target.closest('[data-trophy-move]'); if (button) held.delete(button.dataset.trophyMove); }
  function click(event) {
    if (event.target.closest('[data-trophy-leave]')) { onLeave(); return; }
    if (event.target.closest('[data-ticket-close]')) { ticketCard.hidden = true; ticketButton.hidden = false; ticketButton.focus(); return; }
    if (event.target.closest('[data-ticket-open]')) { ticketCard.hidden = false; ticketButton.hidden = true; root.querySelector('[data-ticket-close]').focus(); return; }
    if (event.target.closest('[data-birthday-continue]')) { ending.advance(); render(); return; }
    if (['positioning', 'arriving', 'dialogue'].includes(endingPhase)) return;
    if (event.target.closest('[data-trophy-interact]')) { interact(); return; }
    if (event.target !== canvas) return;
    const rect = canvas.getBoundingClientRect();
    let clickedExit = false;
    if (renderer) {
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
      clickedExit = raycaster.intersectObject(door, true).length > 0;
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, hit)) target = { x: hit.x, z: hit.z };
    } else {
      const scale = Math.min(width / 800, height / 600);
      target = {
        x: (event.clientX - rect.left - (width - 800 * scale) / 2) / scale,
        z: (event.clientY - rect.top - (height - 600 * scale) / 2) / scale
      };
      clickedExit = Math.abs(target.x - TROPHY_EXIT.x) <= 47 && Math.abs(target.z - TROPHY_EXIT.z) <= 14;
    }
    pendingExit = clickedExit;
    if (clickedExit && nearTrophyExit(player)) { onLeave(); return; }
    if (clickedExit) target = { x: TROPHY_EXIT.x, z: TROPHY_EXIT.z - 55 };
    if (target) {
      target = { x: Math.max(35, Math.min(765, target.x)), z: Math.max(75, Math.min(565, target.z)) };
      const result = findWorldPath({ x: player.x, y: player.z }, { x: target.x, y: target.z }, currentCollision());
      if (!result) { target = null; path = []; pendingExit = false; say('There is no clear route there. Choose another spot.'); }
      else { path = result; target = result.at(-1) ? { x: result.at(-1).x, z: result.at(-1).y } : null; }
    }
    canvas.focus();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
    width = rect.width; height = rect.height;
    if (renderer) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(width, height, false); }
    else { const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    render();
  }
  function tick(time) {
    if (disposed) return;
    const dt = last ? Math.min((time - last) / 1000, 0.05) : 0; last = time;
    const modalOpen = document.querySelector('[data-modal-backdrop]:not(.hidden), #removeQuestDialog[open]');
    if (modalOpen) clearInput();
    let stagingWalk = false;
    if (endingPhase === 'positioning' && !modalOpen) {
      const waypoint = endingPlayerPath[0];
      if (waypoint) {
        const dx = waypoint.x - player.x, dz = waypoint.y - player.z;
        const distance = Math.hypot(dx, dz), step = Math.min(175 * dt, distance);
        if (distance > 0) {
          player = { x: player.x + dx / distance * step, z: player.z + dz / distance * step };
          facing = Math.atan2(dx, dz); walkPhase += dt * 10; stagingWalk = true;
        }
        if (distance <= step + 0.001) endingPlayerPath.shift();
      }
      if (!endingPlayerPath.length) ending.positioned();
    }
    if (endingPhase === 'arriving' && !modalOpen) {
      const waypoint = lovePath[0];
      if (waypoint) {
        const dx = waypoint.x - lovePosition.x, dy = waypoint.y - lovePosition.y;
        const distance = Math.hypot(dx, dy), step = Math.min(120 * dt, distance);
        if (distance > 0) {
          lovePosition = { x: lovePosition.x + dx / distance * step, y: lovePosition.y + dy / distance * step };
          loveFacing = Math.atan2(dx, dy); loveWalk += dt * 10;
        }
        if (distance <= step + 0.001) lovePath.shift();
      }
      if (!lovePath.length && family[0].visible && !family[0].route.length) {
        loveFacing = Math.atan2(player.x - lovePosition.x, player.z - lovePosition.y);
        facing = Math.atan2(lovePosition.x - player.x, lovePosition.y - player.z);
        ending.arrive();
      }
    }
    if (!['idle', 'positioning'].includes(endingPhase) && !modalOpen) {
      familyElapsed += dt;
      family.forEach((guest, index) => {
        if (familyElapsed < (index + 1) * 0.65) return;
        guest.visible = true;
        const waypoint = guest.route[0];
        if (waypoint) {
          const dx = waypoint.x - guest.position.x, dy = waypoint.y - guest.position.y;
          const distance = Math.hypot(dx, dy), step = Math.min(120 * dt, distance);
          if (distance > 0) {
            guest.position = { x: guest.position.x + dx / distance * step, y: guest.position.y + dy / distance * step };
            guest.facing = Math.atan2(dx, dy); guest.walk += dt * 10;
          }
          if (distance <= step + 0.001) guest.route.shift();
        }
        if (!guest.route.length) guest.facing = Math.atan2(player.x - guest.position.x, player.z - guest.position.y);
        guest.legs[0].rotation.x = guest.route.length ? Math.sin(guest.walk) * 0.4 : 0;
        guest.legs[1].rotation.x = -guest.legs[0].rotation.x;
        if (guest.arms) swingCharacterArms(guest.arms, guest.legs[0].rotation.x);
      });
    }
    loveLegs[0].rotation.x = endingPhase === 'arriving' ? Math.sin(loveWalk) * 0.4 : 0;
    loveLegs[1].rotation.x = -loveLegs[0].rotation.x;
    let dx = 0, dz = 0;
    for (const direction of [...keys].map((key) => directions[key]).concat([...held].map((key) => padDirections[key]))) {
      dx += direction[0]; dz += direction[1];
    }
    if (!modalOpen && !['positioning', 'arriving', 'dialogue'].includes(endingPhase) && !dx && !dz && target) {
      const waypoint = path[0];
      if (waypoint) { dx = waypoint.x - player.x; dz = waypoint.y - player.z; }
      if (!waypoint || Math.hypot(dx, dz) < 1) {
        path.shift();
        if (!path.length) target = null;
        dx = 0; dz = 0;
      }
    }
    const distance = Math.hypot(dx, dz);
    if (distance) {
      const step = Math.min(175 * dt, target ? distance : Infinity);
      const next = currentCollision().move({ x: player.x, y: player.z }, dx / distance * step, dz / distance * step);
      player = { x: next.x, z: next.y };
      if (pendingExit && nearTrophyExit(player)) { pendingExit = false; onLeave(); return; }
      facing = Math.atan2(dx, dz);
      walkPhase += dt * 10;
    }
    playerStride = distance || stagingWalk ? Math.sin(walkPhase) * 0.4 : 0;
    legs[0].rotation.x = playerStride;
    legs[1].rotation.x = -playerStride;
    swingCharacterArms(arms, playerStride);
    flames.forEach((flame, i) => { flame.scale.y = 18 + Math.sin(time / 180 + i) * 3; });
    sparkles.forEach((sparkle) => { sparkle.position.y = 75 + sparkle.userData.phase % 3 * 10 + Math.sin(time / 500 + sparkle.userData.phase) * 6; });
    render(); frame = requestAnimationFrame(tick);
  }
  root.addEventListener('click', click); root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointerup', pointerUp); root.addEventListener('pointercancel', pointerUp);
  document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearInput);
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  say(`Welcome to your trophy room, ${characterName}. Place each earned keepsake on its pedestal.`);
  resize(); canvas.focus(); frame = requestAnimationFrame(tick);
  return () => {
    disposed = true; ending.stop(); cancelAnimationFrame(frame); observer.disconnect();
    root.removeEventListener('click', click); root.removeEventListener('pointerdown', pointerDown);
    root.removeEventListener('pointerup', pointerUp); root.removeEventListener('pointercancel', pointerUp);
    document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup); window.removeEventListener('blur', clearInput);
    scene.traverse((object) => {
      if (object.isMesh && ![geometry, torsoGeometry, cylinder, orb, cone, shadowGeometry].includes(object.geometry)) object.geometry.dispose();
    });
    [geometry, torsoGeometry, cylinder, orb, cone, shadowGeometry].forEach((shape) => shape.dispose());
    textures.forEach((texture) => texture.dispose()); materials.forEach((mat) => mat.dispose()); renderer?.dispose();
  };
}
