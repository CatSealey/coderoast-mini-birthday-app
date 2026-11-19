import * as THREE from 'three';
import { CANOPY_COURSE_LENGTH, CANOPY_CROSSINGS, CANOPY_PLATFORMS, CANOPY_ZIPLINE, LEGACY_CANOPY_ZIPLINE, OBJECTS, POOL_TABLE_FOOTPRINT, PUB_EXIT, PUB_PARTNER_OFFSET, PUB_STOOLS, adventureObjectDistance, couplePartnerPosition } from './adventure-logic.js';
import { COASTER_PLATFORM, COASTER_RAIL_OFFSET, COASTER_REJOIN_PROGRESS, COASTER_TREATS, coasterDirection, coasterHeading, coasterLanePosition, coasterPosition, coasterRailPosition } from './coaster-course.js';
import { COASTER_ITEM_SCALE, drawCoasterItem } from './coaster-art.js';
import { poolMissOffset } from './pool-shot-animation.js';
import { createCharacterLegs, createFootSupportSurface, createPlayerLegs, supportCharacterFeet, swingCharacterLegs } from './character-legs.js';
import { CAT_OUTFIT, CAT_STYLE, PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker, facingForMovement } from '../character-appearance.js';
import { CHARACTER_RISE, addCharacterBelt, addCharacterClothingDetails, createCharacterArms, createCharacterFaceGeometry, createCharacterHeadGeometry, createCharacterLimbGeometry, createCharacterSkinGeometry, createCharacterTorsoGeometry, poseCharacterHoldingHand, swingCharacterArms } from '../character-body.js';
import { createFirCanopy, createFirTrunk, createNeedleTexture, createPlatformFirTrunk } from '../world/fir-tree.js';
import { createTreeBarkTexture } from '../world/tree-geometry.js';
import { CANOPY_EDGE_TREES, CANOPY_FOREST_TREES } from './canopy-scenery.js';
import { createCanopyRopes, drawCanopyCrossing } from './canopy-rope.js';
import { canopyLanternColor, canopyPlatformLightColor, drawCanopyLight } from './canopy-lights.js';
import { createCanopyForestLights, drawCanopyForest } from './canopy-tree-lights.js';
import { CANOPY_SAFETY_WIRE, ZIP_CABLE_SCREEN_OFFSET, addZipCable, canopySafetyAnchor, createZipRide, drawZipCable, drawZipHarness, drawZipTether, setZipRiderPose } from './canopy-zipline.js';
import { createCanopyDeckTexture, drawCanopyDeck } from '../world/canopy-platform.js';
import { createParkGroundCanvas, createParkGroundTexture, drawParkCar, PARK_PALETTE } from '../world/park-style.js';
import { THIRTEEN_TREES, addThirteenRuins, addThirteenStation, addThirteenVault, drawThirteenScenery, drawThirteenVault, paintThirteenSign } from './thirteen-scenery.js';
import { PUB_CAMERA_OFFSET, PUB_FURNITURE_PALETTE, PUB_POOL_LIGHTS, PUB_RACK_CUES, PUB_RUG, PUB_SHORT_CUE_SCALE, addPubCue, addPubDrinksTable, addPubFurnitureDetails, addPubStoolDetails, addPubTableStool, addPubWallDetails, attachPubCatCue, drawPubHeldCue, drawPubInterior, drawPubObject, paintPubFloor, paintPubRug, pubCameraFraming, pubCatHoldsCue, pubCuesTaken } from './pub-interior-art.js';

const BARTENDER_OUTFIT = '#536c67';
const BARTENDER_STYLE = Object.freeze({ trousers: '#332f2b', belt: '#1e201e', hairLength: 'short' });

export function createAdventureScene(canvas, index, onSelect, characterName) {
  const probe = document.createElement('canvas').getContext('webgl2');
  const available = Boolean(probe);
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const renderer = available ? new THREE.WebGLRenderer({ canvas, antialias: true }) : null;
  const ctx = renderer ? null : canvas.getContext('2d');
  if (!renderer && !ctx) throw new Error('Could not initialize the quest scene.');
  const parkGround = !renderer && index === 2 ? createParkGroundCanvas() : null;
  function pubCanvas(width, height, paint) {
    const image = document.createElement('canvas'); image.width = width; image.height = height;
    const context = image.getContext('2d');
    if (!context) throw new Error('Could not create the pub artwork.');
    paint(context);
    return image;
  }
  const pubFloor = index === 1 ? pubCanvas(1000, 700, paintPubFloor) : null;
  const pubRug = index === 1 ? pubCanvas(340, 195, paintPubRug) : null;
  const thirteenSign = index === 2 ? pubCanvas(512, 200, paintThirteenSign) : null;
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
  const raycaster = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const torsoGeometry = createCharacterTorsoGeometry();
  const shapedTorsoGeometry = createCharacterTorsoGeometry({ shaped: true });
  const characterHeadGeometry = createCharacterHeadGeometry();
  const characterFaceGeometry = createCharacterFaceGeometry();
  const characterLimbGeometry = createCharacterLimbGeometry();
  const characterSkinGeometry = createCharacterSkinGeometry();
  const sphereGeometry = new THREE.SphereGeometry(0.5, 12, 8);
  const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const coneGeometry = new THREE.ConeGeometry(0.5, 1, 8);
  const triangleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 3);
  const materials = new Map(), textures = [], sceneryGeometries = [], interactive = [], platformMeshes = [];
  const pubFootSurfaces = [];
  const collectibles = new Map(), beacons = new Map(), rideTreats = new Map(), rideItemImages = new Map();
  let state, player, train, ball, platformAmor, width = 1, height = 1, scale = 1, ballAnimation = 0, lastBallLost = false;
  let platformCarriage, pubLove, pubExitMarker, dropTrack, canopyRopes, zipRide, legacyZipCable;
  let cueGuide, poolBalls, placedCue, catCue, rackTakenCues, placedDrinks, previousPlayer, walkPhase = 0, facing = 0, pendingFacing = null;
  let poolMiss = null;
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
    const texture = new THREE.CanvasTexture(pubFloor); texture.colorSpace = THREE.SRGBColorSpace;
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
  function person(color, x, z, parent = scene, style = {}) {
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    const bodyGeometry = style.shorts || style.tattoo ? shapedTorsoGeometry : torsoGeometry;
    round(bodyGeometry, 0, 39 + CHARACTER_RISE, 0, 26, 38, 17, color, group);
    addCharacterClothingDetails((px, py, pz, w, h, d, shade) => box(px, py, pz, w, h, d, shade, group),
      { width: 26, height: 38, depth: 17, centerY: 39 + CHARACTER_RISE, color, kind: style.shorts ? 'player' : style.tattoo ? 'cat' : 'npc', limbGeometry: characterLimbGeometry, torsoGeometry: bodyGeometry });
    addCharacterHeadDetails((px, py, pz, w, h, d, shade) => box(px, py, pz, w, h, d, shade, group),
      (px, py, pz, w, h, d, shade) => round(characterHeadGeometry, px, py, pz, w, h, d, shade, group),
      { headY: 70 + CHARACTER_RISE, width: 19, height: 20, depth: 19, skin: '#dfb38c', hairLength: style.hairLength,
        face: (px, py, pz, w, h, d, shade) => round(characterFaceGeometry, px, py, pz, w, h, d, shade, group) });
    group.userData.legs = style.shorts
      ? createPlayerLegs(group, box, { offset: 7, height: 22 + CHARACTER_RISE, shoeColor: '#594336', shortsColor: style.shorts, skin: '#dfb38c', limbGeometry: characterLimbGeometry, skinGeometry: characterSkinGeometry })
      : createCharacterLegs(group, box, 7, '#594336', style.trousers, characterLimbGeometry, { height: 22 + CHARACTER_RISE, shapedHips: Boolean(style.tattoo) });
    addCharacterBelt((px, py, pz, w, h, d, shade) => box(px, py, pz, w, h, d, shade, group),
      { width: 26, depth: 17, y: 27 + CHARACTER_RISE, color: style.belt || '#a98e60', buckle: style.buckle || (!style.shorts && !style.tattoo ? '#d3b47a' : undefined), limbGeometry: characterLimbGeometry });
    group.userData.arms = createCharacterArms(group, box, {
      offset: 16, shoulderY: 54 + CHARACTER_RISE, length: 28, width: 7, depth: 8, color, skin: '#dfb38c',
      shortSleeves: style.shortSleeves, tattoo: style.tattoo, limbGeometry: characterLimbGeometry, skinGeometry: characterSkinGeometry
    });
    return group;
  }
  function carriage(withRiders = false) {
    const group = new THREE.Group(); scene.add(group);
    box(0, 18, 0, 70, 35, 42, '#675143', group);
    box(0, 38, -17, 72, 25, 8, '#493d34', group);
    box(0, 34, 20, 74, 10, 6, '#9e896b', group);
    box(0, 4, 0, 74, 8, 45, '#38372f', group);
    for (const z of [-21, 21]) {
      box(0, 12, z, 68, 4, 2, PARK_PALETTE.iron, group);
      box(0, 24, z, 64, 3, 2, PARK_PALETTE.brass, group);
      for (const x of [-18, 18]) {
        box(x, 17, z * 1.03, 27, 11, 1, '#7e6550', group);
        box(x, 17, z * 1.06, 21, 2, 1, '#b39b74', group);
      }
      for (const x of [-26, 26]) box(x, 21, z * 1.05, 3, 3, 2, PARK_PALETTE.cream, group);
    }
    for (const x of [-17, 17]) {
      box(x, 32, -12, 24, 21, 3, '#805e49', group);
      box(x, 29, 2, 20, 3, 23, '#977557', group);
      box(x, 45, -14, 23, 3, 4, '#b29a75', group);
      for (const side of [-1, 1]) box(x + side * 11, 43, 6, 3, 15, 5, '#46443a', group);
      box(x, 50, 8, 24, 3, 4, '#8e8d7b', group);
    }
    for (const x of [-25, 25]) for (const z of [-24, 24]) {
      round(cylinderGeometry, x, 9, z, 15, 7, 15, '#252f2c', group).rotation.z = Math.PI / 2;
      round(cylinderGeometry, x, 9, z * 1.06, 6, 8, 6, PARK_PALETTE.brass, group).rotation.z = Math.PI / 2;
    }
    if (withRiders) for (const [x, color, style] of [[-17, PLAYER_OUTFIT, PLAYER_STYLE], [17, CAT_OUTFIT, CAT_STYLE]]) {
      const rider = person(color, x, 0, group, style); rider.position.y = 18; rider.scale.set(0.7, 0.7, 0.7);
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
      const bartender = object.id === 'bartender';
      mesh = person(bartender ? BARTENDER_OUTFIT : CAT_OUTFIT, x, z, scene,
        bartender ? BARTENDER_STYLE : CAT_STYLE);
      if (bartender) {
        // A raised service floor keeps the bartender visible behind the counter.
        mesh.position.y = 50;
      }
      if (object.id === 'amor') platformAmor = mesh;
      if (index === 1 && object.id === 'love') {
        pubLove = mesh;
        catCue = new THREE.Group();
        attachPubCatCue(catCue, pubLove.userData.arms[0]);
        addPubCue({ box, round, cylinder: cylinderGeometry, parent: catCue }, 0, 26, 0);
      }
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
        mesh = box(x, 46.5, z, POOL_TABLE_FOOTPRINT.width, 35, 125, '#65482f');
        box(x, 68, z, 205, 8, 110, '#397852');
        for (const dz of [-61, 61]) box(x, 75, z + dz, 220, 14, 9, '#b48a51');
        for (const dx of [-108, 108]) box(x + dx, 75, z, 9, 14, 115, '#b48a51');
        for (const dx of [-80, 80]) for (const dz of [-40, 40]) {
          box(x + dx, 19, z + dz, 15, 38, 15, '#483527');
        }
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
        placedCue = new THREE.Group(); placedCue.position.set(x - 117.5, 45 * PUB_SHORT_CUE_SCALE, z);
        placedCue.scale.y = PUB_SHORT_CUE_SCALE;
        placedCue.rotation.z = -0.17; scene.add(placedCue);
        addPubCue({ box, round, cylinder: cylinderGeometry, parent: placedCue }, 0, 0, 0);
        cueGuide = box(x - 5, 80, z, 120, 2, 2, '#fff3be', scene, true);
      } else if (kind === 'table') {
        placedDrinks = new THREE.Group(); scene.add(placedDrinks);
        mesh = addPubDrinksTable(object, { box, round, cylinder: cylinderGeometry, parent: scene, drinksParent: placedDrinks });
      } else if (kind === 'rack') {
        mesh = box(x, 45, z, 80, 90, 15, '#60422e');
        rackTakenCues = new THREE.Group(); scene.add(rackTakenCues);
        for (const { offset, taken, short } of PUB_RACK_CUES) {
          const cue = new THREE.Group(); cue.position.set(x + offset, 3, z + 9);
          if (short) cue.scale.y = PUB_SHORT_CUE_SCALE;
          (taken ? rackTakenCues : scene).add(cue);
          addPubCue({ box, round, cylinder: cylinderGeometry, parent: cue }, 0, 45, 0);
        }
      } else if (kind === 'tools') {
        mesh = box(x, 45, z, 75, 90, 38, PUB_FURNITURE_PALETTE.tools.body);
      } else if (kind === 'locker') {
        mesh = new THREE.Group();
        mesh.position.set(x, h, z);
        scene.add(mesh);
        const depth = object.footprint.depth - 2;
        const front = depth / 2;
        box(0, 51, 0, 60, 102, depth, '#59686b', mesh);
        for (const dx of [-15, 15]) {
          box(dx, 51, front + 0.5, 27, 94, 2, '#829395', mesh);
          for (const dy of [77, 82, 87]) box(dx, dy, front + 2, 16, 2, 1, '#3c4c50', mesh);
          box(dx + 8, 48, front + 2.5, 3, 11, 2, '#303e42', mesh);
        }
        box(0, 103, 0, 62, 3, depth + 2, '#9ba6a2', mesh);
      } else if (kind === 'note') {
        mesh = box(x, 77, z, 54, 4, 27, '#704b33');
        mesh.rotation.x = 0.32;
      } else if (kind === 'net' || kind === 'rope') {
        const crossing = CANOPY_CROSSINGS[object.id];
        const [endX, , endHeight] = crossing.end;
        if (kind === 'net') {
          mesh = canopyRopes.add([x, h + 6, z - 38], [endX, endHeight + 6, z - 38], 5);
          for (let dz = -20; dz <= 40; dz += 20) canopyRopes.add([x, h + 6, z + dz], [endX, endHeight + 6, z + dz], 4);
          const segments = Math.ceil((endX - x) / 25);
          for (let i = 0; i <= segments; i += 1) {
            const px = x + (endX - x) * i / segments, py = h + 6 + (endHeight - h) * i / segments;
            canopyRopes.add([px, py, z - 42.5], [px, py, z + 42.5], 5);
          }
        } else {
          mesh = canopyRopes.add([x, h + 5, z], [endX, endHeight + 5, z], 7);
          for (const dz of [-27, 27]) canopyRopes.add([x, h + 55, z + dz], [endX, endHeight + 55, z + dz], 4);
          const segments = Math.ceil((endX - x) / 30);
          for (let i = 0; i <= segments; i += 1) for (const dz of [-27, 27]) {
            const px = x + (endX - x) * i / segments, py = h + 5 + (endHeight - h) * i / segments;
            canopyRopes.add([px, py, z + dz], [px, py + 50, z + dz], 3);
          }
        }
      } else if (kind === 'zipline') {
        mesh = box(x, h + 65, z + 25, 10, 130, 10, '#c6a575');
        const cablePoint = (point) => [point.x, point.height + CANOPY_ZIPLINE.cableHeight, point.y];
        addZipCable({ round, cylinder: cylinderGeometry, parent: scene }, cablePoint(CANOPY_ZIPLINE.start), cablePoint(CANOPY_ZIPLINE.departure));
        addZipCable({ round, cylinder: cylinderGeometry, parent: scene }, cablePoint(CANOPY_ZIPLINE.departure), cablePoint(CANOPY_ZIPLINE.end));
        box(x, h + 125, z + 25, 18, 8, 18, '#526464');
        box(x, h + 125, z + 12.5, 6, 6, 29, '#aeb8b6');
        box(x, h + 10, z + 25, 24, 6, 24, '#6d5537');
        const end = CANOPY_ZIPLINE.end;
        box(end.x, end.height + 65, end.y + 25, 10, 130, 10, '#8e7250');
        box(end.x, end.height + 125, end.y + 25, 18, 8, 18, '#526464');
        box(end.x, end.height + 125, end.y + 12.5, 6, 6, 29, '#aeb8b6');
        box(end.x, end.height + 4, end.y + 25, 24, 8, 24, '#6d5537');
        legacyZipCable = new THREE.Group(); scene.add(legacyZipCable);
        addZipCable({ round, cylinder: cylinderGeometry, parent: legacyZipCable },
          cablePoint(LEGACY_CANOPY_ZIPLINE.start), cablePoint(LEGACY_CANOPY_ZIPLINE.end));
        legacyZipCable.visible = false;
      } else if (kind === 'beacon') {
        box(x, h + 22, z, 10, 44, 10, '#6d5537');
        mesh = round(sphereGeometry, x, h + 52, z, 25, 30, 25, canopyLanternColor(object.id, false));
        beacons.set(object.id, mesh);
      } else if (kind === 'collectible') {
        mesh = round(sphereGeometry, x, h + 30, z, 19, 19, 19, '#edd68e', scene, true);
        round(cylinderGeometry, x, h + 9, z, 30, 18, 30, '#644c35');
        round(cylinderGeometry, x, h + 20, z, 36, 4, 36, '#b79a5f');
      } else {
        const color = kind === 'collectible' ? '#e5d18a' : PUB_FURNITURE_PALETTE[kind]?.body || '#805c40';
        mesh = box(x, h + 28, z, kind === 'collectible' ? 20 : 60, kind === 'collectible' ? 20 : 56,
          kind === 'collectible' ? 20 : kind === 'box' ? 42 : 45, color, scene, kind === 'collectible');
      }
      if (index === 1 && object.footprint) {
        addPubFurnitureDetails(object, { box, round, cylinder: cylinderGeometry, sphere: sphereGeometry, parent: scene });
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
      box(500, 78, 0, 1000, 156, 20, '#a49a87');
      box(500, 26, 12, 1000, 52, 5, '#553c2e');
      for (const x of [40, 320, 610, 960]) box(x, 82, 16, 12, 164, 12, '#604734');
      box(185, 102, 14, 275, 10, 35, '#5b3e2e');
      box(185, 140, 14, 275, 10, 35, '#5b3e2e');
      for (let x = 65; x <= 305; x += 25) for (const y of [115, 153]) {
        round(cylinderGeometry, x, y, 22, 8, 22, 8, ['#577b60', '#aa8554', '#826349'][(x / 25 | 0) % 3]);
        round(cylinderGeometry, x, y + 13, 22, 4, 5, 4, '#d2bb7d');
        box(x, y, 26.1, 7, 7, 1, ['#dfc99e', '#e4d7b6', '#d2a775'][(x / 25 | 0) % 3]);
      }
      for (const x of [405, 700, 880]) {
        box(x, 105, 13, 105, 80, 5, '#4d392f');
        box(x, 105, 17, 91, 66, 3, '#416153');
        box(x, 105, 20, 4, 66, 3, '#ad936a'); box(x, 105, 20, 91, 4, 3, '#ad936a');
        box(x, 105, 22, 88, 63, 2, '#35564e');
        box(x, 105, 24, 4, 63, 2, '#c3a97b'); box(x, 105, 24, 88, 4, 2, '#c3a97b');
      }
      const rugTexture = new THREE.CanvasTexture(pubRug); rugTexture.colorSpace = THREE.SRGBColorSpace; textures.push(rugTexture);
      materials.set('pub-rug', new THREE.MeshStandardMaterial({ map: rugTexture, roughness: 1 }));
      const rug = box(PUB_RUG.x, 2, PUB_RUG.y, PUB_RUG.width, 3, PUB_RUG.depth, '#ffffff');
      rug.material = materials.get('pub-rug');
      pubFootSurfaces.push(createFootSupportSurface(rug));
      for (const stool of PUB_STOOLS) {
        const { x, y: z, radius } = stool;
        if (radius === 17.5) {
          round(cylinderGeometry, x, 20, z, 8, 40, 8, '#5a3d2c');
          round(cylinderGeometry, x, 42, z, radius * 2, 7, radius * 2, '#9a714c');
          round(cylinderGeometry, x, 2, z, 24, 4, 24, '#4f392e');
        } else {
          addPubTableStool(stool, { box, round, cylinder: cylinderGeometry, parent: scene });
        }
      }
      for (const x of [360, 660, 920]) {
        box(x, 146, 100, 5, 35, 5, '#6d5339');
        round(cylinderGeometry, x, 126, 100, 34, 10, 34, '#d9bc79');
        round(sphereGeometry, x, 119, 100, 15, 12, 15, '#f3d996', scene, true);
      }
      const pubArt = { box, round, cylinder: cylinderGeometry, sphere: sphereGeometry, parent: scene };
      addPubWallDetails(pubArt);
      addPubStoolDetails(pubArt);
      for (const { x, y, z } of PUB_POOL_LIGHTS) {
        const light = new THREE.PointLight('#ffd18a', 2600, 230, 2);
        light.position.set(x, y, z); scene.add(light);
      }
      box(535, 108, 23, 150, 62, 7, '#4d3429');
      box(535, 108, 27, 142, 54, 2, '#c6a674');
      const sign = pubCanvas(568, 216, (c) => {
        c.fillStyle = '#2c483b'; c.fillRect(0, 0, 568, 216);
        c.strokeStyle = '#d6b77d'; c.lineWidth = 5; c.strokeRect(12, 12, 544, 192);
        c.textAlign = 'center'; c.fillStyle = '#f2d89d'; c.font = 'bold 53px Georgia, serif';
        c.fillText('LUCKY CHUCKS', 284, 94);
        c.font = '24px Georgia, serif'; c.fillText('POOL  ·  DRINKS  ·  GOOD TIMES', 284, 146);
        c.fillStyle = '#d3b678'; c.fillRect(150, 166, 268, 3);
      });
      const signTexture = new THREE.CanvasTexture(sign); signTexture.colorSpace = THREE.SRGBColorSpace; textures.push(signTexture);
      const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture });
      materials.set('pub-sign', signMaterial);
      const signGeometry = new THREE.PlaneGeometry(136, 49); sceneryGeometries.push(signGeometry);
      const signMesh = new THREE.Mesh(signGeometry, signMaterial); signMesh.position.set(535, 108, 28.1); scene.add(signMesh);
      pubExitMarker = new THREE.Group(); scene.add(pubExitMarker);
      pubFootSurfaces.push(createFootSupportSurface(box(PUB_EXIT.x, 3, PUB_EXIT.y, 100, 5, 65, '#567b62', pubExitMarker)));
      pubFootSurfaces.push(createFootSupportSurface(box(PUB_EXIT.x, 5.6, PUB_EXIT.y, 65, 0.2, 5, '#d7c58c', pubExitMarker)));
      pubExitMarker.visible = false;
    } else if (index === 2) {
      const groundTexture = createParkGroundTexture(); textures.push(groundTexture);
      groundTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1 });
      materials.set('park-ground', groundMaterial);
      box(500, -8.1, 350, 1000, 16, 700, '#ffffff').material = groundMaterial;
      const { left, right, top: platformTop, bottom: platformBottom } = COASTER_PLATFORM;
      box((left + right) / 2, -3, (platformTop + platformBottom) / 2, right - left, 6, platformBottom - platformTop, '#807768');
      for (let x = left + 15; x < right; x += 42) box(x, 0, (platformTop + platformBottom) / 2, 2, 0.2, platformBottom - platformTop - 5, '#5e584d');
      box((left + right) / 2, 0.4, platformTop + 13, right - left - 4, 0.4, 3, PARK_PALETTE.brass);
      for (let x = left + 18; x < right; x += 42) for (const z of [platformTop + 12, platformBottom - 12]) {
        box(x, 0.5, z, 2, 0.5, 2, '#c2b49a');
      }
      const barkTexture = createTreeBarkTexture(), needleTexture = createNeedleTexture();
      for (const texture of [barkTexture, needleTexture]) {
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.push(texture);
      }
      const bark = new THREE.MeshStandardMaterial({ map: barkTexture, vertexColors: true, roughness: 1 });
      const needles = new THREE.MeshStandardMaterial({ map: needleTexture, vertexColors: true, roughness: 1 });
      materials.set('park-tree-bark', bark); materials.set('park-tree-needles', needles);
      for (let variant = 0; variant < 3; variant += 1) {
        const trunkGeometry = createFirTrunk(variant), canopyGeometry = createFirCanopy(variant);
        sceneryGeometries.push(trunkGeometry, canopyGeometry);
        for (const treeData of THIRTEEN_TREES.filter((tree) => tree.variant === variant)) {
          for (const [geometry, treeMaterial] of [[trunkGeometry, bark], [canopyGeometry, needles]]) {
            const tree = new THREE.Mesh(geometry, treeMaterial);
            tree.position.set(treeData.x, 0, treeData.y); tree.rotation.y = treeData.angle;
            tree.scale.set(treeData.size, treeData.size * (1 + (variant - 1) * 0.08), treeData.size); scene.add(tree);
          }
        }
      }
      const thirteenArt = { box, round, cylinder: cylinderGeometry, sphere: sphereGeometry, scene };
      addThirteenRuins(thirteenArt);
      addThirteenStation(thirteenArt);
      const signTexture = new THREE.CanvasTexture(thirteenSign); signTexture.colorSpace = THREE.SRGBColorSpace;
      textures.push(signTexture);
      const signMaterial = new THREE.MeshBasicMaterial({ map: signTexture });
      materials.set('thirteen-sign', signMaterial);
      const signGeometry = new THREE.PlaneGeometry(126, 49); sceneryGeometries.push(signGeometry);
      const signMesh = new THREE.Mesh(signGeometry, signMaterial);
      signMesh.position.set(127.5, 72, 565.1); scene.add(signMesh);
      for (const phase of ['riding', 'returning']) {
        for (let i = 0; i < 120; i += 1) {
          if (phase === 'returning' && i / 120 >= COASTER_REJOIN_PROGRESS) break;
          const a = coasterPosition(phase, i / 120);
          const direction = coasterDirection(phase, (i + 0.5) / 120);
          for (const side of [-1, 1]) {
            const start = coasterRailPosition(phase, i / 120, side);
            const end = coasterRailPosition(phase, (i + 1) / 120, side);
            beam([start.x, start.height - 3, start.y], [end.x, end.height - 3, end.y], 8,
              phase === 'riding' ? '#66564a' : '#4e585b');
            beam([start.x, start.height + 1, start.y], [end.x, end.height + 1, end.y], 4,
              phase === 'riding' ? '#c1b399' : '#a2adaa');
          }
          if (i % 5 === 0) {
            beam([a.x - direction.y * 32, a.height - 4, a.y + direction.x * 32],
              [a.x + direction.y * 32, a.height - 4, a.y - direction.x * 32], 6, '#645446');
            const clearLowerTrack = phase !== 'riding' || !Array.from({ length: 61 }, (_, j) => coasterPosition('returning', j / 60))
              .some((point) => Math.hypot(point.x - a.x, point.y - a.y) < 30);
            if (clearLowerTrack) {
              box(a.x, a.height / 2, a.y, 6, a.height, 6, '#5c5145');
              box(a.x, 2, a.y, 16, 4, 16, '#6d6657');
              box(a.x, a.height - 9, a.y, 14, 4, 14, '#8a7b61');
            }
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
      addThirteenVault(thirteenArt, top, dropDirection);
      for (const treat of COASTER_TREATS) {
        const point = coasterLanePosition(treat.progress, treat.lane);
        const item = itemModel(treat.kind);
        item.position.set(point.x, point.height, point.y); item.scale.setScalar(COASTER_ITEM_SCALE); scene.add(item);
        rideTreats.set(treat.id, item);
      }
      train = carriage(true);
    } else {
      box(CANOPY_COURSE_LENGTH / 2, -100, 350, CANOPY_COURSE_LENGTH, 10, 700, '#142d24');
      const barkTexture = createTreeBarkTexture(), needleTexture = createNeedleTexture();
      for (const texture of [barkTexture, needleTexture]) {
        texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        textures.push(texture);
      }
      const bark = new THREE.MeshStandardMaterial({ map: barkTexture, vertexColors: true, roughness: 1 });
      const needles = new THREE.MeshStandardMaterial({ map: needleTexture, vertexColors: true, roughness: 1 });
      const distantNeedles = new THREE.MeshStandardMaterial({ map: needleTexture, color: '#b2c5b2', vertexColors: true, roughness: 1 });
      materials.set('canopy-tree-bark', bark); materials.set('canopy-tree-needles', needles);
      materials.set('canopy-distant-needles', distantNeedles);
      function firInstances(trees, geometry, treeMaterial, place) {
        const mesh = new THREE.InstancedMesh(geometry, treeMaterial, trees.length);
        const object = new THREE.Object3D();
        trees.forEach((tree, i) => {
          place(object, tree);
          object.rotation.y = tree.angle;
          object.updateMatrix();
          mesh.setMatrixAt(i, object.matrix);
        });
        scene.add(mesh);
      }
      for (let variant = 0; variant < 3; variant += 1) {
        const canopyGeometry = createFirCanopy(variant), trunkGeometry = createPlatformFirTrunk(variant);
        sceneryGeometries.push(canopyGeometry, trunkGeometry);
        const background = CANOPY_FOREST_TREES.filter((tree) => tree.variant === variant);
        const edge = CANOPY_EDGE_TREES.filter((tree) => tree.variant === variant);
        const variantHeight = variant === 1 ? 1.08 : 1;
        firInstances(background, canopyGeometry, distantNeedles, (o, t) => {
          o.position.set(t.x, -100 - 41 * 0.75, t.z);
          o.scale.set(0.87, 0.75 / variantHeight, 0.87);
        });
        firInstances(edge, canopyGeometry, needles, (o, t) => {
          o.position.set(t.x, 35, t.z);
          o.scale.set(1.5, 1.15 / variantHeight, 1.5);
        });
        firInstances(edge, trunkGeometry, bark, (o, t) => {
          o.position.set(t.x, -100, t.z);
          o.scale.set(1, 260 / (165 * (1 + (variant - 1) * 0.025)), 1);
        });
      }
      const forestLights = createCanopyForestLights();
      scene.add(forestLights);
      sceneryGeometries.push(forestLights.geometry);
      materials.set('canopy-forest-lights', forestLights.material);
      textures.push(forestLights.material.map);
      const deckTexture = createCanopyDeckTexture();
      deckTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      textures.push(deckTexture);
      canopyRopes = createCanopyRopes(scene, renderer.capabilities.getMaxAnisotropy());
      for (const [name, color] of [['canopy-deck-active', '#a78760'], ['canopy-deck-locked', '#33473c']]) {
        materials.set(name, new THREE.MeshStandardMaterial({ color, map: deckTexture, roughness: 1 }));
      }
      box(CANOPY_ZIPLINE.end.x, -8, CANOPY_ZIPLINE.end.y, 150, 16, 110, '#806443').material = materials.get('canopy-deck-active');
      for (const p of CANOPY_PLATFORMS) {
        const deck = box((p.left + p.right) / 2, p.height - 8, (p.top + p.bottom) / 2,
          p.right - p.left, 16, p.bottom - p.top, '#806443');
        deck.material = materials.get('canopy-deck-active'); platformMeshes.push(deck);
        for (const z of [p.top + 3, p.bottom - 3]) {
          box((p.left + p.right) / 2, p.height - 11, z, p.right - p.left, 5, 6, '#58432f');
        }
        for (const x of [p.left + 8, p.right - 8]) for (const z of [p.top + 8, p.bottom - 8]) {
          box(x, (p.height - 95) / 2, z, 14, p.height + 95, 14, '#4a3d2c');
          box(x, p.height + 27, z, 8, 54, 8, '#775d3e');
        }
        for (const z of [p.top + 8, p.bottom - 8]) box((p.left + p.right) / 2, p.height + 46, z,
          p.right - p.left - 12, 4, 4, '#a58a60');
        for (let x = p.left + 25; x < p.right; x += 50) for (const z of [p.top + 8, p.bottom - 8]) {
          canopyRopes.add([x, p.height, z], [x, p.height + 44, z], 3);
        }
      }
      for (const [i, p] of CANOPY_PLATFORMS.entries()) {
        const x = (p.left + p.right) / 2, z = p.top + 16;
        box(x, p.height + 52, z, 6, 104, 6, '#6d5537');
        box(x, p.height + 105, z, 24, 4, 4, '#856f4c');
        round(sphereGeometry, x + 10, p.height + 96, z, 14, 18, 14, canopyPlatformLightColor(i), scene, true);
      }
      for (let i = 1; i < CANOPY_SAFETY_WIRE.length; i += 1) {
        const from = CANOPY_SAFETY_WIRE[i - 1], to = CANOPY_SAFETY_WIRE[i];
        addZipCable({ round, cylinder: cylinderGeometry, parent: scene },
          [from.x, from.height, from.y], [to.x, to.height, to.y]);
      }
      for (const index of [0, 2, 4, 7]) {
        const p = CANOPY_PLATFORMS[index], x = p.left + 8, z = p.top + 8;
        box(x, p.height + 105, z, 5, 110, 5, '#775d3e');
        box(x, p.height + 160, (z + 350) / 2, 4, 4, 350 - z, '#9aaca9');
      }
    }
    OBJECTS[index].forEach(makeObject);
    player = person(PLAYER_OUTFIT, 0, 0, scene, PLAYER_STYLE);
    if (index === 3) zipRide = createZipRide({
      box, round, cylinder: cylinderGeometry, sphere: sphereGeometry, player, scene, cableHeight: CANOPY_ZIPLINE.cableHeight, bodyRise: CHARACTER_RISE
    });
  }
  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    scale = Math.min(width / (index === 3 && width < 520 ? 580 : 1050), height / 750);
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(width, height, false);
      const framing = index === 1 ? pubCameraFraming(width, height) : { height: width < 520 ? 820 : 850, centerX: 0, centerY: 0 };
      const halfWidth = framing.height * width / height / 2;
      camera.left = framing.centerX - halfWidth; camera.right = framing.centerX + halfWidth;
      camera.top = framing.centerY + framing.height / 2; camera.bottom = framing.centerY - framing.height / 2;
      camera.updateProjectionMatrix();
    } else {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (state) draw(state);
  }
  function draw(next, dt = 0, aim = 0) {
    state = next;
    facing = state.pubTogether && Number.isFinite(state.coupleFacing)
      ? state.coupleFacing : facingForMovement(previousPlayer, state.player, facing);
    if (!state.pubTogether && pendingFacing !== null) facing = pendingFacing;
    pendingFacing = null;
    const distance = previousPlayer && dt > 0 && !(index === 3 && state.zipline)
      ? Math.hypot(state.player.x - previousPlayer.x, state.player.y - previousPlayer.y) : 0;
    walkPhase += distance * 0.08;
    const swing = distance > 0.1 ? Math.sin(walkPhase) * 0.45 : 0;
    previousPlayer = { x: state.player.x, y: state.player.y };
    if (state.ballLost && !lastBallLost) ballAnimation = 0.001;
    lastBallLost = Boolean(state.ballLost);
    if (ballAnimation && ballAnimation < 1) ballAnimation = Math.min(1, ballAnimation + dt / 2);
    if (poolMiss && (!state.shot || state.ballLost)) poolMiss = null;
    if (poolMiss) {
      poolMiss.elapsed += dt;
      if (poolMiss.elapsed >= 1.7) poolMiss = null;
    }
    const cueOffset = poolMiss ? poolMissOffset(poolMiss.aim, poolMiss.power, poolMiss.elapsed) : { x: 0, y: 0 };
    const riding = index === 2 && ['riding', 'dropping', 'returning'].includes(state.phase);
    const ridePoint = riding ? coasterPosition(state.phase, state.progress) : null;
    const followRide = renderer && riding && width < 520;
    const partnerOffset = index === 2 && state.coasterExitSide === 1 ? -PUB_PARTNER_OFFSET : PUB_PARTNER_OFFSET;
    const playerHeldArm = partnerOffset > 0 ? 1 : 0, catHeldArm = partnerOffset > 0 ? 0 : 1;
    const partner = couplePartnerPosition(state.player, facing, partnerOffset);
    const targetX = followRide ? ridePoint.x : targetXForClick();
    const targetY = followRide ? ridePoint.y
      : state.pubTogether || (index === 3 && state.zipline) ? state.player.y : 350;
    if (renderer) {
      if (pubExitMarker) pubExitMarker.visible = state.pubEnding === 'ready';
      player.visible = !riding; player.position.set(state.player.x, state.player.height, state.player.y);
      player.rotation.y = facing;
      swingCharacterLegs(player.userData.legs, walkPhase, distance > 0.1);
      if (index === 1) supportCharacterFeet(player.userData.legs, pubFootSurfaces);
      swingCharacterArms(player.userData.arms, walkPhase, distance > 0.1, state.pubTogether ? playerHeldArm : -1);
      if (zipRide) {
        const legacy = Boolean(state.legacyZipline), first = state.zipProgress <= CANOPY_ZIPLINE.departureProgress;
        const from = legacy ? LEGACY_CANOPY_ZIPLINE.start : first ? CANOPY_ZIPLINE.start : CANOPY_ZIPLINE.departure;
        const to = legacy ? LEGACY_CANOPY_ZIPLINE.end : first ? CANOPY_ZIPLINE.departure : CANOPY_ZIPLINE.end;
        const direction = new THREE.Vector3(to.x - from.x, to.height - from.height, to.y - from.y);
        const anchor = state.zipline
          ? { x: state.player.x, y: state.player.y, height: state.player.height + CANOPY_ZIPLINE.cableHeight }
          : canopySafetyAnchor(state.player.x);
        setZipRiderPose(player, zipRide, Boolean(state.zipline), anchor, direction);
        legacyZipCable.visible = Boolean(state.zipline && legacy);
      }
      if (platformAmor) {
        platformAmor.visible = !riding;
        const amorX = state.pubTogether ? partner.x : OBJECTS[2].find((item) => item.id === 'amor').x;
        const amorY = state.pubTogether ? partner.y : OBJECTS[2].find((item) => item.id === 'amor').y;
        platformAmor.position.set(amorX, 0, amorY);
        platformAmor.rotation.y = state.pubTogether ? facing : 0;
        swingCharacterLegs(platformAmor.userData.legs, walkPhase, Boolean(state.pubTogether) && distance > 0.1);
        swingCharacterArms(platformAmor.userData.arms, walkPhase, Boolean(state.pubTogether) && distance > 0.1, state.pubTogether ? catHeldArm : -1);
        if (state.pubTogether) {
          poseCharacterHoldingHand(player.userData.arms[playerHeldArm], Math.abs(partnerOffset));
          poseCharacterHoldingHand(platformAmor.userData.arms[catHeldArm], Math.abs(partnerOffset));
        }
      }
      if (platformCarriage) {
        platformCarriage.mesh.visible = !riding;
        platformCarriage.label.visible = !riding;
      }
      if (pubLove) {
        const together = Boolean(state.pubTogether);
        const loveX = together ? partner.x : OBJECTS[1].find((item) => item.id === 'love').x;
        const loveY = together ? partner.y : OBJECTS[1].find((item) => item.id === 'love').y;
        pubLove.position.set(loveX, 0, loveY);
        pubLove.rotation.y = together ? facing : 0;
        swingCharacterLegs(pubLove.userData.legs, walkPhase, together && distance > 0.1);
        supportCharacterFeet(pubLove.userData.legs, pubFootSurfaces);
        swingCharacterArms(pubLove.userData.arms, walkPhase, together && distance > 0.1, together ? catHeldArm : -1);
        if (together) {
          poseCharacterHoldingHand(player.userData.arms[playerHeldArm], Math.abs(partnerOffset));
          poseCharacterHoldingHand(pubLove.userData.arms[catHeldArm], Math.abs(partnerOffset));
        }
      }
      if (index === 1) camera.position.set(targetX + PUB_CAMERA_OFFSET.x, PUB_CAMERA_OFFSET.y, targetY + PUB_CAMERA_OFFSET.z);
      else {
        const focusHeight = index === 3 && state.zipline ? state.player.height + 50 : 0;
        camera.position.set(targetX + 500, 1100 + focusHeight, targetY + 950);
        const zoom = index === 3 && state.zipline ? 1.35 : 1;
        if (camera.zoom !== zoom) {
          camera.zoom = zoom;
          camera.updateProjectionMatrix();
        }
        camera.lookAt(targetX, focusHeight, targetY);
      }
      if (index === 1) camera.lookAt(targetX, 0, targetY);
      camera.updateMatrixWorld();
      if (ball) {
        const t = state.ballFound || state.pubEnding ? 1 : ballAnimation;
        const offTable = Math.max(0, Math.min(1, (t - 0.2) / 0.15));
        const cabinet = OBJECTS[1].find((item) => item.id === 'cabinet');
        ball.position.set(512 + (cabinet.x - 512) * t, 77 - 71 * offTable, 230 + (cabinet.y - 230) * t);
        ball.rotation.z = -t * 15;
        ball.visible = state.ballsPlaced && !state.ballFound && t < 1;
      }
      if (poolBalls) {
        poolBalls.visible = state.ballsPlaced;
        const t = state.ballLost ? ballAnimation : 0;
        poolBalls.children.forEach((piece) => {
          const cue = piece === poolBalls.children.at(-1);
          piece.position.set(piece.userData.start.x + piece.userData.scatter.x * t + (cue ? cueOffset.x : 0), piece.userData.start.y,
            piece.userData.start.z + piece.userData.scatter.z * t + (cue ? cueOffset.y : 0));
        });
      }
      if (placedCue) placedCue.visible = state.cuesPlaced;
      if (catCue) catCue.visible = pubCatHoldsCue(state);
      if (rackTakenCues) rackTakenCues.visible = !pubCuesTaken(state);
      if (placedDrinks) placedDrinks.visible = state.drinksPlaced;
      if (cueGuide) {
        cueGuide.visible = state.shot && !poolMiss;
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
      if (index === 3) {
        platformMeshes.forEach((platform, i) => {
          platform.material = materials.get(i <= state.checkpoint + 1 ? 'canopy-deck-active' : 'canopy-deck-locked');
        });
      }
      collectibles.forEach((item, id) => {
        const platform = ['leaf', 'feather', 'acorn', 'star'].indexOf(id);
        item.visible = !state.collected.includes(id) && platform <= state.checkpoint + 1;
      });
      beacons.forEach((beacon, id) => {
        const lit = (state.lanterns || []).includes(id);
        beacon.material = material(canopyLanternColor(id, lit), lit);
      });
      renderer.render(scene, camera);
      return;
    }
    ctx.fillStyle = theme; ctx.fillRect(0, 0, width, height);
    const sx = (x) => width / 2 + (x - targetX) * scale, sy = (y) => height / 2 + (y - targetY) * scale;
    const partnerScreen = index === 2
      ? { x: sx(partner.x), y: sy(partner.y) }
      : { x: sx(state.player.x) + PUB_PARTNER_OFFSET * scale, y: sy(state.player.y) };
    const heldHand = (index === 1 || index === 2) && state.pubTogether
      ? { x: (partnerScreen.x + sx(state.player.x)) / 2, y: (partnerScreen.y + sy(state.player.y)) / 2 + 16 }
      : undefined;
    if (index === 1) {
      ctx.save(); ctx.translate(sx(0), sy(0)); ctx.scale(scale, scale);
      drawPubInterior(ctx, pubFloor, pubRug); ctx.restore();
    } else if (index === 2) { ctx.fillStyle = '#414d3d'; ctx.fillRect(sx(0), sy(0), 1000 * scale, 700 * scale); }
    else {
      drawCanopyForest(ctx, sx, sy, scale, width, height);
      for (const [i, p] of CANOPY_PLATFORMS.entries()) {
        drawCanopyDeck(ctx, sx(p.left), sy(p.top), (p.right - p.left) * scale, (p.bottom - p.top) * scale,
          { variant: i, tone: i <= state.checkpoint + 1 ? 'warm' : 'locked' });
        ctx.strokeStyle = '#594c36'; ctx.lineWidth = 3;
        ctx.strokeRect(sx(p.left), sy(p.top), (p.right - p.left) * scale, (p.bottom - p.top) * scale);
      }
    }
    if (index === 3) {
      ctx.fillStyle = '#6d5537';
      for (const [i, p] of CANOPY_PLATFORMS.entries()) {
        ctx.fillRect(sx((p.left + p.right) / 2 - 3), sy(p.top + 13), 6 * scale, 6 * scale);
        drawCanopyLight(ctx, sx((p.left + p.right) / 2 + 10), sy(p.top + 16), 6 * scale, canopyPlatformLightColor(i));
        ctx.fillStyle = '#6d5537';
      }
      for (const object of OBJECTS[3]) {
        if (object.kind === 'collectible') {
          ctx.fillStyle = '#644c35';
          ctx.fillRect(sx(object.x - 18), sy(object.y - 18), 36 * scale, 36 * scale);
        } else if (object.kind === 'beacon' || object.kind === 'zipline') {
          ctx.fillStyle = '#6d5537';
          ctx.fillRect(sx(object.x - 5), sy(object.y - 5), 10 * scale, 10 * scale);
        }
      }
      Object.values(CANOPY_CROSSINGS).forEach((crossing) => drawCanopyCrossing(ctx, crossing, sx, sy, scale));
      drawZipCable(ctx, CANOPY_SAFETY_WIRE, sx, sy);
      drawCanopyDeck(ctx, sx(CANOPY_ZIPLINE.end.x - 75), sy(CANOPY_ZIPLINE.end.y - 55), 150 * scale, 110 * scale);
      const points = state.zipline && state.legacyZipline
        ? [LEGACY_CANOPY_ZIPLINE.start, LEGACY_CANOPY_ZIPLINE.end]
        : [CANOPY_ZIPLINE.start, CANOPY_ZIPLINE.departure, CANOPY_ZIPLINE.end];
      drawZipCable(ctx, points, sx, sy);
    }
    if (index === 2) {
      ctx.drawImage(parkGround, sx(0), sy(0), 1000 * scale, 700 * scale);
      drawThirteenScenery(ctx, sx, sy, scale, thirteenSign);
      ctx.fillStyle = '#807768';
      ctx.fillRect(sx(COASTER_PLATFORM.left), sy(COASTER_PLATFORM.top),
        (COASTER_PLATFORM.right - COASTER_PLATFORM.left) * scale, (COASTER_PLATFORM.bottom - COASTER_PLATFORM.top) * scale);
      ctx.fillStyle = '#5e584d';
      for (let x = COASTER_PLATFORM.left + 15; x < COASTER_PLATFORM.right; x += 42) {
        ctx.fillRect(sx(x), sy(COASTER_PLATFORM.top + 2), 2 * scale,
          (COASTER_PLATFORM.bottom - COASTER_PLATFORM.top - 4) * scale);
      }
      ctx.fillStyle = PARK_PALETTE.brass;
      ctx.fillRect(sx(COASTER_PLATFORM.left + 2), sy(COASTER_PLATFORM.top + 13),
        (COASTER_PLATFORM.right - COASTER_PLATFORM.left - 4) * scale, 3 * scale);
      for (let x = 70; x < 955; x += 35) {
        ctx.fillStyle = '#d4b87b'; ctx.fillRect(sx(x), sy(584), 20 * scale, 3 * scale);
        ctx.fillStyle = '#c6b89a';
        for (const y of [600, 677]) ctx.fillRect(sx(x), sy(y), 2 * scale, 2 * scale);
      }
      ctx.fillStyle = '#685746';
      ctx.fillRect(sx(35), sy(692), 930 * scale, 3 * scale);
      for (let x = 35; x <= 965; x += 62) {
        ctx.fillStyle = '#4d4336'; ctx.fillRect(sx(x - 3), sy(690), 6 * scale, 6 * scale);
        ctx.fillStyle = '#b1a07c'; ctx.fillRect(sx(x - 2), sy(691), 4 * scale, 2 * scale);
      }
      for (const phase of ['returning', 'riding']) {
        const segments = phase === 'returning' ? Math.round(120 * COASTER_REJOIN_PROGRESS) : 120;
        ctx.strokeStyle = '#645446'; ctx.lineWidth = 3 * scale; ctx.beginPath();
        for (let i = 0; i <= segments; i += 5) {
          const point = coasterPosition(phase, i / 120), direction = coasterDirection(phase, i / 120);
          ctx.moveTo(sx(point.x - direction.y * 32), sy(point.y + direction.x * 32));
          ctx.lineTo(sx(point.x + direction.y * 32), sy(point.y - direction.x * 32));
        }
        ctx.stroke();
        for (const side of [-1, 1]) {
          ctx.strokeStyle = phase === 'riding' ? '#604c3e' : '#515a5d';
          ctx.lineWidth = 6 * scale; ctx.beginPath();
          for (let i = 0; i <= segments; i += 1) {
            const point = coasterRailPosition(phase, i / 120, side);
            if (i === 0) ctx.moveTo(sx(point.x), sy(point.y));
            else ctx.lineTo(sx(point.x), sy(point.y));
          }
          ctx.stroke();
          ctx.strokeStyle = phase === 'riding' ? '#d1b995' : '#a9b0a9';
          ctx.lineWidth = 3 * scale; ctx.stroke();
        }
      }
      drawThirteenVault(ctx, sx, sy, scale, coasterPosition('dropping', 0), coasterDirection('dropping', 0));
      for (const x of [325, 925]) {
        ctx.fillStyle = '#594a39'; ctx.beginPath(); ctx.arc(sx(x), sy(610), 7 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e1c47b'; ctx.beginPath(); ctx.arc(sx(x), sy(610), 4 * scale, 0, Math.PI * 2); ctx.fill();
      }
      for (const treat of COASTER_TREATS) {
        if (state.treats.includes(treat.id)) continue;
        const point = coasterLanePosition(treat.progress, treat.lane);
        const size = 30 * COASTER_ITEM_SCALE;
        ctx.drawImage(itemImage(treat.kind), sx(point.x) - size / 2, sy(point.y) - size / 2, size, size);
      }
    }
    if (index === 1) {
      if (state.pubEnding === 'ready') {
        ctx.fillStyle = '#567b62';
        ctx.fillRect(sx(PUB_EXIT.x - 50), sy(PUB_EXIT.y - 32.5), 100 * scale, 65 * scale);
      }
    }
    OBJECTS[index].forEach((object) => {
      if (index === 3 && (object.kind === 'net' || object.kind === 'rope')) return;
      if (['amor', 'carriage'].includes(object.id) && ['riding', 'dropping', 'returning'].includes(state.phase)) return;
      if (object.kind === 'collectible' && (state.collected.includes(object.id)
        || ['leaf', 'feather', 'acorn', 'star'].indexOf(object.id) > state.checkpoint + 1)) return;
      if (object.kind === 'carriage') {
        ctx.save(); ctx.translate(sx(object.x), sy(object.y)); ctx.rotate(-coasterHeading('riding', 0));
        drawParkCar(ctx, 70 * scale, 42 * scale); ctx.restore();
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd';
        ctx.fillText(object.name, sx(object.x), sy(object.y) - 25 * scale);
        return;
      }
      if (index === 2 && object.id === 'amor' && state.pubTogether) {
        drawCharacterMarker(ctx, partnerScreen.x, partnerScreen.y, CAT_OUTFIT, { ...CAT_STYLE, stride: swing, heldArm: catHeldArm, heldHand, facing });
        return;
      }
      if (index === 2 && object.kind === 'locker') {
        const depth = object.footprint.depth;
        ctx.fillStyle = '#59686b';
        ctx.fillRect(sx(object.x - object.footprint.width / 2), sy(object.y - depth / 2),
          object.footprint.width * scale, depth * scale);
        ctx.fillStyle = '#829395';
        for (const offset of [-15, 15]) {
          ctx.fillRect(sx(object.x + offset - 12), sy(object.y - depth / 2 + 2), 24 * scale, (depth - 4) * scale);
          ctx.fillStyle = '#3c4c50';
          for (const dy of [-6, -3, 0]) ctx.fillRect(sx(object.x + offset - 7), sy(object.y + dy), 14 * scale, 1 * scale);
          ctx.fillRect(sx(object.x + offset + 6), sy(object.y + 3), 3 * scale, 6 * scale);
          ctx.fillStyle = '#829395';
        }
        return;
      }
      if (index === 3 && object.kind === 'beacon') {
        const lit = (state.lanterns || []).includes(object.id);
        drawCanopyLight(ctx, sx(object.x), sy(object.y), 12 * scale, canopyLanternColor(object.id, lit), lit);
        return;
      }
      if (index === 1 && object.footprint) {
        const objectX = object.id === 'love' && state.pubTogether ? partner.x : object.x;
        const objectY = object.id === 'love' && state.pubTogether ? partner.y : object.y;
        if (object.kind === 'npc') {
          const bartender = object.id === 'bartender';
          const together = object.id === 'love' && state.pubTogether;
          const x = together ? partnerScreen.x : sx(objectX);
          const y = together ? partnerScreen.y : sy(objectY);
          if (object.id === 'love' && pubCatHoldsCue(state)) drawPubHeldCue(ctx, x, y);
          drawCharacterMarker(ctx, x, y, bartender ? BARTENDER_OUTFIT : CAT_OUTFIT,
            bartender ? BARTENDER_STYLE
              : { ...CAT_STYLE, stride: together ? swing : 0, heldArm: together ? catHeldArm : -1, heldHand: together ? heldHand : undefined, facing: together ? facing : 0 });
          return;
        }
        ctx.save(); ctx.translate(sx(0), sy(0)); ctx.scale(scale, scale);
        drawPubObject(ctx, object, state, ballAnimation, cueOffset); ctx.restore();
        return;
      }
      if (object.id === 'amor') {
        drawCharacterMarker(ctx, sx(object.x), sy(object.y), CAT_OUTFIT, CAT_STYLE);
        return;
      }
      ctx.fillStyle = object.kind === 'npc' ? '#d29caf' : object.kind === 'collectible' ? '#f4d686' : '#a9895e';
      ctx.fillRect(sx(object.x) - 13, sy(object.y) - 13, 26, 26);
      if (index !== 3) {
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd'; ctx.fillText(object.name, sx(object.x), sy(object.y) - 17);
      }
    });
    if (index === 1 && state.shot && !poolMiss) {
      ctx.strokeStyle = '#fff3be'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(sx(435), sy(230));
      ctx.lineTo(sx(435 + 120 * Math.cos(aim * Math.PI / 180)), sy(230 + 120 * Math.sin(aim * Math.PI / 180)));
      ctx.stroke();
    }
    if (index !== 2 || !['riding', 'dropping', 'returning'].includes(state.phase)) {
      const zipline = index === 3 && state.zipline, playerX = sx(state.player.x), playerY = sy(state.player.y);
      if (index === 3) {
        const anchor = zipline ? null : canopySafetyAnchor(state.player.x);
        drawZipTether(ctx, playerX, playerY, anchor ? sx(anchor.x) : playerX,
          anchor ? sy(anchor.y) - ZIP_CABLE_SCREEN_OFFSET : playerY - ZIP_CABLE_SCREEN_OFFSET);
      }
      drawCharacterMarker(ctx, playerX, playerY, PLAYER_OUTFIT, { ...PLAYER_STYLE, stride: swing, heldArm: state.pubTogether ? playerHeldArm : -1, heldHand, facing, zipline });
      if (index === 3) drawZipHarness(ctx, playerX, playerY);
    }
    if (index === 2 && ['riding', 'dropping', 'returning'].includes(state.phase)) {
      ctx.save(); ctx.translate(sx(ridePoint.x), sy(ridePoint.y));
      ctx.rotate(-coasterHeading(state.phase, state.progress));
      drawParkCar(ctx, 44, 26);
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
    const bartender = index === 1 && OBJECTS[1].find((item) => item.id === 'bartender'
      && Math.hypot(item.x - target.x, item.y - target.y) <= item.footprint.radius);
    const object = bartender || OBJECTS[index].find((item) => (index === 1 || index === 2) && item.footprint
      ? adventureObjectDistance(index, target, item) === 0
      : Math.hypot(item.x - target.x, item.y - target.y) < 40);
    onSelect(object ? { objectId: object.id } : target);
  }
  function targetXForClick() {
    if (!state) return 500;
    if (state.pubTogether) return state.player.x;
    if (index === 1) return 500;
    if (index === 3 && state.zipline) return state.player.x;
    if (index === 3) return Math.max(220, Math.min(CANOPY_PLATFORMS.at(-1).left, state.player.x));
    if (!renderer && index === 2) return 500;
    return width < 520 ? Math.max(220, Math.min(780, state.player.x)) : 500;
  }
  canvas.addEventListener('click', click);
  function objectPosition(id) {
    const object = OBJECTS[index].find((item) => item.id === id);
    if (!object) return null;
    if (renderer) {
      const position = new THREE.Vector3(object.x, object.id === 'bartender' ? 170 : 120, object.y).project(camera);
      return { x: (position.x + 1) * width / 2, y: (1 - position.y) * height / 2 };
    }
    return { x: width / 2 + (object.x - targetXForClick()) * scale, y: height / 2 + (object.y - 350) * scale - 30 };
  }
  return { draw, resize, objectPosition, playPoolMiss(aim, power) {
    poolMiss = { aim, power, elapsed: 0 };
  }, faceDirection(dx, dy) {
    if (dx || dy) pendingFacing = Math.atan2(dx, dy);
  }, dispose() {
    canvas.removeEventListener('click', click); boxGeometry.dispose(); torsoGeometry.dispose(); shapedTorsoGeometry.dispose(); characterHeadGeometry.dispose(); characterFaceGeometry.dispose(); characterLimbGeometry.dispose(); characterSkinGeometry.dispose(); sphereGeometry.dispose(); cylinderGeometry.dispose(); coneGeometry.dispose(); triangleGeometry.dispose(); materials.forEach((m) => m.dispose());
    sceneryGeometries.forEach((geometry) => geometry.dispose());
    canopyRopes?.dispose();
    textures.forEach((t) => t.dispose()); renderer?.dispose();
  } };
}
