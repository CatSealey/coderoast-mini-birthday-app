import * as THREE from 'three';
import { CANOPY_PLATFORMS, OBJECTS } from './adventure-logic.js';

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
  const sphereGeometry = new THREE.SphereGeometry(0.5, 12, 8);
  const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
  const coneGeometry = new THREE.ConeGeometry(0.5, 1, 8);
  const materials = new Map(), textures = [], interactive = [], platformMeshes = [];
  const collectibles = new Map();
  let state, player, train, ball, lightMarker, platformAmor, width = 1, height = 1, scale = 1, ballAnimation = 0, lastBallLost = false;
  let platformCarriage;
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
  function person(color, name, x, z, parent = scene) {
    const group = new THREE.Group(); group.position.set(x, 0, z); parent.add(group);
    box(0, 39, 0, 26, 38, 17, color, group);
    box(0, 70, 0, 19, 20, 19, '#dfb38c', group);
    box(0, 82, 0, 21, 6, 21, '#47372e', group);
    const leftLeg = box(-7, 11, 0, 9, 22, 10, '#302d2a', group);
    const rightLeg = box(7, 11, 0, 9, 22, 10, '#302d2a', group);
    box(0, -9, 2, 10, 4, 13, '#594336', leftLeg); box(0, -9, 2, 10, 4, 13, '#594336', rightLeg);
    group.userData.legs = [leftLeg, rightLeg];
    box(0, 27, 9, 26, 4, 2, '#a98e60', group);
    box(-5, 71, 10, 3, 3, 2, '#47372e', group); box(5, 71, 10, 3, 3, 2, '#47372e', group);
    box(-17, 40, 0, 7, 28, 8, color, group);
    box(17, 40, 0, 7, 28, 8, color, group);
    if (name) group.userData.label = label(name, x, 103, z);
    return group;
  }
  function makeObject(object) {
    const { x, y: z, kind } = object, h = object.height || 0;
    let mesh;
    if (kind === 'npc') {
      mesh = person('#a56a7c', object.name, x, z);
      if (object.id === 'amor') platformAmor = mesh;
    } else {
      if (kind === 'bar') {
        mesh = box(x, 40, z, 180, 80, 55, '#754b34');
        box(x, 84, z, 190, 9, 65, '#b59061');
        for (const offset of [-60, 0, 60]) {
          box(x + offset, 40, z + 29, 48, 55, 3, '#936848');
          round(cylinderGeometry, x + offset, 101, z, 10, 26, 10, '#9dbe9c');
          round(cylinderGeometry, x + offset, 116, z, 6, 6, 6, '#d4c184');
        }
      } else if (kind === 'pool') {
        mesh = box(x, 37, z, 220, 55, 125, '#65482f');
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
      } else if (kind === 'carriage') {
        mesh = new THREE.Group(); mesh.position.set(x, 0, z); scene.add(mesh);
        box(0, 20, 0, 100, 40, 65, '#635145', mesh);
        box(0, 48, 0, 80, 22, 50, '#796453', mesh);
        for (const dx of [-28, 28]) {
          box(dx, 55, -10, 28, 28, 18, '#47463a', mesh);
          round(cylinderGeometry, dx, 10, 36, 15, 8, 15, '#292e2d', mesh).rotation.x = Math.PI / 2;
        }
      } else if (kind === 'net' || kind === 'rope') {
        if (kind === 'net') {
          mesh = beam([x, h + 6, z - 38], [x + 70, h + 86, z - 38], 5, '#d7bd81');
          for (let dz = -20; dz <= 40; dz += 20) beam([x, h + 6, z + dz], [x + 70, h + 86, z + dz], 4, '#d7bd81');
          for (let i = 0; i <= 5; i += 1) {
            box(x + 14 * i, h + 6 + 16 * i, z, 5, 5, 85, '#d7bd81');
          }
        } else {
          mesh = beam([x, h + 5, z], [x + 115, h + 55, z], 7, '#c3a77a');
          for (const dz of [-27, 27]) beam([x, h + 55, z + dz], [x + 115, h + 105, z + dz], 4, '#d7bd81');
          for (let i = 0; i <= 4; i += 1) for (const dz of [-27, 27]) {
            box(x + 28.75 * i, h + 30 + 12.5 * i, z + dz, 3, 50, 3, '#d7bd81');
          }
        }
      } else if (kind === 'zipline') {
        mesh = box(x, h + 65, z, 10, 130, 10, '#c6a575');
        beam([x, h + 85, z], [960, 85, 570], 4, '#e8d18c');
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
      const objectLabel = label(object.name, x, h + (kind === 'bar' ? 135 : 105), z);
      if (kind === 'collectible') collectibles.set(object.id, { mesh, label: objectLabel });
      if (kind === 'carriage') platformCarriage = { mesh, label: objectLabel };
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
      for (const x of [75, 135, 195]) {
        round(cylinderGeometry, x, 20, 205, 8, 40, 8, '#5a3d2c');
        round(cylinderGeometry, x, 42, 205, 35, 7, 35, '#9a714c');
        round(cylinderGeometry, x, 2, 205, 24, 4, 24, '#4f392e');
      }
      box(530, 2, 385, 340, 3, 195, '#573e36');
      box(530, 4, 385, 325, 2, 180, '#80584b');
      for (const x of [420, 640]) for (const z of [470, 570]) {
        round(cylinderGeometry, x, 35, z, 10, 70, 10, '#523c2c');
        round(cylinderGeometry, x, 71, z, 47, 8, 47, '#956d48');
        round(cylinderGeometry, x, 77, z, 37, 5, 37, '#68473d');
      }
      for (const x of [360, 660, 920]) {
        box(x, 146, 100, 5, 35, 5, '#6d5339');
        round(cylinderGeometry, x, 126, 100, 34, 10, 34, '#d9bc79');
        round(sphereGeometry, x, 119, 100, 15, 12, 15, '#f3d996', scene, true);
      }
    } else if (index === 2) {
      box(500, -8, 350, 1000, 16, 700, '#384736');
      for (let x = 30; x < 1000; x += 65) for (let z = 25; z < 700; z += 65) {
        box(x, 1, z, 38 + (x * z % 23), 2, 28, (x + z) % 3 ? '#40533b' : '#4b5c40');
      }
      box(500, 3, 530, 950, 6, 150, '#807768');
      for (let x = 40; x < 960; x += 42) box(x, 7, 530, 2, 2, 145, '#5e584d');
      for (const x of [65, 245, 410, 590, 760, 935]) for (const z of [40, 650]) {
        round(cylinderGeometry, x, 45, z, 20, 90, 20, '#514433');
        for (let i = 0; i < 3; i += 1) round(coneGeometry, x, 100 + i * 27, z, 100 - i * 18, 75, 100 - i * 18, '#314c38');
      }
      for (let i = 0; i < 96; i += 1) {
        const a = i / 96 * Math.PI * 2, b = (i + 1) / 96 * Math.PI * 2;
        const x = 500 + 350 * Math.cos(a), z = 280 + 200 * Math.sin(a);
        const nx = 500 + 350 * Math.cos(b), nz = 280 + 200 * Math.sin(b);
        const dx = nx - x, dz = nz - z, length = Math.hypot(dx, dz), yaw = -Math.atan2(dz, dx);
        const progress = (i / 96 + 0.75) % 1;
        const color = progress >= 0.64 && progress <= 0.72 ? '#d5b66c' : '#6e736a';
        for (const side of [-1, 1]) {
          const rail = box((x + nx) / 2 - dz / length * 13 * side, 45, (z + nz) / 2 + dx / length * 13 * side,
            length + 1, 5, 5, color);
          rail.rotation.y = yaw;
        }
        if (i % 3 === 0) {
          const sleeper = box(x, 41, z, 7, 5, 36, '#645446'); sleeper.rotation.y = yaw;
          box(x, 21, z, 7, 42, 7, '#5c5145');
        }
      }
      for (const [x, z] of [[430, 80], [855, 250]]) {
        box(x, 65, z, 14, 130, 14, '#6d6654');
        box(x, 132, z, 110, 14, 30, '#817867');
        box(x - 48, 65, z, 15, 130, 30, '#686456');
        box(x + 48, 65, z, 15, 130, 30, '#686456');
        for (let y = 20; y < 130; y += 28) for (const dx of [-48, 48]) box(x + dx, y, z + 16, 16, 2, 2, '#4b5048');
      }
      for (const x of [325, 925]) {
        box(x, 34, 610, 8, 68, 8, '#5a4939');
        round(sphereGeometry, x, 74, 610, 18, 18, 18, '#e1c47b', scene, true);
      }
      train = new THREE.Group(); scene.add(train);
      box(0, 18, 0, 70, 35, 42, '#675143', train);
      box(0, 38, -17, 72, 25, 8, '#493d34', train);
      box(0, 34, 20, 74, 10, 6, '#9e896b', train);
      for (const x of [-25, 25]) for (const z of [-24, 24]) {
        round(cylinderGeometry, x, 9, z, 15, 7, 15, '#252f2c', train).rotation.x = Math.PI / 2;
      }
      for (const [x, color] of [[-17, '#315d4a'], [17, '#a56a7c']]) {
        const rider = person(color, null, x, 0, train); rider.position.y = 18; rider.scale.set(0.7, 0.7, 0.7);
        rider.userData.legs.forEach((leg) => { leg.rotation.x = -Math.PI / 2; });
      }
    } else {
      box(500, -100, 350, 1000, 10, 700, '#142d24');
      for (let x = 25; x < 1000; x += 80) for (let z = 35; z < 700; z += 90) {
        round(coneGeometry, x, -48, z, 80, 105, 80, (x + z) % 3 ? '#203f30' : '#294c36');
      }
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
      for (const x of [100, 270, 460, 660, 850]) for (const z of [70, 620]) {
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
    player = person('#315d4a', null, 0, 0);
    const nameLabel = label(characterName, 0, 105, 0);
    player.userData.label = nameLabel;
  }
  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    scale = Math.min(width / 1050, height / 750);
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
    if (state.ballLost && !lastBallLost) ballAnimation = 0.001;
    lastBallLost = Boolean(state.ballLost);
    if (ballAnimation && ballAnimation < 1) ballAnimation = Math.min(1, ballAnimation + dt / 2);
    const targetX = width < 520 ? Math.max(220, Math.min(780, state.player.x)) : 500;
    if (renderer) {
      const riding = index === 2 && ['riding', 'dropping', 'returning'].includes(state.phase);
      player.visible = !riding; player.position.set(state.player.x, state.player.height, state.player.y);
      if (previousPlayer && dt > 0) {
        const distance = Math.hypot(state.player.x - previousPlayer.x, state.player.y - previousPlayer.y);
        walkPhase += distance * 0.08;
        const swing = distance > 0.1 ? Math.sin(walkPhase) * 0.45 : 0;
        player.userData.legs[0].rotation.x = swing; player.userData.legs[1].rotation.x = -swing;
      }
      previousPlayer = { x: state.player.x, y: state.player.y };
      player.userData.label.visible = !riding;
      if (platformAmor) {
        platformAmor.visible = !riding;
        platformAmor.userData.label.visible = !riding;
      }
      if (platformCarriage) {
        platformCarriage.mesh.visible = !riding;
        platformCarriage.label.visible = !riding;
      }
      player.userData.label.position.set(state.player.x, state.player.height + 105, state.player.y);
      camera.position.set(targetX + 500, 1100, 350 + 950); camera.lookAt(targetX, 0, 350); camera.updateMatrixWorld();
      if (ball) {
        const t = state.ballFound ? 1 : ballAnimation;
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
        const angle = (state.phase === 'riding' ? state.progress : state.phase === 'returning' ? 0.72 + state.progress * 0.28 : 0.68) * Math.PI * 2 + Math.PI / 2;
        train.position.set(500 + 350 * Math.cos(angle), state.phase === 'dropping' ? 45 - state.progress * 60 : state.phase === 'returning' ? -15 : 45, 280 + 200 * Math.sin(angle));
        train.rotation.y = -angle;
      }
      if (lightMarker) {
        const p = CANOPY_PLATFORMS[Math.min(state.checkpoint + 1, 3)];
        lightMarker.position.set((p.left + p.right) / 2, p.height + 3, 350);
        platformMeshes.forEach((platform, i) => { platform.material = material(i <= state.checkpoint + 1 ? '#806443' : '#283a32'); });
      }
      collectibles.forEach((item, id) => {
        const platform = ['leaf', 'feather', 'acorn', 'star'].indexOf(id);
        const visible = !state.collected.includes(id) && platform <= state.checkpoint + 1;
        item.mesh.visible = visible; item.label.visible = visible;
      });
      renderer.render(scene, camera);
      return;
    }
    ctx.fillStyle = theme; ctx.fillRect(0, 0, width, height);
    const sx = (x) => width / 2 + (x - targetX) * scale, sy = (y) => height / 2 + (y - 350) * scale;
    if (index !== 3) { ctx.fillStyle = index === 1 ? '#71583f' : '#414d3d'; ctx.fillRect(sx(0), sy(0), 1000 * scale, 700 * scale); }
    else for (const [i, p] of CANOPY_PLATFORMS.entries()) {
      ctx.fillStyle = i <= state.checkpoint + 1 ? '#806443' : '#283a32'; ctx.fillRect(sx(p.left), sy(p.top), (p.right - p.left) * scale, (p.bottom - p.top) * scale);
      ctx.strokeStyle = i === Math.min(state.checkpoint + 1, 3) ? '#e9ca76' : '#594c36'; ctx.lineWidth = 3;
      ctx.strokeRect(sx(p.left), sy(p.top), (p.right - p.left) * scale, (p.bottom - p.top) * scale);
    }
    if (index === 2) {
      ctx.strokeStyle = '#d1b995'; ctx.lineWidth = 5; ctx.beginPath();
      ctx.ellipse(sx(500), sy(280), 350 * scale, 200 * scale, 0, 0, Math.PI * 2); ctx.stroke();
    }
    OBJECTS[index].forEach((object) => {
      if (['amor', 'carriage'].includes(object.id) && ['riding', 'dropping', 'returning'].includes(state.phase)) return;
      if (object.kind === 'collectible' && (state.collected.includes(object.id)
        || ['leaf', 'feather', 'acorn', 'star'].indexOf(object.id) > state.checkpoint + 1)) return;
      ctx.fillStyle = object.kind === 'npc' ? '#d29caf' : object.kind === 'collectible' ? '#f4d686' : '#a9895e';
      ctx.fillRect(sx(object.x) - 13, sy(object.y) - 13, 26, 26);
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff0bd'; ctx.fillText(object.name, sx(object.x), sy(object.y) - 17);
    });
    if (index === 1 && state.shot) {
      ctx.strokeStyle = '#fff3be'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(sx(435), sy(230));
      ctx.lineTo(sx(435 + 120 * Math.cos(aim * Math.PI / 180)), sy(230 + 120 * Math.sin(aim * Math.PI / 180)));
      ctx.stroke();
    }
    if (index !== 2 || !['riding', 'dropping', 'returning'].includes(state.phase)) {
      ctx.fillStyle = '#e7c198'; ctx.beginPath(); ctx.arc(sx(state.player.x), sy(state.player.y), 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#315d4a'; ctx.fillRect(sx(state.player.x) - 8, sy(state.player.y) + 6, 16, 16);
    }
    if (index === 2 && ['riding', 'dropping', 'returning'].includes(state.phase)) {
      const angle = (state.phase === 'riding' ? state.progress : state.phase === 'returning' ? 0.72 + state.progress * 0.28 : 0.68) * Math.PI * 2 + Math.PI / 2;
      ctx.fillStyle = '#dec181'; ctx.fillRect(sx(500 + 350 * Math.cos(angle)) - 15, sy(280 + 200 * Math.sin(angle)) - 10, 30, 20);
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
      y: 350 + (event.clientY - rect.top - height / 2) / scale };
    const object = OBJECTS[index].find((item) => Math.hypot(item.x - target.x, item.y - target.y) < 40);
    onSelect(object ? { objectId: object.id } : target);
  }
  function targetXForClick() { return width < 520 ? Math.max(220, Math.min(780, state.player.x)) : 500; }
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
    canvas.removeEventListener('click', click); boxGeometry.dispose(); sphereGeometry.dispose(); cylinderGeometry.dispose(); coneGeometry.dispose(); materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose()); renderer?.dispose();
  } };
}
