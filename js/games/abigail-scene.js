import * as THREE from 'three';
import { HOUSE_BOUNDS, HOUSE_OBJECTS, HOUSE_WALLS } from './abigail-house.js';
import { PLAYER_OUTFIT, PLAYER_STYLE, addCharacterHeadDetails, drawCharacterMarker } from '../character-appearance.js';
import { createCharacterArms, createCharacterTorsoGeometry, swingCharacterArms } from '../character-body.js';
import { createPlayerLegs } from './character-legs.js';

export function createAbigailScene(canvas, onSelect, characterName = 'Adventurer') {
  const probe = document.createElement('canvas').getContext('webgl2');
  const hasWebGL = Boolean(probe);
  probe?.getExtension('WEBGL_lose_context')?.loseContext();
  const renderer = hasWebGL ? new THREE.WebGLRenderer({ canvas, antialias: true }) : null;
  const context = renderer ? null : canvas.getContext('2d');
  if (!renderer && !context) throw new Error('Could not initialize the escape room.');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#202a27');
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 3000);
  let roomGroup = null;
  let player = null;
  let door = null;
  let wardOrb = null;
  let width = 1;
  let height = 1;
  let state = null;
  let shadowMap = null;
  const geometries = new Map();
  const materials = new Map();
  const textures = new Set();
  let previousPosition = null;
  let walkingPhase = 0;
  const runeMarkers = new Map();

  if (renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.add(new THREE.HemisphereLight('#e5dfc2', '#302c29', 1.8));
    const light = new THREE.DirectionalLight('#f0d7a2', 2);
    light.position.set(-300, 800, 500);
    scene.add(light);
  }

  function box(parent, w, h, d, color, x, y, z) {
    const key = `${w},${h},${d}`;
    if (!geometries.has(key)) geometries.set(key, new THREE.BoxGeometry(w, h, d));
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    const mesh = new THREE.Mesh(geometries.get(key), materials.get(color));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function texture(width, height, paint) {
    const image = document.createElement('canvas');
    image.width = width; image.height = height;
    const ctx = image.getContext('2d');
    if (!ctx) throw new Error('Could not create the house texture.');
    paint(ctx, width, height);
    const result = new THREE.CanvasTexture(image);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    textures.add(result);
    return result;
  }

  function texturedBox(parent, w, h, d, color, map, x, y, z) {
    const item = box(parent, w, h, d, color, x, y, z);
    const key = `${color}:${map.uuid}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, map, roughness: 1 }));
    item.material = materials.get(key);
    return item;
  }

  function label(parent, text) {
    const map = texture(512, 96, (ctx, w, h) => {
      ctx.fillStyle = 'rgba(24,35,29,.9)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff0bc'; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(text.toUpperCase(), w / 2, 60, w - 24);
    });
    const material = new THREE.SpriteMaterial({ map, transparent: true, depthTest: false });
    materials.set(`label:${map.uuid}`, material);
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(105, 20, 1);
    sprite.position.y = 103;
    parent.add(sprite);
  }

  function shadow(parent, width, depth) {
    if (!shadowMap) {
      shadowMap = texture(64, 64, (ctx) => {
        const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(24,20,17,.42)');
        gradient.addColorStop(1, 'rgba(24,20,17,0)');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
      });
      materials.set('shadow', new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }));
      geometries.set('shadow', new THREE.PlaneGeometry(1, 1));
    }
    const mesh = new THREE.Mesh(geometries.get('shadow'), materials.get('shadow'));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(6, 2.2, 5);
    mesh.scale.set(width, depth, 1);
    parent.add(mesh);
  }

  function person(parent, x, z, color, longHair = false, belt = '#aa9160', playerStyle = null) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    shadow(group, 66, 45);
    if (!geometries.has('character-torso')) geometries.set('character-torso', createCharacterTorsoGeometry());
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    const torso = new THREE.Mesh(geometries.get('character-torso'), materials.get(color));
    torso.position.set(0, 40, 0); torso.scale.set(25, 38, 15); group.add(torso);
    if (!geometries.has('character-head')) geometries.set('character-head', new THREE.SphereGeometry(0.5, 16, 12));
    addCharacterHeadDetails((px, py, pz, w, h, d, shade) => box(group, w, h, d, shade, px, py, pz),
      (px, py, pz, w, h, d, shade) => {
        if (!materials.has(shade)) materials.set(shade, new THREE.MeshStandardMaterial({ color: shade, roughness: 0.9 }));
        const part = new THREE.Mesh(geometries.get('character-head'), materials.get(shade));
        part.position.set(px, py, pz); part.scale.set(w, h, d); group.add(part);
      }, { headY: 68, width: 17, height: 18, depth: 17, skin: '#dfb38c', longHair });
    if (!longHair) box(group, 18, 30, 3, '#725443', 0, 40, -8);
    box(group, 25, 4, 17, belt, 0, 25, 0);
    const bodyBox = (px, py, pz, w, h, d, shade, owner) => box(owner, w, h, d, shade, px, py, pz);
    if (playerStyle) {
      group.userData.legs = createPlayerLegs(group, bodyBox, { offset: 7, height: 21,
        shoeColor: '#5a4434', shortsColor: playerStyle.shorts, skin: '#dfb38c' });
    } else {
      const left = box(group, 9, 21, 10, '#342f2b', -7, 11, 0);
      const right = box(group, 9, 21, 10, '#342f2b', 7, 11, 0);
      box(left, 10, 4, 13, '#5a4434', 0, -9, 2);
      box(right, 10, 4, 13, '#5a4434', 0, -9, 2);
      group.userData.legs = [left, right];
    }
    group.userData.arms = createCharacterArms(group, bodyBox, {
      offset: 15.5, shoulderY: 57, length: 30, width: 7, depth: 8, color, skin: '#dfb38c'
    });
    parent.add(group);
    return group;
  }

  function furniture(item) {
    const group = new THREE.Group();
    group.position.set(item.x, 0, item.y);
    roomGroup.add(group);
    if (item.radius && item.id !== 'mara') shadow(group, item.radius * 2.8, item.radius * 2.2);
    if (item.id === 'mara') {
      const mara = person(group, 0, 0, '#75546c', true);
      label(mara, 'Mara the Wardkeeper');
    } else if (item.id === 'diary' || item.id === 'book') {
      box(group, 65, 8, 48, '#604437', 0, 32, 0);
      for (const x of [-25, 25]) for (const z of [-17, 17]) box(group, 6, 30, 6, '#46352b', x, 15, z);
      box(group, 30, 5, 23, '#d7cba7', 0, 39, 0);
      box(group, 2, 1, 22, '#5d4d3d', 0, 42, 0);
      for (const z of [-6, 0, 6]) box(group, 10, 1, 1, '#8b785e', -7, 42, z);
      box(group, 6, 13, 6, '#d0b183', 23, 42, -13);
      box(group, 3, 5, 3, '#f3c86f', 23, 51, -13);
    } else if (item.id === 'doll') {
      box(group, 52, 33, 39, '#5d493c', 0, 17, 0);
      box(group, 16, 20, 10, '#795455', 0, 45, 0);
      box(group, 13, 13, 12, '#d0ae9d', 0, 61, 0);
      box(group, 17, 5, 14, '#42332d', 0, 70, 0);
      box(group, 3, 3, 2, '#443032', -4, 62, 7);
      box(group, 3, 3, 2, '#443032', 4, 62, 7);
    } else if (item.rune) {
      if (item.id === 'starCache') {
        box(group, 66, 8, 48, '#604437', 0, 34, 0);
        for (const x of [-25, 25]) for (const z of [-17, 17]) box(group, 6, 30, 6, '#46352b', x, 15, z);
        box(group, 34, 5, 23, '#d7cba7', -10, 41, 0);
        box(group, 5, 25, 5, '#ab986d', 19, 50, 0);
        const telescope = box(group, 32, 10, 10, '#b4975d', 20, 66, 0);
        telescope.rotation.z = -0.5;
      } else if (item.id === 'moonCache') {
        box(group, 55, 33, 42, '#6d4e3a', 0, 17, 0);
        box(group, 46, 8, 36, '#a48162', 0, 35, 0);
        box(group, 32, 14, 24, '#4b5364', 0, 45, 0);
        box(group, 8, 8, 3, '#d3c8a9', 0, 44, 13);
      } else {
        box(group, 56, 70, 38, '#574331', 0, 35, 0);
        box(group, 48, 52, 4, '#89694a', 0, 38, 21);
        box(group, 4, 52, 5, '#c2a678', 0, 38, 24);
        box(group, 5, 5, 5, '#d8bc75', 10, 38, 25);
        box(group, 62, 6, 44, '#a3845a', 0, 73, 0);
      }
      const marker = box(group, 14, 14, 14, item.rune === 'Star' ? '#e5c76d' : item.rune === 'Moon' ? '#a8bed6' : '#9ee1d5', 0, item.id === 'diamondCache' ? 85 : 61, 0);
      marker.rotation.y = Math.PI / 4;
      runeMarkers.set(item.rune, marker);
    } else if (item.id === 'ward') {
      box(group, 62, 18, 62, '#555b54', 0, 9, 0);
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(20, 1), new THREE.MeshStandardMaterial({ color: '#b48fca', emissive: '#654578', emissiveIntensity: 0.6 }));
      geometries.set('ward-orb', orb.geometry);
      materials.set('ward-orb', orb.material);
      orb.position.y = 56; group.add(orb);
      wardOrb = orb;
      box(group, 15, 42, 15, '#776881', 0, 33, 0);
      for (const x of [-21, 21]) for (const z of [-21, 21]) {
        box(group, 5, 8, 5, '#b7a17b', x, 22, z);
      }
    } else if (item.id === 'chest') {
      box(group, 62, 32, 42, '#694528', 0, 16, 0);
      box(group, 66, 10, 46, '#8a6336', 0, 37, 0);
      box(group, 8, 15, 3, '#d4ba71', 0, 25, 22);
      for (const x of [-21, 21]) box(group, 5, 42, 46, '#ad8d58', x, 22, 0);
    } else {
      group.rotation.y = Math.PI / 2;
      const wide = item.id === 'chamberDoor';
      box(group, wide ? 160 : 65, 105, 12, '#50483d', 0, 52, 0);
      box(group, wide ? 146 : 48, 86, 15, '#80572e', 0, 47, 8);
      for (const x of wide ? [-50, -25, 0, 25, 50] : [-12, 12]) {
        box(group, 4, 86, 18, '#b18b52', x, 47, 9);
      }
      box(group, 5, 5, 4, '#e4ca81', wide ? 60 : 16, 43, 19);
    }
    if (item.id === 'chamberDoor') door = group;
    group.traverse((child) => { if (child.isMesh) child.userData.objectId = item.id; });
  }

  function clearRoom() {
    if (!roomGroup) return;
    scene.remove(roomGroup);
    roomGroup = null;
  }

  function buildRoom() {
    clearRoom();
    roomGroup = new THREE.Group();
    scene.add(roomGroup);
    const stone = texture(512, 512, (ctx) => {
      ctx.fillStyle = '#6e6b5b'; ctx.fillRect(0, 0, 512, 512);
      for (let row = 0; row < 12; row += 1) for (let col = -1; col < 6; col += 1) {
        const x = col * 103 + (row % 2) * 51, y = row * 43;
        const tone = 137 + ((row * 41 + col * 23 + 512) % 29);
        ctx.fillStyle = `rgb(${tone},${tone - 2},${tone - 12})`;
        ctx.fillRect(x + 2, y + 2, 98, 38);
        ctx.fillStyle = 'rgba(255,244,206,.13)'; ctx.fillRect(x + 4, y + 4, 94, 2);
        ctx.fillStyle = 'rgba(38,30,22,.14)'; ctx.fillRect(x + 5, y + 36, 90, 2);
      }
    });
    const planks = texture(1024, 512, (ctx, w, h) => {
      ctx.fillStyle = '#765a42'; ctx.fillRect(0, 0, w, h);
      for (let row = 0; row < 24; row += 1) {
        const y = row * h / 24;
        const tone = 104 + (row * 17 % 30);
        ctx.fillStyle = `rgb(${tone + 24},${tone},${tone - 22})`;
        ctx.fillRect(0, y + 1, w, h / 24 - 2);
        ctx.fillStyle = 'rgba(35,24,17,.32)'; ctx.fillRect(0, y, w, 2);
        for (let col = -1; col < 7; col += 1) {
          const x = col * 190 + (row % 3) * 63;
          ctx.fillStyle = 'rgba(32,23,17,.3)'; ctx.fillRect(x, y + 2, 2, h / 24 - 4);
          ctx.fillStyle = 'rgba(231,189,136,.12)';
          ctx.fillRect(x + 12, y + 5, 120 + (row * 13 + col * 7 + 512) % 45, 1);
          ctx.fillStyle = 'rgba(31,23,17,.3)';
          ctx.fillRect(x + 6, y + 4, 2, 2); ctx.fillRect(x + 6, y + 15, 2, 2);
        }
      }
    });
    const rug = texture(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#6a4c46'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#d1b988'; ctx.lineWidth = 9;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.strokeStyle = '#9b795a'; ctx.lineWidth = 4;
      ctx.strokeRect(28, 28, w - 56, h - 56);
      ctx.strokeStyle = '#ddc99a'; ctx.lineWidth = 3;
      for (const x of [115, 256, 397]) {
        ctx.beginPath(); ctx.moveTo(x, 58); ctx.lineTo(x + 48, 128);
        ctx.lineTo(x, 198); ctx.lineTo(x - 48, 128); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, 86); ctx.lineTo(x + 22, 128);
        ctx.lineTo(x, 170); ctx.lineTo(x - 22, 128); ctx.closePath(); ctx.stroke();
      }
    });
    const floor = texturedBox(roomGroup, 1100, 8, 480, '#ffffff', planks, 0, -4, 0);
    floor.userData.ground = true;
    const newFloor = texturedBox(roomGroup, 1100, 8, 400, '#e8dfd1', planks, 0, -4, 440);
    newFloor.userData.ground = true;
    texturedBox(roomGroup, 1116, 110, 16, '#c6c1a8', stone, 0, 55, -248);
    texturedBox(roomGroup, 16, 110, 480, '#b4b5a2', stone, -558, 55, 0);
    texturedBox(roomGroup, 16, 110, 160, '#bdb9a4', stone, 0, 55, -160);
    texturedBox(roomGroup, 16, 110, 160, '#bdb9a4', stone, 0, 55, 160);
    for (const wall of HOUSE_WALLS.slice(2)) {
      texturedBox(roomGroup, wall.right - wall.left, 76, wall.bottom - wall.top, '#bdb9a4', stone,
        (wall.left + wall.right) / 2, 38, (wall.top + wall.bottom) / 2);
    }
    texturedBox(roomGroup, 16, 76, 400, '#b4b5a2', stone, -558, 38, 440);
    texturedBox(roomGroup, 16, 76, 400, '#b4b5a2', stone, 558, 38, 440);
    for (const x of [-370, 100, 370]) {
      for (const side of [-1, 1]) box(roomGroup, 10, 84, 20, '#674e36', x + side * 57, 42, 240);
      box(roomGroup, 124, 9, 20, '#806344', x, 82, 240);
    }
    box(roomGroup, 1100, 8, 14, '#4a392d', 0, 5, -232);
    box(roomGroup, 13, 8, 480, '#4a392d', -546, 5, 0);
    for (const x of [-540, -280, -15, 15, 270, 540]) {
      box(roomGroup, 14, 110, 12, '#5b4332', x, 55, -235);
      box(roomGroup, 21, 8, 17, '#79604a', x, 102, -235);
    }
    for (let i = 0; i < 22; i += 1) {
      box(roomGroup, 47, 3, 18, i % 2 ? '#827966' : '#6e6a59', -525 + i * 50, 105, -248);
    }
    for (const x of [-300, 240]) {
      texturedBox(roomGroup, 205, 2, 120, x < 0 ? '#ffffff' : '#c9bad0', rug, x, 1, 70).userData.ground = true;
    }
    for (const x of [-365, 0, 365]) {
      texturedBox(roomGroup, 170, 2, 105, x === 0 ? '#c9bad0' : '#ffffff', rug, x, 1, 370).userData.ground = true;
    }
    for (const x of [-480, -250, -90, 90, 255, 480]) {
      box(roomGroup, 24, 34, 5, '#49392e', x, 54, 247);
      box(roomGroup, 15, 23, 6, '#e8c77d', x, 54, 250);
    }
    box(roomGroup, 65, 20, 125, '#614534', -142.5, 10, 522.5);
    box(roomGroup, 57, 14, 110, '#c5b49b', -142.5, 24, 522.5);
    box(roomGroup, 56, 6, 73, '#6d6c85', -142.5, 34, 535);
    box(roomGroup, 40, 8, 24, '#eee3d2', -142.5, 35, 484);
    for (const [x, z] of [[-527, 522], [522, 520]]) {
      box(roomGroup, 36, 90, 125, '#594435', x, 45, z);
      for (const y of [20, 44, 68]) {
        box(roomGroup, 38, 4, 125, '#a18361', x, y, z);
        for (let i = 0; i < 7; i += 1) {
          box(roomGroup, 20, 16, 8, ['#896252', '#536c61', '#af906a'][i % 3], x, y + 10, z - 48 + i * 15);
        }
      }
    }
    for (const x of [-490, -80, 110, 480]) {
      box(roomGroup, 34, 50, 5, '#46382d', x, 66, -237);
      box(roomGroup, 25, 40, 4, '#a0a795', x, 66, -233);
      box(roomGroup, 3, 40, 5, '#514438', x, 66, -230);
      box(roomGroup, 25, 3, 5, '#514438', x, 66, -230);
      box(roomGroup, 42, 5, 9, '#b6a387', x, 41, -229);
    }
    for (const x of [-375, -160, 205, 400]) {
      box(roomGroup, 7, 23, 8, '#49372a', x, 57, -226);
      box(roomGroup, 18, 20, 14, '#c28e43', x, 75, -224);
      box(roomGroup, 11, 13, 15, '#f2cb78', x, 75, -222);
      box(roomGroup, 20, 4, 17, '#654b31', x, 86, -224);
    }
    for (const x of [-320, 290]) {
      box(roomGroup, 54, 8, 8, '#53402e', x, 82, -229);
      for (let i = 0; i < 6; i += 1) {
        box(roomGroup, 6, 21 + i % 3 * 3, 9, ['#835d4b', '#546c5c', '#9c8060'][i % 3],
          x - 19 + i * 7, 95 + i % 3, -226);
      }
    }
    for (const [x, color] of [[-255, '#647b72'], [70, '#81735a'], [370, '#7b6855']]) {
      box(roomGroup, 62, 42, 4, '#584331', x, 72, -232);
      box(roomGroup, 52, 32, 5, '#b29e79', x, 72, -229);
      box(roomGroup, 46, 26, 5, color, x, 72, -226);
      box(roomGroup, 34, 3, 6, '#a9987a', x, 66, -223);
      const hill = box(roomGroup, 19, 3, 6, '#b5aa83', x - 5, 72, -223);
      hill.rotation.z = 0.35;
    }
    HOUSE_OBJECTS.forEach(furniture);
    player = person(roomGroup, 0, 0, PLAYER_OUTFIT, true, PLAYER_STYLE.belt, PLAYER_STYLE);
    label(player, characterName);
  }

  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    if (renderer) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      const viewHeight = Math.max(760, (width < 520 ? 900 : 1500) * height / width);
      camera.left = -viewHeight * width / height / 2;
      camera.right = -camera.left;
      camera.top = viewHeight / 2; camera.bottom = -camera.top;
      camera.position.set(550, 1050, 1350);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    } else {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (state) draw(state);
  }

  function fallbackPoint(x, y) {
    const scale = Math.min((width - 30) / 1100, (height - 180) / 880);
    return { x: width / 2 + x * scale, y: height / 2 + (y - 200) * scale, scale };
  }

  function draw(next) {
    state = next;
    const moving = previousPosition && Math.hypot(state.player.x - previousPosition.x, state.player.y - previousPosition.y) > 0.01;
    if (moving) walkingPhase += 0.35;
    const stride = moving ? Math.sin(walkingPhase) * 0.4 : 0;
    if (renderer) {
      if (!roomGroup) buildRoom();
      if (moving) {
        player.rotation.y = Math.atan2(state.player.x - previousPosition.x, state.player.y - previousPosition.y);
      }
      player.userData.legs[0].rotation.x = stride;
      player.userData.legs[1].rotation.x = -stride;
      swingCharacterArms(player.userData.arms, stride);
      player.position.set(state.player.x, 0, state.player.y);
      const cameraX = width < 520 ? Math.max(-240, Math.min(240, state.player.x * 0.55)) : 0;
      const cameraZ = Math.max(0, Math.min(350, state.player.y * 0.75));
      camera.position.set(550 + cameraX, 1050, 1350 + cameraZ);
      camera.lookAt(cameraX, 0, cameraZ);
      camera.updateMatrixWorld();
      door.visible = !state.chamberUnlocked;
      runeMarkers.forEach((marker, rune) => { marker.visible = !state.collectedRunes.includes(rune); });
      wardOrb.material.emissiveIntensity = state.wardSolved ? 0 : 0.6;
      wardOrb.material.color.set(state.wardSolved ? '#777078' : '#b48fca');
      previousPosition = { ...state.player };
      renderer.render(scene, camera);
      return;
    }
    context.fillStyle = '#28302d'; context.fillRect(0, 0, width, height);
    const first = fallbackPoint(HOUSE_BOUNDS.left, HOUSE_BOUNDS.top);
    const scale = first.scale;
    context.fillStyle = '#79614c'; context.fillRect(first.x, first.y, 1100 * scale, 880 * scale);
    context.strokeStyle = '#493c34'; context.lineWidth = Math.max(1, scale * 8);
    context.beginPath();
    for (const [a, b] of [[-240, -80], [80, 240]]) {
      const start = fallbackPoint(0, a), end = fallbackPoint(0, b);
      context.moveTo(start.x, start.y); context.lineTo(end.x, end.y);
    }
    for (const wall of HOUSE_WALLS.slice(2)) {
      const a = fallbackPoint((wall.left + wall.right) / 2, wall.top);
      const b = fallbackPoint((wall.left + wall.right) / 2, wall.bottom);
      if (wall.right - wall.left > wall.bottom - wall.top) {
        const left = fallbackPoint(wall.left, (wall.top + wall.bottom) / 2);
        const right = fallbackPoint(wall.right, (wall.top + wall.bottom) / 2);
        context.moveTo(left.x, left.y); context.lineTo(right.x, right.y);
      } else { context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); }
    }
    if (!state.chamberUnlocked) { const a = fallbackPoint(0, -80), b = fallbackPoint(0, 80); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); }
    context.stroke();
    context.font = `${Math.max(14, 50 * scale)}px sans-serif`;
    context.textAlign = 'center'; context.textBaseline = 'middle';
    HOUSE_OBJECTS.filter((item) => item.id !== 'chamberDoor' || !state.chamberUnlocked).forEach((item) => {
      const p = fallbackPoint(item.x, item.y); context.fillText(item.icon, p.x, p.y);
    });
    const p = fallbackPoint(state.player.x, state.player.y);
    drawCharacterMarker(context, p.x, p.y, PLAYER_OUTFIT, { ...PLAYER_STYLE, scale: Math.max(0.7, scale), stride });
    previousPosition = { ...state.player };
  }

  function handleClick(event) {
    if (!state) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (renderer) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2), camera);
      const hit = ray.intersectObjects(roomGroup.children, true).find((entry) => entry.object.visible
        && (entry.object.userData.objectId !== 'chamberDoor' || !state.chamberUnlocked)
        && (entry.object.userData.objectId || entry.object.userData.ground));
      if (!hit) return;
      if (hit.object.userData.objectId) onSelect({ objectId: hit.object.userData.objectId });
      else onSelect({ x: hit.point.x, y: hit.point.z });
    } else {
      const first = fallbackPoint(0, 0);
      const world = { x: (x - first.x) / first.scale, y: (y - first.y) / first.scale };
      const item = HOUSE_OBJECTS.find((entry) => (entry.id !== 'chamberDoor' || !state.chamberUnlocked)
        && Math.hypot(entry.x - world.x, entry.y - world.y) < Math.max(35, 18 / first.scale));
      if (item) onSelect({ objectId: item.id });
      else if (world.x >= HOUSE_BOUNDS.left && world.x <= HOUSE_BOUNDS.right && world.y >= HOUSE_BOUNDS.top && world.y <= HOUSE_BOUNDS.bottom) onSelect(world);
    }
  }
  canvas.addEventListener('click', handleClick);
  return {
    draw, resize,
    objectPosition(id) {
      const item = HOUSE_OBJECTS.find((entry) => entry.id === id);
      if (!item) return null;
      if (!renderer) {
        return fallbackPoint(item.x, item.y);
      }
      const projected = new THREE.Vector3(item.x, 90, item.y).project(camera);
      return { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
    },
    dispose() {
      canvas.removeEventListener('click', handleClick);
      clearRoom();
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((map) => map.dispose());
      renderer?.dispose();
    }
  };
}
