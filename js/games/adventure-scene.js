import * as THREE from 'three';
import { CANOPY_CROSSINGS, CANOPY_PLATFORMS, CANOPY_ZIPLINE, OBJECTS, POOL_TABLE_FOOTPRINT, PUB_EXIT, PUB_PARTNER_OFFSET, PUB_STOOLS, adventureObjectDistance } from './adventure-logic.js';
import { COASTER_PLATFORM, COASTER_RAIL_OFFSET, COASTER_REJOIN_PROGRESS, COASTER_TREATS, coasterDirection, coasterHeading, coasterLanePosition, coasterPosition, coasterRailPosition } from './coaster-course.js';
import { drawCoasterItem } from './coaster-art.js';
import { createCharacterLegs, createPlayerLegs } from './character-legs.js';
import { CAT_OUTFIT, CAT_STYLE, PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker } from '../character-appearance.js';
import { createCharacterArms, createCharacterTorsoGeometry, swingCharacterArms } from '../character-body.js';

export function createAdventureScene(canvas, index, onSelect, characterName) {
  const probe = document.createElement('canvas').getContext('webgl2');
  const available = Boolean(probe);
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const renderer = available ? new THREE.WebGLRenderer({ canvas, antialias: true }) : null;
  const ctx = renderer ? null : canvas.getContext('2d');
  if (!renderer && !ctx) throw new Error('Could not initialize the quest scene.');
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const torsoGeometry = createCharacterTorsoGeometry();
  const sphereGeometry = new THREE.SphereGeometry(0.5, 12, 8);
  const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const coneGeometry = new THREE.ConeGeometry(0.5, 1, 8);
  const triangleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 3);
  const materials = new Map(), textures = [], interactive = [], platformMeshes = [];
  const collectibles = new Map(), beacons = new Map(), rideTreats = new Map(), rideItemImages = new Map();
  let state, player, train, ball, lightMarker, platformAmor, width = 1, height = 1, scale = 1, ballAnimation = 0, lastBallLost = false;
  let platformCarriage, pubLove, joinedHands, pubExitMarker, dropTrack;
  let cueGuide, poolBalls, placedCues, placedDrinks, previousPlayer, walkPhase = 0;
  const theme = index === 1 ? '#342f28' : index === 2 ? '#20272f' : '#152b29';
  scene.background = new THREE.Color(theme);

  function material(color, glow = false) {
    const key = `${color}:${glow}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85,
      ...(glow ? { emissive: color, emissiveIntensity: 0.5 } : {}) }));
    return materials.get(key);
  }
  function box(x, y, z, w, h, d, color, parent = scene, glow = false) {
    const mesh = new THREE.Mesh(boxGeometry, material(color, glow));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh);
    return mesh;
  }
  function round(geometry, x, y, z, w, h, d, color, parent = scene, glow = false) {
    const mesh = new THREE.Mesh(geometry, material(color, glow));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh);
    return mesh;
  }
  function beam(start, end, thickness, color) {
    const from = new THREE.Vector3(...start), to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from);
    const mesh = box((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2,
      direction.length(), thickness, thickness, color);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
    return mesh;
  }
  function woodFloor() {
    const image = document.createElement('canvas'); image.width = 512; image.height = 512;
    const c = image.getContext('2d');
    if (!c) throw new Error('Could not create the pub floor texture.');
    c.fillStyle = '#826044'; c.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) {
      c.fillStyle = y % 64 ? '#79583e' : '#896849'; c.fillRect(0, y, 512, 30);
      c.strokeStyle = '#5d4431'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke();
      for (let x = (y % 64 ? -64 : 0); x < 512; x += 128) {
        c.fillStyle = '#604531'; c.fillRect(x, y, 2, 30);
        c.fillStyle = '#a0805c'; c.fillRect(x + 12, y + 9, 80, 1); c.fillRect(x + 28, y + 23, 64, 1);
      }
    }
    const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    const floor = box(500, -8, 350, 1000, 16, 700, '#ffffff');
    const floorMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
    materials.set('pub-floor', floorMaterial); floor.material = floorMaterial;
  }
  function label(text, x, y, z) {
    const image = document.createElement('canvas'); image.width = 256; image.height = 64;
    const c = image.getContext('2d');
    if (!c) throw new Error('Could not create a quest label.');
    c.fillStyle = '#202923e8'; c.fillRect(0, 0, 256, 64);
    c.fillStyle = '#fff0bd'; c.textAlign = 'center'; c.font = 'bold 25px sans-serif'; c.fillText(text, 128, 40, 240);
    const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    materials.set(`label:${texture.uuid}`, mat);
    const sprite = new THREE.Sprite(mat); sprite.position.set(x, y, z); sprite.scale.set(130, 32, 1); scene.add(sprite);
    return sprite;
  }
  function person(color, name, x, z, parent = scene, style = {}) {
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    round(torsoGeometry, 0, 39, 0, 26, 38, 17, color, group);
    addCharacterHeadDetails((px, py, pz, w, h, d, shade) => box(px, py, pz, w, h, d, shade, group),
      (px, py, pz, w, h, d, shade) => round(sphereGeometry, px, py, pz, w, h, d, shade, group),
      { headY: 70, width: 19, height: 20, depth: 19, skin: '#dfb38c', hairLength: style.hairLength });
    group.userData.legs = style.shorts
      ? createPlayerLegs(group, box, { offset: 7, shoeColor: '#594336', shortsColor: style.shorts, skin: '#dfb38c' })
      : createCharacterLegs(group, box, 7, '#594336', style.trousers);
    box(0, 27, 9, 26, 4, 2, style.belt || '#a98e60', group);
    if (style.buckle) box(0, 27, 10.5, 5, 3, 1, style.buckle, group);
    group.userData.arms = createCharacterArms(group, box, {
      offset: 16, shoulderY: 54, length: 28, width: 7, depth: 8, color, skin: '#dfb38c',
      shortSleeves: style.shortSleeves, tattoo: style.tattoo
    });
    if (name) group.userData.label = label(name, x, 103, z);
    return group;
  }
  function carriage(withRiders = false) {
    const group = new THREE.Group(); scene.add(group);
    box(0, 18, 0, 70, 35, 42, '#675143', group);
    box(0, 38, -17, 72, 25, 8, '#493d34', group);
    box(0, 34, 20, 74, 10, 6, '#9e896b', group);
    for (const x of [-25, 25]) for (const z of [-24, 24]) {
      round(cylinderGeometry, x, 9, z, 15, 7, 15, '#252f2c', group).rotation.z = Math.PI / 2;
    }
    if (withRiders) for (const [x, color, style] of [[-17, PLAYER_OUTFIT, PLAYER_STYLE], [17, CAT_OUTFIT, CAT_STYLE]]) {
      const rider = person(color, null, x, 0, group, style); rider.position.y = 18; rider.scale.set(0.7, 0.7, 0.7);
      rider.userData.legs.forEach((leg) => { leg.rotation.x = -Math.PI / 2; });
    }
    return group;
  }
  function itemImage(kind) {
    if (!rideItemImages.has(kind)) {
      const image = document.createElement('canvas'); image.width = 96; image.height = 96;
      const context = image.getContext('2d');
      if (!context) throw new Error('Could not create a coaster item icon.');
      drawCoasterItem(context, kind); rideItemImages.set(kind, image);
    }
    return rideItemImages.get(kind);
  }
  function itemModel(kind) {
    const group = new THREE.Group();
    const b = (x, y, z, w, h, d, color) => box(x, y, z, w, h, d, color, group);
    const r = (geometry, x, y, z, w, h, d, color) => round(geometry, x, y, z, w, h, d, color, group);
    if (kind === 'pizza') {
      r(triangleGeometry, 0, 0, 0, 56, 6, 56, '#f2c56b');
      b(0, 5, -12, 45, 7, 7, '#c47c42');
      for (const [x, z] of [[-9, -5], [10, -5], [0, 9]]) r(cylinderGeometry, x, 4, z, 9, 2, 9, '#c84c43');
    } else if (kind === 'cup') {
      r(cylinderGeometry, 0, 0, 0, 32, 45, 32, '#74c8d3');
      r(cylinderGeometry, 0, 4, 0, 33, 11, 33, '#f4b65d');
      r(cylinderGeometry, 0, 24, 0, 37, 5, 37, '#f3e5bf');
      b(7, 34, 0, 4, 20, 4, '#ed8b88').rotation.z = -0.25;
    } else if (kind === 'map') {
      for (const [x, angle] of [[-19, 0.3], [0, -0.3], [19, 0.3]]) {
        b(x, 0, 0, 20, 35, 3, '#e9dfba').rotation.y = angle;
      }
      b(0, 3, 3, 38, 3, 2, '#679b6c').rotation.z = 0.35;
      r(sphereGeometry, 3, 6, 5, 7, 7, 7, '#cd6460');
    } else if (kind === 'ticket') {
      b(0, 0, 0, 54, 32, 5, '#f2c56b');
      for (const x of [-18, 18]) for (const y of [-9, 0, 9]) b(x, y, 3, 3, 4, 2, '#9b6739');
      b(-8, 0, 4, 3, 18, 2, '#9b6739'); b(-3, 8, 4, 13, 3, 2, '#9b6739'); b(-5, 1, 4, 9, 3, 2, '#9b6739');
      b(8, 8, 4, 14, 3, 2, '#9b6739'); b(8, 0, 4, 3, 18, 2, '#9b6739');
    } else if (kind === 'umbrella') {
      r(coneGeometry, 0, 14, 0, 56, 25, 56, '#779ed1');
      r(cylinderGeometry, 0, -9, 0, 3, 42, 3, '#e7e7db');
      b(6, -29, 0, 14, 3, 3, '#e7e7db'); b(12, -25, 0, 3, 9, 3, '#e7e7db');
    }
    return group;
  }
  function makeObject(object) {
    const { x, y: z, kind } = object, h = object.height || 0;
    let mesh;
    if (kind === 'npc') {
      mesh = person(CAT_OUTFIT, object.name, x, z, scene, CAT_STYLE);
      if (object.id === 'amor') platformAmor = mesh;
      if (index === 1 && object.id === 'love') pubLove = mesh;
    } else {
      if (kind === 'carriage') {
        mesh = carriage();
        mesh.position.set(x, coasterPosition('riding', 0).height, z);
        mesh.rotation.y = coasterHeading('riding', 0);
      } else if (kind === 'bar') {
        mesh = box(x, 40, z, 180, 80, 55, '#754b34');
        box(x, 84, z, 190, 9, 65, '#b59061');
        for (const offset of [-60, 0, 60]) {
          box(x + offset, 40, z + 29, 48, 55, 3, '#936848');
          round(cylinderGeometry, x + offset, 101, z, 10, 26, 10, '#9dbe9c');
          round(cylinderGeometry, x + offset, 116, z, 6, 6, 6, '#d4c184');
        }
      } else if (kind === 'pool') {
        mesh = box(x, 37, z, POOL_TABLE_FOOTPRINT.width, 55, 125, '#65482f');
        box(x, 68, z, 205, 8, 110, '#397852');
        for (const dz of [-61, 61]) box(x, 75, z + dz, 220, 14, 9, '#b48a51');
        for (const dx of [-108, 108]) box(x + dx, 75, z, 9, 14, 115, '#b48a51');
        for (const dx of [-80, 80]) for (const dz of [-40, 40]) {
          box(x + dx, 19, z + dz, 15, 38, 15, '#483527');
        }
        for (const dx of [-94, 0, 94]) for (const dz of [-47, 47]) box(x + dx, 73, z + dz, 13, 3, 13, '#141d19');
        poolBalls = new THREE.Group(); scene.add(poolBalls);
        for (let row = 0; row < 4; row += 1) for (let col = 0; col <= row; col += 1) {
          const piece = round(sphereGeometry, x + 24 + row * 9, 78, z + (col - row / 2) * 10, 10, 10, 10,
            ['#dcaa49', '#c5574a', '#527db1', '#ead6a4'][(row + col) % 4], poolBalls);
          piece.userData.start = piece.position.clone();
          piece.userData.scatter = { x: (row - 1.5) * 8, z: (col - row / 2) * 9 };
        }
        const cueBall = round(sphereGeometry, x - 65, 78, z, 10, 10, 10, '#f2ead8', poolBalls);
        cueBall.userData.start = cueBall.position.clone(); cueBall.userData.scatter = { x: 45, z: -16 };
        ball = round(sphereGeometry, x + 12, 77, z, 12, 12, 12, '#141a1c');
        placedCues = new THREE.Group(); scene.add(placedCues);
        for (const dz of [-68, -74]) box(x - 15, 83, z + dz, 145, 3, 3, '#dfc18d', placedCues);
        cueGuide = box(x - 5, 80, z, 120, 2, 2, '#fff3be', scene, true);
      } else if (kind === 'table') {
        mesh = box(x, 60, z, 100, 8, 70, '#9a7046');
        for (const dx of [-40, 40]) for (const dz of [-25, 25]) box(x + dx, 30, z + dz, 7, 60, 7, '#5e4330');
        placedDrinks = new THREE.Group(); scene.add(placedDrinks);
        for (const dx of [-18, 18]) {
          round(cylinderGeometry, x + dx, 73, z, 13, 19, 13, '#d6ae6e', placedDrinks);
          round(cylinderGeometry, x + dx, 84, z, 13, 3, 13, '#eee3b3', placedDrinks);
        }
      } else if (kind === 'rack') {
        mesh = box(x, 45, z, 80, 90, 15, '#60422e');
        for (const dx of [-25, -5, 15, 30]) box(x + dx, 51, z + 10, 4, 90, 4, '#d4b77a');
      } else if (kind === 'tools') {
        mesh = box(x, 45, z, 75, 90, 38, '#674833');
        box(x, 48, z + 20, 66, 75, 3, '#936a48');
        for (const dx of [-18, 18]) box(x + dx, 48, z + 22, 3, 65, 3, '#d0b988');
        box(x + 27, 45, z + 23, 5, 5, 3, '#d6b66e');
      } else if (kind === 'note') {
        mesh = box(x, 36, z, 62, 70, 32, '#70503b');
        box(x, 75, z, 40, 3, 25, '#e1d2aa');
        for (const dz of [-6, 0, 6]) box(x, 77, z + dz, 28, 1, 1, '#8e765a');
      } else if (kind === 'net' || kind === 'rope') {
        const crossing = CANOPY_CROSSINGS[object.id];
        const [endX, , endHeight] = crossing.end;
        if (kind === 'net') {
          mesh = beam([x, h + 6, z - 38], [endX, endHeight + 6, z - 38], 5, '#d7bd81');
          for (let dz = -20; dz <= 40; dz += 20) beam([x, h + 6, z + dz], [endX, endHeight + 6, z + dz], 4, '#d7bd81');
          for (let i = 0; i <= 5; i += 1) {
            box(x + (endX - x) * i / 5, h + 6 + (endHeight - h) * i / 5, z, 5, 5, 85, '#d7bd81');
          }
        } else {
          mesh = beam([x, h + 5, z], [endX, endHeight + 5, z], 7, '#c3a77a');
          for (const dz of [-27, 27]) beam([x, h + 55, z + dz], [endX, endHeight + 55, z + dz], 4, '#d7bd81');
          for (let i = 0; i <= 4; i += 1) for (const dz of [-27, 27]) {
            box(x + (endX - x) * i / 4, h + 30 + (endHeight - h) * i / 4, z + dz, 3, 50, 3, '#d7bd81');
          }
        }
      } else if (kind === 'zipline') {
        mesh = box(x, h + 65, z, 10, 130, 10, '#c6a575');
        const cablePoint = (point) => [point.x, point.height + CANOPY_ZIPLINE.cableHeight, point.y];
        beam(cablePoint(CANOPY_ZIPLINE.start), cablePoint(CANOPY_ZIPLINE.departure), 4, '#e8d18c');
        beam(cablePoint(CANOPY_ZIPLINE.departure), cablePoint(CANOPY_ZIPLINE.end), 4, '#e8d18c');
      } else if (kind === 'beacon') {
        box(x, h + 22, z, 10, 44, 10, '#6d5537');
        mesh = round(sphereGeometry, x, h + 52, z, 25, 30, 25, '#8a7959');
        beacons.set(object.id, mesh);
      } else if (kind === 'collectible') {
        mesh = round(sphereGeometry, x, h + 30, z, 19, 19, 19, '#edd68e', scene, true);
        round(cylinderGeometry, x, h + 9, z, 30, 18, 30, '#644c35');
        round(cylinderGeometry, x, h + 20, z, 36, 4, 36, '#b79a5f');
      } else {
        const color = kind === 'collectible' ? '#e5d18a' : kind === 'locker' ? '#6d7f80' : '#805c40';
        mesh = box(x, h + 28, z, kind === 'collectible' ? 20 : 60, kind === 'collectible' ? 20 : 56,
          kind === 'collectible' ? 20 : 45, color, scene, kind === 'collectible');
        if (kind === 'cabinet' || kind === 'locker') box(x, h + 30, z + 24, 48, 42, 4, '#a78c67');
      }
      if (kind === 'collectible') collectibles.set(object.id, mesh);
      if (index === 2 && kind === 'carriage') {
        const objectLabel = label(object.name, x, h + (kind === 'bar' ? 135 : 105), z);
        platformCarriage = { mesh, label: objectLabel };
      }
    }
    mesh.userData.objectId = object.id;
    interactive.push(mesh);
  }
  if (renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.HemisphereLight('#e6dfc2', '#302e28', 1.8));
    const sun = new THREE.DirectionalLight('#f0d7a2', 2); sun.position.set(-300, 900, 600); scene.add(sun);
    if (index === 1) {
      woodFloor();
      box(500, 78, 0, 1000, 156, 20, '#967f68');
      box(0, 78, 350, 20, 156, 700, '#967f68');
      box(500, 26, 12, 1000, 52, 5, '#553c2e');
      box(12, 26, 350, 5, 52, 700, '#553c2e');
      for (const x of [40, 320, 610, 960]) box(x, 82, 16, 12, 164, 12, '#604734');
      box(185, 102, 14, 275, 10, 35, '#5b3e2e');
      box(185, 140, 14, 275, 10, 35, '#5b3e2e');
      for (let x = 65; x <= 305; x += 25) for (const y of [115, 153]) {
        round(cylinderGeometry, x, y, 22, 8, 22, 8, ['#577b60', '#aa8554', '#826349'][(x / 25 | 0) % 3]);
        round(cylinderGeometry, x, y + 13, 22, 4, 5, 4, '#d2bb7d');
      }
      for (const x of [405, 700, 880]) {
        box(x, 105, 13, 105, 80, 5, '#4d392f');
        box(x, 105, 17, 91, 66, 3, '#416153');
        box(x, 105, 20, 4, 66, 3, '#ad936a'); box(x, 105, 20, 91, 4, 3, '#ad936a');
        box(x, 105, 22, 88, 63, 2, '#35564e');
        box(x, 105, 24, 4, 63, 2, '#c3a97b'); box(x, 105, 24, 88, 4, 2, '#c3a97b');
      }
      box(530, 2, 385, 340, 3, 195, '#573e36');
      box(530, 4, 385, 325, 2, 180, '#80584b');
      for (const { x, y: z, radius } of PUB_STOOLS) {
        if (radius === 17.5) {
          round(cylinderGeometry, x, 20, z, 8, 40, 8, '#5a3d2c');
          round(cylinderGeometry, x, 42, z, radius * 2, 7, radius * 2, '#9a714c');
          round(cylinderGeometry, x, 2, z, 24, 4, 24, '#4f392e');
        } else {
          round(cylinderGeometry, x, 35, z, 10, 70, 10, '#523c2c');
          round(cylinderGeometry, x, 71, z, radius * 2, 8, radius * 2, '#956d48');
          round(cylinderGeometry, x, 77, z, 37, 5, 37, '#68473d');
        }
      }
      for (const x of [360, 660, 920]) {
        box(x, 146, 100, 5, 35, 5, '#6d5339');
        round(cylinderGeometry, x, 126, 100, 34, 10, 34, '#d9bc79');
        round(sphereGeometry, x, 119, 100, 15, 12, 15, '#f3d996', scene, true);
      }
      pubExitMarker = new THREE.Group(); scene.add(pubExitMarker);
      box(PUB_EXIT.x, 3, PUB_EXIT.y, 100, 5, 65, '#567b62', pubExitMarker);
      box(PUB_EXIT.x, 7, PUB_EXIT.y, 65, 3, 5, '#d7c58c', pubExitMarker);
      joinedHands = box(0, 27, 0, 10, 7, 8, '#dfb38c');
    } else if (index === 2) {
      box(500, -8, 350, 1000, 16, 700, '#384736');
      for (let x = 30; x < 1000; x += 65) for (let z = 25; z < 700; z += 65) {
        box(x, 1, z, 38 + (x * z % 23), 2, 28, (x + z) % 3 ? '#40533b' : '#4b5c40');
      }
      const { left, right, top: platformTop, bottom: platformBottom } = COASTER_PLATFORM;
      box((left + right) / 2, 3, (platformTop + platformBottom) / 2, right - left, 6, platformBottom - platformTop, '#807768');
      for (let x = left + 15; x < right; x += 42) box(x, 7, (platformTop + platformBottom) / 2, 2, 2, platformBottom - platformTop - 5, '#5e584d');
      joinedHands = box(0, 27, 0, 10, 7, 8, '#dfb38c');
      for (const x of [65, 245, 410, 590, 760, 935]) {
        const z = 40;
        round(cylinderGeometry, x, 45, z, 20, 90, 20, '#514433');
        for (let i = 0; i < 3; i += 1) round(coneGeometry, x, 100 + i * 27, z, 100 - i * 18, 75, 100 - i * 18, '#314c38');
      }
      for (const phase of ['riding', 'returning']) {
        for (let i = 0; i < 120; i += 1) {
          if (phase === 'returning' && i / 120 >= COASTER_REJOIN_PROGRESS) break;
          const a = coasterPosition(phase, i / 120);
          const direction = coasterDirection(phase, (i + 0.5) / 120);
          for (const side of [-1, 1]) {
            const start = coasterRailPosition(phase, i / 120, side);
            const end = coasterRailPosition(phase, (i + 1) / 120, side);
            beam([start.x, start.height, start.y], [end.x, end.height, end.y], 5,
              phase === 'riding' ? '#b8a78a' : '#8b94a0');
          }
          if (i % 5 === 0) {
            beam([a.x - direction.y * 32, a.height - 4, a.y + direction.x * 32],
              [a.x + direction.y * 32, a.height - 4, a.y - direction.x * 32], 6, '#645446');
            const clearLowerTrack = phase !== 'riding' || !Array.from({ length: 61 }, (_, j) => coasterPosition('returning', j / 60))
              .some((point) => Math.hypot(point.x - a.x, point.y - a.y) < 30);
            if (clearLowerTrack) box(a.x, a.height / 2, a.y, 6, a.height, 6, '#5c5145');
          }
        }
      }
      const top = coasterPosition('dropping', 0), bottom = coasterPosition('dropping', 1);
      const dropDirection = coasterDirection('dropping', 0);
      for (const side of [-1, 1]) {
        const dx = -dropDirection.y * COASTER_RAIL_OFFSET * side, dz = dropDirection.x * COASTER_RAIL_OFFSET * side;
        beam([top.x + dx, top.height, top.y + dz], [bottom.x + dx, bottom.height, bottom.y + dz], 5, '#a28e6f');
      }
      dropTrack = new THREE.Group(); scene.add(dropTrack);
      for (const side of [-1, 1]) box(side * COASTER_RAIL_OFFSET, 0, 0, 5, 5, 74, '#b8a78a', dropTrack);
      for (const z of [-28, 0, 28]) box(0, -4, z, 64, 5, 6, '#645446', dropTrack);
      const towerHeight = top.height + 105;
      const towerSide = { x: -dropDirection.y * 70, y: dropDirection.x * 70 };
      for (const side of [-1, 1]) {
        box(top.x + towerSide.x * side, towerHeight / 2, top.y + towerSide.y * side,
          10, towerHeight, 10, '#6d6654');
      }
      beam([top.x - towerSide.x, towerHeight, top.y - towerSide.y],
        [top.x + towerSide.x, towerHeight, top.y + towerSide.y], 10, '#817867');
      for (const treat of COASTER_TREATS) {
        const point = coasterLanePosition(treat.progress, treat.lane);
        const item = itemModel(treat.kind);
        item.position.set(point.x, point.height, point.y); scene.add(item);
        rideTreats.set(treat.id, item);
      }
      for (const x of [325, 925]) {
        box(x, 34, 610, 8, 68, 8, '#5a4939');
        round(sphereGeometry, x, 74, 610, 18, 18, 18, '#e1c47b', scene, true);
      }
      train = carriage(true);
    } else {
      box(1160, -100, 350, 2320, 10, 700, '#142d24');
      for (let x = 25; x < 2320; x += 80) for (let z = 35; z < 700; z += 90) {
        round(coneGeometry, x, -48, z, 80, 105, 80, (x + z) % 3 ? '#203f30' : '#294c36');
      }
      box(CANOPY_ZIPLINE.end.x, -8, CANOPY_ZIPLINE.end.y, 150, 16, 110, '#806443');
      for (const p of CANOPY_PLATFORMS) {
        platformMeshes.push(box((p.left + p.right) / 2, p.height - 8, (p.top + p.bottom) / 2,
          p.right - p.left, 16, p.bottom - p.top, '#806443'));
        for (let x = p.left + 15; x < p.right; x += 35) box(x, p.height + 1, 350, 2, 2, 160, '#5b4530');
        for (const x of [p.left + 8, p.right - 8]) for (const z of [p.top + 8, p.bottom - 8]) {
          box(x, (p.height - 95) / 2, z, 14, p.height + 95, 14, '#4a3d2c');
          box(x, p.height + 27, z, 8, 54, 8, '#775d3e');
        }
        for (const z of [p.top + 8, p.bottom - 8]) box((p.left + p.right) / 2, p.height + 46, z,
          p.right - p.left - 12, 4, 4, '#a58a60');
        for (let x = p.left + 25; x < p.right; x += 50) for (const z of [p.top + 8, p.bottom - 8]) {
          box(x, p.height + 22, z, 3, 44, 3, '#d1b680');
        }
      }
      for (const x of [100, 270, 460, 660, 850, 1050, 1250, 1450, 1650, 1820]) for (const z of [70, 620]) {
        round(cylinderGeometry, x, 30, z, 34, 260, 34, '#59402f');
        for (let i = 0; i < 3; i += 1) round(coneGeometry, x, 130 + i * 32, z, 140 - i * 25, 95, 140 - i * 25, i % 2 ? '#365c42' : '#294e38');
      }
      for (const p of CANOPY_PLATFORMS) {
        const x = (p.left + p.right) / 2, z = p.top + 16;
        box(x, p.height + 52, z, 6, 104, 6, '#6d5537');
        box(x, p.height + 105, z, 24, 4, 4, '#856f4c');
        round(sphereGeometry, x + 10, p.height + 96, z, 14, 18, 14, '#f0d484', scene, true);
      }
      lightMarker = box(220, 3, 350, 80, 4, 80, '#e9ca76', scene, true);
    }
    OBJECTS[index].forEach(makeObject);
    player = person(PLAYER_OUTFIT, null, 0, 0, scene, PLAYER_STYLE);
    const nameLabel = label(characterName, 0, 105, 0);
    player.userData.label = nameLabel;
  }
  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    scale = Math.min(width / (index === 3 && width < 520 ? 580 : 1050), height / 750);
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(width, height, false);
      const viewHeight = width < 520 ? 820 : 850;
      camera.left = -viewHeight * width / height / 2; camera.right = -camera.left;
      camera.top = viewHeight / 2; camera.bottom = -camera.top; camera.updateProjectionMatrix();
    } else {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (state) draw(state);
  }
  function draw(next, dt = 0, aim = 0) {
    state = next;
    const distance = previousPlayer && dt > 0
      ? Math.hypot(state.player.x - previousPlayer.x, state.player.y - previousPlayer.y) : 0;
    walkPhase += distance * 0.08;
    const swing = distance > 0.1 ? Math.sin(walkPhase) * 0.45 : 0;
    previousPlayer = { x: state.player.x, y: state.player.y };
    if (state.ballLost && !lastBallLost) ballAnimation = 0.001;
    lastBallLost = Boolean(state.ballLost);
    if (ballAnimation && ballAnimation < 1) ballAnimation = Math.min(1, ballAnimation + dt / 2);
    const riding = index === 2 && ['riding', 'dropping', 'returning'].includes(state.phase);
    const ridePoint = riding ? coasterPosition(state.phase, state.progress) : null;
    const followRide = renderer && riding && width < 520;
    const targetX = followRide ? ridePoint.x : targetXForClick();
    const targetY = followRide ? ridePoint.y
      : state.pubTogether || (index === 3 && state.zipline) ? state.player.y : 350;
    if (renderer) {
      player.visible = !riding; player.position.set(state.player.x, state.player.height, state.player.y);
      player.userData.legs[0].rotation.x = swing; player.userData.legs[1].rotation.x = -swing;
      swingCharacterArms(player.userData.arms, swing, state.pubTogether ? 1 : -1);
      player.userData.label.visible = !riding;
      if (platformAmor) {
        platformAmor.visible = !riding;
        platformAmor.userData.label.visible = !riding;
        const amorX = state.pubTogether ? state.player.x + PUB_PARTNER_OFFSET : OBJECTS[2].find((item) => item.id === 'amor').x;
        const amorY = state.pubTogether ? state.player.y : OBJECTS[2].find((item) => item.id === 'amor').y;
        platformAmor.position.set(amorX, 0, amorY);
        platformAmor.userData.label.position.set(amorX, 103, amorY);
        platformAmor.userData.legs.forEach((leg, i) => { leg.rotation.x = state.pubTogether ? player.userData.legs[i].rotation.x : 0; });
        swingCharacterArms(platformAmor.userData.arms, state.pubTogether ? swing : 0, state.pubTogether ? 0 : -1);
        joinedHands.visible = Boolean(state.pubTogether);
        joinedHands.position.set(state.player.x + PUB_PARTNER_OFFSET / 2, 27, state.player.y);
      }
      if (platformCarriage) {
        platformCarriage.mesh.visible = !riding;
        platformCarriage.label.visible = !riding;
      }
      if (pubLove) {
        const together = Boolean(state.pubTogether);
        const loveX = together ? state.player.x + PUB_PARTNER_OFFSET : OBJECTS[1].find((item) => item.id === 'love').x;
        const loveY = together ? state.player.y : OBJECTS[1].find((item) => item.id === 'love').y;
        pubLove.position.set(loveX, 0, loveY);
        pubLove.userData.label.position.set(loveX, 103, loveY);
        pubLove.userData.legs.forEach((leg, i) => { leg.rotation.x = together ? player.userData.legs[i].rotation.x : 0; });
        swingCharacterArms(pubLove.userData.arms, together ? swing : 0, together ? 0 : -1);
        joinedHands.visible = together;
        joinedHands.position.set(state.player.x + PUB_PARTNER_OFFSET / 2, 27, state.player.y);
        pubExitMarker.visible = state.pubEnding === 'ready';
      }
      player.userData.label.position.set(state.player.x, state.player.height + (state.pubTogether ? 145 : 105), state.player.y);
      camera.position.set(targetX + 500, 1100, targetY + 950); camera.lookAt(targetX, 0, targetY); camera.updateMatrixWorld();
      if (ball) {
        const t = state.ballFound || state.pubEnding ? 1 : ballAnimation;
        const offTable = Math.max(0, Math.min(1, (t - 0.2) / 0.15));
        ball.position.set(512 + 328 * t, 77 - 71 * offTable, 230 + 270 * t);
        ball.rotation.z = -t * 15;
        ball.visible = state.ballsPlaced && !state.ballFound && t < 1;
      }
      if (poolBalls) {
        poolBalls.visible = state.ballsPlaced;
        const t = state.ballLost ? ballAnimation : 0;
        poolBalls.children.forEach((piece) => {
          piece.position.set(piece.userData.start.x + piece.userData.scatter.x * t, piece.userData.start.y,
            piece.userData.start.z + piece.userData.scatter.z * t);
        });
      }
      if (placedCues) placedCues.visible = state.cuesPlaced;
      if (placedDrinks) placedDrinks.visible = state.drinksPlaced;
      if (cueGuide) {
        cueGuide.visible = state.shot;
        cueGuide.rotation.y = -aim * Math.PI / 180;
        cueGuide.position.set(435 + 60 * Math.cos(aim * Math.PI / 180), 81, 230 + 60 * Math.sin(aim * Math.PI / 180));
      }
      if (train) {
        train.visible = riding;
        dropTrack.visible = state.phase === 'dropping';
        if (riding) {
          train.position.set(ridePoint.x, ridePoint.height, ridePoint.y);
          train.rotation.y = coasterHeading(state.phase, state.progress);
          train.rotation.z = state.phase === 'riding' ? -state.lane * 0.08 : 0;
          if (state.phase === 'dropping') {
            dropTrack.position.set(ridePoint.x, ridePoint.height, ridePoint.y);
            dropTrack.rotation.y = train.rotation.y;
          }
        }
        for (const treat of COASTER_TREATS) {
          rideTreats.get(treat.id).visible = !state.treats.includes(treat.id);
        }
      }
      if (lightMarker) {
        const p = CANOPY_PLATFORMS[Math.min(state.checkpoint + 1, CANOPY_PLATFORMS.length - 1)];
        lightMarker.position.set((p.left + p.right) / 2, p.height + 3, 350);
        platformMeshes.forEach((platform, i) => { platform.material = material(i <= state.checkpoint + 1 ? '#806443' : '#283a32'); });
      }
      collectibles.forEach((item, id) => {
        const platform = ['leaf', 'feather', 'acorn', 'star'].indexOf(id);
        item.visible = !state.collected.includes(id) && platform <= state.checkpoint + 1;
      });
      beacons.forEach((beacon, id) => {
        beacon.material = material((state.lanterns || []).includes(id) ? '#f0d484' : '#8a7959', (state.lanterns || []).includes(id));
      });
      renderer.render(scene, camera);
      return;
    }
    ctx.fillStyle = theme; ctx.fillRect(0, 0, width, height);
    const sx = (x) => width / 2 + (x - targetX) * scale, sy = (y) => height / 2 + (y - targetY) * scale;
    if (index !== 3) { ctx.fillStyle = index === 1 ? '#71583f' : '#414d3d'; ctx.fillRect(sx(0), sy(0), 1000 * scale, 700 * scale); }
    else for (const [i, p] of CANOPY_PLATFORMS.entries()) {
      ctx.fillStyle = i <= state.checkpoint + 1 ? '#806443' : '#283a32'; ctx.fillRect(sx(p.left), sy(p.top), (p.right - p.left) * scale, (p.bottom - p.top) * scale);
      ctx.strokeStyle = i === Math.min(state.checkpoint + 1, CANOPY_PLATFORMS.length - 1) ? '#e9ca76' : '#594c36'; ctx.lineWidth = 3;
      ctx.strokeRect(sx(p.left), sy(p.top), (p.right - p.left) * scale, (p.bottom - p.top) * scale);
    }
    if (index === 3) {
      ctx.strokeStyle = '#d7bd81'; ctx.lineWidth = 4;
      Object.values(CANOPY_CROSSINGS).forEach(({ start, end }) => {
        ctx.beginPath(); ctx.moveTo(sx(start[0]), sy(start[1])); ctx.lineTo(sx(end[0]), sy(end[1])); ctx.stroke();
      });
      ctx.fillStyle = '#806443';
      ctx.fillRect(sx(CANOPY_ZIPLINE.end.x - 75), sy(CANOPY_ZIPLINE.end.y - 55), 150 * scale, 110 * scale);
      ctx.beginPath();
      ctx.moveTo(sx(CANOPY_ZIPLINE.start.x), sy(CANOPY_ZIPLINE.start.y));
      ctx.lineTo(sx(CANOPY_ZIPLINE.departure.x), sy(CANOPY_ZIPLINE.departure.y));
      ctx.lineTo(sx(CANOPY_ZIPLINE.end.x), sy(CANOPY_ZIPLINE.end.y));
      ctx.stroke();
    }
    if (index === 2) {
      ctx.fillStyle = '#807768';
      ctx.fillRect(sx(COASTER_PLATFORM.left), sy(COASTER_PLATFORM.top),
        (COASTER_PLATFORM.right - COASTER_PLATFORM.left) * scale, (COASTER_PLATFORM.bottom - COASTER_PLATFORM.top) * scale);
      for (const phase of ['returning', 'riding']) {
        ctx.strokeStyle = phase === 'riding' ? '#d1b995' : '#8b94a0';
        ctx.lineWidth = phase === 'riding' ? 5 : 3; ctx.beginPath();
        const segments = phase === 'returning' ? Math.round(120 * COASTER_REJOIN_PROGRESS) : 120;
        for (let i = 0; i <= segments; i += 1) {
          const point = coasterPosition(phase, i / 120);
          if (i === 0) ctx.moveTo(sx(point.x), sy(point.y));
          else ctx.lineTo(sx(point.x), sy(point.y));
        }
        ctx.stroke();
      }
      for (const treat of COASTER_TREATS) {
        if (state.treats.includes(treat.id)) continue;
        const point = coasterLanePosition(treat.progress, treat.lane);
        ctx.drawImage(itemImage(treat.kind), sx(point.x) - 15, sy(point.y) - 15, 30, 30);
      }
    }
    if (index === 1) {
      if (state.pubEnding === 'ready') {
        ctx.fillStyle = '#567b62';
        ctx.fillRect(sx(PUB_EXIT.x - 50), sy(PUB_EXIT.y - 32.5), 100 * scale, 65 * scale);
      }
      ctx.fillStyle = '#956d48';
      for (const stool of PUB_STOOLS) {
        ctx.beginPath(); ctx.arc(sx(stool.x), sy(stool.y), stool.radius * scale, 0, Math.PI * 2); ctx.fill();
      }
    }
    OBJECTS[index].forEach((object) => {
      if (['amor', 'carriage'].includes(object.id) && ['riding', 'dropping', 'returning'].includes(state.phase)) return;
      if (object.kind === 'collectible' && (state.collected.includes(object.id)
        || ['leaf', 'feather', 'acorn', 'star'].indexOf(object.id) > state.checkpoint + 1)) return;
      if (object.kind === 'carriage') {
        ctx.save(); ctx.translate(sx(object.x), sy(object.y)); ctx.rotate(-coasterHeading('riding', 0));
        ctx.fillStyle = '#675143'; ctx.fillRect(-35 * scale, -21 * scale, 70 * scale, 42 * scale); ctx.restore();
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd';
        ctx.fillText(object.name, sx(object.x), sy(object.y) - 25 * scale);
        return;
      }
      if (index === 2 && object.id === 'amor' && state.pubTogether) {
        drawCharacterMarker(ctx, sx(state.player.x + PUB_PARTNER_OFFSET), sy(state.player.y), CAT_OUTFIT, { ...CAT_STYLE, stride: swing, heldArm: 0 });
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd';
        ctx.fillText(object.name, sx(state.player.x + PUB_PARTNER_OFFSET), sy(state.player.y) - 17);
        return;
      }
      if (index === 2 && object.kind === 'locker') {
        ctx.fillStyle = '#6d7f80';
        ctx.fillRect(sx(object.x - object.footprint.width / 2), sy(object.y - object.footprint.depth / 2),
          object.footprint.width * scale, object.footprint.depth * scale);
        return;
      }
      if (index === 1 && object.kind === 'pool') {
        ctx.fillStyle = '#65482f';
        ctx.fillRect(sx(object.x - POOL_TABLE_FOOTPRINT.width / 2), sy(object.y - POOL_TABLE_FOOTPRINT.depth / 2),
          POOL_TABLE_FOOTPRINT.width * scale, POOL_TABLE_FOOTPRINT.depth * scale);
        ctx.fillStyle = '#397852';
        ctx.fillRect(sx(object.x - 100), sy(object.y - 52), 200 * scale, 104 * scale);
        return;
      }
      if (index === 1 && object.footprint) {
        const objectX = object.id === 'love' && state.pubTogether ? state.player.x + PUB_PARTNER_OFFSET : object.x;
        const objectY = object.id === 'love' && state.pubTogether ? state.player.y : object.y;
        if (object.id === 'love') {
          drawCharacterMarker(ctx, sx(objectX), sy(objectY), CAT_OUTFIT, { ...CAT_STYLE, stride: state.pubTogether ? swing : 0, heldArm: state.pubTogether ? 0 : -1 });
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd';
          ctx.fillText(object.name, sx(objectX), sy(objectY) - 17);
          return;
        }
        ctx.fillStyle = object.kind === 'npc' ? '#d29caf' : '#a9895e';
        const { width: w, depth: d, radius } = object.footprint;
        if (radius !== undefined) {
          ctx.beginPath(); ctx.arc(sx(objectX), sy(objectY), radius * scale, 0, Math.PI * 2); ctx.fill();
        } else ctx.fillRect(sx(objectX - w / 2), sy(objectY - d / 2), w * scale, d * scale);
        if (object.kind === 'npc') {
          ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd';
          ctx.fillText(object.name, sx(objectX), sy(objectY) - 17);
        }
        return;
      }
      if (object.id === 'amor') {
        drawCharacterMarker(ctx, sx(object.x), sy(object.y), CAT_OUTFIT, CAT_STYLE);
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd';
        ctx.fillText(object.name, sx(object.x), sy(object.y) - 17);
        return;
      }
      ctx.fillStyle = object.kind === 'npc' ? '#d29caf' : object.kind === 'collectible'
        || (object.kind === 'beacon' && (state.lanterns || []).includes(object.id)) ? '#f4d686' : '#a9895e';
      ctx.fillRect(sx(object.x) - 13, sy(object.y) - 13, 26, 26);
      if (index !== 3) {
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd'; ctx.fillText(object.name, sx(object.x), sy(object.y) - 17);
      }
    });
    if (index === 1 && state.shot) {
      ctx.strokeStyle = '#fff3be'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(sx(435), sy(230));
      ctx.lineTo(sx(435 + 120 * Math.cos(aim * Math.PI / 180)), sy(230 + 120 * Math.sin(aim * Math.PI / 180)));
      ctx.stroke();
    }
    if (index !== 2 || !['riding', 'dropping', 'returning'].includes(state.phase)) {
      drawCharacterMarker(ctx, sx(state.player.x), sy(state.player.y), PLAYER_OUTFIT, { ...PLAYER_STYLE, stride: swing, heldArm: state.pubTogether ? 1 : -1 });
      if ((index === 1 || index === 2) && state.pubTogether) {
        ctx.fillStyle = '#dfb38c';
        ctx.fillRect(sx(state.player.x + PUB_PARTNER_OFFSET), sy(state.player.y) + 5, -PUB_PARTNER_OFFSET * scale, 4);
      }
      if ((index === 1 || index === 3) && characterName) {
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd';
        ctx.fillText(characterName, sx(state.player.x), sy(state.player.y) - (state.pubTogether ? 31 : 17));
      }
    }
    if (index === 2 && ['riding', 'dropping', 'returning'].includes(state.phase)) {
      ctx.save(); ctx.translate(sx(ridePoint.x), sy(ridePoint.y));
      ctx.rotate(-coasterHeading(state.phase, state.progress));
      ctx.fillStyle = '#675143'; ctx.fillRect(-22, -13, 44, 26);
      drawCharacterMarker(ctx, -10, -5, PLAYER_OUTFIT, { ...PLAYER_STYLE, scale: 0.55 });
      drawCharacterMarker(ctx, 10, -5, CAT_OUTFIT, { ...CAT_STYLE, scale: 0.55 });
      ctx.restore();
    }
  }
  function click(event) {
    if (!state) return;
    const rect = canvas.getBoundingClientRect();
    let target;
    if (renderer) {
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
      const hitObject = raycaster.intersectObjects(interactive, true).find((hit) => hit.object.userData.objectId || hit.object.parent?.userData.objectId);
      if (hitObject) { onSelect({ objectId: hitObject.object.userData.objectId || hitObject.object.parent.userData.objectId }); return; }
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!hit) return;
      target = { x: hit.x, y: hit.z };
    } else target = { x: targetXForClick() + (event.clientX - rect.left - width / 2) / scale,
      y: (state.pubTogether ? state.player.y : 350) + (event.clientY - rect.top - height / 2) / scale };
    const object = OBJECTS[index].find((item) => (index === 1 || index === 2) && item.footprint
      ? adventureObjectDistance(index, target, item) === 0
      : Math.hypot(item.x - target.x, item.y - target.y) < 40);
    onSelect(object ? { objectId: object.id } : target);
  }
  function targetXForClick() {
    if (state.pubTogether) return state.player.x;
    if (index === 3 && state.zipline) return state.player.x;
    if (index === 3) return Math.max(220, Math.min(1660, state.player.x));
    if (!renderer && index === 2) return 500;
    return width < 520 ? Math.max(220, Math.min(780, state.player.x)) : 500;
  }
  canvas.addEventListener('click', click);
  function objectPosition(id) {
    const object = OBJECTS[index].find((item) => item.id === id);
    if (!object) return null;
    if (renderer) {
      const position = new THREE.Vector3(object.x, 120, object.y).project(camera);
      return { x: (position.x + 1) * width / 2, y: (1 - position.y) * height / 2 };
    }
    return { x: width / 2 + (object.x - targetXForClick()) * scale, y: height / 2 + (object.y - 350) * scale - 30 };
  }
  return { draw, resize, objectPosition, dispose() {
    canvas.removeEventListener('click', click); boxGeometry.dispose(); torsoGeometry.dispose(); sphereGeometry.dispose(); cylinderGeometry.dispose(); coneGeometry.dispose(); triangleGeometry.dispose(); materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose()); renderer?.dispose();
  } };
}
