import * as THREE from 'three';
import { HALL_CENTER, HALL_EXIT_MAT, HALL_WIDTH, isOnHallExitMat, nearTrophyExit, placeKeepsake, presentAvailable, TROPHY_EXIT } from './trophy-logic.js';
import { createTrophyModel } from './trophy-models.js';
import { createCollision, findWorldPath } from '../world/world-collision.js';
import { createCharacterLegs, createPlayerLegs } from './character-legs.js';
import { BIRTHDAY_ENTRANCE, BIRTHDAY_FAMILY, BIRTHDAY_PLAYER_POSITION, BIRTHDAY_TICKET_MARKUP, birthdayArrivalPath, birthdayArrivalPose, birthdayDogFacing, birthdayFamilyPaths, birthdayGuestObstacles, createBirthdayEnding, scheduleBirthdayArrivals } from './birthday-ending.js';
import { createBirthdayDogModel, drawBirthdayDog } from './birthday-dog.js';
import { addHallBookcase, addHallPedestal, addHallPlanter, addHallPresent, addHallSconce, addHallTable, createHallBannerGeometry, createHallExitMatGeometry, createHallPedestalGeometry, drawHallDisplay, drawHallFurniture, drawHallPresent, HALL_BANNER_HEIGHT, HALL_BOOKCASE_WIDTH, HALL_BOOKCASE_X, HALL_BOOKCASE_Z, HALL_PEDESTAL_DEPTH, HALL_PEDESTAL_WIDTH, HALL_PILLAR_X, HALL_RUG, HALL_SCONCE_X, HALL_PLANTER_X, HALL_TABLE_X, HALL_TROPHY_ACCENTS, paintHallBanner, paintHallExitMat, paintHallFloor, paintHallRug, paintHallStone } from './castle-interior-art.js';
import { CAT_OUTFIT, CAT_STYLE, PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker } from '../character-appearance.js';
import { addCharacterClothingDetails, addJapaneseSleeve, createCharacterArms, createCharacterHeadGeometry, createCharacterLimbGeometry, createCharacterTorsoGeometry, shapeCharacterLimb, swingCharacterArms } from '../character-body.js';

const slots = [
  { x: 230, z: 120 }, { x: 375, z: 120 }, { x: 520, z: 120 },
  { x: 665, z: 120 }, { x: 810, z: 120 }
];
const gift = { x: HALL_CENTER, z: 325 };
const directions = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0]
};
const padDirections = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function mountTrophyRoom(root, { characterName, memories, images, completed, displays, guestsPresent = false, onDisplays, onPresent, onLeave, onMessage, onCakeArrives, onBirthdayFinished, onBirthdayEnd }) {
  let placed = [...displays], player = { x: HALL_CENTER, z: 490 }, disposed = false, frame = 0, last = 0;
  let width = 1, height = 1, target = null, path = [], pendingExit = false, walkPhase = 0, facing = 0, playerStride = 0;
  let endingPhase = 'idle', endingLine = null, lovePosition = { ...BIRTHDAY_ENTRANCE }, loveFacing = 0, loveWalk = 0, loveMoving = false;
  let familyElapsed = 0, arrivalElapsed = 0, arrivalSchedule = null, endingPlayerPath = [], ticketReceived = false;
  const keys = new Set(), held = new Set(), textures = [], materials = [];
  const furniture = [
    ...slots.map((slot) => ({ x: slot.x, y: slot.z, width: HALL_PEDESTAL_WIDTH, depth: HALL_PEDESTAL_DEPTH })),
    ...HALL_TABLE_X.map((x) => ({ x, y: 330, width: 76, depth: 50 })),
    ...HALL_PLANTER_X.map((x) => ({ x, y: 510, width: 58, depth: 58 })),
    ...HALL_BOOKCASE_X.flatMap((x) => HALL_BOOKCASE_Z.map((z) => ({ x, y: z + 3, width: HALL_BOOKCASE_WIDTH, depth: 24 }))),
    { x: HALL_CENTER, y: 0, width: HALL_WIDTH, depth: 120 }, { x: HALL_CENTER, y: 600, width: HALL_WIDTH, depth: 50 },
    { x: 0, y: 300, width: 50, depth: 600 }, { x: HALL_WIDTH, y: 300, width: 50, depth: 600 }
  ];
  const roomCollision = createCollision(furniture, 10);
  const roomWithPresent = createCollision([...furniture, { x: gift.x, y: gift.z, radius: 47 }], 10);
  const currentCollision = () => {
    if (endingPhase !== 'finished') return presentAvailable(placed, completed) ? roomWithPresent : roomCollision;
    const present = presentAvailable(placed, completed) ? [{ x: gift.x, y: gift.z, radius: 47 }] : [];
    return createCollision([...furniture, ...present, ...birthdayGuestObstacles(endingPhase, lovePosition, family)], 10);
  };
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
  const pedestalGeometry = createHallPedestalGeometry();
  const torsoGeometry = createCharacterTorsoGeometry();
  const characterHeadGeometry = createCharacterHeadGeometry();
  const characterLimbGeometry = createCharacterLimbGeometry();
  const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  const orb = new THREE.SphereGeometry(0.5, 16, 10);
  const cone = new THREE.ConeGeometry(0.5, 1, 8);
  const trophies = [], icons = [], raycaster = new THREE.Raycaster();
  const materialCache = new Map(), flames = [], sparkles = [], displayLights = [];
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  scene.background = new THREE.Color('#202927');
  function material(color, emissive = false, vertexColors = false) {
    const key = `${color}:${emissive}:${vertexColors}`;
    if (materialCache.has(key)) return materialCache.get(key);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, vertexColors, ...(emissive ? { emissive: color, emissiveIntensity: 0.35 } : {}) });
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
  function roundedBox(x, y, z, w, h, d, color, parent = scene) {
    return round(pedestalGeometry, x, y, z, w, h, d, color, parent);
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
  const stone = paintedTexture(512, 512, paintHallStone);
  const floor = paintedTexture(1024, 768, paintHallFloor);
  const rug = paintedTexture(256, 512, paintHallRug);
  const exitMatTexture = paintedTexture(256, 96, paintHallExitMat);
  const banners = HALL_TROPHY_ACCENTS.map((_, index) => paintedTexture(256, 320, (c) => paintHallBanner(c, index)));
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
  texturedBox(HALL_CENTER, -10, 300, HALL_WIDTH, 20, 600, floor);
  texturedBox(HALL_CENTER, 110, 22, HALL_WIDTH, 220, 24, stone, '#e0d1b3');
  texturedBox(12, 72, 300, 24, 144, 600, stone, '#b4aa95');
  texturedBox(HALL_WIDTH - 12, 72, 300, 24, 144, 600, stone, '#b4aa95');
  const exitMaterial = new THREE.MeshStandardMaterial({ map: exitMatTexture, roughness: 1, transparent: true });
  materials.push(exitMaterial);
  const exitMat = new THREE.Mesh(createHallExitMatGeometry(), exitMaterial);
  exitMat.rotation.x = -Math.PI / 2;
  exitMat.position.set(HALL_EXIT_MAT.x, 2.8, HALL_EXIT_MAT.z); scene.add(exitMat);
  for (const z of [0, 600]) {
    box(HALL_CENTER, 4, z, HALL_WIDTH, 8, 8, '#5b5140');
  }
  box(HALL_CENTER, 12, 40, HALL_WIDTH, 24, 15, '#5b5148');
  box(HALL_CENTER, 30, 42, HALL_WIDTH, 6, 18, '#b7a587');
  box(HALL_CENTER, 206, 40, HALL_WIDTH, 14, 20, '#6d6151');
  box(HALL_CENTER, 218, 40, HALL_WIDTH, 9, 24, '#c5b699');
  for (const x of HALL_PILLAR_X) {
    box(x, 110, 43, 20, 200, 26, '#b2a48d');
    box(x, 110, 58, 12, 180, 7, '#c6b99f');
    box(x, 18, 52, 29, 22, 36, '#74685a');
    box(x, 198, 52, 31, 14, 36, '#d1c1a4');
    box(x, 188, 54, 25, 6, 31, '#857561');
    for (const y of [52, 94, 136, 178]) {
      box(x, y, 62, 12, 2, 1, '#a08f78');
    }
  }
  texturedBox(HALL_CENTER, 1.5, HALL_RUG.z, HALL_RUG.depth, 2, HALL_RUG.width, rug).rotation.y = Math.PI / 2;
  for (const x of HALL_BOOKCASE_X) for (const z of HALL_BOOKCASE_Z) {
    addHallBookcase(x, z, { box, round, orb, parent: scene });
  }
  slots.forEach((slot, index) => {
    const bannerMaterial = new THREE.MeshStandardMaterial({ map: banners[index], roughness: 1, side: THREE.DoubleSide });
    materials.push(bannerMaterial);
    const banner = new THREE.Mesh(createHallBannerGeometry(), bannerMaterial);
    banner.position.set(slot.x, 190 - HALL_BANNER_HEIGHT, 43); scene.add(banner);
    box(slot.x, 191, 43, 78, 5, 8, '#c5a96f');
    for (const dx of [-38, 38]) round(orb, slot.x + dx, 191, 43, 7, 7, 7, '#e8d095');
    for (const dx of [-25, -15, -5, 5, 15, 25]) round(orb, slot.x + dx, 191, 48, 3, 3, 3, '#e8d095');
  });
  slots.forEach((slot, index) => {
    addShadow(scene, slot.x + 3, slot.z + 9, 108, 94);
    displayLights.push(addHallPedestal(slot.x, slot.z, index, { box, roundedBox, round, cylinder, orb, parent: scene }));
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
  for (const [index, x] of HALL_TABLE_X.entries()) {
    const z = 330;
    addShadow(scene, x, z, 90, 75);
    addHallTable(x, z, index, { box, round, cylinder, cone, orb, parent: scene });
  }
  for (const [index, x] of HALL_PLANTER_X.entries()) {
    const z = 510;
    addShadow(scene, x, z, 95, 70);
    addHallPlanter(x, z, index, { round, cylinder, orb, parent: scene });
  }
  for (const [xs, z] of [[HALL_SCONCE_X, 43], [HALL_PILLAR_X, 64]]) for (const x of xs) {
    const flame = addHallSconce(x, z, { box, round, cylinder, cone, orb, parent: scene });
    flames.push({ mesh: flame, height: flame.scale.y });
    const candlelight = new THREE.PointLight('#ffbf73', 90, 130, 2);
    candlelight.position.set(x, 131.3, z + 14.7); scene.add(candlelight);
  }
  const present = new THREE.Group(); present.position.set(gift.x, 0, gift.z); scene.add(present);
  addShadow(present, 3, 7, 84, 72);
  addHallPresent({ box, round, orb, parent: present });
  present.position.y = 2.5;
  for (let i = 0; i < 8; i += 1) {
    const a = i * Math.PI / 4;
    const sparkle = round(orb, Math.cos(a) * 42, 75 + i % 3 * 10, Math.sin(a) * 42, 5, 5, 5, '#ffe6a3', present, true);
    sparkle.userData.phase = i; sparkles.push(sparkle);
  }
  const person = new THREE.Group(); scene.add(person);
  addShadow(person, 0, 2, 65, 45);
  round(torsoGeometry, 0, 37, 0, 24, 36, 17, PLAYER_OUTFIT, person);
  addCharacterClothingDetails((x, y, z, w, h, d, color) => box(x, y, z, w, h, d, color, person),
    { width: 24, height: 36, depth: 17, centerY: 37, color: PLAYER_OUTFIT, kind: 'player' });
  box(0, 24, 1, 25, 4, 19, PLAYER_STYLE.belt, person);
  addCharacterHeadDetails((x, y, z, w, h, d, shade) => box(x, y, z, w, h, d, shade, person),
    (x, y, z, w, h, d, shade) => round(characterHeadGeometry, x, y, z, w, h, d, shade, person),
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hairLength: PLAYER_STYLE.hairLength });
  const arms = createCharacterArms(person, box, { offset: 15, shoulderY: 54, length: 28, width: 7, depth: 8, color: PLAYER_OUTFIT, skin: '#dfb38c', limbGeometry: characterLimbGeometry });
  const legs = createPlayerLegs(person, box, { offset: 6, shoeColor: '#5a4434', shortsColor: PLAYER_STYLE.shorts, skin: '#dfb38c', limbGeometry: characterLimbGeometry });
  const love = new THREE.Group(); scene.add(love);
  addShadow(love, 0, 2, 65, 45);
  round(torsoGeometry, 0, 37, 0, 24, 36, 17, CAT_OUTFIT, love);
  addCharacterClothingDetails((x, y, z, w, h, d, color) => box(x, y, z, w, h, d, color, love),
    { width: 24, height: 36, depth: 17, centerY: 37, color: CAT_OUTFIT, kind: 'cat' });
  box(0, 24, 1, 25, 4, 19, CAT_STYLE.belt, love);
  box(0, 24, 11, 5, 3, 2, CAT_STYLE.buckle, love);
  addCharacterHeadDetails((x, y, z, w, h, d, shade) => box(x, y, z, w, h, d, shade, love),
    (x, y, z, w, h, d, shade) => round(characterHeadGeometry, x, y, z, w, h, d, shade, love),
    { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hairLength: CAT_STYLE.hairLength });
  for (const x of [-15, 15]) {
    const sleeve = box(x, 45, 4, 7, 14, 8, CAT_OUTFIT, love);
    shapeCharacterLimb(sleeve, characterLimbGeometry, 7, 14, 8);
    box(x, 35, 4, 7, 7, 8, '#dfb38c', love);
    box(x / 2, 30, 14, 17, 7, 7, '#dfb38c', love);
    box(x / 2, 30, 19, 7, 6, 6, '#dfb38c', love);
  }
  addJapaneseSleeve((...args) => box(...args, love),
    { x: -15, y: 35, z: 4, width: 7, height: 7, depth: 8 });
  addJapaneseSleeve((...args) => box(...args, love),
    { x: -7.5, y: 30, z: 14, width: 17, height: 7, depth: 7 });
  const loveLegs = createCharacterLegs(love, box, 6, '#5a4434', CAT_STYLE.trousers, characterLimbGeometry);
  const ticket = new THREE.Group(); love.add(ticket);
  box(0, 0, 0, 30, 20, 2, '#f2c56b', ticket);
  for (const x of [-10, 10]) for (const y of [-5, 0, 5]) box(x, y, 2, 2, 2, 1, '#9b6739', ticket);
  ticket.position.set(0, 34, 20);
  const family = BIRTHDAY_FAMILY.map((member) => {
    if (member.kind === 'dog') {
      const { model, legs, tail } = createBirthdayDogModel(box, round, orb);
      scene.add(model); model.scale.setScalar(member.size); addShadow(model, 0, 2, 55, 55);
      return { member, model, arms: null, legs, tail, position: { ...BIRTHDAY_ENTRANCE },
        visible: false, moving: false, facing: 0, walk: 0 };
    }
    const model = new THREE.Group(); scene.add(model); model.scale.setScalar(member.size);
    addShadow(model, 0, 2, 65, 45);
    round(torsoGeometry, 0, 37, 0, 24, 36, 17, member.outfit, model);
    addCharacterClothingDetails((x, y, z, w, h, d, color) => box(x, y, z, w, h, d, color, model),
      { width: 24, height: 36, depth: 17, centerY: 37, color: member.outfit, kind: 'guest' });
    box(0, 24, 1, 25, 4, 19, '#bd9e68', model);
    addCharacterHeadDetails((x, y, z, w, h, d, shade) => box(x, y, z, w, h, d, shade, model),
      (x, y, z, w, h, d, shade) => round(characterHeadGeometry, x, y, z, w, h, d, shade, model),
      { headY: 66, width: 18, height: 18, depth: 18, skin: '#dfb38c', hair: member.hair,
        longHair: ['gran', 'mum', 'sister'].includes(member.id) });
    let guestArms = null;
    if (member.id === 'gran') {
      for (const x of [-15, 15]) {
        const sleeve = box(x, 40, 0, 7, 28, 8, member.outfit, model);
        shapeCharacterLimb(sleeve, characterLimbGeometry, 7, 28, 8);
        box(x, 35, 12, 7, 7, 24, member.outfit, model);
        box(x, 35, 25, 7, 6, 8, '#dfb38c', model);
      }
    } else guestArms = createCharacterArms(model, box, { offset: 15, shoulderY: 54, length: 28, width: 7, depth: 8, color: member.outfit, skin: '#dfb38c', limbGeometry: characterLimbGeometry });
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
      member, model, arms: guestArms, legs: createCharacterLegs(model, box, 6, '#5a4434', undefined, characterLimbGeometry),
      position: { ...BIRTHDAY_ENTRANCE }, visible: false, moving: false, facing: 0, walk: 0
    };
  });
  let restoreError = false;
  if (guestsPresent && presentAvailable(placed, completed)) {
    const arrival = birthdayArrivalPath(BIRTHDAY_PLAYER_POSITION, roomWithPresent);
    const familyPaths = arrival && birthdayFamilyPaths(BIRTHDAY_PLAYER_POSITION, arrival.at(-1), roomWithPresent);
    if (familyPaths) {
      lovePosition = arrival.at(-1);
      loveFacing = Math.atan2(BIRTHDAY_PLAYER_POSITION.x - lovePosition.x, BIRTHDAY_PLAYER_POSITION.z - lovePosition.y);
      for (const guest of family) {
        const destination = familyPaths.find((path) => path.member.id === guest.member.id).destination;
        guest.position = destination; guest.visible = true;
        guest.facing = guest.member.kind === 'dog' ? birthdayDogFacing(destination, lovePosition)
          : Math.atan2(BIRTHDAY_PLAYER_POSITION.x - destination.x, BIRTHDAY_PLAYER_POSITION.z - destination.y);
      }
      endingPhase = 'finished'; ticketReceived = true; ticketButton.hidden = false;
      player = { x: HALL_CENTER + 50, z: 550 };
    } else {
      console.error('Could not restore the birthday celebration: the family has no safe formation.');
      restoreError = true;
    }
  }
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
      onBirthdayFinished?.();
      say('Happy birthday! Open the present again to replay your celebration.');
      canvas.focus();
    }
  }, endingPhase === 'finished');

  function say(text) { message.textContent = text; onMessage(text); }
  function illustratedLayout() {
    const availableHeight = Math.max(height / 2, Math.min(height,
      message.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 8));
    const scale = Math.min(width / HALL_WIDTH, availableHeight / 600);
    return { scale, ox: (width - HALL_WIDTH * scale) / 2, oy: (availableHeight - 600 * scale) / 2 };
  }
  function render() {
    const ready = presentAvailable(placed, completed);
    root.querySelector('[data-trophy-status]').textContent = `${placed.filter(Boolean).length}/5 keepsakes displayed${ready ? ' · A present has appeared!' : ''}`;
    const nearest = slots.map((slot, index) => ({ index, distance: Math.hypot(player.x - slot.x, player.z - slot.z) }))
      .sort((a, b) => a.distance - b.distance)[0];
    root.querySelector('[data-trophy-hint]').textContent = endingPhase === 'positioning' ? 'Getting ready for the celebration'
      : endingPhase === 'arriving' ? 'Your birthday guests are arriving'
      : endingPhase === 'dialogue' ? 'Continue the conversation'
        : nearTrophyExit(player) ? 'Exit mat · E to leave'
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
      camera.position.set(HALL_CENTER, 720, 980); camera.lookAt(HALL_CENTER, 35, 285);
      const scale = Math.max(1140 / width, 650 / height);
      camera.left = -width * scale / 2; camera.right = width * scale / 2;
      camera.top = height * scale / 2; camera.bottom = -height * scale / 2; camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    } else {
      ctx.clearRect(0, 0, width, height);
      const { scale, ox, oy } = illustratedLayout();
      ctx.save(); ctx.translate(ox, oy); ctx.scale(scale, scale);
      ctx.drawImage(floor.image, 0, 0, HALL_WIDTH, 600);
      ctx.drawImage(stone.image, 0, 0, HALL_WIDTH, 65);
      slots.forEach((slot, index) => ctx.drawImage(banners[index].image, slot.x - 23, 3, 46, 58 * HALL_BANNER_HEIGHT / 72));
      ctx.save(); ctx.translate(HALL_CENTER, HALL_RUG.z); ctx.rotate(Math.PI / 2);
      ctx.drawImage(rug.image, -HALL_RUG.depth / 2, -HALL_RUG.width / 2, HALL_RUG.depth, HALL_RUG.width); ctx.restore();
      ctx.drawImage(exitMatTexture.image, HALL_EXIT_MAT.x - HALL_EXIT_MAT.width / 2,
        HALL_EXIT_MAT.z - HALL_EXIT_MAT.depth / 2, HALL_EXIT_MAT.width, HALL_EXIT_MAT.depth);
      drawHallFurniture(ctx);
      slots.forEach((slot, i) => {
        drawHallDisplay(ctx, slot.x, slot.z, i, placed[i] && icons[i].loaded ? icons[i].image : null);
      });
      if (ready) drawHallPresent(ctx, gift.x, gift.z);
      drawCharacterMarker(ctx, player.x, player.z, PLAYER_OUTFIT, { ...PLAYER_STYLE, stride: playerStride, facing });
      if (love.visible) {
        drawCharacterMarker(ctx, lovePosition.x, lovePosition.y, CAT_OUTFIT, { ...CAT_STYLE, facing: loveFacing });
        if (ticket.visible) {
          ctx.fillStyle = '#f2c56b'; ctx.fillRect(lovePosition.x - 8, lovePosition.y + 8, 16, 9);
          ctx.fillStyle = '#9b6739'; ctx.fillRect(lovePosition.x - 4, lovePosition.y + 10, 2, 5);
        }
      }
      family.forEach((guest) => {
        if (!guest.model.visible) return;
        if (guest.member.kind === 'dog') {
          drawBirthdayDog(ctx, guest.position.x, guest.position.y, guest.facing, guest.legs[0].rotation.x, guest.member.size);
          return;
        }
        drawCharacterMarker(ctx, guest.position.x, guest.position.y, guest.member.outfit,
          { scale: guest.member.size, hair: guest.member.hair, hairLength: ['gran', 'mum', 'sister'].includes(guest.member.id) ? 'long' : 'short',
            stride: guest.member.id === 'gran' ? 0 : guest.legs[0].rotation.x, facing: guest.facing });
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
        const { scale, ox, oy } = illustratedLayout();
        x = ox + speaker.x * scale;
        y = oy + speaker.y * scale;
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
      const arrival = birthdayArrivalPath(BIRTHDAY_PLAYER_POSITION, roomWithPresent);
      if (!arrival) { say('Cat cannot reach you from the entrance. Move to another side of the present and try again.'); return; }
      const familyPaths = birthdayFamilyPaths(BIRTHDAY_PLAYER_POSITION, arrival.at(-1), roomWithPresent);
      if (!familyPaths) { say('Your family cannot reach the celebration. Move to another side of the present and try again.'); return; }
      const schedule = scheduleBirthdayArrivals(arrival, familyPaths);
      if (!schedule) { say('Your family cannot enter safely. Move to another side of the present and try again.'); return; }
      if (onPresent() !== true) return;
      clearInput(); lovePosition = { ...BIRTHDAY_ENTRANCE }; arrivalSchedule = schedule; endingPlayerPath = stagingPath;
      ticketReceived = false; ticketCard.hidden = true; ticketButton.hidden = true;
      familyElapsed = 0; arrivalElapsed = 0; loveWalk = 0; loveMoving = false;
      family.forEach((guest) => {
        guest.position = { ...BIRTHDAY_ENTRANCE };
        guest.visible = false; guest.walk = 0; guest.facing = 0; guest.moving = false;
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
      || document.querySelector('[data-modal-backdrop]:not(.hidden), [data-game-modal][open]')
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
      clickedExit = raycaster.intersectObject(exitMat).length > 0;
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, hit)) target = { x: hit.x, z: hit.z };
    } else {
      const { scale, ox, oy } = illustratedLayout();
      target = {
        x: (event.clientX - rect.left - ox) / scale,
        z: (event.clientY - rect.top - oy) / scale
      };
      clickedExit = isOnHallExitMat(target.x, target.z);
    }
    pendingExit = clickedExit;
    if (clickedExit && nearTrophyExit(player)) { onLeave(); return; }
    if (clickedExit) target = { x: TROPHY_EXIT.x, z: TROPHY_EXIT.z - 55 };
    if (target) {
      target = { x: Math.max(35, Math.min(HALL_WIDTH - 35, target.x)), z: Math.max(75, Math.min(565, target.z)) };
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
    const modalOpen = document.querySelector('[data-modal-backdrop]:not(.hidden), [data-game-modal][open]');
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
      arrivalElapsed = Math.min(arrivalElapsed + dt, arrivalSchedule.duration);
      const catPose = birthdayArrivalPose(arrivalSchedule.cat, arrivalElapsed);
      lovePosition = catPose.position; loveMoving = catPose.moving;
      loveWalk = Math.min(arrivalElapsed, arrivalSchedule.cat.duration) * 10;
      if (loveMoving) loveFacing = catPose.facing;
      else {
        loveFacing = Math.atan2(player.x - lovePosition.x, player.z - lovePosition.y);
        facing = Math.atan2(lovePosition.x - player.x, lovePosition.y - player.z);
      }
      family.forEach((guest) => {
        const index = arrivalSchedule.family.findIndex((entry) => entry.memberId === guest.member.id);
        const entry = arrivalSchedule.family[index];
        if (arrivalElapsed < entry.start) return;
        if (!guest.visible && guest.member.id === 'gran') onCakeArrives?.();
        guest.visible = true;
        const settlement = arrivalSchedule.settlements.find((item) => item.index === index)?.trajectory;
        const movingToFinal = settlement && arrivalElapsed >= settlement.start;
        const pose = birthdayArrivalPose(movingToFinal ? settlement : entry, arrivalElapsed);
        guest.position = pose.position; guest.moving = pose.moving;
        guest.walk = (Math.min(arrivalElapsed - entry.start, entry.duration)
          + (movingToFinal ? Math.min(arrivalElapsed - settlement.start, settlement.duration) : 0)) * 10;
        guest.facing = pose.moving ? pose.facing : guest.member.kind === 'dog'
          ? birthdayDogFacing(guest.position, lovePosition)
          : Math.atan2(player.x - guest.position.x, player.z - guest.position.y);
      });
      if (arrivalElapsed >= arrivalSchedule.duration) ending.arrive();
    }
    if (!['idle', 'positioning'].includes(endingPhase) && !modalOpen) {
      familyElapsed += dt;
      family.forEach((guest) => {
        if (!guest.visible) return;
        const stride = endingPhase === 'arriving' && guest.moving ? Math.sin(guest.walk) * 0.4 : 0;
        guest.legs.forEach((leg, legIndex) => {
          leg.rotation.x = stride * (guest.member.kind === 'dog' && legIndex >= 2 ? -1 : 1) * (legIndex % 2 ? -1 : 1);
        });
        if (guest.tail) guest.tail.rotation.y = Math.sin(familyElapsed * 7) * 0.35;
        if (guest.arms) swingCharacterArms(guest.arms, stride);
      });
    }
    loveLegs[0].rotation.x = endingPhase === 'arriving' && loveMoving ? Math.sin(loveWalk) * 0.4 : 0;
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
    flames.forEach(({ mesh, height }, i) => { mesh.scale.y = height * (1 + Math.sin(time / 180 + i) * 0.16); });
    sparkles.forEach((sparkle) => { sparkle.position.y = 75 + sparkle.userData.phase % 3 * 10 + Math.sin(time / 500 + sparkle.userData.phase) * 6; });
    render(); frame = requestAnimationFrame(tick);
  }
  root.addEventListener('click', click); root.addEventListener('pointerdown', pointerDown);
  root.addEventListener('pointerup', pointerUp); root.addEventListener('pointercancel', pointerUp);
  document.addEventListener('keydown', keydown); document.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearInput);
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  say(restoreError ? 'Your family could not return to the hall. Open the present to try the celebration again.'
    : endingPhase === 'finished' ? 'Your family is here to celebrate! Open the present to replay the surprise.'
      : `Welcome to your trophy room, ${characterName}. Place each earned keepsake on its pedestal.`);
  resize(); canvas.focus(); frame = requestAnimationFrame(tick);
  return () => {
    disposed = true; ending.stop(); cancelAnimationFrame(frame); observer.disconnect();
    onBirthdayEnd?.();
    root.removeEventListener('click', click); root.removeEventListener('pointerdown', pointerDown);
    root.removeEventListener('pointerup', pointerUp); root.removeEventListener('pointercancel', pointerUp);
    document.removeEventListener('keydown', keydown); document.removeEventListener('keyup', keyup); window.removeEventListener('blur', clearInput);
    scene.traverse((object) => {
      if (object.isMesh && ![geometry, pedestalGeometry, torsoGeometry, characterHeadGeometry, characterLimbGeometry, cylinder, orb, cone, shadowGeometry].includes(object.geometry)) object.geometry.dispose();
    });
    [geometry, pedestalGeometry, torsoGeometry, characterHeadGeometry, characterLimbGeometry, cylinder, orb, cone, shadowGeometry].forEach((shape) => shape.dispose());
    textures.forEach((texture) => texture.dispose()); materials.forEach((mat) => mat.dispose()); renderer?.dispose();
  };
}
