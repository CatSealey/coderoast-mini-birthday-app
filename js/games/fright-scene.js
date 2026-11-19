import * as THREE from 'three';
import { CELL, FRIGHT_MAZE, FRIGHT_OBJECTS, FRIGHT_OBJECT_SCALE, FRIGHT_SCENERY, FRIGHT_THEMES, SIZE, frightAreaAt, frightExitReady, frightRandom, frightTeleportPosition } from './fright-logic.js';
import { PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker, facingForMovement } from '../character-appearance.js';
import { CHARACTER_RISE, addCharacterBelt, addCharacterClothingDetails, createCharacterArms, createCharacterFaceGeometry, createCharacterHeadGeometry, createCharacterLimbGeometry, createCharacterSkinGeometry, createCharacterTorsoGeometry, swingCharacterArms } from '../character-body.js';
import { createPlayerLegs, swingCharacterLegs } from './character-legs.js';
import { FRIGHT_PALETTES, drawFrightTileDetail, frightWallSegments, paintFrightConsole, paintFrightDocument, paintFrightFloor, paintFrightWall } from './fright-scenery.js';
import { createFrightMarker, createFrightMarkerGeometries, createFrightMaterial, frightMarkerVisible } from './fright-markers.js';

export function createFrightScene(canvas, onSelect, characterName = 'Adventurer') {
  const probe = document.createElement('canvas').getContext('webgl2');
  const hasWebGL = Boolean(probe);
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const renderer = hasWebGL ? new THREE.WebGLRenderer({ canvas, antialias: true }) : null;
  const context = renderer ? null : canvas.getContext('2d');
  if (!renderer && !context) throw new Error('Could not initialize the Fright Nights maze.');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#161b22');
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const markerGeometries = createFrightMarkerGeometries();
  const { box: geometry, cylinder: cylinderGeometry, cone: coneGeometry, sphere: sphereGeometry, ring: ringGeometry } = markerGeometries;
  const torsoGeometry = createCharacterTorsoGeometry();
  const characterHeadGeometry = createCharacterHeadGeometry();
  const characterFaceGeometry = createCharacterFaceGeometry();
  const characterLimbGeometry = createCharacterLimbGeometry();
  const characterSkinGeometry = createCharacterSkinGeometry();
  const materials = new Map(), markers = new Map(), textures = [], animations = [], lights = [];
  const documents = new Map(), consoles = new Map();
  let state, player, playerLabel, teleportCircle, teleportPosition, previousPosition, walkingPhase = 0, facing = 0, width = 1, height = 1, scale = 1, animationFrame = 0;
  const teleportRadius = 21;
  const colors = Object.fromEntries(FRIGHT_THEMES.map((theme) => [theme.id, theme.color]));
  const palettes = FRIGHT_PALETTES;
  const areas = FRIGHT_MAZE.map((row, y) => [...row].map((_, x) => frightAreaAt((x + 0.5) * CELL, (y + 0.5) * CELL)));
  const wallSegments = FRIGHT_MAZE.map((row, y) => [...row].map((_, x) => frightWallSegments(FRIGHT_MAZE, x, y)));
  const rand = frightRandom;

  function material(color, emissive = false, opacity = 1) {
    const key = `${color}:${emissive}:${opacity}`;
    if (!materials.has(key)) materials.set(key, createFrightMaterial(color, emissive, opacity));
    return materials.get(key);
  }
  function shape(geo, x, y, z, w, h, d, color, glow = false, opacity = 1) {
    const mesh = new THREE.Mesh(geo, material(color, glow, opacity));
    mesh.position.set(x, y, z); mesh.scale.set(w, h, d); scene.add(mesh);
    return mesh;
  }
  const box = (x, y, z, w, h, d, color, glow, opacity) => shape(geometry, x, y, z, w, h, d, color, glow, opacity);
  const cyl = (x, y, z, w, h, d, color, glow, opacity) => shape(cylinderGeometry, x, y, z, w, h, d, color, glow, opacity);
  const ball = (x, y, z, size, color, glow, opacity) => shape(sphereGeometry, x, y, z, size, size, size, color, glow, opacity);
  const ring = (x, y, z, size, color) => shape(ringGeometry, x, y, z, size, size, size, color);
  function label(text, x, y, z, big = false) {
    const surface = document.createElement('canvas');
    surface.width = 256; surface.height = 64;
    const ctx = surface.getContext('2d');
    if (!ctx) throw new Error('Could not create a maze sign.');
    ctx.fillStyle = big ? '#2a1530e8' : '#24271fe8'; ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#f4e3b4'; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(text.toUpperCase(), 128, 40, 240);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    materials.set(`label:${texture.uuid}`, spriteMaterial);
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, z); sprite.scale.set(big ? 150 : 115, big ? 38 : 29, 1); scene.add(sprite);
    return sprite;
  }
  function addLight(color, x, y, z, intensity, flicker = 0) {
    const light = new THREE.PointLight(color, intensity, 380, 1.4);
    light.position.set(x, y, z); scene.add(light);
    lights.push({ light, base: intensity, flicker, phase: x * 0.01 + z * 0.02 });
  }

  function paintedMaterial(key, paint) {
    const surface = document.createElement('canvas');
    surface.width = 128; surface.height = 128;
    const ctx = surface.getContext('2d');
    if (!ctx) throw new Error(`Could not create the ${key} texture.`);
    paint(ctx);
    const map = new THREE.CanvasTexture(surface);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.push(map);
    const result = new THREE.MeshStandardMaterial({ map, roughness: 1 });
    materials.set(key, result);
    return result;
  }

  function decorateFloor(theme, x, y) {
    const cx = (x + 0.5) * CELL, cz = (y + 0.5) * CELL;
    const r = (k) => rand(x, y, k), jitter = (k) => (r(k) - 0.5) * (CELL - 40);
    if (theme === 'disease') {
      if (r(1) < 0.5) box(cx + jitter(2), 3, cz + jitter(3), 28 + r(4) * 20, 1, 22 + r(5) * 16, '#8fe068', true, 0.55);
      if (r(9) < 0.4) {
        const mist = ball(cx + jitter(10), 28, cz + jitter(11), 46, '#9be06f', true, 0.18);
        animations.push((t) => { mist.position.y = 28 + Math.sin(t * 0.8 + x + y) * 6; });
      }
    } else if (theme === 'ai') {
      box(cx, 2.5, cz, 6, 1, CELL - 20, '#46e6ff', true);
    } else if (theme === 'darkness') {
      if (r(1) < 0.4) {
        const eyeX = cx + jitter(2), eyeZ = cz + jitter(3);
        const eyes = [box(eyeX - 5, 14, eyeZ, 5, 5, 3, '#f7ffd0', true), box(eyeX + 5, 14, eyeZ, 5, 5, 3, '#f7ffd0', true)];
        animations.push((t) => eyes.forEach((e) => { e.visible = Math.sin(t * 1.3 + x * 3 + y) > -0.7; }));
      }
      if (r(4) < 0.35) {
        const star = box(cx + jitter(5), 10, cz + jitter(6), 7, 7, 7, '#b9b0ff', true);
        animations.push((t) => { star.rotation.y = t; star.position.y = 10 + Math.sin(t * 2 + x) * 3; });
      }
    } else if (theme === 'chainsaws') {
      if (r(1) < 0.5) box(cx + jitter(2), 3, cz + jitter(3), 40, 1, 30, '#c9a86d', false, 0.8);
    } else if (theme === 'claustrophobia') {
      box(cx, 2.5, cz, CELL - 30, 1, 6, '#e2b64a');
    }
  }

  function buildSideScenery({ x, y, theme, variant }) {
    if (theme === 'disease') {
      cyl(x, 14, y, 22, 28, 22, '#5b7d3b');
      for (const h of [6, 23]) cyl(x, h, y, 24, 3, 24, '#8ba276');
      box(x, 16, y + 11, 12, 11, 2, '#c6d6aa');
      box(x, 16, y + 13, 3, 8, 1, '#5c8357');
      box(x, 16, y + 13, 8, 3, 1, '#5c8357');
      cyl(x, 29, y, 16, 3, 16, '#b8cc98');
      cyl(x + 4, 31, y - 2, 5, 3, 5, '#d8ec7e', true);
    } else if (theme === 'ai') {
      box(x, 22, y, 22, 44, 14, '#1a2c38');
      box(x, 24, y + 8, 18, 35, 2, '#314c58');
      for (let i = 0; i < 4; i += 1) {
        box(x, 12 + i * 8, y + 10, 14, 4, 2, '#152e38');
        ball(x - 5, 12 + i * 8, y + 11, 2, i % 2 ? '#7dffb2' : '#46e6ff', true);
      }
      box(x, 44, y, 25, 3, 17, '#6d8181');
    } else if (theme === 'darkness') {
      cyl(x, 8, y, 20, 16, 20, '#4d4658');
      cyl(x, 16, y, 22, 3, 22, '#91816c');
      cyl(x, 21, y, 7, 11, 7, '#ded4be');
      cyl(x + 1, 24, y + 3, 2, 6, 2, '#f2e3c9');
      ball(x, 29, y, 7, '#ffc65a', true);
    } else if (theme === 'chainsaws') {
      for (const dz of [-9, 9]) {
        const log = cyl(x, 8, y + dz, 14, 30, 14, '#7a5233');
        log.rotation.z = Math.PI / 2;
        const end = cyl(x + 16, 8, y + dz, 8, 2, 8, '#c5a474');
        end.rotation.z = Math.PI / 2;
        const growth = ring(x + 17, 8, y + dz, 5, '#896542');
        growth.rotation.y = Math.PI / 2;
        for (const dx of [-9, 0, 9]) box(x + dx, 15, y + dz, 2, 2, 10, '#5e3d2c');
      }
    } else if (theme === 'bogeymen') {
      if (variant) {
        box(x, 7, y, 24, 12, 34, '#513a4a');
        box(x, 15, y, 22, 5, 31, '#d0bfae');
        box(x, 19, y + 5, 21, 4, 19, '#766282');
        box(x, 19, y - 10, 19, 5, 8, '#eee2cf');
        for (const dz of [-16, 16]) box(x, 14, y + dz, 25, 24, 3, '#72566a');
      } else {
        box(x, 40, y, 14, 80, 8, '#0f0a14'); ball(x, 88, y, 20, '#0f0a14');
        for (const dx of [-9, 9]) box(x + dx, 45, y, 4, 53, 5, '#18101e');
        for (const dx of [-4, 4]) box(x + dx, 88, y + 9, 4, 3, 2, '#ffd36a', true);
      }
    } else if (theme === 'claustrophobia') {
      cyl(x, 20, y, 12, 40, 12, '#8c9a92');
      for (const h of [6, 34]) cyl(x, h, y, 18, 4, 18, '#b0bdb0');
      for (const h of [6, 34]) for (const dx of [-6, 6]) ball(x + dx, h, y + 6, 3, '#d7d1b3');
      cyl(x, 42, y, 16, 4, 16, '#586e62');
    } else {
      cyl(x, 4, y, 18, 8, 18, '#a67c4e');
      box(x, 30, y, 2, 52, 2, '#e8e0d0');
      const balloon = ball(x, 60, y, 24, variant ? '#5ab4ff' : '#ff5a7a', true);
      animations.push((t) => { balloon.position.y = 60 + Math.sin(t * 1.6 + x + y) * 5; });
      const shine = ball(x - 5, 64, y + 10, 5, '#fff1db', true);
      animations.push((t) => { shine.position.y = 64 + Math.sin(t * 1.6 + x + y) * 5; });
      ball(x, 48, y, 4, variant ? '#5ab4ff' : '#ff5a7a');
    }
  }

  function decorateWall(theme, x, y) {
    const cx = (x + 0.5) * CELL, cz = (y + 0.5) * CELL;
    const style = Math.floor(rand(x, y, 50) * 3);
    if (theme === 'disease') {
      if (rand(x, y, 1) < 0.6) box(cx, 36, cz, CELL + 1, 14, CELL + 1, '#7ec45f', false, 0.35);
      box(cx, 61, cz, 54, 2, 54, '#536d51');
      if (style === 0) {
        box(cx, 63, cz, 30, 2, 5, '#a4cf93');
        box(cx, 63, cz, 5, 2, 30, '#a4cf93');
      } else {
        for (let i = 0; i < 4; i += 1) box(cx, 63, cz - 16 + i * 10, 36, 2, 3, style === 1 ? '#a4cf93' : '#304e3d');
        for (const dx of [-22, 22]) for (const dz of [-22, 22]) cyl(cx + dx, 63, cz + dz, 3, 2, 3, '#c6d6b1');
      }
    } else if (theme === 'ai') {
      box(cx, 50, cz, CELL + 2, 3, CELL + 2, '#46e6ff', true);
      if (rand(x, y, 2) < 0.5) box(cx, 34, cz, CELL + 2, 5, CELL + 2, '#7dffb2', true, 0.8);
      box(cx, 62, cz, 48, 3, 32, '#18313d');
      for (let i = 0; i < 4; i += 1) {
        box(cx - 16 + i * 10, 64, cz, style === 1 ? 7 : 4, 2, style === 1 ? 7 : 22,
          i % 2 ? '#7dffb2' : '#46e6ff', true);
      }
    } else if (theme === 'darkness') {
      box(cx, 56, cz, CELL + 2, 14, CELL + 2, '#0a0a14');
      for (const [dx, dz] of [[-25, -16], [20, 13], [0, 30]]) {
        box(cx + dx + style * 6, 64, cz + dz - style * 5, 5, 2, 5, '#9d8bd2', true);
      }
    } else if (theme === 'chainsaws') {
      for (let i = 0; i < 4; i += 1) box(x * CELL + 14 + i * 28, 20, cz, 6, 44, CELL + 2, '#3b281f');
      for (const dz of [-31, 31]) {
        box(cx, 62, cz + dz, 84, 5, 8, '#795334');
        for (const dx of [-28, 28]) cyl(cx + dx, 65, cz + dz, 4, 2, 4, '#bd9a65');
      }
      if (style === 1) box(cx, 63, cz, 52, 4, 10, '#a0794c');
    } else if (theme === 'bogeymen') {
      if (rand(x, y, 3) < 0.5) box(cx, 36, cz, CELL + 2, 5, CELL + 2, '#8b5fa0', true, 0.5);
      box(cx, 61, cz, 54, 3, 42, style === 0 ? '#3d3044' : '#292132');
      if (style === 0) {
        for (const dz of [-12, 0, 12]) box(cx, 63, cz + dz, 40, 2, 2, '#776279');
      } else for (const dx of [-10, 10]) box(cx + dx, 64, cz, 7, 2, 5, '#d7b977', true);
    } else if (theme === 'claustrophobia') {
      box(cx, 36, cz, CELL + 6, 8, CELL + 6, '#e2b64a');
      box(cx, 52, cz, CELL + 6, 8, CELL + 6, '#232a27');
      if (style === 0) {
        box(cx, 74, cz, 70, 4, 58, '#708378');
        for (let i = 0; i < 5; i += 1) box(cx, 77, cz - 20 + i * 10, 56, 2, 4, '#283731');
      } else {
        for (const dx of [-24, 24]) {
          const pipe = cyl(cx + dx, 76, cz, 9, 86, 9, '#81958b');
          pipe.rotation.x = Math.PI / 2;
          for (const dz of [-25, 25]) box(cx + dx, 76, cz + dz, 13, 12, 5, '#b0bdb0');
        }
      }
    } else if (theme === 'clowns') {
      for (let i = 0; i < 5; i += 1) box(x * CELL + 11 + i * 22, 31, cz, 11, 62, CELL + 2, i % 2 ? '#fff0d8' : '#d9344f');
      for (let i = 0; i < 4; i += 1) {
        ball(cx - 36 + i * 24, 67, cz + (style - 1) * 16, 8, ['#ffce61', '#f082a1', '#86cfd1', '#ffce61'][i], true);
      }
    }
    if (style !== 2) return;
    if (theme === 'disease') {
      for (const dx of [-13, 13]) {
        cyl(cx + dx, 70, cz, 12, 14, 12, '#a2c78e');
        cyl(cx + dx, 78, cz, 7, 3, 7, '#cdd9b7');
        box(cx + dx, 70, cz + 6, 8, 4, 2, '#e0ead0');
      }
    } else if (theme === 'ai') {
      box(cx, 72, cz, 38, 18, 12, '#263e47');
      box(cx, 72, cz + 7, 30, 12, 2, '#3da7b4', true);
      for (const dx of [-9, 0, 9]) box(cx + dx, 72, cz + 8, 4, 5, 1, '#a7f9e4', true);
    } else if (theme === 'darkness') {
      for (const dx of [-16, 16]) {
        cyl(cx + dx, 70, cz, 6, 13, 6, '#d4c7a8');
        ball(cx + dx, 79, cz, 7, '#f4c572', true);
      }
    } else if (theme === 'chainsaws') {
      for (const dz of [-9, 9]) {
        const log = cyl(cx, 70, cz + dz, 13, 48, 13, '#906641');
        log.rotation.z = Math.PI / 2;
        const end = cyl(cx + 25, 70, cz + dz, 9, 2, 9, '#c5a474');
        end.rotation.z = Math.PI / 2;
      }
    } else if (theme === 'bogeymen') {
      box(cx, 71, cz, 22, 18, 16, '#644c69');
      ball(cx, 82, cz, 13, '#aa8e9a');
      for (const dx of [-4, 4]) ball(cx + dx, 83, cz + 7, 3, '#33242f');
    } else if (theme === 'claustrophobia') {
      cyl(cx, 82, cz, 25, 4, 25, '#b8a35d');
      for (const angle of [0, Math.PI / 2]) {
        const spoke = box(cx, 85, cz, 22, 2, 3, '#4b5c53');
        spoke.rotation.y = angle;
      }
      cyl(cx, 85, cz, 5, 4, 5, '#d4c17e');
    } else if (theme === 'clowns') {
      for (const dx of [-15, 15]) {
        cyl(cx + dx, 72, cz, 11, 12, 11, dx < 0 ? '#e5c27b' : '#dc8191');
        ball(cx + dx, 79, cz, 7, '#f0d7b4');
      }
    }
  }

  function decorateSlimWall(theme, x, y, segment) {
    const cx = (x + 0.5) * CELL, cz = (y + 0.5) * CELL;
    const first = scene.children.length;
    decorateWall(theme, x, y);
    const details = scene.children.slice(first);
    const group = new THREE.Group();
    group.position.set(cx + segment.x, 0, cz + segment.z);
    group.scale.set(segment.width / CELL, 1, segment.depth / CELL);
    for (const detail of details) {
      detail.position.x -= cx;
      detail.position.z -= cz;
      group.add(detail);
    }
    scene.add(group);
  }

  function dial(x, height, z, size, face = '#d6c6a0') {
    const rim = cyl(x, height, z, size, 4, size, '#8e8d7b');
    rim.rotation.x = Math.PI / 2;
    const glass = cyl(x, height, z + 3, size * 0.75, 2, size * 0.75, face);
    glass.rotation.x = Math.PI / 2;
    box(x + size * 0.1, height + size * 0.1, z + 5, size * 0.35, 2, 1, '#4e4b40').rotation.z = 0.7;
    ball(x, height, z + 5, 3, '#4e4b40');
  }

  function floatingMarker(object, height) {
    const marker = createFrightMarker(object, colors[object.theme], markerGeometries, material);
    marker.position.set(object.x, height, object.y);
    scene.add(marker);
    markers.set(object.id, marker);
    animations.push((t) => {
      marker.position.y = height + Math.sin(t * 2 + object.x) * 3;
      marker.rotation.y = Math.sin(t * 0.9 + object.y) * 0.2;
    });
  }

  function buildSetPiece(object) {
    const theme = object.theme, color = colors[theme], { x, y } = object;
    if (object.kind === 'clue') {
      box(x, 3, y, 70, 4, 70, '#3c3830');
      for (const dx of [-31, 31]) box(x + dx, 5, y, 3, 2, 64, color);
      for (const dz of [-31, 31]) box(x, 5, y + dz, 64, 2, 3, color);
      if (object.id.endsWith('-1')) {
        box(x, 19, y, 7, 38, 7, '#4a4030');
        box(x, 42, y, 66, 42, 6, '#69513b');
        const note = box(x, 42, y + 4, 56, 34, 2, '#e8d8a8');
        note.material = documents.get(`${theme}:0`);
        for (const dx of [-24, 24]) for (const h of [28, 56]) ball(x + dx, h, y + 6, 3, '#c5a36d');
        for (const dx of [-35, 35]) box(x + dx, 42, y, 4, 43, 7, '#3f3026');
      } else if (object.id.endsWith('-2')) {
        box(x, 24, y, 58, 8, 48, '#70503b');
        for (const dx of [-24, 24]) for (const dz of [-18, 18]) box(x + dx, 12, y + dz, 5, 24, 5, '#493328');
        box(x, 17, y + 21, 36, 12, 3, '#795842');
        ball(x, 17, y + 23, 4, '#c5a36d');
        box(x - 3, 29, y, 42, 2, 32, '#d3c5a1');
        const note = box(x - 3, 31, y, 36, 2, 26, '#eee0b9');
        note.material = documents.get(`${theme}:1`);
        box(x + 23, 32, y - 12, 3, 4, 17, '#483427').rotation.y = -0.3;
      } else {
        cyl(x, 14, y, 30, 28, 30, '#78674e');
        for (const h of [5, 24]) cyl(x, h, y, 33, 3, 33, '#4d4036');
        box(x, 42, y, 48, 34, 5, '#66513e');
        const note = box(x, 42, y + 3, 40, 28, 2, '#ebd8a5');
        note.material = documents.get(`${theme}:2`);
        for (const dx of [-17, 17]) ball(x + dx, 52, y + 5, 3, color);
      }
      for (const dx of [-27, 27]) for (const dz of [-27, 27]) cyl(x + dx, 6, y + dz, 3, 2, 3, '#c5a36d');
      floatingMarker(object, 83);
      return;
    }
    if (object.kind === 'tool') {
      box(x, 3, y, 56, 4, 56, '#3c3830');
      for (const dx of [-24, 24]) box(x + dx, 5, y, 3, 2, 50, color);
      box(x, 10, y, 28, 14, 28, '#4a4335');
      box(x, 18, y, 32, 3, 32, '#80745b');
      for (const dx of [-12, 12]) for (const dz of [-12, 12]) cyl(x + dx, 20, y + dz, 3, 2, 3, '#d0b882');
      if (theme === 'disease') {
        for (const dx of [-5, 5]) {
          box(x + dx, 24, y, 8, 12, 5, '#e8f4e8');
          for (const fx of [-3, -1, 1, 3]) box(x + dx + fx, 33, y, 1.5, 7, 4, '#e8f4e8');
          box(x + dx + (dx < 0 ? -5 : 5), 25, y, 3, 7, 4, '#e8f4e8').rotation.z = dx < 0 ? -0.5 : 0.5;
          box(x + dx, 19, y + 3, 8, 3, 2, '#91bd9a');
        }
      } else if (theme === 'ai') {
        box(x, 25, y, 24, 14, 3, '#527d88');
        box(x, 25, y + 2, 20, 10, 1, '#46e6ff', true);
        box(x - 4, 25, y + 3, 8, 6, 1, '#1b5261');
        for (const dx of [3, 7]) for (const h of [23, 27]) box(x + dx, h, y + 3, 2, 2, 1, '#d4c184');
        box(x, 19, y + 2, 13, 2, 1, '#c2b47a');
      } else if (theme === 'darkness') {
        box(x, 22, y, 18, 9, 12, '#c9a15a');
        box(x, 22, y + 7, 16, 7, 2, '#a8503e');
        box(x, 22, y + 8, 10, 2, 1, '#f3d9a0');
        for (const dx of [2, 5, 8]) {
          box(x + dx, 29, y, 1.5, 9, 1.5, '#e7d5a5').rotation.z = -0.3;
          ball(x + dx + 1, 34, y, 2, '#a34735');
        }
      } else if (theme === 'chainsaws') {
        box(x, 24, y, 30, 4, 5, '#b8b1a0');
        const end = ring(x + 17, 24, y, 12, '#c9c4b8');
        end.rotation.x = Math.PI / 2;
        for (const dz of [-4, 4]) box(x - 16, 24, y + dz, 9, 4, 3, '#c9c4b8');
        box(x - 3, 26, y, 12, 1, 2, '#e1d8c6');
      } else if (theme === 'bogeymen') {
        cyl(x, 24, y, 12, 16, 12, '#f0eadb', true);
        for (const h of [17, 33]) cyl(x, h, y, 15, 3, 15, '#766f60');
        for (const dx of [-6, 6]) box(x + dx, 25, y + 6, 2, 15, 2, '#766f60');
        box(x, 35, y, 14, 3, 14, '#6a6a6a');
        const handle = ring(x, 39, y, 8, '#958a73');
        handle.rotation.y = Math.PI / 2;
        ball(x, 27, y + 1, 5, '#ffd49a', true);
      } else if (theme === 'claustrophobia') {
        box(x, 24, y, 30, 4, 4, '#9aa39e');
        box(x + 14, 28, y, 4, 12, 4, '#9aa39e');
        box(x + 10, 34, y, 10, 3, 4, '#c1c8b9');
        box(x - 10, 24, y, 7, 5, 5, '#b5c2b9');
        box(x - 6, 27, y, 12, 1, 2, '#d3ddd2');
      } else {
        cyl(x, 25, y, 3, 20, 3, '#d8d8d8');
        ball(x, 36, y, 9, '#ff5a7a', true);
        ball(x - 2, 38, y + 3, 3, '#ffe2d6');
        shape(coneGeometry, x, 14, y, 4, 6, 4, '#ebe7da').rotation.z = Math.PI;
      }
      floatingMarker(object, 57);
      return;
    }
    box(x, 3, y, 100, 4, 100, '#38342f');
    for (const dx of [-45, 45]) box(x + dx, 5, y, 4, 2, 90, color);
    for (const dz of [-45, 45]) box(x, 5, y + dz, 90, 2, 4, color);
    for (const dx of [-39, 39]) for (const dz of [-39, 39]) cyl(x + dx, 6, y + dz, 6, 3, 6, '#c6a86a');
    box(x, 16, y, 42, 32, 42, '#494335');
    box(x, 5, y, 56, 5, 56, '#6d6654');
    const controls = box(x, 25, y + 22, 32, 18, 2, '#4a534f');
    controls.material = consoles.get(theme);
    floatingMarker(object, 120);
    label(FRIGHT_THEMES.find((entry) => entry.id === theme).zone, x, 225, y, true);
    box(x - 16, 29, y, 5, 28, 5, color); box(x + 16, 29, y, 5, 28, 5, color);
    addLight(color, x, 70, y, 3.2, theme === 'darkness' || theme === 'bogeymen' ? 0.6 : 0.2);
    if (theme === 'disease') {
      box(x, 58, y + 12, 4, 17, 3, '#eaf2d8'); box(x, 58, y + 13, 17, 4, 3, '#eaf2d8');
      for (const dx of [-38, 38]) {
        cyl(dx + x, 22, y + 30, 18, 44, 18, '#a3c08e', false, 0.55);
        cyl(dx + x, 16, y + 30, 12, 28, 12, '#7fbd64', true, 0.7);
        for (const h of [6, 37]) cyl(dx + x, h, y + 30, 20, 3, 20, '#879972');
        box(dx + x, 24, y + 40, 10, 12, 2, '#c5d6a5');
        box(dx + x, 24, y + 42, 3, 8, 1, '#4f7a3c');
        box(dx + x, 24, y + 42, 7, 3, 1, '#4f7a3c');
        box(dx + x, 46, y + 30, 14, 4, 14, '#d8ec7e', true);
      }
      dial(x, 17, y + 25, 13);
    } else if (theme === 'ai') {
      for (const dx of [-7, 7]) box(x + dx, 58, y + 12, 5, 5, 3, '#e8ffff', true);
      for (const dx of [-40, 40]) {
        box(x + dx, 30, y, 22, 60, 30, '#162733');
        box(x + dx, 40, y + 16, 14, 8, 2, '#46e6ff', true);
        for (const h of [14, 21, 28]) {
          box(x + dx, h, y + 16, 15, 3, 2, '#54717a');
          ball(x + dx - 7, h, y + 17, 3, '#7dffb2', true);
        }
        for (const h of [8, 52]) box(x + dx, h, y + 16, 19, 3, 2, '#738a8d');
      }
      box(x, 36, y + 19, 29, 15, 3, '#426979');
      box(x, 36, y + 21, 24, 11, 1, '#46e6ff', true);
      for (let i = 0; i < 4; i += 1) box(x - 9 + i * 6, 33 + i * 2, y + 22, 3, 3, 1, '#d8ffff', true);
      const drone = box(x, 100, y + 30, 20, 6, 20, '#8fe6f5', true);
      drone.userData.floatingScenery = true;
      animations.push((t) => { drone.position.set(x + Math.cos(t) * 40, 100 + Math.sin(t * 2) * 4, y + Math.sin(t) * 40); });
    } else if (theme === 'darkness') {
      box(x, 56, y + 12, 4, 18, 3, '#fff3ba', true); box(x, 56, y + 12, 18, 4, 3, '#fff3ba', true);
      for (const dx of [-35, 35]) {
        cyl(x + dx, 3, y + 30, 15, 4, 15, '#8e7754');
        cyl(x + dx, 12, y + 30, 7, 24, 7, '#e8dcc0');
        box(x + dx + 2, 18, y + 33, 2, 8, 2, '#f4e7cd');
        const flame = ball(x + dx, 28, y + 30, 8, '#ffc65a', true);
        animations.push((t) => { flame.scale.y = 8 + Math.sin(t * 9 + dx) * 3; });
      }
      const lens = ring(x, 24, y + 24, 17, '#c8b783');
      lens.rotation.x = Math.PI / 2;
      cyl(x, 25, y + 24, 11, 2, 11, '#b8b2df', true, 0.7);
    } else if (theme === 'chainsaws') {
      box(x + 20, 42, y, 24, 5, 5, '#b8b1a0');
      for (const dx of [-44, 44]) {
        const blade = cyl(x + dx, 40, y + 20, 44, 4, 44, '#c5c9ce'); blade.rotation.x = Math.PI / 2;
        animations.push((t) => { blade.rotation.y = t * 10 * Math.sign(dx); });
        box(x + dx, 18, y + 20, 8, 36, 8, '#6a4a39');
        box(x + dx, 40, y + 23, 10, 10, 3, '#675544');
        const hub = ring(x + dx, 40, y + 24, 13, '#8e775c');
        animations.push((t) => { hub.rotation.z = t * 10 * Math.sign(dx); });
      }
      for (const dz of [-27, -17, -7]) box(x, 7, y + dz, 30, 2, 3, '#bd9a65');
      dial(x, 24, y + 24, 14, '#ded5bd');
    } else if (theme === 'bogeymen') {
      for (const dx of [-6, 6]) box(x + dx, 59, y + 12, 4, 4, 3, '#f5e9cc', true);
      box(x - 48, 40, y, 6, 80, 40, '#2b1f33'); box(x + 48, 40, y, 6, 80, 40, '#2b1f33');
      for (const dx of [-48, 48]) {
        for (const h of [16, 64]) box(x + dx, h, y + 21, 6, 4, 3, '#aa8c70');
        ball(x + dx, 40, y + 22, 4, '#d3b480');
        box(x + dx, 42, y + 21, 4, 62, 3, '#6d5160');
      }
      box(x, 27, y + 27, 38, 42, 3, '#211924');
      for (const dx of [-14, 14]) {
        box(x + dx, 27, y + 29, 3, 38, 2, '#725b6b');
        ball(x + dx / 2, 25, y + 30, 3, '#d4bb87');
      }
      const eyes = [box(x - 6, 50, y + 38, 6, 5, 3, '#ff6a3a', true), box(x + 6, 50, y + 38, 6, 5, 3, '#ff6a3a', true)];
      animations.push((t) => eyes.forEach((e) => { e.visible = Math.sin(t * 2) > -0.5; }));
    } else if (theme === 'claustrophobia') {
      box(x - 30, 45, y, 5, 85, 65, '#738c7c'); box(x + 30, 45, y, 5, 85, 65, '#738c7c');
      for (const dx of [-30, 30]) for (const h of [19, 45, 70]) {
        box(x + dx, h, y + 33, 7, 3, 3, '#b0bdb0');
      }
      dial(x, 24, y + 24, 17, '#d8dbc5');
      for (const dx of [-22, 22]) for (const h of [14, 35]) ball(x + dx, h, y + 34, 3, '#d0ccad');
      const left = box(x - 52, 28, y + 20, 6, 56, 50, '#5a6e63'), right = box(x + 52, 28, y + 20, 6, 56, 50, '#5a6e63');
      animations.push((t) => { const d = Math.sin(t * 0.9) * 6; left.position.x = -52 + d; right.position.x = 52 - d; });
    } else {
      box(x, 62, y + 12, 6, 6, 3, '#f0d7b4'); box(x, 49, y + 12, 12, 3, 3, '#5d3540');
      cyl(x - 40, 32, y + 28, 7, 64, 7, '#f4ecd8'); cyl(x + 40, 32, y + 28, 7, 64, 7, '#d9344f');
      const tent = shape(coneGeometry, x, 84, y - 16, 70, 30, 70, '#d9344f'); tent.rotation.y = Math.PI / 4;
      for (const dx of [-20, 0, 20]) {
        ball(x + dx, 67, y + 25, 6, dx ? '#ffca6c' : '#f38aaa', true);
        box(x + dx, 62, y + 25, 3, 6, 3, '#8d693f');
      }
      box(x, 30, y + 25, 30, 12, 3, '#f0d7b4');
      for (const dx of [-9, 0, 9]) ball(x + dx, 30, y + 27, 4, dx ? '#d9344f' : '#ffe05a', true);
      for (const dx of [-28, 28]) {
        ball(x + dx, 65, y + 28, 7, '#ffe05a', true);
        cyl(x + dx, 8, y + 28, 12, 4, 12, '#a67c4e');
      }
      const hat = ball(x, 98, y - 16, 12, '#ffe05a', true);
      animations.push((t) => { hat.position.y = 98 + Math.abs(Math.sin(t * 3)) * 8; });
    }
  }

  function buildSideSetPiece(object) {
    const first = scene.children.length;
    buildSetPiece(object);
    const group = new THREE.Group();
    group.position.set(object.x, 0, object.y);
    group.scale.set(FRIGHT_OBJECT_SCALE, 1, FRIGHT_OBJECT_SCALE);
    for (const part of scene.children.slice(first)) {
      if (part.isSprite || part.isLight || part.userData.objectId || part.userData.floatingScenery) continue;
      part.position.x -= object.x;
      part.position.z -= object.y;
      group.add(part);
    }
    scene.add(group);
  }

  if (renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.background = new THREE.Color('#0b0d14');
    scene.fog = new THREE.FogExp2('#0b0d14', 0.00045);
    scene.add(new THREE.HemisphereLight('#adb5cc', '#302621', 1.4));
    const light = new THREE.DirectionalLight('#c3c4d2', 1.5);
    light.position.set(-500, 1000, 500); scene.add(light);
    box(SIZE * CELL / 2, -8, SIZE * CELL / 2, SIZE * CELL, 16, SIZE * CELL, '#2b2a24');
    const floors = new Map([null, ...FRIGHT_THEMES.map(({ id }) => id)].map((theme) =>
      [theme, paintedMaterial(`floor:${theme || 'path'}`, (ctx) => paintFrightFloor(ctx, theme))]));
    for (const { id } of FRIGHT_THEMES) {
      for (let i = 0; i < 3; i += 1) documents.set(`${id}:${i}`,
        paintedMaterial(`document:${id}:${i}`, (ctx) => paintFrightDocument(ctx, id, i)));
      consoles.set(id, paintedMaterial(`console:${id}`, (ctx) => paintFrightConsole(ctx, id)));
    }
    const walls = new Map(FRIGHT_THEMES.map(({ id }) =>
      [id, paintedMaterial(`wall:${id}`, (ctx) => paintFrightWall(ctx, id))]));
    const neutralWalls = Array.from({ length: 3 }, (_, variant) => ({
      side: paintedMaterial(`wall:side:${variant}`, (ctx) => paintFrightWall(ctx, null, variant)),
      top: paintedMaterial(`wall:top:${variant}`, (ctx) => paintFrightWall(ctx, null, variant, true))
    }));
    FRIGHT_MAZE.forEach((row, y) => [...row].forEach((tile, x) => {
      const area = areas[y][x];
      if (tile !== '#') {
        const floor = box((x + 0.5) * CELL, 1, (y + 0.5) * CELL, CELL - 2, 2, CELL - 2, '#ffffff');
        floor.material = floors.get(area);
        if (area) decorateFloor(area, x, y);
        return;
      }
      const wallHeight = area === 'claustrophobia' ? 72 : 60;
      const cx = (x + 0.5) * CELL, cz = (y + 0.5) * CELL;
      box(cx, 0.5, cz, CELL - 1, 1, CELL - 1, area ? palettes[area][1] : '#30352c');
      const neutral = neutralWalls[Math.floor(rand(x, y, 42) * neutralWalls.length)];
      const side = area ? walls.get(area) : neutral.side;
      const top = area ? material(palettes[area][1]) : neutral.top;
      for (const segment of wallSegments[y][x]) {
        const wall = box(cx + segment.x, wallHeight / 2, cz + segment.z, segment.width, wallHeight, segment.depth,
          area ? palettes[area][1] : '#454b34');
        wall.material = [side, side, top, side, side, side];
        wall.userData.wall = true;
      }
      if (area) decorateSlimWall(area, x, y, wallSegments[y][x][0]);
    }));
    FRIGHT_SCENERY.forEach(buildSideScenery);
    for (const object of FRIGHT_OBJECTS) {
      if (object.kind === 'exit') {
        box(object.x - 35, 40, object.y, 12, 80, 14, '#5e4630');
        box(object.x + 35, 40, object.y, 12, 80, 14, '#5e4630');
        box(object.x, 78, object.y, 82, 12, 14, '#987344');
        box(object.x, 85, object.y, 88, 3, 18, '#c19c60');
        box(object.x, 72, object.y, 78, 3, 16, '#493929');
        for (const dx of [-35, 35]) for (const h of [15, 55]) {
          box(object.x + dx, h, object.y + 8, 14, 5, 2, '#92784f');
          ball(object.x + dx, h, object.y + 10, 3, '#d4bd85');
        }
        for (const dx of [-35, 35]) {
          box(object.x + dx, 82, object.y, 18, 5, 20, '#b28e59');
          box(object.x + dx, 92, object.y, 13, 16, 13, '#523b28');
          box(object.x + dx, 92, object.y + 7, 8, 11, 3, '#ec9b48', true);
          for (const side of [-5, 5]) box(object.x + dx + side, 92, object.y + 9, 2, 14, 2, '#30251e');
          box(object.x + dx, 102, object.y, 17, 4, 17, '#493528');
        }
        for (let i = 0; i < 7; i += 1) box(object.x - 30 + i * 10, 62, object.y, 5, 5, 4, colors[FRIGHT_THEMES[i].id], true);
        label('Fright Nights', object.x, 170, object.y, true);
        addLight('#ffd89a', object.x, 80, object.y, 3, 0.3);
      } else buildSideSetPiece(object);
    }
    player = new THREE.Group();
    const person = (w, h, d, color, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material(color));
      mesh.scale.set(w, h, d); mesh.position.set(x, y, z); player.add(mesh);
      return mesh;
    };
    const torso = new THREE.Mesh(torsoGeometry, material(PLAYER_OUTFIT));
    torso.position.set(0, 42 + CHARACTER_RISE, 0); torso.scale.set(25, 36, 17); player.add(torso);
    addCharacterClothingDetails((x, y, z, w, h, d, color) => person(w, h, d, color, x, y, z),
      { width: 25, height: 36, depth: 17, centerY: 42 + CHARACTER_RISE, color: PLAYER_OUTFIT, kind: 'player', limbGeometry: characterLimbGeometry, torsoGeometry });
    addCharacterBelt((x, y, z, w, h, d, color) => person(w, h, d, color, x, y, z),
      { width: 25, depth: 17, y: 26 + CHARACTER_RISE, color: PLAYER_STYLE.belt, limbGeometry: characterLimbGeometry });
    addCharacterHeadDetails((x, y, z, w, h, d, color) => person(w, h, d, color, x, y, z),
      (x, y, z, w, h, d, color) => {
        const part = new THREE.Mesh(characterHeadGeometry, material(color));
        part.position.set(x, y, z); part.scale.set(w, h, d); player.add(part);
      }, { headY: 70 + CHARACTER_RISE, width: 18, height: 19, depth: 18, skin: '#dfb38c', longHair: true,
        face: (x, y, z, w, h, d, color) => {
          const part = new THREE.Mesh(characterFaceGeometry, material(color));
          part.position.set(x, y, z); part.scale.set(w, h, d); player.add(part);
        } });
    const bodyBox = (x, y, z, w, h, d, color, parent) => {
      const mesh = new THREE.Mesh(geometry, material(color));
      mesh.scale.set(w, h, d); mesh.position.set(x, y, z); parent.add(mesh);
      return mesh;
    };
    player.userData.legs = createPlayerLegs(player, bodyBox, { offset: 7, height: 24 + CHARACTER_RISE,
      shoeColor: '#5a4434', shortsColor: PLAYER_STYLE.shorts, skin: '#dfb38c', limbGeometry: characterLimbGeometry, skinGeometry: characterSkinGeometry });
    player.userData.arms = createCharacterArms(player, bodyBox, {
      offset: 15, shoulderY: 57 + CHARACTER_RISE, length: 28, width: 7, depth: 8, color: PLAYER_OUTFIT, skin: '#dfb38c',
      limbGeometry: characterLimbGeometry, skinGeometry: characterSkinGeometry
    });
    scene.add(player);
    const torch = new THREE.PointLight('#ffd9a0', 4.5, 330, 1.3);
    torch.position.set(0, 60, 25); player.add(torch);
    playerLabel = label(characterName, 0, 105, 0);
    teleportCircle = new THREE.Group();
    const outer = ring(0, 4, 0, 35, '#70edff');
    outer.material = material('#70edff', true);
    outer.rotation.x = -Math.PI / 2; teleportCircle.add(outer);
    const inner = ring(0, 5, 0, 25, '#e3ffff');
    inner.material = material('#e3ffff', true);
    inner.rotation.x = -Math.PI / 2; teleportCircle.add(inner);
    teleportCircle.add(cyl(0, 3, 0, 30, 1, 30, '#62d8ef', true, 0.3));
    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      const rune = box(Math.sin(angle) * 15, 6, Math.cos(angle) * 15, 3, 2, 5, '#d6ffff', true);
      rune.rotation.y = angle; teleportCircle.add(rune);
    }
    const teleportLabel = label('Teleport out', 0, 60, 0);
    teleportLabel.position.set(24, 55, -24);
    teleportLabel.scale.set(100, 25, 1);
    teleportCircle.add(teleportLabel);
    teleportCircle.visible = false;
    scene.add(teleportCircle);
    animations.push((t) => {
      inner.rotation.z = t * 0.7;
      outer.scale.setScalar(35 + Math.sin(t * 3) * 1.5);
    });
    const start = performance.now();
    const animate = (now) => {
      const t = (now - start) / 1000;
      animations.forEach((fn) => fn(t));
      lights.forEach(({ light, base, flicker, phase }) => { light.intensity = base * (1 + Math.sin(t * 7 + phase) * flicker * Math.sin(t * 2.3 + phase)); });
      if (state) renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
  }

  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    scale = Math.min(width / 650, height / 650);
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      const viewHeight = width < 520 ? 620 : 750;
      camera.left = -viewHeight * width / height / 2; camera.right = -camera.left;
      camera.top = viewHeight / 2; camera.bottom = -camera.top;
      camera.updateProjectionMatrix();
    } else {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (state) draw(state);
  }
  function draw(next) {
    state = next;
    const teleportReady = frightExitReady(state);
    if (teleportReady && !teleportPosition) teleportPosition = frightTeleportPosition(state.player);
    else if (!teleportReady) teleportPosition = null;
    const showTeleport = teleportReady && !state.puzzle;
    facing = facingForMovement(previousPosition, state.player, facing);
    const distance = previousPosition ? Math.hypot(state.player.x - previousPosition.x, state.player.y - previousPosition.y) : 0;
    walkingPhase += distance * 0.04;
    const stride = distance > 0.01 ? Math.sin(walkingPhase) * 0.4 : 0;
    if (renderer) {
      player.position.set(state.player.x, 0, state.player.y);
      player.rotation.y = facing;
      swingCharacterLegs(player.userData.legs, walkingPhase, distance > 0.01);
      swingCharacterArms(player.userData.arms, walkingPhase, distance > 0.01);
      previousPosition = { ...state.player };
      playerLabel.position.set(state.player.x, 108 + CHARACTER_RISE, state.player.y);
      teleportCircle.visible = showTeleport;
      if (teleportPosition) teleportCircle.position.set(teleportPosition.x, 0, teleportPosition.y);
      camera.position.set(state.player.x + 400, 900, state.player.y + 600);
      camera.lookAt(state.player.x, 0, state.player.y);
      camera.updateMatrixWorld();
      markers.forEach((marker, id) => {
        const object = FRIGHT_OBJECTS.find((entry) => entry.id === id);
        marker.visible = frightMarkerVisible(object, state);
      });
      renderer.render(scene, camera);
      return;
    }
    context.fillStyle = '#171d22'; context.fillRect(0, 0, width, height);
    const screen = (x, y) => ({ x: width / 2 + (x - state.player.x) * scale, y: height / 2 + (y - state.player.y) * scale });
    FRIGHT_MAZE.forEach((row, y) => [...row].forEach((tile, x) => {
      const p = screen(x * CELL, y * CELL);
      const area = areas[y][x];
      context.fillStyle = tile === '#' ? (area ? palettes[area][1] : '#30352c') : area ? palettes[area][0] : '#736a52';
      context.fillRect(p.x, p.y, CELL * scale + 1, CELL * scale + 1);
      if (tile === '#') {
        for (const segment of wallSegments[y][x]) {
          const sx = p.x + (CELL / 2 + segment.x - segment.width / 2) * scale;
          const sy = p.y + (CELL / 2 + segment.z - segment.depth / 2) * scale;
          context.fillStyle = area ? palettes[area][0] : '#59603d';
          context.fillRect(sx, sy, segment.width * scale, segment.depth * scale);
          drawFrightTileDetail(context, sx, sy, segment.width * scale, tile, area, x, y, segment.depth * scale);
        }
      } else {
        drawFrightTileDetail(context, p.x, p.y, CELL * scale, tile, area, x, y);
      }
    }));
    FRIGHT_SCENERY.forEach((object) => {
      const p = screen(object.x, object.y);
      context.fillStyle = colors[object.theme];
      context.fillRect(p.x - object.halfSize * scale, p.y - object.halfSize * scale, object.halfSize * 2 * scale, object.halfSize * 2 * scale);
      context.fillStyle = '#30302b';
      context.fillRect(p.x - 8 * scale, p.y - 8 * scale, 16 * scale, 16 * scale);
    });
    FRIGHT_OBJECTS.forEach((object) => {
      const completed = !frightMarkerVisible(object, state);
      const p = screen(object.x, object.y);
      const halfSize = object.kind === 'cache' ? 27 : object.kind === 'clue' ? 17 : 12;
      context.fillStyle = completed ? '#4a4335' : colors[object.theme] || '#e6bf78';
      context.fillRect(p.x - halfSize * scale, p.y - halfSize * scale, halfSize * 2 * scale, halfSize * 2 * scale);
      context.strokeStyle = '#222'; context.lineWidth = 2;
      context.strokeRect(p.x - halfSize * scale, p.y - halfSize * scale, halfSize * 2 * scale, halfSize * 2 * scale);
    });
    if (showTeleport) {
      const p = screen(teleportPosition.x, teleportPosition.y);
      context.fillStyle = 'rgba(98,216,239,0.3)';
      context.beginPath(); context.arc(p.x, p.y, teleportRadius * scale, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#70edff'; context.lineWidth = Math.max(2, 3 * scale); context.stroke();
      context.fillStyle = '#e3ffff'; context.font = `bold ${Math.max(10, 12 * scale)}px sans-serif`;
      context.textAlign = 'center'; context.fillText('Teleport out', p.x, p.y - (teleportRadius + 8) * scale);
    }
    drawCharacterMarker(context, width / 2, height / 2, PLAYER_OUTFIT, { ...PLAYER_STYLE, scale, stride, facing });
    previousPosition = { ...state.player };
  }
  function handleClick(event) {
    if (!state) return;
    const rect = canvas.getBoundingClientRect();
    let target;
    if (renderer) {
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!hit) return;
      target = { x: hit.x, y: hit.z };
      if (frightExitReady(state) && !state.puzzle && teleportPosition
        && Math.hypot(target.x - teleportPosition.x, target.y - teleportPosition.y) <= teleportRadius + 4) {
        onSelect({ teleport: true }); return;
      }
      const hitboxes = [...markers.values()].filter((marker) => marker.visible).map((marker) => marker.userData.hitbox);
      const marker = raycaster.intersectObjects(hitboxes)[0];
      if (marker) { onSelect({ objectId: marker.object.userData.objectId }); return; }
    } else target = { x: state.player.x + (event.clientX - rect.left - width / 2) / scale,
      y: state.player.y + (event.clientY - rect.top - height / 2) / scale };
    if (frightExitReady(state) && !state.puzzle && teleportPosition
      && Math.hypot(target.x - teleportPosition.x, target.y - teleportPosition.y) <= teleportRadius + 4) {
      onSelect({ teleport: true }); return;
    }
    const nearby = FRIGHT_OBJECTS.find((object) => Math.hypot(object.x - target.x, object.y - target.y) < 40);
    onSelect(nearby ? { objectId: nearby.id } : target);
  }
  canvas.addEventListener('click', handleClick);
  return {
    draw, resize,
    dispose() {
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrame);
      [geometry, torsoGeometry, characterHeadGeometry, characterFaceGeometry, characterLimbGeometry, characterSkinGeometry, cylinderGeometry, coneGeometry, sphereGeometry, ringGeometry].forEach((entry) => entry.dispose()); materials.forEach((entry) => entry.dispose()); textures.forEach((entry) => entry.dispose()); renderer?.dispose();
    }
  };
}
