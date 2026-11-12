import * as THREE from 'three';
import { CELL, FRIGHT_MAZE, FRIGHT_OBJECTS, FRIGHT_THEMES, SIZE } from './fright-logic.js';
import { CHARACTER_HAIR, PLAYER_OUTFIT, drawCharacterMarker } from '../character-appearance.js';

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
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const cylinderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  const coneGeometry = new THREE.ConeGeometry(0.5, 1, 4);
  const sphereGeometry = new THREE.SphereGeometry(0.5, 14, 10);
  const materials = new Map(), markers = new Map(), textures = [], animations = [], lights = [];
  let state, player, playerLabel, previousPosition, walkingPhase = 0, width = 1, height = 1, scale = 1, animationFrame = 0;
  const colors = Object.fromEntries(FRIGHT_THEMES.map((theme) => [theme.id, theme.color]));
  const palettes = {
    disease: ['#4f7a48', '#2f4a32'], ai: ['#1d3c4b', '#12242f'],
    darkness: ['#25233a', '#13121f'], chainsaws: ['#6a4a39', '#4a3228'],
    bogeymen: ['#4a3552', '#2b1f33'], claustrophobia: ['#4d5d55', '#303b36'],
    clowns: ['#8a4a5e', '#5b2c40']
  };
  const themed = FRIGHT_OBJECTS.filter((object) => object.theme);
  function areaAt(x, y) {
    const closest = themed.map((object) => ({ object, distance: Math.hypot(object.x - x, object.y - y) }))
      .sort((a, b) => a.distance - b.distance)[0];
    return closest.distance < CELL * 1.6 ? closest.object.theme : null;
  }
  const areas = FRIGHT_MAZE.map((row, y) => [...row].map((_, x) => areaAt((x + 0.5) * CELL, (y + 0.5) * CELL)));
  const rand = (x, y, k = 0) => (((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) >>> 0) % 1000 / 1000;

  function material(color, emissive = false, opacity = 1) {
    const key = `${color}:${emissive}:${opacity}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color, roughness: 0.9, ...(emissive ? { emissive: color, emissiveIntensity: 0.6 } : {}),
      ...(opacity < 1 ? { transparent: true, opacity, depthWrite: false } : {})
    }));
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

  function decorateFloor(theme, x, y) {
    const cx = (x + 0.5) * CELL, cz = (y + 0.5) * CELL;
    const r = (k) => rand(x, y, k), jitter = (k) => (r(k) - 0.5) * (CELL - 40);
    if (theme === 'disease') {
      if (r(1) < 0.5) box(cx + jitter(2), 3, cz + jitter(3), 28 + r(4) * 20, 1, 22 + r(5) * 16, '#8fe068', true, 0.55);
      if (r(6) < 0.35) {
        const bx = cx + jitter(7), bz = cz + jitter(8);
        cyl(bx, 14, bz, 22, 28, 22, '#5b7d3b'); box(bx, 29, bz, 12, 3, 12, '#d8ec7e', true);
      }
      if (r(9) < 0.4) {
        const mist = ball(cx + jitter(10), 28, cz + jitter(11), 46, '#9be06f', true, 0.18);
        animations.push((t) => { mist.position.y = 28 + Math.sin(t * 0.8 + x + y) * 6; });
      }
    } else if (theme === 'ai') {
      box(cx, 2.5, cz, 6, 1, CELL - 20, '#46e6ff', true);
      if (r(1) < 0.45) {
        const rx = cx + jitter(2), rz = cz + jitter(3);
        box(rx, 22, rz, 22, 44, 14, '#1a2c38');
        for (let i = 0; i < 3; i += 1) box(rx - 6 + i * 6, 22 + (i - 1) * 12, rz + 8, 4, 3, 2, i % 2 ? '#7dffb2' : '#46e6ff', true);
      }
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
      if (r(4) < 0.4) {
        const lx = cx + jitter(5), lz = cz + jitter(6);
        for (let i = 0; i < 3; i += 1) {
          const log = cyl(lx, 8 + (i === 2 ? 14 : 0), lz + (i === 2 ? 8 : i * 14), 16, 34, 16, '#7a5233');
          log.rotation.z = Math.PI / 2;
        }
      }
      if (r(7) < 0.3) {
        const blade = cyl(cx + jitter(8), 20, cz + jitter(9), 30, 3, 30, '#c5c9ce');
        blade.rotation.x = Math.PI / 2;
        animations.push((t) => { blade.rotation.y = t * 9; });
      }
    } else if (theme === 'bogeymen') {
      if (r(1) < 0.35) {
        const sx = cx + jitter(2), sz = cz + jitter(3);
        box(sx, 40, sz, 14, 80, 8, '#0f0a14'); ball(sx, 88, sz, 20, '#0f0a14');
        const eyes = [box(sx - 4, 88, sz + 9, 4, 3, 2, '#ffd36a', true), box(sx + 4, 88, sz + 9, 4, 3, 2, '#ffd36a', true)];
        animations.push((t) => eyes.forEach((e) => { e.scale.y = 1 + Math.sin(t * 3 + x) * 0.8; }));
      }
      if (r(4) < 0.3) {
        const bx = cx + jitter(5), bz = cz + jitter(6);
        box(bx, 8, bz, 34, 14, 52, '#5a3b62'); box(bx, 17, bz - 18, 30, 8, 12, '#e8dcc8');
      }
    } else if (theme === 'claustrophobia') {
      box(cx, 2.5, cz, CELL - 30, 1, 6, '#e2b64a');
      if (r(1) < 0.5) {
        const pipe = cyl(cx + jitter(2), 36, cz, 8, CELL - 12, 8, '#8c9a92');
        pipe.rotation.x = Math.PI / 2;
      }
      if (r(3) < 0.3) box(cx + jitter(4), 6, cz + jitter(5), 30, 8, 26, '#3c453f');
    } else if (theme === 'clowns') {
      if (r(1) < 0.55) {
        const bx = cx + jitter(2), bz = cz + jitter(3), color = ['#ff5a7a', '#5ab4ff', '#ffe05a'][Math.floor(r(4) * 3)];
        const balloon = ball(bx, 60, bz, 24, color, true);
        box(bx, 30, bz, 1.5, 58, 1.5, '#e8e0d0');
        animations.push((t) => { balloon.position.y = 60 + Math.sin(t * 1.6 + x * 2 + y) * 5; });
      }
      if (r(6) < 0.3) {
        const px = cx + jitter(7), pz = cz + jitter(8);
        cyl(px, 28, pz, 8, 56, 8, '#f4ecd8'); cyl(px, 45, pz, 9, 10, 9, '#d9344f');
        const flag = box(px + 8, 58, pz, 14, 8, 2, '#ffd23f', true);
        animations.push((t) => { flag.rotation.y = Math.sin(t * 3 + x) * 0.4; });
      }
    }
  }

  function decorateWall(theme, x, y) {
    const cx = (x + 0.5) * CELL, cz = (y + 0.5) * CELL;
    if (theme === 'disease' && rand(x, y, 1) < 0.6) box(cx, 36, cz, CELL + 1, 14, CELL + 1, '#7ec45f', false, 0.35);
    else if (theme === 'ai') {
      box(cx, 50, cz, CELL + 2, 3, CELL + 2, '#46e6ff', true);
      if (rand(x, y, 2) < 0.5) box(cx, 34, cz, CELL + 2, 5, CELL + 2, '#7dffb2', true, 0.8);
    } else if (theme === 'darkness') box(cx, 56, cz, CELL + 2, 14, CELL + 2, '#0a0a14');
    else if (theme === 'chainsaws') {
      for (let i = 0; i < 4; i += 1) box(x * CELL + 14 + i * 28, 20, cz, 6, 44, CELL + 2, '#3b281f');
    } else if (theme === 'bogeymen') {
      if (rand(x, y, 3) < 0.5) box(cx, 36, cz, CELL + 2, 5, CELL + 2, '#8b5fa0', true, 0.5);
    } else if (theme === 'claustrophobia') {
      box(cx, 36, cz, CELL + 6, 8, CELL + 6, '#e2b64a');
      box(cx, 52, cz, CELL + 6, 8, CELL + 6, '#232a27');
    } else if (theme === 'clowns') {
      for (let i = 0; i < 5; i += 1) box(x * CELL + 11 + i * 22, 31, cz, 11, 62, CELL + 2, i % 2 ? '#fff0d8' : '#d9344f');
    }
  }

  function buildSetPiece(object) {
    const theme = object.theme, color = colors[theme], { x, y } = object;
    if (object.kind === 'clue') {
      box(x, 3, y, 70, 4, 70, color);
      if (object.id.endsWith('-1')) {
        box(x, 20, y, 5, 40, 5, '#4a4030'); box(x, 40, y, 34, 24, 4, '#e8d8a8');
        box(x, 40, y + 3, 26, 3, 2, '#3a2c1c'); box(x, 34, y + 3, 20, 3, 2, '#3a2c1c');
      } else if (object.id.endsWith('-2')) {
        box(x, 14, y, 38, 28, 32, '#594333');
        box(x, 29, y, 30, 3, 24, '#eee0b9');
        for (const z of [-6, 0, 6]) box(x, 31, y + z, 22, 1, 2, '#6d5640');
      } else {
        cyl(x, 14, y, 28, 28, 28, '#78674e');
        box(x, 32, y, 22, 18, 5, '#ebd8a5');
        for (const h of [28, 34, 38]) box(x, h, y + 3, 15, 2, 2, '#725b40');
      }
      const marker = ball(x, 63, y, 12, color, true);
      marker.userData.objectId = object.id; markers.set(object.id, marker);
      animations.push((t) => { marker.position.y = 63 + Math.sin(t * 2 + x) * 4; });
      label(object.name, x, 87, y);
      return;
    }
    if (object.kind === 'tool') {
      box(x, 3, y, 56, 4, 56, color);
      box(x, 10, y, 28, 14, 28, '#4a4335');
      if (theme === 'disease') { box(x - 5, 24, y, 8, 12, 5, '#e8f4e8'); box(x + 5, 24, y, 8, 12, 5, '#e8f4e8'); }
      else if (theme === 'ai') box(x, 22, y, 20, 10, 3, '#46e6ff', true);
      else if (theme === 'darkness') box(x, 22, y, 14, 9, 8, '#c9a15a');
      else if (theme === 'chainsaws') { box(x, 24, y, 30, 5, 5, '#b8b1a0'); ball(x + 17, 24, y, 11, '#b8b1a0'); }
      else if (theme === 'bogeymen') { cyl(x, 24, y, 12, 16, 12, '#f0eadb', true); box(x, 34, y, 14, 3, 14, '#6a6a6a'); }
      else if (theme === 'claustrophobia') { box(x, 24, y, 30, 4, 4, '#9aa39e'); box(x + 14, 28, y, 4, 12, 4, '#9aa39e'); }
      else { box(x, 24, y, 3, 18, 3, '#d8d8d8'); ball(x, 34, y, 8, '#ff5a7a', true); }
      const marker = box(x, 52, y, 16, 16, 16, color, true);
      marker.rotation.y = Math.PI / 4; marker.userData.objectId = object.id;
      markers.set(object.id, marker);
      animations.push((t) => { marker.rotation.y = t * 1.4; marker.position.y = 52 + Math.sin(t * 2) * 3; });
      label(object.name, x, 85, y);
      return;
    }
    box(x, 3, y, 100, 4, 100, color);
    box(x, 16, y, 42, 32, 42, '#494335');
    const marker = box(x, 56, y, 23, 23, 18, color, true);
    marker.rotation.y = Math.PI / 4; marker.userData.objectId = object.id;
    markers.set(object.id, marker);
    animations.push((t) => { marker.rotation.y = Math.PI / 4 + Math.sin(t) * 0.3; });
    label(`${FRIGHT_THEMES.find((entry) => entry.id === theme).name} mechanism`, x, 95, y);
    label(FRIGHT_THEMES.find((entry) => entry.id === theme).zone, x, 150, y, true);
    box(x - 16, 29, y, 5, 28, 5, color); box(x + 16, 29, y, 5, 28, 5, color);
    addLight(color, x, 70, y, 3.2, theme === 'darkness' || theme === 'bogeymen' ? 0.6 : 0.2);
    if (theme === 'disease') {
      box(x, 58, y + 12, 4, 17, 3, '#eaf2d8'); box(x, 58, y + 13, 17, 4, 3, '#eaf2d8');
      for (const dx of [-38, 38]) { cyl(dx + x, 22, y + 30, 18, 44, 18, '#4f7a3c'); box(dx + x, 46, y + 30, 14, 4, 14, '#d8ec7e', true); }
    } else if (theme === 'ai') {
      for (const dx of [-7, 7]) box(x + dx, 58, y + 12, 5, 5, 3, '#e8ffff', true);
      for (const dx of [-40, 40]) { box(x + dx, 30, y, 22, 60, 30, '#162733'); box(x + dx, 40, y + 16, 14, 8, 2, '#46e6ff', true); }
      const drone = box(x, 100, y + 30, 20, 6, 20, '#8fe6f5', true);
      animations.push((t) => { drone.position.set(x + Math.cos(t) * 40, 100 + Math.sin(t * 2) * 4, y + Math.sin(t) * 40); });
    } else if (theme === 'darkness') {
      box(x, 56, y + 12, 4, 18, 3, '#fff3ba', true); box(x, 56, y + 12, 18, 4, 3, '#fff3ba', true);
      for (const dx of [-35, 35]) { cyl(x + dx, 12, y + 30, 6, 24, 6, '#e8dcc0'); const flame = ball(x + dx, 28, y + 30, 8, '#ffc65a', true); animations.push((t) => { flame.scale.y = 8 + Math.sin(t * 9 + dx) * 3; }); }
    } else if (theme === 'chainsaws') {
      box(x + 20, 42, y, 24, 5, 5, '#b8b1a0');
      for (const dx of [-44, 44]) {
        const blade = cyl(x + dx, 40, y + 20, 44, 4, 44, '#c5c9ce'); blade.rotation.x = Math.PI / 2;
        animations.push((t) => { blade.rotation.y = t * 10 * Math.sign(dx); });
        box(x + dx, 18, y + 20, 8, 36, 8, '#6a4a39');
      }
    } else if (theme === 'bogeymen') {
      for (const dx of [-6, 6]) box(x + dx, 59, y + 12, 4, 4, 3, '#f5e9cc', true);
      box(x - 48, 40, y, 6, 80, 40, '#2b1f33'); box(x + 48, 40, y, 6, 80, 40, '#2b1f33');
      const eyes = [box(x - 6, 50, y + 38, 6, 5, 3, '#ff6a3a', true), box(x + 6, 50, y + 38, 6, 5, 3, '#ff6a3a', true)];
      animations.push((t) => eyes.forEach((e) => { e.visible = Math.sin(t * 2) > -0.5; }));
    } else if (theme === 'claustrophobia') {
      box(x - 30, 45, y, 5, 85, 65, '#738c7c'); box(x + 30, 45, y, 5, 85, 65, '#738c7c');
      const left = box(x - 52, 28, y + 20, 6, 56, 50, '#5a6e63'), right = box(x + 52, 28, y + 20, 6, 56, 50, '#5a6e63');
      animations.push((t) => { const d = Math.sin(t * 0.9) * 6; left.position.x = x - 52 + d; right.position.x = x + 52 - d; });
    } else {
      box(x, 62, y + 12, 6, 6, 3, '#f0d7b4'); box(x, 49, y + 12, 12, 3, 3, '#5d3540');
      cyl(x - 40, 32, y + 28, 7, 64, 7, '#f4ecd8'); cyl(x + 40, 32, y + 28, 7, 64, 7, '#d9344f');
      const tent = shape(coneGeometry, x, 84, y - 16, 70, 30, 70, '#d9344f'); tent.rotation.y = Math.PI / 4;
      const hat = ball(x, 98, y - 16, 12, '#ffe05a', true);
      animations.push((t) => { hat.position.y = 98 + Math.abs(Math.sin(t * 3)) * 8; });
    }
  }

  if (renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene.background = new THREE.Color('#0b0d14');
    scene.fog = new THREE.FogExp2('#0b0d14', 0.00045);
    scene.add(new THREE.HemisphereLight('#8d9cc8', '#1c1620', 1.15));
    const light = new THREE.DirectionalLight('#9fb0e6', 1.3);
    light.position.set(-500, 1000, 500); scene.add(light);
    box(SIZE * CELL / 2, -8, SIZE * CELL / 2, SIZE * CELL, 16, SIZE * CELL, '#2b2a24');
    FRIGHT_MAZE.forEach((row, y) => [...row].forEach((tile, x) => {
      const area = areas[y][x];
      if (tile !== '#') {
        const check = (x + y) % 2;
        box((x + 0.5) * CELL, 1, (y + 0.5) * CELL, CELL - 2, 2, CELL - 2,
          area ? (area === 'clowns' && check ? '#e8d6c4' : palettes[area][0]) : check ? '#5a5444' : '#625b49');
        if (area) decorateFloor(area, x, y);
        return;
      }
      const wall = box((x + 0.5) * CELL, 30, (y + 0.5) * CELL, CELL, area === 'claustrophobia' ? 72 : 60, CELL,
        area ? palettes[area][1] : (x + y) % 2 ? '#454b34' : '#525838');
      wall.userData.wall = true;
      if (area) decorateWall(area, x, y);
      else for (let i = 0; i < 3; i += 1) {
        box(x * CELL + 18 + i * 36, 63 + (x * 7 + y * 11 + i * 5) % 10, (y + 0.5) * CELL,
          9, 18, CELL - 12, '#6b6a3c');
      }
    }));
    for (const object of FRIGHT_OBJECTS) {
      if (object.kind === 'exit') {
        box(object.x - 35, 40, object.y, 12, 80, 14, '#5e4630');
        box(object.x + 35, 40, object.y, 12, 80, 14, '#5e4630');
        box(object.x, 78, object.y, 82, 12, 14, '#987344');
        for (let i = 0; i < 7; i += 1) box(object.x - 30 + i * 10, 62, object.y, 5, 5, 4, colors[FRIGHT_THEMES[i].id], true);
        addLight('#ffd89a', object.x, 80, object.y, 3, 0.3);
      } else buildSetPiece(object);
    }
    player = new THREE.Group();
    const person = (w, h, d, color, x, y, z) => {
      const mesh = new THREE.Mesh(geometry, material(color));
      mesh.scale.set(w, h, d); mesh.position.set(x, y, z); player.add(mesh);
      return mesh;
    };
    person(25, 36, 17, PLAYER_OUTFIT, 0, 42, 0);
    person(18, 19, 18, '#dfb38c', 0, 70, 0);
    person(20, 6, 20, '#40342d', 0, 82, 0);
    person(20, 25, 5, CHARACTER_HAIR, 0, 71, -10);
    const legs = [person(9, 24, 10, '#342f2b', -7, 12, 0), person(9, 24, 10, '#342f2b', 7, 12, 0)];
    person(7, 28, 8, PLAYER_OUTFIT, -16, 43, 0);
    person(7, 28, 8, PLAYER_OUTFIT, 16, 43, 0);
    player.userData.legs = legs;
    scene.add(player);
    const torch = new THREE.PointLight('#ffd9a0', 4.5, 330, 1.3);
    torch.position.set(0, 60, 25); player.add(torch);
    playerLabel = label(characterName, 0, 105, 0);
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
    if (renderer) {
      player.position.set(state.player.x, 0, state.player.y);
      if (previousPosition && (previousPosition.x !== state.player.x || previousPosition.y !== state.player.y)) {
        player.rotation.y = Math.atan2(state.player.x - previousPosition.x, state.player.y - previousPosition.y);
        walkingPhase += 0.3;
        player.userData.legs[0].rotation.x = Math.sin(walkingPhase) * 0.4;
        player.userData.legs[1].rotation.x = -Math.sin(walkingPhase) * 0.4;
      } else {
        player.userData.legs[0].rotation.x = 0;
        player.userData.legs[1].rotation.x = 0;
      }
      previousPosition = { ...state.player };
      playerLabel.position.set(state.player.x, 108, state.player.y);
      camera.position.set(state.player.x + 400, 900, state.player.y + 600);
      camera.lookAt(state.player.x, 0, state.player.y);
      camera.updateMatrixWorld();
      markers.forEach((marker, id) => {
        const object = FRIGHT_OBJECTS.find((entry) => entry.id === id);
        marker.visible = object.kind === 'clue' || (object.kind === 'cache' ? !state.collected.includes(object.theme) : !state.tools.includes(object.theme));
      });
      renderer.render(scene, camera);
      return;
    }
    context.fillStyle = '#171d22'; context.fillRect(0, 0, width, height);
    const screen = (x, y) => ({ x: width / 2 + (x - state.player.x) * scale, y: height / 2 + (y - state.player.y) * scale });
    FRIGHT_MAZE.forEach((row, y) => [...row].forEach((tile, x) => {
      const p = screen(x * CELL, y * CELL);
      const area = areas[y][x];
      context.fillStyle = area ? palettes[area][tile === '#' ? 1 : 0] : tile === '#' ? '#59603d' : '#736a52';
      context.fillRect(p.x, p.y, CELL * scale + 1, CELL * scale + 1);
      if (tile === '#') {
        context.fillStyle = '#7a794b';
        context.fillRect(p.x + 5 * scale, p.y + 5 * scale, (CELL - 10) * scale, 10 * scale);
      }
    }));
    FRIGHT_OBJECTS.forEach((object) => {
      if ((object.kind === 'cache' && state.collected.includes(object.theme)) || (object.kind === 'tool' && state.tools.includes(object.theme))) return;
      const p = screen(object.x, object.y);
      context.fillStyle = colors[object.theme] || '#e6bf78';
      context.fillRect(p.x - 12 * scale, p.y - 12 * scale, 24 * scale, 24 * scale);
      context.strokeStyle = '#222'; context.lineWidth = 2; context.strokeRect(p.x - 12 * scale, p.y - 12 * scale, 24 * scale, 24 * scale);
      if (object.theme) {
        const theme = FRIGHT_THEMES.find((entry) => entry.id === object.theme);
        context.fillStyle = '#fff2ce'; context.font = `bold ${Math.max(10, 12 * scale)}px sans-serif`;
        context.textAlign = 'center'; context.fillText(`${theme.name} ${object.kind}`, p.x, p.y - 20 * scale);
      }
    });
    drawCharacterMarker(context, width / 2, height / 2, PLAYER_OUTFIT, scale);
  }
  function handleClick(event) {
    if (!state) return;
    const rect = canvas.getBoundingClientRect();
    let target;
    if (renderer) {
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
      const marker = raycaster.intersectObjects([...markers.values()]).find((hit) => hit.object.visible);
      if (marker) { onSelect({ objectId: marker.object.userData.objectId }); return; }
      const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
      if (!hit) return;
      target = { x: hit.x, y: hit.z };
    } else target = { x: state.player.x + (event.clientX - rect.left - width / 2) / scale,
      y: state.player.y + (event.clientY - rect.top - height / 2) / scale };
    const nearby = FRIGHT_OBJECTS.find((object) => Math.hypot(object.x - target.x, object.y - target.y) < 40);
    onSelect(nearby ? { objectId: nearby.id } : target);
  }
  canvas.addEventListener('click', handleClick);
  return {
    draw, resize,
    dispose() {
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrame);
      [geometry, cylinderGeometry, coneGeometry, sphereGeometry].forEach((entry) => entry.dispose()); materials.forEach((entry) => entry.dispose()); textures.forEach((entry) => entry.dispose()); renderer?.dispose();
    }
  };
}
