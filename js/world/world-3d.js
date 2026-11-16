import * as THREE from 'three';
import { CASTLE_EXTERIOR_SUPPLIES, CASTLE_FRONT_WINDOWS, CASTLE_KEEP_WIDTH, CASTLE_LAYOUT, CASTLE_ROOF_SUPPLIES, CASTLE_SIDE_BATTLEMENT_Z, CASTLE_TOWERS, CASTLE_WINDOW_LEVELS, CASTLE_WINDOW_WIDTH_SCALE, QUEST_LOCATIONS, WORLD_SIZE, WORLD_SPAWN } from './world-data.js';
import { regionBlendAt } from './world-regions.js';
import { PARK_RIDES } from './park-scenery.js';
import { roadDistance } from './world-art.js';
import { WORLD_NPCS } from './world-npcs.js';
import { CANOPY_LINKS, CANOPY_OFFSET, CANOPY_PLATFORMS, COASTER_TRACKS, harvestPumpkins, placeQuestDecorations } from './world-scenery-data.js';
import { worldCornWalls, worldTrees } from './world-collision.js';
import { CAT_OUTFIT, CAT_STYLE, GUIDE_HAIRSTYLES, PLAYER_OUTFIT, PLAYER_STYLE, TOWNSFOLK_HAIRSTYLES, addCharacterHeadDetails } from '../character-appearance.js';
import { createCharacterArms, createCharacterTorsoGeometry, swingCharacterArms } from '../character-body.js';
import { createCharacterLegs, createPlayerLegs } from '../games/character-legs.js';
import { CHURCH_STONE, CHURCH_WOOD, isTownPlaza, STOREFRONT_AWNINGS, TOWN_BENCHES, TOWN_CHURCH, TOWN_LAMPS, TOWN_TABLES, TOWN_VENUES } from './town-scenery.js';
import { sideQuestPosition } from '../side-quests.js';
import { SURROUNDINGS_BOUNDS, surroundingTrees } from './world-surroundings.js';
import { createDeadTreeGeometry, createTreeBarkTexture } from './tree-geometry.js';
import { createFoliageTexture, createLeafyBranches, createLeafyCanopy } from './leafy-tree.js';
import { createFirCanopy, createFirTrunk, createNeedleTexture, createPlatformFirTrunk, platformFirLayout } from './fir-tree.js';
import { createRockGeometry, createRockTexture } from './rock-geometry.js';
import { rockVariant } from './rock-style.js';
import { cornStalks, createCornGeometry, createCornTexture } from './corn-scenery.js';
import { createPumpkinGeometry, pumpkinHasFace } from './pumpkin-scenery.js';
import { createRoofTileGeometry, createTownTexture } from './town-textures.js';
import { createGamesSignTexture } from './games-sign.js';
import { createVenueSignTexture } from './venue-sign.js';
import { CASTLE_GATE_PLANKS, CASTLE_PALETTE, CASTLE_TOWER_WINDOWS, castleFlagPosition, castleSupplyStyle, createCastleArchGeometry, createCastleBannerGeometry, createCastleFlagGeometry } from './castle-scenery.js';
import { WORLD_SUPPLIES } from './world-supplies.js';
import { createFrightMarqueeTexture, FRIGHT_MARQUEE } from './fright-marquee.js';

function random(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function paletteColor(palette, x, z, salt) {
  return palette[Math.floor(random(x, z + salt) * palette.length)];
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

export function createWorld3D(canvas, ground, characterName, surroundings) {
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
  const townTextures = Object.fromEntries(['wood', 'plaster', 'roof'].map((kind) => {
    const texture = createTownTexture(kind);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.add(texture);
    return [kind, texture];
  }));
  function textured(item, kind, color) {
    const key = `${kind}:${color}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, map: townTextures[kind], roughness: 1 }));
    item.material = materials.get(key);
    return item;
  }
  function texturedBox(parent, width, height, depth, color, x, y, z, kind = 'wood') {
    return textured(box(parent, width, height, depth, color, x, y, z), kind, color);
  }
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
  const surroundingTexture = new THREE.CanvasTexture(surroundings);
  surroundingTexture.colorSpace = THREE.SRGBColorSpace;
  surroundingTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  textures.add(surroundingTexture);
  const surroundingGeometry = new THREE.PlaneGeometry(
    SURROUNDINGS_BOUNDS.right - SURROUNDINGS_BOUNDS.left,
    SURROUNDINGS_BOUNDS.bottom - SURROUNDINGS_BOUNDS.top
  );
  geometries.add(surroundingGeometry);
  const surroundingMaterial = new THREE.MeshStandardMaterial({ map: surroundingTexture, roughness: 1 });
  const surroundingFloor = new THREE.Mesh(surroundingGeometry, surroundingMaterial);
  surroundingFloor.rotation.x = -Math.PI / 2;
  surroundingFloor.position.set(WORLD_SIZE.width / 2, -1, WORLD_SIZE.height / 2);
  scene.add(surroundingFloor);
  const groundGeometry = new THREE.PlaneGeometry(WORLD_SIZE.width, WORLD_SIZE.height);
  geometries.add(groundGeometry);
  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 });
  const floor = new THREE.Mesh(groundGeometry, groundMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(WORLD_SIZE.width / 2, 0, WORLD_SIZE.height / 2);
  scene.add(floor);

  function timber(parent, x, y, z, width, height) {
    texturedBox(parent, width, height, 5, '#5d4939', x, y, z);
  }
  function windowFrame(parent, x, y, z, dark = false) {
    box(parent, 25, 30, 4, '#58493a', x, y, z);
    box(parent, 19, 24, 5, dark ? '#c1b67c' : '#6a8b8b', x, y, z + 1);
    box(parent, 3, 25, 6, '#514438', x, y, z + 2);
    box(parent, 20, 3, 6, '#514438', x, y, z + 2);
    box(parent, 29, 4, 8, '#b2a488', x, y - 16, z + 1);
    box(parent, 2, 8, 1, dark ? '#e5d7a2' : '#acc7bf', x - 5, y + 5, z + 3);
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
      textured(mesh(createRoofTileGeometry(width, depth, height, side), color, parent, 0, y, 0), 'roof', color);
    }
    return item;
  }
  function house(x, z, dark = false, size = 1) {
    const g = groupAt(x, z); g.scale.setScalar(size);
    const plaster = dark ? '#66695b' : paletteColor(['#c1b498', '#c8b9a1', '#b9b29d', '#c5b198', '#b9b6a4'], x, z, 132);
    const roofColor = dark ? '#514744' : paletteColor(['#805c4b', '#896450', '#79594b', '#886856', '#755b50'], x, z, 133);
    stoneBox(g, 128, 12, 105, dark ? '#727a70' : '#9a998b', 0, 6, 0);
    texturedBox(g, 118, 80, 95, plaster, 0, 52, 0, 'plaster');
    roof(g, 132, 108, 48, roofColor, 92);
    stoneBox(g, 16, 45, 18, '#817668', 36, 124, -22);
    box(g, 22, 6, 24, '#615b51', 36, 147, -22);
    for (const xPos of [-57, 57]) timber(g, xPos, 52, 49, 7, 80);
    timber(g, 0, 86, 49, 118, 6);
    timber(g, 0, 22, 49, 118, 6);
    const gableSlope = Math.atan2(41, 54);
    for (const side of [-1, 1]) {
      const beam = texturedBox(g, 68, 4, 4, '#71533f', side * 27, 113, 55);
      beam.rotation.z = -side * gableSlope;
    }
    texturedBox(g, 4, 34, 4, '#71533f', 0, 111, 55);
    texturedBox(g, 98, 4, 4, '#71533f', 0, 96, 55);
    box(g, 30, 53, 5, '#504236', 0, 39, 49);
    texturedBox(g, 21, 45, 6, dark ? '#3d3932' : '#74543c', 0, 37, 51);
    for (const x of [-5, 0, 5]) box(g, 0.8, 40, 1, dark ? '#302e29' : '#5a4131', x, 37, 54.5);
    box(g, 17, 2, 1, dark ? '#676053' : '#a07a53', 0, 48, 54.5);
    box(g, 3, 4, 3, '#d7b574', 7, 36, 55);
    box(g, 35, 5, 16, '#9d9583', 0, 4, 56);
    for (const side of [-37, 37]) {
      windowFrame(g, side, 57, 49, dark);
      texturedBox(g, 5, 28, 4, dark ? '#48473b' : '#76644d', side + Math.sign(side) * 15, 57, 50);
      box(g, 7, 2, 5, '#a99572', side + Math.sign(side) * 15, 49, 51);
    }
    if (dark) {
      const board = box(g, 34, 4, 5, '#584c40', -37, 56, 55);
      board.rotation.z = 0.35;
      box(g, 8, 24, 8, '#554b3d', -54, 121, 55);
    }
    return g;
  }
  const barrelBody = new THREE.CylinderGeometry(8, 9, 24, 12);
  const barrelHoop = new THREE.CylinderGeometry(9.2, 9.2, 2, 12);
  const barrelLid = new THREE.CylinderGeometry(8, 8, 1, 12);
  function supply(parent, item, baseY) {
    const { wood, light, edge, metal: band } = castleSupplyStyle(item.kind, item.variant);
    const group = new THREE.Group();
    group.position.set(item.x, baseY, item.z);
    group.rotation.y = item.rotation;
    group.scale.setScalar(item.size);
    parent.add(group);
    if (item.kind === 'barrel') {
      textured(mesh(barrelBody, wood, group, 0, 12, 0), 'wood', wood);
      for (const y of [6, 18]) mesh(barrelHoop, band, group, 0, y, 0);
      textured(mesh(barrelLid, light, group, 0, 24, 0), 'wood', light);
      for (let i = 0; i < 12; i += 1) {
        const angle = i * Math.PI / 6;
        const stave = box(group, 0.6, 23, 0.7, edge, Math.sin(angle) * 8.5, 12, Math.cos(angle) * 8.5);
        stave.rotation.y = angle;
      }
      for (const zPos of [-3, 3]) box(group, 13, 0.5, 0.5, edge, 0, 24.7, zPos);
      for (const y of [6, 18]) box(group, 1.5, 1.5, 1, light, 0, y, 9.3);
    } else {
      texturedBox(group, 20, 20, 20, wood, 0, 10, 0);
      for (const dx of [-8, 8]) box(group, 2, 20, 1, edge, dx, 10, 10.5);
      for (const y of [2, 18]) box(group, 20, 2, 1, edge, 0, y, 10.5);
      for (const y of [7, 13]) box(group, 16, 0.6, 1, edge, 0, y, 10.6);
      for (const side of [-1, 1]) {
        for (const zPos of [-8, 8]) box(group, 1, 20, 2, edge, side * 10.5, 10, zPos);
        for (const y of [2, 18]) box(group, 1, 2, 20, edge, side * 10.5, y, 0);
        const sideBrace = box(group, 1, 2, 23, light, side * 11, 10, 0);
        sideBrace.rotation.x = Math.PI / 4;
      }
      for (const zPos of [-4, 4]) box(group, 18, 0.5, 0.6, edge, 0, 20.3, zPos);
      const brace = box(group, 23, 2, 1, light, 0, 10, 11);
      brace.rotation.z = Math.PI / 4;
      if (item.variant === 2) {
        const crossBrace = box(group, 23, 2, 1, light, 0, 10, 11.6);
        crossBrace.rotation.z = -Math.PI / 4;
      }
      for (const dx of [-7, 7]) for (const y of [3, 17]) box(group, 1.4, 1.4, 1, band, dx, y, 11.5);
    }
  }
  function castle(x, z) {
    const g = groupAt(x, z);
    const { wall, tower, trim, shadow, gate, gateIron, windowGlass, metal, roof: roofColor, roofTrim, royalBlue, heraldryGold } = CASTLE_PALETTE;
    stoneBox(g, CASTLE_LAYOUT.width, 15, CASTLE_LAYOUT.depth, '#93968c', 0, 8, CASTLE_LAYOUT.centerOffset);
    stoneBox(g, CASTLE_KEEP_WIDTH, 160, 220, wall, 0, 88, CASTLE_LAYOUT.centerOffset);
    stoneBox(g, CASTLE_KEEP_WIDTH + 4, 9, 224, shadow, 0, 168, CASTLE_LAYOUT.centerOffset);
    for (let dx = -100; dx <= 100; dx += 20) {
      stoneBox(g, 12, 17, 12, trim, dx, 180, 59);
      stoneBox(g, 12, 17, 12, trim, dx, 180, -154);
    }
    stoneBox(g, 216, 2, 188, roofColor, 0, 173, CASTLE_LAYOUT.centerOffset);
    for (let row = 0; row <= 6; row += 1) {
      const zPos = CASTLE_LAYOUT.centerOffset - 84 + row * 28;
      box(g, 208, 0.6, 1, roofTrim, 0, 174.2, zPos);
      if (row === 6) continue;
      for (let col = -2; col <= 2; col += 1) {
        box(g, 1, 0.6, 28, roofTrim, col * 40 + (row % 2) * 20, 174.2, zPos + 14);
      }
    }
    CASTLE_ROOF_SUPPLIES.forEach((item) => supply(g, item, 174));
    CASTLE_EXTERIOR_SUPPLIES.forEach((item) => supply(g, item, 0));
    for (const side of [-1, 1]) {
      for (const zPos of CASTLE_SIDE_BATTLEMENT_Z) {
        stoneBox(g, 12, 17, 12, trim, side * (CASTLE_KEEP_WIDTH / 2 - 5), 180, zPos);
      }
    }
    const bannerGeometry = createCastleBannerGeometry();
    const flagGeometry = createCastleFlagGeometry();
    const flagMaterial = new THREE.MeshStandardMaterial({ color: royalBlue, roughness: 0.9, side: THREE.DoubleSide });
    materials.set('castle:flag', flagMaterial);
    const towerWindows = Object.fromEntries(Object.entries(CASTLE_TOWER_WINDOWS).map(([key, spec]) => [key, {
      ...spec,
      surround: createCastleArchGeometry(spec.width, spec.spring, spec.height),
      pane: createCastleArchGeometry(spec.innerWidth, spec.innerSpring, spec.innerHeight)
    }]));
    function towerWindow(spec, towerX, face, height) {
      const bottom = height + spec.bottomOffset;
      const windowX = towerX;
      mesh(spec.surround, trim, g, windowX, bottom, face + 2.5);
      mesh(spec.pane, windowGlass, g, windowX, bottom + 2, face + 3);
      box(g, spec.width + 4, 3, 6, trim, windowX, bottom - 1, face + 3);
      box(g, 1.4, spec.innerHeight - 4, 1, '#b7c1ad',
        windowX, bottom + 2 + spec.innerHeight / 2, face + 3.8);
      box(g, spec.innerWidth - 2, 1.3, 1, '#b7c1ad',
        windowX, bottom + 2 + spec.innerHeight * 0.48, face + 3.8);
      box(g, 1, 4, 1, '#d1dfd2', windowX - spec.innerWidth / 4,
        bottom + 5 + spec.innerHeight * 0.5, face + 4.2);
    }
    for (const turret of CASTLE_TOWERS) {
      const { x: towerX, z: towerZ, height, hasBanner } = turret;
      const half = CASTLE_LAYOUT.towerSize / 2;
      const face = towerZ + half;
      stoneBox(g, CASTLE_LAYOUT.towerSize, height, CASTLE_LAYOUT.towerSize, tower, towerX, height / 2, towerZ);
      box(g, 74, 10, 74, shadow, towerX, height - 3, towerZ);
      box(g, 70, 4, 70, trim, towerX, height - 10, towerZ);
      for (let dx = -27; dx <= 27; dx += 18) {
        stoneBox(g, 11, 20, 12, trim, towerX + dx, height + 12, towerZ + 31);
        stoneBox(g, 11, 20, 12, trim, towerX + dx, height + 12, towerZ - 31);
      }
      for (let dz = -18; dz <= 18; dz += 18) {
        stoneBox(g, 12, 20, 11, trim, towerX - 31, height + 12, towerZ + dz);
        stoneBox(g, 12, 20, 11, trim, towerX + 31, height + 12, towerZ + dz);
      }
      for (const edge of [-26, 26]) {
        for (let y = 20, row = 0; y < height - 35; y += 20, row += 1) {
          const width = row % 2 ? 10 : 14;
          box(g, width, 8, 3, trim, towerX + edge, y, face + 1);
        }
      }
      if (hasBanner) {
        towerWindow(towerWindows.upper, towerX, face, height);
        towerWindow(towerWindows.lower, towerX, face, height);
        box(g, 24, 3, 4, metal, towerX, height - 13, face + 3);
        const border = mesh(bannerGeometry, heraldryGold, g, towerX, height - 48, face + 3);
        border.scale.set(1.14, 1.05, 1);
        mesh(bannerGeometry, royalBlue, g, towerX, height - 48, face + 4);
        box(g, 2, 18, 1, heraldryGold, towerX, height - 30, face + 5);
        box(g, 10, 2, 1, heraldryGold, towerX, height - 29, face + 5);
      } else {
        towerWindow(towerWindows.rear, towerX, face, height);
      }
      const flagPosition = castleFlagPosition(turret);
      box(g, 5, 45, 5, '#695a43', flagPosition.x, height + 40, flagPosition.z);
      const flag = mesh(flagGeometry, royalBlue, g, flagPosition.x + 2.5, height + 40, flagPosition.z + 2);
      flag.material = flagMaterial;
      box(g, 2, 16, 1, heraldryGold, flagPosition.x + 5, height + 49, flagPosition.z + 3);
      box(g, 2, 11, 1, heraldryGold, flagPosition.x + 15, height + 49, flagPosition.z + 3);
      box(g, 9, 2, 1, heraldryGold, flagPosition.x + 15, height + 49, flagPosition.z + 3);
    }
    mesh(createCastleArchGeometry(70, 52, 83), trim, g, 0, 8, 65.5);
    mesh(createCastleArchGeometry(52, 49, 73), gate, g, 0, 8, 66);
    for (const plank of CASTLE_GATE_PLANKS) {
      box(g, 9.2, plank.top - 9, 1, plank.color, plank.x, (plank.top + 9) / 2, 66.8);
      box(g, 0.8, plank.top - 13, 1, '#947354', plank.x - 2.5, (plank.top + 11) / 2, 67.5);
      box(g, 1.8, plank.top - 10, 2, gateIron, plank.x, (plank.top + 10) / 2, 68.5);
    }
    for (const dy of [23, 43, 59]) {
      box(g, 50, 3, 2, gateIron, 0, dy, 69);
      for (const dx of [-20, -10, 0, 10, 20]) box(g, 2.5, 2.5, 1.5, metal, dx, dy, 70.5);
    }
    for (const side of [-1, 1]) for (const y of [20, 32, 44, 56]) {
      box(g, 8, 9, 2, '#b4aa95', side * 30.5, y, 67);
    }
    for (let i = 0; i <= 8; i += 1) {
      const angle = i * Math.PI / 8;
      const block = box(g, 8, 10, 2, i % 2 ? '#c1b6a0' : '#b4aa95',
        31 * Math.cos(angle), 60 + 25 * Math.sin(angle), 67);
      block.rotation.z = angle - Math.PI / 2;
    }
    box(g, 28, 4, 4, trim, 0, 109, 65);
    box(g, 19, 23, 3, royalBlue, 0, 121, 65);
    box(g, 3, 15, 2, heraldryGold, 0, 121, 67);
    box(g, 11, 3, 2, heraldryGold, 0, 122, 67);
    for (const windowY of CASTLE_WINDOW_LEVELS) for (const windowX of CASTLE_FRONT_WINDOWS) {
      const windowGroup = new THREE.Group();
      windowGroup.position.set(windowX, windowY, 65);
      windowGroup.scale.x = CASTLE_WINDOW_WIDTH_SCALE;
      g.add(windowGroup);
      windowFrame(windowGroup, 0, 0, 0);
    }
    box(g, 70, 5, 35, '#a6a18f', 0, 3, 82);
  }
  function character(color, longHair = false, hair, belt = '#aa9160', style = null) {
    const g = new THREE.Group();
    const torso = mesh(torsoGeometry, color, g, 0, 37, 0); torso.scale.set(20, 30, 12);
    addCharacterHeadDetails((x, y, z, w, h, d, shade) => box(g, w, h, d, shade, x, y, z),
      (x, y, z, w, h, d, shade) => {
        const part = mesh(headGeometry, shade, g, x, y, z); part.scale.set(w, h, d);
      }, { headY: 60, width: 14, height: 14, depth: 14, skin: '#d7aa83', hair, longHair, hairLength: style?.hairLength });
    if (!longHair && !style) box(g, 16, 25, 3, '#725443', 0, 37, -8);
    box(g, 20, 4, 14, belt, 0, 25, 0);
    if (style?.buckle) box(g, 4, 3, 2, style.buckle, 0, 25, 8);
    const bodyBox = (x, y, z, w, h, d, shade, parent) => box(parent, w, h, d, shade, x, y, z);
    if (style?.shorts) {
      g.userData.legs = createPlayerLegs(g, bodyBox, { offset: 5, height: 23, width: 7, depth: 8,
        shoeColor: '#5a4434', shortsColor: style.shorts, skin: '#d7aa83' });
    } else if (style?.trousers) {
      g.userData.legs = createCharacterLegs(g, bodyBox, 5, '#5a4434', style.trousers);
    } else {
      const left = box(g, 7, 23, 8, '#443e34', -5, 11, 0);
      const right = box(g, 7, 23, 8, '#443e34', 5, 11, 0);
      box(left, 8, 4, 12, '#5a4434', 0, -9, 2);
      box(right, 8, 4, 12, '#5a4434', 0, -9, 2);
      g.userData.legs = [left, right];
    }
    g.userData.arms = createCharacterArms(g, bodyBox, {
      offset: 12.5, shoulderY: 48.5, length: 25, width: 6, depth: 8, color, skin: '#d7aa83',
      shortSleeves: style?.shortSleeves, tattoo: style?.tattoo
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
    const sideQuest = npc.sideQuest !== undefined;
    const person = sideQuest
      ? character(CAT_OUTFIT, false, undefined, CAT_STYLE.belt, CAT_STYLE)
      : character(npc.color, longHair, hair);
    person.position.set(npc.x, 0, npc.y);
    if (npc.prop === 'doll') {
      person.rotation.y = Math.PI / 2;
      const doll = groupAt(npc.x + 42, npc.y);
      box(doll, 15, 20, 10, '#77524e', 0, 12, 0);
      const head = mesh(headGeometry, '#d7bc9d', doll, 0, 28, 0); head.scale.set(12, 12, 12);
      box(doll, 14, 4, 11, '#49332d', 0, 34, 0);
      for (const side of [-1, 1]) {
        box(doll, 4, 14, 5, '#d7bc9d', side * 9, 15, 0);
        box(doll, 2, 2, 2, '#4d302c', side * 3, 29, 6);
      }
    } else if (npc.prop === 'cup') {
      const cup = mesh(new THREE.CylinderGeometry(6, 4, 16, 10), '#d6a957', person, 14, 34, 8);
      cup.rotation.z = -0.15;
      mesh(new THREE.CylinderGeometry(6.5, 6.5, 2, 10), '#eee0ae', person, 14, 43, 8);
    } else if (npc.prop === 'tickets') {
      box(person, 18, 12, 2, '#cfb783', 10, 40, 9);
      box(person, 18, 12, 2, '#eed8a0', 13, 37, 11);
      box(person, 2, 10, 3, '#a6764c', 13, 37, 12);
    } else if (npc.prop === 'grave') {
      person.rotation.y = Math.PI / 2;
      const shovel = box(person, 3, 43, 3, '#a88154', -14, 21, 8);
      shovel.rotation.z = -0.2;
      box(person, 12, 8, 3, '#a2a9a0', -18, 2, 8);
      const grave = groupAt(npc.x + 48, npc.y);
      box(grave, 58, 2, 32, '#3c2d25', 0, 1, 0);
      box(grave, 23, 8, 12, '#5c6e70', -2, 5, 0);
      const head = mesh(headGeometry, '#d7aa83', grave, 16, 8, 0); head.scale.set(12, 12, 12);
      const davidLabel = textSprite('DAVID WHITE', 'rgba(24, 40, 37, .9)', 256);
      davidLabel.position.y = 42; grave.add(davidLabel);
    }
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
    label.position.set(index === 3 ? -90 : 0, index === 1 ? 32 : 48, index === 3 ? 40 : index === 1 ? 55 : 0);
    marker.add(label);
    return label;
  });

  castle(CASTLE_LAYOUT.x, CASTLE_LAYOUT.y);
  const worldSupplyGroup = groupAt(0, 0);
  WORLD_SUPPLIES.forEach((item) => supply(worldSupplyGroup, { ...item, z: item.y }, 0));
  house(WORLD_SPAWN.x - 205, WORLD_SPAWN.y - 95, false, 0.8);
  const [escape, , park, forest, harvest] = QUEST_LOCATIONS;
  house(escape.x - 70, escape.y - 185, true, 1.15);
  TOWN_VENUES.forEach((venue) => {
    const building = house(venue.x, venue.y, false, venue.size);
    if (venue.kind !== 'games') {
      for (const awning of STOREFRONT_AWNINGS) {
        const canopy = box(building, awning.width, 3, 21, venue.awning, awning.x, 75, 58);
        canopy.rotation.x = 0.18;
        for (const offset of awning.stripeOffsets) {
          const stripe = box(building, awning.stripeWidth, 3.2, 21, '#e8d8ba', awning.x + offset, 75.15, 58);
          stripe.rotation.x = canopy.rotation.x;
        }
        box(building, awning.width, 3, 2, venue.awning, awning.x, 71.5, 68);
      }
    }
    const signTexture = createVenueSignTexture(venue.name, venue.motif);
    textures.add(signTexture);
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture, transparent: true, depthTest: false }));
    sign.scale.set(106.67, 16.67, 1);
    sign.position.set(0, 110, 56); building.add(sign);
    if (venue.kind === 'games') {
      const texture = createGamesSignTexture();
      textures.add(texture);
      const activities = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
      activities.scale.set(100, 15.625, 1);
      activities.position.set(0, 85, 58); building.add(activities);
    }
  });
  function church() {
    const g = groupAt(TOWN_CHURCH.x, TOWN_CHURCH.y);
    stoneBox(g, 170, 12, 170, CHURCH_STONE.base, 0, 6, 0);
    stoneBox(g, 150, 88, 150, CHURCH_STONE.wall, 0, 56, 0);
    roof(g, 162, 162, 55, CHURCH_WOOD, 100);
    stoneBox(g, 54, 150, 54, CHURCH_STONE.tower, 0, 75, 55);
    stoneBox(g, 58, 5, 58, CHURCH_STONE.base, 0, 148, 55);
    const steeple = mesh(new THREE.ConeGeometry(42, 52, 4), CHURCH_WOOD, g, 0, 176, 55);
    textured(steeple, 'roof', CHURCH_WOOD);
    steeple.rotation.y = Math.PI / 4;
    box(g, 4, 25, 4, '#dfcf9c', 0, 213, 55);
    box(g, 16, 4, 4, '#dfcf9c', 0, 217, 55);
    for (const side of [-1, 1]) {
      box(g, 32, 54, 5, '#54493e', 0, 39, side < 0 ? -77 : 84);
      const doorZ = side < 0 ? -80 : 87;
      texturedBox(g, 24, 46, 6, CHURCH_WOOD, 0, 36, doorZ);
      const doorFace = doorZ + side * 3.5;
      for (const x of [-7, -2, 3, 8]) box(g, 0.8, 41, 1, '#4e3b2e', x, 36, doorFace);
      for (const y of [23, 49]) box(g, 20, 2, 1, '#4e3b2e', 0, y, doorFace);
      box(g, 2, 3, 2, '#d7b574', 7, 36, doorFace + side);
      for (const x of [-43, 43]) {
        box(g, 20, 32, 5, CHURCH_STONE.trim, x, 63, side * 77);
        box(g, 14, 26, 6, '#6c9094', x, 63, side * 80);
        box(g, 2, 26, 7, '#c2b99f', x, 63, side * 80);
        box(g, 14, 2, 7, '#c2b99f', x, 63, side * 80);
      }
      box(g, 5, 37, 22, CHURCH_STONE.trim, side * 77, 65, 0);
      box(g, 6, 30, 16, '#6c9094', side * 80, 65, 0);
    }
    box(g, 26, 38, 5, CHURCH_STONE.trim, 0, 108, 83);
    box(g, 18, 30, 6, '#6b8990', 0, 108, 86);
    box(g, 2, 30, 7, CHURCH_STONE.trim, 0, 108, 86);
    box(g, 18, 2, 7, CHURCH_STONE.trim, 0, 108, 86);
  }
  church();
  const escapeSign = textSprite('ESCAPE ROOM', 'rgba(36, 41, 38, .95)');
  escapeSign.position.set(escape.x - 70, 120, escape.y - 125); scene.add(escapeSign);

  function lamp(x, z, color) {
    const g = groupAt(x, z);
    const frame = paletteColor(['#5e594c', '#615848', '#685846', '#575548'], x, z, 91);
    const post = paletteColor(['#504b3e', '#5a4f3e', '#554c41', '#665340'], x, z, 92);
    box(g, 14, 7, 14, frame, 0, 4, 0);
    mesh(new THREE.CylinderGeometry(2.4, 3.2, 65, 8), post, g, 0, 37, 0);
    mesh(new THREE.CylinderGeometry(5, 6, 4, 8), frame, g, 0, 10, 0);
    mesh(new THREE.CylinderGeometry(4, 4, 3, 8), frame, g, 0, 66, 0);
    box(g, 17, 22, 17, frame, 0, 77, 0);
    box(g, 12, 16, 18, color ?? paletteColor(['#f8cc77', '#f2d89b', '#ead08a', '#e3b976', '#d8d0a0'], x, z, 93), 0, 77, 0);
    for (const side of [-1, 1]) {
      box(g, 2, 18, 19, frame, side * 7, 77, 0);
    }
    box(g, 17, 2, 19, frame, 0, 77, 0);
    box(g, 2, 18, 1, frame, 0, 77, 9.5);
    mesh(new THREE.ConeGeometry(14, 12, 4), post, g, 0, 93, 0).rotation.y = Math.PI / 4;
    mesh(new THREE.SphereGeometry(2.5, 8, 6), frame, g, 0, 100, 0);
  }
  function bench(x, z) {
    const g = groupAt(x, z);
    const wood = paletteColor(['#876646', '#936e4b', '#806043', '#9a744e', '#765a40'], x, z, 101);
    const frame = paletteColor(['#5c4c3b', '#65503c', '#55483b', '#70553d'], x, z, 102);
    for (const zOffset of [-7, 0, 7]) texturedBox(g, 58, 4, 6, wood, 0, 19, zOffset);
    for (const side of [-22, 22]) {
      for (const zOffset of [-7, 7]) box(g, 4, 18, 4, frame, side, 9, zOffset);
      box(g, 4, 30, 4, frame, side, 25, -8);
    }
    for (const height of [27, 34, 41]) texturedBox(g, 58, 5, 3, wood, 0, height, -8);
    for (const side of [-22, 22]) {
      box(g, 2, 2, 1, '#c8af7d', side, 34, -6);
      box(g, 2, 2, 1, '#c8af7d', side, 41, -6);
    }
  }
  function stall(x, z, color) {
    const g = groupAt(x, z);
    const wood = paletteColor(['#7b6047', '#866749', '#745b43', '#8a6a4b'], x, z, 111);
    const trim = paletteColor(['#a78c64', '#b1966d', '#9e8764', '#b49a72'], x, z, 112);
    const stripe = paletteColor(['#dfcba0', '#e8d8ba', '#d7c6a0', '#ead9b5'], x, z, 113);
    box(g, 75, 38, 40, wood, 0, 19, 0);
    box(g, 82, 5, 45, trim, 0, 40, 0);
    for (const side of [-34, 34]) box(g, 5, 60, 5, wood, side, 67, -16);
    box(g, 84, 6, 55, color, 0, 99, 0);
    for (let stripeIndex = 0, stripePosition = -3; stripePosition <= 3; stripePosition += 2, stripeIndex += 1) {
      box(g, 10, 7, 55, stripeIndex % 2 ? trim : stripe, stripePosition * 10, 100, 0);
    }
    for (const side of [-20, 0, 20]) box(g, 9, 12, 9, trim, side, 48, 0);
  }
  function cafeTable(x, z) {
    const g = groupAt(x, z);
    const wood = paletteColor(['#ae8f68', '#a8855e', '#ba9870', '#9d805e'], x, z, 121);
    const frame = paletteColor(['#5f4b39', '#69523d', '#55483b', '#715640'], x, z, 122);
    mesh(new THREE.CylinderGeometry(3, 5, 22, 8), frame, g, 0, 11, 0);
    mesh(new THREE.CylinderGeometry(11, 11, 2, 16), frame, g, 0, 1, 0);
    textured(mesh(new THREE.CylinderGeometry(20, 20, 4, 24), wood, g, 0, 23, 0), 'wood', wood);
    for (const offset of [-9, 0, 9]) {
      box(g, Math.sqrt(400 - offset * offset) * 2 - 1, 0.3, 0.6, '#806344', 0, 25.1, offset);
    }
    for (const side of [-27, 27]) {
      mesh(new THREE.CylinderGeometry(3, 4, 12, 8), frame, g, side, 6, 0);
      textured(mesh(new THREE.CylinderGeometry(7, 7, 3, 12), wood, g, side, 13, 0), 'wood', wood);
    }
    mesh(new THREE.CylinderGeometry(4, 3, 7, 12), '#d6c6a5', g, 0, 28.5, 0);
    mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.4, 12), '#7a553a', g, 0, 32.1, 0);
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
  function frightMarquee(x, z) {
    const g = groupAt(x, z);
    for (const side of [-1, 1]) {
      const postX = side * FRIGHT_MARQUEE.postOffset;
      texturedBox(g, 14, 128, 16, '#644735', postX, 64, 0);
      box(g, 20, 7, 22, '#9d774d', postX, 4, 0);
      box(g, 18, 6, 20, '#a68050', postX, 118, 0);
    }
    box(g, 178, 5, 50, '#493128', 0, 162, -14);
    for (let i = 0; i < 9; i += 1) {
      box(g, 19.5, 3, 46, i % 2 ? '#c29c62' : '#773f34', -78 + i * 19.5, 166, -14);
    }
    box(g, 178, 54, 12, '#493128', 0, 137, 8);
    const texture = createFrightMarqueeTexture();
    textures.add(texture);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(174, 50), new THREE.MeshBasicMaterial({ map: texture }));
    geometries.add(sign.geometry);
    sign.position.set(0, 137, 14.1);
    g.add(sign);
  }
  [WORLD_SPAWN, escape, park, harvest].forEach((location) => {
    lamp(location.x - 75, location.y - 50);
    lamp(location.x + 95, location.y + 75);
  });
  TOWN_LAMPS.forEach(({ x, y }) => lamp(x, y));
  TOWN_BENCHES.forEach(({ x, y }) => bench(x, y));
  TOWN_TABLES.forEach(({ x, y }) => cafeTable(x, y));
  stall(park.x + 205, park.y + 45, '#9e6254');
  stall(park.x - 380, park.y + 260, '#788a88');
  stall(park.x + 350, park.y + 300, '#a56e50');
  gate(park.x - 180, park.y - 60, 'THIRTEEN', '#79594e');
  frightMarquee(harvest.entrance.x, harvest.entrance.y);
  gate(forest.entrance.x, forest.entrance.y, 'GOAPE', '#4b6348');

  placeQuestDecorations(escape, 'escape', 22, 560, 12).forEach(({ x, y, variant, scale, rotation }) => {
    const grave = groupAt(x, y);
    grave.rotation.y = rotation;
    grave.rotation.z = rotation * 0.18;
    grave.scale.setScalar(scale);
    const stone = paletteColor(['#6e746c', '#85877b', '#928f80', '#72796f', '#9c9885'], x, y, 43);
    const engraving = paletteColor(['#a4a79a', '#b5b4a1', '#c2bda5', '#a8b0a2', '#c4bea8'], x, y, 44);
    box(grave, 26, 5, 18, paletteColor(['#555d56', '#66685e', '#706c60', '#596158'], x, y, 45), 0, 3, 0);
    if (variant === 0) {
      box(grave, 22, 38, 10, stone, 0, 22, 0);
      box(grave, 4, 22, 2, engraving, 0, 25, 6);
      box(grave, 14, 4, 2, engraving, 0, 29, 6);
    } else if (variant === 1) {
      box(grave, 24, 25, 10, stone, 0, 17, 0);
      const top = mesh(new THREE.CylinderGeometry(12, 12, 10, 12, 1, false, 0, Math.PI), stone, grave, 0, 29, 0);
      top.rotation.x = Math.PI / 2;
      box(grave, 14, 2, 2, engraving, 0, 20, 6);
    } else {
      box(grave, 7, 42, 8, stone, 0, 24, 0);
      box(grave, 25, 7, 8, stone, 0, 34, 0);
    }
  });
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
  const corn = cornStalks(worldCornWalls());
  const pumpkinGeometries = [0, 1, 2].map(createPumpkinGeometry);
  const pumpkinMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
  materials.set('pumpkins', pumpkinMaterial);
  const pumpkinStem = new THREE.CylinderGeometry(1.8, 2.8, 7, 6);
  const pumpkinEyeShape = new THREE.Shape();
  pumpkinEyeShape.moveTo(-2, 1.5);
  pumpkinEyeShape.lineTo(2, 1.5);
  pumpkinEyeShape.lineTo(0, -2);
  pumpkinEyeShape.closePath();
  const pumpkinEye = new THREE.ShapeGeometry(pumpkinEyeShape);
  const pumpkinMouthShape = new THREE.Shape();
  pumpkinMouthShape.moveTo(-5, 1);
  pumpkinMouthShape.quadraticCurveTo(0, -4, 5, 1);
  pumpkinMouthShape.quadraticCurveTo(0, -5, -5, 1);
  const pumpkinMouth = new THREE.ShapeGeometry(pumpkinMouthShape);
  const pumpkinFace = material('#4d3827');
  harvestPumpkins().forEach(({ x, y, variant, scale, rotation }) => {
    const pumpkin = groupAt(x, y);
    pumpkin.rotation.y = rotation;
    pumpkin.scale.setScalar(scale);
    const body = new THREE.Mesh(pumpkinGeometries[variant], pumpkinMaterial);
    geometries.add(pumpkinGeometries[variant]);
    body.position.y = 12;
    pumpkin.add(body);
    mesh(pumpkinStem, paletteColor(['#556241', '#687044', '#717344', '#5d6b43'], x, y, 62), pumpkin, 0, 26, 0);
    if (pumpkinHasFace(variant)) {
      const leftEye = new THREE.Mesh(pumpkinEye, pumpkinFace);
      leftEye.position.set(-4.5, 15, 13);
      pumpkin.add(leftEye);
      const rightEye = new THREE.Mesh(pumpkinEye, pumpkinFace);
      rightEye.position.set(4.5, 15, 13);
      pumpkin.add(rightEye);
      const mouth = new THREE.Mesh(pumpkinMouth, pumpkinFace);
      mouth.position.set(0, 8.5, 13.5);
      pumpkin.add(mouth);
      geometries.add(pumpkinEye);
      geometries.add(pumpkinMouth);
    }
  });

  const treeData = [...worldTrees(), ...surroundingTrees()];
  function instances(data, geometry, color, transform, instanceMaterial = material(color)) {
    geometries.add(geometry);
    const instanced = new THREE.InstancedMesh(geometry, instanceMaterial, data.length);
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
  const cornTexture = createCornTexture();
  cornTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  textures.add(cornTexture);
  const cornMaterial = new THREE.MeshStandardMaterial({ map: cornTexture, vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  materials.set('corn-stalks', cornMaterial);
  for (let variant = 0; variant < 5; variant += 1) {
    instances(corn.filter((stalk) => stalk.variant === variant), createCornGeometry(variant), null, (o, stalk) => {
      o.position.set(stalk.x, 0, stalk.z);
      o.rotation.y = stalk.angle;
      o.scale.setScalar(stalk.size);
    }, cornMaterial);
  }
  const barkTexture = createTreeBarkTexture();
  barkTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  textures.add(barkTexture);
  const treeBarkMaterial = new THREE.MeshStandardMaterial({ map: barkTexture, vertexColors: true, roughness: 1 });
  materials.set('tree-bark', treeBarkMaterial);
  const foliageTexture = createFoliageTexture();
  foliageTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  textures.add(foliageTexture);
  const foliageMaterial = new THREE.MeshStandardMaterial({ map: foliageTexture, vertexColors: true, roughness: 1 });
  materials.set('tree-foliage', foliageMaterial);
  const leafTrees = treeData.filter((t) => t.region !== 'escape' && t.region !== 'forest');
  for (let variant = 0; variant < 3; variant += 1) {
    const trees = leafTrees.filter((tree) => tree.variant === variant);
    const placeTree = (o, t) => {
      o.position.set(t.x, 0, t.z);
      o.rotation.y = t.angle;
      o.scale.setScalar(t.size);
    };
    instances(trees, createLeafyBranches(variant), null, placeTree, treeBarkMaterial);
    instances(trees, createLeafyCanopy(variant), null, placeTree, foliageMaterial);
  }
  const pines = treeData.filter((t) => t.region === 'forest');
  const needleTexture = createNeedleTexture();
  needleTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  textures.add(needleTexture);
  const needleMaterial = new THREE.MeshStandardMaterial({ map: needleTexture, vertexColors: true, roughness: 1 });
  materials.set('fir-needles', needleMaterial);
  const platformTrees = CANOPY_PLATFORMS.map(platformFirLayout);
  for (let variant = 0; variant < 3; variant += 1) {
    const trees = pines.filter((tree) => tree.variant === variant);
    const platforms = platformTrees.filter((tree) => tree.variant === variant);
    const placeTree = (o, t) => {
      o.position.set(t.x, 0, t.z);
      o.rotation.y = t.angle;
      o.scale.setScalar(t.size);
    };
    instances(trees, createFirTrunk(variant), null, placeTree, treeBarkMaterial);
    const firCanopy = createFirCanopy(variant);
    instances(trees, firCanopy, null, placeTree, needleMaterial);
    instances(platforms, createPlatformFirTrunk(variant), null, (o, t) => {
      o.position.set(forest.x + CANOPY_OFFSET.x + t.x, 0, forest.y + CANOPY_OFFSET.z + t.z);
      o.rotation.y = t.angle;
      o.scale.set(1, t.trunkHeight, 1);
    }, treeBarkMaterial);
    instances(platforms, firCanopy, null, (o, t) => {
      o.position.set(forest.x + CANOPY_OFFSET.x + t.x, t.canopyBase, forest.y + CANOPY_OFFSET.z + t.z);
      o.rotation.y = t.angle;
      o.scale.set(t.canopyWidth, t.canopyHeight, t.canopyWidth);
    }, needleMaterial);
  }
  const deadTrees = treeData.filter((t) => t.region === 'escape');
  for (let variant = 0; variant < 3; variant += 1) {
    instances(deadTrees.filter((tree) => tree.variant === variant), createDeadTreeGeometry(variant), null, (o, t) => {
      o.position.set(t.x, 0, t.z);
      o.rotation.y = t.angle;
      o.scale.setScalar(t.size);
    }, treeBarkMaterial);
  }
  const rocks = treeData.filter((t) => t.variant === 0);
  const rockTexture = createRockTexture();
  rockTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  textures.add(rockTexture);
  const rockMaterial = new THREE.MeshStandardMaterial({ map: rockTexture, vertexColors: true, roughness: 1 });
  materials.set('natural-rock', rockMaterial);
  for (let variant = 0; variant < 3; variant += 1) {
    instances(rocks.filter((tree) => rockVariant(tree.x, tree.z) === variant), createRockGeometry(variant), null, (o, t) => {
      o.position.set(t.x + 48, 6, t.z + 18);
      o.rotation.y = t.size;
    }, rockMaterial);
  }
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
    { x: CASTLE_LAYOUT.x + 20, z: CASTLE_LAYOUT.y + CASTLE_LAYOUT.centerOffset + 25,
      width: CASTLE_LAYOUT.width + 110, depth: CASTLE_LAYOUT.depth + 85 },
    { x: escape.x - 65, z: escape.y - 160, width: 230, depth: 170 },
    ...TOWN_VENUES.map((venue) => ({ x: venue.x + 20, z: venue.y + 15, width: 190 * venue.size, depth: 140 * venue.size })),
    { x: TOWN_CHURCH.x + 20, z: TOWN_CHURCH.y + 20, width: 230, depth: 205 }
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
    if (roadDistance({ x, y: z }) < 65 || isTownPlaza({ x, y: z })) continue;
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
      townsfolk.forEach((person, index) => {
        const npc = WORLD_NPCS[index];
        if (npc.prop === 'pace') {
          const position = sideQuestPosition(npc, time);
          person.position.x = position.x;
          person.rotation.y = Math.cos(time / 650) >= 0 ? Math.PI / 2 : -Math.PI / 2;
          const step = Math.sin(time / 120) * 0.35;
          person.userData.legs[0].rotation.x = step;
          person.userData.legs[1].rotation.x = -step;
          swingCharacterArms(person.userData.arms, step);
        } else if (npc.sideQuest !== undefined) {
          const facing = npc.prop === 'doll' || npc.prop === 'grave' ? Math.PI / 2 : 0;
          person.rotation.y = facing + Math.sin(time / 1300) * 0.08;
        }
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
      surroundingMaterial.dispose();
      renderer.dispose();
    }
  };
}
