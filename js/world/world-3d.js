import * as THREE from 'three';
import { QUEST_LOCATIONS, WORLD_SIZE, WORLD_SPAWN } from './world-data.js';
import { regionBlendAt } from './world-regions.js';
import { PARK_RIDES } from './park-scenery.js';
import { roadDistance } from './world-art.js';
import { WORLD_NPCS } from './world-npcs.js';
import { CANOPY_LINKS, CANOPY_OFFSET, CANOPY_PLATFORMS, COASTER_TRACKS, placeQuestDecorations } from './world-scenery-data.js';
import { worldCornWalls, worldTrees } from './world-collision.js';
import { GUIDE_HAIRSTYLES, PLAYER_OUTFIT, PLAYER_STYLE, TOWNSFOLK_HAIRSTYLES, addCharacterHeadDetails } from '../character-appearance.js';
import { createCharacterArms, createCharacterTorsoGeometry, swingCharacterArms } from '../character-body.js';
import { createPlayerLegs } from '../games/character-legs.js';

function random(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function configureWorldCamera(camera, width, height, zoom, position) {
  camera.left = -width / (2 * zoom); camera.right = width / (2 * zoom);
  camera.top = height / (2 * zoom); camera.bottom = -height / (2 * zoom);
  camera.position.set(position.x, 650, position.y + 900);
  camera.lookAt(position.x, 0, position.y - 70);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

export function groundPointAt(camera, width, height, point) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(point.x / width * 2 - 1, 1 - point.y / height * 2), camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
  return { x: hit.x, y: hit.z };
}

export function createWorld3D(canvas, ground, characterName) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a9bec0');
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 6000);
  const ambient = new THREE.HemisphereLight('#e5e9d3', '#3d4937', 1.65);
  scene.add(ambient);
  const sunlight = new THREE.DirectionalLight('#fff0d4', 2.2);
  sunlight.position.set(-500, 900, 400);
  scene.add(sunlight);

  const materials = new Map();
  const geometries = new Set();
  const textures = new Set();
  const boxGeometries = new Map();
  const headGeometry = new THREE.SphereGeometry(0.5, 16, 12);
  const torsoGeometry = createCharacterTorsoGeometry();
  function material(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    return materials.get(color);
  }
  function mesh(geometry, color, parent, x = 0, y = 0, z = 0) {
    geometries.add(geometry);
    const item = new THREE.Mesh(geometry, material(color));
    item.position.set(x, y, z);
    parent.add(item);
    return item;
  }
  function box(parent, width, height, depth, color, x, y, z) {
    const key = `${width},${height},${depth}`;
    if (!boxGeometries.has(key)) boxGeometries.set(key, new THREE.BoxGeometry(width, height, depth));
    return mesh(boxGeometries.get(key), color, parent, x, y, z);
  }
  function groupAt(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    scene.add(group);
    return group;
  }
  function masonryTexture() {
    const image = document.createElement('canvas');
    image.width = 512; image.height = 512;
    const ctx = image.getContext('2d');
    if (!ctx) throw new Error('Could not create the stone texture.');
    ctx.fillStyle = '#aaa99d'; ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 12; row += 1) {
      for (let col = -1; col < 6; col += 1) {
        const x = col * 103 + (row % 2) * 51;
        const y = row * 43;
        const tone = 188 + Math.floor(random(row * 20 + col, 39) * 34);
        ctx.fillStyle = `rgb(${tone}, ${tone}, ${tone - 6})`;
        ctx.fillRect(x + 2, y + 2, 99, 39);
        ctx.fillStyle = 'rgba(255,255,255,.13)';
        ctx.fillRect(x + 4, y + 4, 95, 2);
        ctx.fillStyle = 'rgba(48,48,38,.09)';
        ctx.fillRect(x + 5, y + 34, 90, 4);
      }
    }
    const texture = new THREE.CanvasTexture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.add(texture);
    return texture;
  }
  const stoneTexture = masonryTexture();
  function stoneBox(parent, width, height, depth, color, x, y, z) {
    const item = box(parent, width, height, depth, color, x, y, z);
    const key = `stone:${color}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, map: stoneTexture, roughness: 1 }));
    item.material = materials.get(key);
    return item;
  }
  function paintLabel(image, text, background) {
    const ctx = image.getContext('2d');
    if (!ctx) throw new Error('Could not create a 3D label.');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, image.width, image.height);
    ctx.fillStyle = '#fff0bc'; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(text, image.width / 2, 41, image.width - 12);
  }
  function textSprite(text, background, width = 256) {
    const image = document.createElement('canvas');
    image.width = width; image.height = 64;
    paintLabel(image, text, background);
    const texture = new THREE.CanvasTexture(image);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(width / 3, 21, 1);
    return sprite;
  }

  let textureSource = ground;
  const maxTextureSize = renderer.capabilities.maxTextureSize;
  if (ground.width > maxTextureSize || ground.height > maxTextureSize) {
    const scale = Math.min(maxTextureSize / ground.width, maxTextureSize / ground.height);
    textureSource = document.createElement('canvas');
    textureSource.width = Math.floor(ground.width * scale);
    textureSource.height = Math.floor(ground.height * scale);
    const context = textureSource.getContext('2d');
    if (!context) throw new Error('Could not resize the world texture.');
    context.drawImage(ground, 0, 0, textureSource.width, textureSource.height);
  }
  const groundTexture = new THREE.CanvasTexture(textureSource);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  groundTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  textures.add(groundTexture);
  const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE.width, WORLD_SIZE.height);
  geometries.add(groundGeometry);
  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 });
  const floor = new THREE.Mesh(groundGeometry, groundMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(WORLD_SIZE.width / 2, 0, WORLD_SIZE.height / 2);
  scene.add(floor);

  function timber(parent, x, y, z, width, height) {
    box(parent, width, height, 5, '#5d4939', x, y, z);
  }
  function windowFrame(parent, x, y, z, dark = false) {
    box(parent, 25, 30, 4, '#58493a', x, y, z);
    box(parent, 19, 24, 5, dark ? '#c1b67c' : '#6a8b8b', x, y, z + 1);
    box(parent, 3, 25, 6, '#514438', x, y, z + 2);
    box(parent, 20, 3, 6, '#514438', x, y, z + 2);
    box(parent, 29, 4, 8, '#b2a488', x, y - 16, z + 1);
  }
  function roof(parent, width, depth, height, color, y) {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0); shape.lineTo(width / 2, 0);
    shape.lineTo(0, height); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    const item = mesh(geometry, color, parent, 0, y, -depth / 2);
    const slope = Math.atan2(height, width / 2);
    for (const side of [-1, 1]) {
      const eave = box(parent, Math.hypot(width / 2, height) + 4, 4, depth + 6, color,
        side * width / 4, y + height / 2, 0);
      eave.rotation.z = -side * slope;
      for (let row = 1; row <= 4; row += 1) {
        const fraction = row / 5;
        const trim = box(parent, 2, 2, depth + 8, '#8e6e5a',
          side * width / 2 * fraction, y + height * (1 - fraction) + 2, 0);
        trim.rotation.z = -side * slope;
      }
    }
    return item;
  }
  function house(x, z, dark = false, size = 1) {
    const g = groupAt(x, z); g.scale.setScalar(size);
    stoneBox(g, 128, 12, 105, dark ? '#727a70' : '#9a998b', 0, 6, 0);
    box(g, 118, 80, 95, dark ? '#66695b' : '#c1b498', 0, 52, 0);
    roof(g, 132, 108, 48, dark ? '#514744' : '#805c4b', 92);
    box(g, 16, 45, 18, '#817668', 36, 124, -22);
    box(g, 22, 6, 24, '#615b51', 36, 147, -22);
    for (const xPos of [-57, 57]) timber(g, xPos, 52, 49, 7, 80);
    timber(g, 0, 86, 49, 118, 6);
    timber(g, 0, 22, 49, 118, 6);
    box(g, 30, 53, 5, '#504236', 0, 39, 49);
    box(g, 21, 45, 6, dark ? '#3d3932' : '#74543c', 0, 37, 51);
    box(g, 3, 4, 3, '#d7b574', 7, 36, 55);
    box(g, 35, 5, 16, '#9d9583', 0, 4, 56);
    for (const side of [-37, 37]) {
      windowFrame(g, side, 57, 49, dark);
    }
    if (dark) {
      const board = box(g, 34, 4, 5, '#584c40', -37, 56, 55);
      board.rotation.z = 0.35;
      box(g, 8, 24, 8, '#554b3d', -54, 121, 55);
    }
    return g;
  }
  function castle(x, z) {
    const g = groupAt(x, z);
    stoneBox(g, 215, 15, 155, '#93968c', 0, 8, 0);
    stoneBox(g, 170, 135, 125, '#c6c3b4', 0, 75, 0);
    box(g, 174, 9, 130, '#777b72', 0, 137, 0);
    for (const side of [-88, 88]) {
      stoneBox(g, 55, 175, 150, '#b8bcad', side, 88, 0);
      box(g, 62, 10, 158, '#777d72', side, 172, 0);
      for (let dx = -24; dx <= 24; dx += 16) {
        box(g, 10, 20, 14, '#b8b8a7', side + dx, 187, 73);
        box(g, 10, 20, 14, '#b8b8a7', side + dx, 187, -73);
      }
      box(g, 13, 35, 4, '#45565b', side, 117, 77);
      box(g, 20, 4, 7, '#c2bcaa', side, 98, 78);
      box(g, 5, 45, 5, '#695a43', side, 215, 0);
      box(g, 30, 20, 3, side < 0 ? '#94644c' : '#53786a', side + 15, 225, 0);
    }
    box(g, 55, 78, 6, '#54554d', 0, 43, 65);
    box(g, 43, 70, 7, '#493d32', 0, 39, 69);
    for (const dx of [-16, -8, 0, 8, 16]) box(g, 2, 66, 2, '#766549', dx, 39, 73);
    for (const dy of [20, 53]) box(g, 42, 3, 3, '#746249', 0, dy, 74);
    for (const side of [-55, 55]) windowFrame(g, side, 96, 65);
    box(g, 70, 5, 35, '#a6a18f', 0, 3, 82);
    for (let row = 0; row < 5; row += 1) {
      for (let col = -2; col <= 2; col += 1) {
        if (row < 3 && col === 0) continue;
        box(g, 25, 2, 2, '#b9b5a4', col * 30 + (row % 2) * 7, 18 + row * 22, 64);
      }
    }
  }
  function character(color, longHair = false, hair, belt = '#aa9160', playerStyle = null) {
    const g = new THREE.Group();
    const torso = mesh(torsoGeometry, color, g, 0, 37, 0); torso.scale.set(20, 30, 12);
    addCharacterHeadDetails((x, y, z, w, h, d, shade) => box(g, w, h, d, shade, x, y, z),
      (x, y, z, w, h, d, shade) => {
        const part = mesh(headGeometry, shade, g, x, y, z); part.scale.set(w, h, d);
      }, { headY: 60, width: 14, height: 14, depth: 14, skin: '#d7aa83', hair, longHair });
    if (!longHair) box(g, 16, 25, 3, '#725443', 0, 37, -8);
    box(g, 20, 4, 14, belt, 0, 25, 0);
    const bodyBox = (x, y, z, w, h, d, shade, parent) => box(parent, w, h, d, shade, x, y, z);
    if (playerStyle) {
      g.userData.legs = createPlayerLegs(g, bodyBox, { offset: 5, height: 23, width: 7, depth: 8,
        shoeColor: '#5a4434', shortsColor: playerStyle.shorts, skin: '#d7aa83' });
    } else {
      const left = box(g, 7, 23, 8, '#443e34', -5, 11, 0);
      const right = box(g, 7, 23, 8, '#443e34', 5, 11, 0);
      box(left, 8, 4, 12, '#5a4434', 0, -9, 2);
      box(right, 8, 4, 12, '#5a4434', 0, -9, 2);
      g.userData.legs = [left, right];
    }
    g.userData.arms = createCharacterArms(g, bodyBox, {
      offset: 12.5, shoulderY: 48.5, length: 25, width: 6, depth: 8, color, skin: '#d7aa83'
    });
    scene.add(g);
    return g;
  }
  const player = character(PLAYER_OUTFIT, true, undefined, PLAYER_STYLE.belt, PLAYER_STYLE);
  const playerLabel = textSprite(`${characterName.toUpperCase()} · 29`, 'rgba(24, 35, 29, .9)');
  let playerLevel = 29;
  playerLabel.position.y = 95; player.add(playerLabel);
  const guides = QUEST_LOCATIONS.map((quest, index) => {
    const { longHair, hair } = GUIDE_HAIRSTYLES[index % GUIDE_HAIRSTYLES.length];
    const guide = character('#876c51', longHair, hair);
    guide.position.set(quest.x, 0, quest.y);
    const marker = mesh(new THREE.OctahedronGeometry(12), '#e6bf63', guide, 0, 93, 0);
    const label = textSprite(quest.guide.toUpperCase(), 'rgba(37, 39, 28, .9)', 384);
    label.position.y = 122;
    guide.add(label);
    return { guide, marker, label };
  });
  const townsfolk = WORLD_NPCS.map((npc, index) => {
    const { longHair, hair } = TOWNSFOLK_HAIRSTYLES[index % TOWNSFOLK_HAIRSTYLES.length];
    const person = character(npc.color, longHair, hair);
    person.position.set(npc.x, 0, npc.y);
    const label = textSprite(npc.name.toUpperCase(), 'rgba(24, 40, 37, .9)', 384);
    label.position.y = 95;
    person.add(label);
    return person;
  });
  const entrances = QUEST_LOCATIONS.map((quest, index) => {
    const marker = groupAt(quest.entrance.x, quest.entrance.y);
    const ring = mesh(new THREE.TorusGeometry(21, 3, 6, 24), '#e6bf63', marker, 0, 3, 0);
    ring.rotation.x = Math.PI / 2;
    const label = textSprite(`ENTER · ${quest.entrance.name.toUpperCase()}`, 'rgba(38, 48, 34, .94)', 512);
    label.position.set(index === 3 ? -90 : 0, 48, index === 3 ? 40 : 0);
    marker.add(label);
    return label;
  });

  castle(WORLD_SPAWN.x + 50, WORLD_SPAWN.y - 250);
  house(WORLD_SPAWN.x - 205, WORLD_SPAWN.y - 95, false, 0.8);
  const [escape, town, park, forest, harvest] = QUEST_LOCATIONS;
  house(escape.x - 70, escape.y - 185, true, 1.15);
  house(town.x - 85, town.y - 165, false, 1.2);
  house(town.x + 230, town.y - 135);
  house(town.x - 250, town.y + 15, false, 0.85);
  const townSign = textSprite('LUCKY CHUCKS', 'rgba(60, 42, 30, .95)');
  townSign.position.set(town.x - 85, 120, town.y - 100); scene.add(townSign);
  const escapeSign = textSprite('ESCAPE ROOM', 'rgba(36, 41, 38, .95)');
  escapeSign.position.set(escape.x - 70, 120, escape.y - 125); scene.add(escapeSign);

  function lamp(x, z, color = '#f8cc77') {
    const g = groupAt(x, z);
    box(g, 14, 7, 14, '#5e594c', 0, 4, 0);
    box(g, 5, 65, 5, '#504b3e', 0, 37, 0);
    box(g, 17, 22, 17, '#584c3b', 0, 77, 0);
    box(g, 12, 16, 18, color, 0, 77, 0);
    mesh(new THREE.ConeGeometry(14, 12, 4), '#574a3b', g, 0, 93, 0).rotation.y = Math.PI / 4;
  }
  function barrel(x, z) {
    const g = groupAt(x, z);
    mesh(new THREE.CylinderGeometry(11, 10, 28, 10), '#785b3f', g, 0, 14, 0);
    for (const y of [5, 23]) mesh(new THREE.TorusGeometry(10.5, 1.5, 4, 10), '#48463e', g, 0, y, 0).rotation.x = Math.PI / 2;
  }
  function bench(x, z) {
    const g = groupAt(x, z);
    box(g, 58, 5, 20, '#876646', 0, 19, 0);
    for (const side of [-22, 22]) box(g, 5, 19, 14, '#5c4c3b', side, 10, 0);
    box(g, 58, 20, 4, '#876646', 0, 32, -9);
  }
  function stall(x, z, color) {
    const g = groupAt(x, z);
    box(g, 75, 38, 40, '#7b6047', 0, 19, 0);
    box(g, 82, 5, 45, '#a78c64', 0, 40, 0);
    for (const side of [-34, 34]) box(g, 5, 60, 5, '#66503d', side, 67, -16);
    box(g, 84, 6, 55, color, 0, 99, 0);
    for (let stripe = -3; stripe <= 3; stripe += 2) box(g, 10, 7, 55, '#dfcba0', stripe * 10, 100, 0);
    for (const side of [-20, 0, 20]) box(g, 9, 12, 9, '#b8a472', side, 48, 0);
  }
  function gate(x, z, label, color) {
    const g = groupAt(x, z);
    for (const side of [-65, 65]) {
      box(g, 12, 105, 14, '#635140', side, 53, 0);
      box(g, 18, 8, 20, '#a78a63', side, 108, 0);
    }
    box(g, 145, 22, 12, color, 0, 87, 0);
    const sign = textSprite(label, 'rgba(63, 48, 35, .92)', 320);
    sign.position.set(0, 88, 8); g.add(sign);
  }
  [WORLD_SPAWN, escape, town, park, harvest].forEach((location) => {
    lamp(location.x - 75, location.y - 50);
    lamp(location.x + 95, location.y + 75);
  });
  barrel(town.x - 165, town.y - 155); barrel(town.x - 138, town.y - 160);
  bench(town.x - 170, town.y - 20);
  stall(town.x - 200, town.y + 110, '#a16c50');
  stall(town.x + 275, town.y + 150, '#687e73');
  stall(park.x + 205, park.y + 45, '#9e6254');
  stall(park.x - 380, park.y + 260, '#788a88');
  stall(park.x + 350, park.y + 300, '#a56e50');
  gate(park.x - 180, park.y - 60, 'THIRTEEN', '#79594e');
  gate(harvest.x - 175, harvest.y - 175, 'Fright Nights', '#674e36');
  gate(forest.entrance.x, forest.entrance.y, 'GOAPE', '#4b6348');

  placeQuestDecorations(escape, 'escape', 22, 560, 12).forEach(({ x, y, variant, scale, rotation }) => {
    const grave = groupAt(x, y);
    grave.rotation.y = rotation;
    grave.rotation.z = rotation * 0.18;
    grave.scale.setScalar(scale);
    box(grave, 26, 5, 18, '#666d64', 0, 3, 0);
    if (variant === 0) {
      box(grave, 22, 38, 10, '#7b8174', 0, 22, 0);
      box(grave, 4, 22, 2, '#a4a79a', 0, 25, 6);
      box(grave, 14, 4, 2, '#a4a79a', 0, 29, 6);
    } else if (variant === 1) {
      box(grave, 24, 25, 10, '#888c7d', 0, 17, 0);
      const top = mesh(new THREE.CylinderGeometry(12, 12, 10, 12, 1, false, 0, Math.PI), '#888c7d', grave, 0, 29, 0);
      top.rotation.x = Math.PI / 2;
      box(grave, 14, 2, 2, '#b7b7a5', 0, 20, 6);
    } else {
      box(grave, 7, 42, 8, '#97988a', 0, 24, 0);
      box(grave, 25, 7, 8, '#97988a', 0, 34, 0);
    }
  });
  for (let i = 0; i < 2; i += 1) {
    const target = groupAt(town.x + 190 + i * 55, town.y + 40);
    box(target, 6, 55, 6, '#69513b', 0, 27, 0);
    const face = mesh(new THREE.CylinderGeometry(23, 23, 4, 20), '#b75b4b', target, 0, 55, 0);
    face.rotation.x = Math.PI / 2;
    const bull = mesh(new THREE.CylinderGeometry(9, 9, 5, 20), '#e8d1a0', target, 0, 55, 3);
    bull.rotation.x = Math.PI / 2;
  }
  const coasterTrains = [];
  function coaster(x, z, type, color, size = 1, rotation = 0) {
    const group = groupAt(x, z);
    group.rotation.y = rotation;
    group.scale.setScalar(size);
    const curve = new THREE.CatmullRomCurve3(
      COASTER_TRACKS[type].map(([px, py, pz]) => new THREE.Vector3(px, py, pz)),
      true, 'centripetal'
    );
    const frames = curve.computeFrenetFrames(320, true);
    const sides = Math.abs(frames.normals[0].y) < Math.abs(frames.binormals[0].y)
      ? frames.normals : frames.binormals;
    function lateral(t) {
      return sides[Math.round(t * 320)];
    }
    for (const side of [-9, 9]) {
      const points = [];
      for (let i = 0; i < 160; i += 1) {
        const t = i / 160;
        points.push(curve.getPointAt(t).addScaledVector(lateral(t), side));
      }
      const railCurve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
      mesh(new THREE.TubeGeometry(railCurve, 320, 3, 6, true), color, group);
    }
    for (let i = 0; i < 72; i += 1) {
      const t = i / 72;
      const point = curve.getPointAt(t);
      const across = lateral(t);
      const tie = box(group, 4, 4, 22, '#b9a184', point.x, point.y, point.z);
      tie.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), across);
      if (i % (type === 'woodCoaster' ? 3 : 6) === 0) {
        for (const side of [-13, 13]) {
          const support = point.clone().addScaledVector(across, side);
          box(group, 5, support.y, 5, type === 'woodCoaster' ? '#735039' : '#756657',
            support.x, support.y / 2, support.z);
        }
      }
    }
    const train = new THREE.Group();
    group.add(train);
    for (let i = 0; i < 3; i += 1) {
      const car = new THREE.Group();
      train.add(car);
      box(car, 20, 12, 18, '#73423a', 0, 10, 0);
      box(car, 10, 6, 12, '#d0aa72', 0, 19, 0);
    }
    coasterTrains.push({ curve, cars: train.children, offset: random(x, z) });
  }
  coaster(park.x + 40, park.y - 185, 'thirteen', '#b26b59');
  PARK_RIDES.filter((ride) => ride.type.includes('Coaster')).forEach((ride, index) => {
    const type = index === 2 ? 'twistingCoaster' : ride.type;
    coaster(ride.x, ride.y, type, index === 1 ? '#c5a36d' : index === 2 ? '#6d8392' : '#a34d4d',
      ride.size, index === 2 ? 0.55 : index === 1 ? -0.3 : 0.2);
  });
  const towerRide = PARK_RIDES.find((ride) => ride.type === 'dropTower');
  if (!towerRide) throw new Error('The theme park is missing its drop tower.');
  const tower = groupAt(towerRide.x, towerRide.y);
  box(tower, 34, 215, 34, '#77736b', 0, 108, 0);
  const towerSeats = box(tower, 95, 16, 40, '#aa6650', 0, 115, 0);
  const wheel = groupAt(park.x + 320, park.y - 260);
  box(wheel, 10, 160, 12, '#856f5b', 0, 80, 0);
  const wheelRotor = new THREE.Group();
  wheelRotor.position.y = 125;
  wheel.add(wheelRotor);
  mesh(new THREE.TorusGeometry(82, 4, 6, 32), '#e0b574', wheelRotor);
  const gondolas = [];
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    const spoke = box(wheelRotor, 82, 3, 3, '#d0b38b', Math.cos(angle) * 41, Math.sin(angle) * 41, 0);
    spoke.rotation.z = angle;
    gondolas.push(box(wheelRotor, 16, 13, 14, i % 2 ? '#b96753' : '#6a8191',
      Math.cos(angle) * 82, Math.sin(angle) * 82, 0));
  }
  const carousel = groupAt(park.x - 310, park.y - 210);
  mesh(new THREE.CylinderGeometry(68, 68, 14, 12), '#997151', carousel, 0, 7, 0);
  for (let i = 0; i < 6; i += 1) {
    const angle = i * Math.PI / 3;
    box(carousel, 5, 65, 5, '#d7bc82', Math.cos(angle) * 52, 45, Math.sin(angle) * 52);
  }
  mesh(new THREE.ConeGeometry(76, 48, 12), '#a45b4b', carousel, 0, 100, 0);
  const glowImage = document.createElement('canvas');
  glowImage.width = 64; glowImage.height = 64;
  const glowContext = glowImage.getContext('2d');
  if (!glowContext) throw new Error('Could not create forest lights.');
  const glowGradient = glowContext.createRadialGradient(32, 32, 1, 32, 32, 32);
  glowGradient.addColorStop(0, 'rgba(255,255,255,.9)');
  glowGradient.addColorStop(0.2, 'rgba(255,255,255,.4)');
  glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
  glowContext.fillStyle = glowGradient; glowContext.fillRect(0, 0, 64, 64);
  const glowTexture = new THREE.CanvasTexture(glowImage);
  textures.add(glowTexture);
  function glowingBulb(parent, x, y, z, color, size = 4) {
    const bulb = mesh(new THREE.SphereGeometry(size, 8, 6), color, parent, x, y, z);
    bulb.material = new THREE.MeshBasicMaterial({ color });
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture, color, transparent: true, depthWrite: false
    }));
    halo.position.set(x, y, z);
    halo.scale.set(size * 7, size * 7, 1);
    parent.add(halo);
  }
  const canopy = groupAt(forest.x + CANOPY_OFFSET.x, forest.y + CANOPY_OFFSET.z);
  CANOPY_PLATFORMS.forEach((platform, index) => {
    const g = new THREE.Group();
    g.position.set(platform.x, 0, platform.z);
    canopy.add(g);
    mesh(new THREE.CylinderGeometry(11, 18, platform.height + 70, 8), '#574431',
      g, 0, (platform.height + 70) / 2, 0);
    mesh(new THREE.ConeGeometry(35 + index % 3 * 7, 85, 8), index % 2 ? '#305a47' : '#294f3e',
      g, 0, platform.height + 100, 0);
    box(g, platform.size, 9, platform.size, '#ad8955', 0, platform.height, 0);
    for (let plank = -2; plank <= 2; plank += 1) {
      box(g, 2, 2, platform.size - 4, '#765d3e', plank * platform.size / 6, platform.height + 5, 0);
    }
    for (const side of [-1, 1]) {
      box(g, 4, 38, 4, '#d0aa72', side * (platform.size / 2 - 5), platform.height + 23, -platform.size / 2 + 5);
      glowingBulb(g, side * (platform.size / 2 - 5), platform.height + 44, -platform.size / 2 + 5,
        ['#f9bb70', '#e899cb', '#8dd8cb', '#bca8ed'][(index + (side + 1) / 2) % 4], 4);
    }
  });
  CANOPY_LINKS.forEach(({ from, to, type }) => {
    const start = CANOPY_PLATFORMS[from];
    const end = CANOPY_PLATFORMS[to];
    const a = new THREE.Vector3(start.x, start.height + (type === 'zipline' ? 65 : 3), start.z);
    const b = new THREE.Vector3(end.x, end.height + (type === 'zipline' ? 65 : 3), end.z);
    const direction = b.clone().sub(a);
    const side = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    const sag = type === 'zipline' ? 38 : 20;
    function rope(offset, lift) {
      const points = [a.clone().addScaledVector(side, offset), a.clone().lerp(b, 0.5).addScaledVector(side, offset),
      b.clone().addScaledVector(side, offset)];
      points[0].y += lift; points[1].y += lift - sag; points[2].y += lift;
      const curve = new THREE.QuadraticBezierCurve3(...points);
      mesh(new THREE.TubeGeometry(curve, 24, 2, 5), '#d0b180', canopy);
      return curve;
    }
    if (type === 'zipline') {
      rope(0, 0);
      return;
    }
    const left = rope(-16, 34);
    const right = rope(16, 34);
    const steps = Math.max(5, Math.floor(direction.length() / 25));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const p = a.clone().lerp(b, t);
      p.y -= sag * 4 * t * (1 - t);
      if (type === 'bridge') {
        const plank = box(canopy, 19, 4, 31, '#ad895c', p.x, p.y, p.z);
        plank.rotation.y = Math.atan2(-direction.z, direction.x);
      } else {
        const rung = box(canopy, 4, 4, 32, '#bca074', p.x, p.y, p.z);
        rung.rotation.y = Math.atan2(side.x, side.z);
      }
      for (const rail of [left, right]) {
        const top = rail.getPoint(t);
        const bottom = p.clone().addScaledVector(side, rail === left ? -16 : 16);
        const connector = new THREE.LineCurve3(bottom, top);
        mesh(new THREE.TubeGeometry(connector, 1, 1.1, 4), '#d0b180', canopy);
      }
      if (i % 3 === 0) glowingBulb(canopy, p.x, p.y + 35, p.z,
        ['#f9bb70', '#e899cb', '#8dd8cb'][(i + from) % 3], 2.5);
    }
  });
  const corn = [];
  worldCornWalls().forEach((wall) => {
    const x = wall.x, z = wall.y;
    for (let i = 0; i < 11; i += 1) {
      const offset = -62 + i * 12.4;
      corn.push({ x: x + (wall.vertical ? 0 : offset), z: z + (wall.vertical ? offset : 0), size: 0.8 + random(i + x, z) * 0.35 });
    }
  });
  placeQuestDecorations(harvest, 'harvest', 35, 760, 48).forEach(({ x, y, variant, scale, rotation }) => {
    const pumpkin = groupAt(x, y);
    pumpkin.rotation.y = rotation;
    pumpkin.scale.setScalar(scale);
    mesh(new THREE.SphereGeometry(15, 10, 6), ['#c97c36', '#a85b2e', '#e29b43'][variant], pumpkin, 0, 12, 0).scale.y = 0.8;
    box(pumpkin, 4, 7, 4, '#576341', 0, 25, 0);
    box(pumpkin, 3, 4, 2, '#4d3827', -5, 14, 14);
    box(pumpkin, 3, 4, 2, '#4d3827', 5, 14, 14);
    box(pumpkin, 10, 2, 2, '#4d3827', 0, 8, 15);
  });

  const treeData = worldTrees();
  function instances(data, geometry, color, transform) {
    geometries.add(geometry);
    const instanced = new THREE.InstancedMesh(geometry, material(color), data.length);
    const object = new THREE.Object3D();
    data.forEach((entry, index) => {
      object.position.set(0, 0, 0);
      object.rotation.set(0, 0, 0);
      object.scale.set(1, 1, 1);
      transform(object, entry);
      object.updateMatrix();
      instanced.setMatrixAt(index, object.matrix);
    });
    scene.add(instanced);
  }
  instances(corn, new THREE.CylinderGeometry(3, 6, 70, 5), '#a28c47', (o, stalk) => {
    o.position.set(stalk.x, 35 * stalk.size, stalk.z); o.scale.setScalar(stalk.size);
  });
  instances(corn, new THREE.ConeGeometry(9, 30, 5), '#d2b45d', (o, stalk) => {
    o.position.set(stalk.x, 75 * stalk.size, stalk.z); o.scale.setScalar(stalk.size);
  });
  for (const side of [-1, 1]) {
    instances(corn, new THREE.ConeGeometry(7, 35, 4), '#b7a052', (o, stalk) => {
      o.position.set(stalk.x + side * 8, 38 * stalk.size, stalk.z);
      o.rotation.z = -side * 0.65; o.scale.setScalar(stalk.size);
    });
  }
  instances(treeData, new THREE.CylinderGeometry(6, 10, 70, 6), '#5a4733', (o, t) => {
    o.position.set(t.x, 35 * t.size, t.z); o.scale.setScalar(t.size);
  });
  const leafTrees = treeData.filter((t) => t.region !== 'escape' && t.region !== 'forest');
  const leafColors = [
    ['#456b40', '#5a824c', '#6c9457'],
    ['#5b7141', '#819154', '#9ba668'],
    ['#3d6652', '#527b61', '#72937a']
  ];
  leafColors.forEach((colors, variant) => {
    const trees = leafTrees.filter((tree) => tree.variant === variant);
    instances(trees, new THREE.IcosahedronGeometry(38, 1), colors[0], (o, t) => {
      o.position.set(t.x, 92 * t.size, t.z);
      o.rotation.y = t.angle;
      o.scale.set(t.size * (variant === 1 ? 1.25 : 1), t.size * (variant === 2 ? 1.3 : 1), t.size);
    });
    for (const [side, radius, height, color] of [[-1, 29, 103, colors[1]], [1, 26, 112, colors[2]]]) {
      instances(trees, new THREE.IcosahedronGeometry(radius, 1), color, (o, t) => {
        o.position.set(t.x + side * Math.cos(t.angle) * 24 * t.size, height * t.size,
          t.z + side * Math.sin(t.angle) * 24 * t.size);
        o.rotation.y = t.angle;
        o.scale.set(t.size, t.size * (variant === 2 ? 1.25 : 1), t.size);
      });
    }
  });
  const pines = treeData.filter((t) => t.region === 'forest');
  const pineColors = [['#274d3d', '#305d49', '#3a6950'], ['#334d3c', '#41664e', '#55775a'], ['#1e453e', '#28584b', '#396d5b']];
  pineColors.forEach((colors, variant) => {
    const trees = pines.filter((tree) => tree.variant === variant);
    [[48, 75, 75], [39, 72, 110], [27, 62, 145]].forEach(([radius, height, y], layer) => {
      if (variant === 1 && layer === 1) return;
      instances(trees, new THREE.ConeGeometry(radius, height, variant === 2 ? 6 : 8), colors[layer], (o, t) => {
        o.position.set(t.x, y * t.size, t.z);
        o.rotation.y = t.angle;
        o.scale.set(t.size * (variant === 1 ? 0.75 : 1), t.size * (variant === 1 ? 1.2 : 1), t.size * (variant === 1 ? 0.75 : 1));
      });
    });
  });
  const deadTrees = treeData.filter((t) => t.region === 'escape');
  for (const side of [-1, 1]) {
    instances(deadTrees, new THREE.CylinderGeometry(2, 5, 48, 5), '#514c3f', (o, t) => {
      o.position.set(t.x + side * 12 * t.size, 62 * t.size, t.z);
      o.rotation.set(0, t.angle, -side * (0.4 + t.variant * 0.2));
      o.scale.setScalar(t.size);
    });
  }
  const rocks = treeData.filter((t) => t.variant === 0);
  instances(rocks, new THREE.IcosahedronGeometry(13, 0), '#888b78', (o, t) => {
    o.position.set(t.x + 48, 6, t.z + 18);
    o.scale.set(1.3, 0.6, 1);
    o.rotation.y = t.size;
  });
  const shadowImage = document.createElement('canvas');
  shadowImage.width = 64; shadowImage.height = 64;
  const shadowContext = shadowImage.getContext('2d');
  if (!shadowContext) throw new Error('Could not create scenery shadows.');
  const gradient = shadowContext.createRadialGradient(32, 32, 2, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(20, 29, 21, .5)');
  gradient.addColorStop(1, 'rgba(20, 29, 21, 0)');
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowImage);
  textures.add(shadowTexture);
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const shadowGeometry = new THREE.PlaneGeometry(1, 1);
  geometries.add(shadowGeometry);
  const shadowEntries = [
    ...treeData.map((t) => ({ x: t.x + 12, z: t.z + 16, width: 110 * t.size, depth: 75 * t.size })),
    { x: WORLD_SPAWN.x + 70, z: WORLD_SPAWN.y - 225, width: 340, depth: 240 },
    ...[escape, town].map((q) => ({ x: q.x - 65, z: q.y - 160, width: 230, depth: 170 }))
  ];
  const shadows = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, shadowEntries.length);
  const shadowObject = new THREE.Object3D();
  shadowEntries.forEach((entry, index) => {
    shadowObject.position.set(entry.x, 0.5, entry.z);
    shadowObject.rotation.x = -Math.PI / 2;
    shadowObject.scale.set(entry.width, entry.depth, 1);
    shadowObject.updateMatrix();
    shadows.setMatrixAt(index, shadowObject.matrix);
  });
  scene.add(shadows);
  const groundDetails = [];
  for (let i = 0; i < 3000; i += 1) {
    const x = 35 + random(i, 71) * (WORLD_SIZE.width - 70);
    const z = 35 + random(i, 72) * (WORLD_SIZE.height - 70);
    if (roadDistance({ x, y: z }) < 65) continue;
    const region = regionBlendAt({ x, y: z }).region.id;
    if (region === 'park' || region === 'harvest') continue;
    groundDetails.push({ x, z, region, size: 0.6 + random(i, 73) * 0.8 });
  }
  for (const [regions, color] of [[['home', 'town'], '#76965a'], [['forest'], '#416c51'], [['escape'], '#777d5b']]) {
    instances(groundDetails.filter((item) => regions.includes(item.region)), new THREE.ConeGeometry(5, 16, 3), color, (o, t) => {
      o.position.set(t.x, 7 * t.size, t.z);
      o.rotation.y = t.x;
      o.scale.set(t.size, t.size, t.size);
    });
  }
  instances(groundDetails.filter((t) => t.region === 'home' && t.x % 5 < 1), new THREE.IcosahedronGeometry(4, 0), '#d5c585', (o, t) => {
    o.position.set(t.x, 7, t.z);
  });
  const lightColors = ['#ffd07a', '#ef92c9', '#85daca', '#bca8ed'];
  for (let i = 0; i < 12; i += 1) {
    const x = forest.x + (random(i, 45) - 0.5) * 850;
    const z = forest.y + (random(i, 46) - 0.5) * 850;
    const lantern = groupAt(x, z);
    box(lantern, 4, 70, 4, '#584a36', 0, 35, 0);
    glowingBulb(lantern, 0, 73, 0, lightColors[i % lightColors.length], 6);
  }

  let width = 1;
  let height = 1;
  let currentZoom = 1;
  let previousPosition = null;
  return {
    setPlayerLevel(level) {
      if (level === playerLevel) return;
      playerLevel = level;
      const texture = playerLabel.material.map;
      paintLabel(texture.image, `${characterName.toUpperCase()} · ${level}`, 'rgba(24, 35, 29, .9)');
      texture.needsUpdate = true;
    },
    resize(w, h, zoom) {
      width = w; height = h;
      currentZoom = zoom;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
    },
    draw(position, selected, completed, moving, time) {
      player.position.set(position.x, 0, position.y);
      if (previousPosition && (position.x !== previousPosition.x || position.y !== previousPosition.y)) {
        player.rotation.y = Math.atan2(position.x - previousPosition.x, position.y - previousPosition.y);
      }
      previousPosition = { ...position };
      const stride = moving ? Math.sin(time / 120) * 0.45 : 0;
      player.userData.legs[0].rotation.x = stride;
      player.userData.legs[1].rotation.x = -stride;
      swingCharacterArms(player.userData.arms, stride);
      guides.forEach(({ marker, label }, index) => {
        marker.material = material(completed[index] ? '#97c77c' : '#e6bf63');
        marker.rotation.y = time / 1000;
        label.visible = index === selected;
      });
      const { region, neighbor, blend } = regionBlendAt(position);
      const night = (region.id === 'forest' ? 1 - blend : 0) + (neighbor.id === 'forest' ? blend : 0);
      ambient.intensity = 1.65 - night * 0.35;
      sunlight.intensity = 2.2 - night * 0.7;
      wheelRotor.rotation.z = time * 0.00015;
      gondolas.forEach((gondola) => { gondola.rotation.z = -wheelRotor.rotation.z; });
      carousel.rotation.y = time * 0.0003;
      towerSeats.position.y = 115 + Math.sin(time * 0.0005) * 48;
      coasterTrains.forEach(({ curve, cars, offset }) => {
        cars.forEach((car, index) => {
          const t = (time * 0.00002 + offset - index * 0.018 + 1) % 1;
          const point = curve.getPointAt(t);
          const tangent = curve.getTangentAt(t);
          car.position.copy(point);
          car.rotation.set(0, -Math.atan2(tangent.z, tangent.x), Math.atan2(tangent.y, Math.hypot(tangent.x, tangent.z)));
        });
      });
      configureWorldCamera(camera, width, height, currentZoom, position);
      renderer.render(scene, camera);
    },
    screenToWorld(point) {
      return groundPointAt(camera, width, height, point);
    },
    npcSpeechAnchor(index) {
      const projected = townsfolk[index].localToWorld(new THREE.Vector3(0, 120, 0)).project(camera);
      if (projected.z < -1 || projected.z > 1) return null;
      return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
    },
    guideSpeechAnchor(index) {
      const projected = guides[index].guide.localToWorld(new THREE.Vector3(0, 145, 0)).project(camera);
      if (projected.z < -1 || projected.z > 1) return null;
      return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
    },
    npcAt(point) {
      return townsfolk.findIndex((person) => {
        const projected = person.localToWorld(new THREE.Vector3(0, 40, 0)).project(camera);
        const x = (projected.x + 1) * width / 2;
        const y = (1 - projected.y) * height / 2;
        return projected.z >= -1 && projected.z <= 1 && Math.hypot(point.x - x, point.y - y) <= 23;
      });
    },
    markerAt(point) {
      return guides.findIndex(({ marker }) => {
        const projected = marker.getWorldPosition(new THREE.Vector3()).project(camera);
        const x = (projected.x + 1) * width / 2;
        const y = (1 - projected.y) * height / 2;
        return projected.z >= -1 && projected.z <= 1 && Math.hypot(point.x - x, point.y - y) <= 25;
      });
    },
    entranceAt(point) {
      return entrances.findIndex((label) => {
        const projected = label.getWorldPosition(new THREE.Vector3()).project(camera);
        const x = (projected.x + 1) * width / 2;
        const y = (1 - projected.y) * height / 2;
        return projected.z >= -1 && projected.z <= 1 && Math.abs(point.x - x) <= 65 && Math.abs(point.y - y) <= 18;
      });
    },
    dispose() {
      scene.traverse((object) => {
        if (object.isSprite) object.material.dispose();
        if (object.isMesh && object.material.isMeshBasicMaterial) object.material.dispose();
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((item) => item.dispose());
      textures.forEach((texture) => texture.dispose());
      groundMaterial.dispose();
      renderer.dispose();
    }
  };
}
