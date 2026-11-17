import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { addHallBookcase, addHallPedestal, addHallPlanter, addHallPresent, addHallSconce, addHallTable, createHallBannerGeometry, createHallExitMatGeometry, createHallPedestalGeometry, drawHallDisplay, drawHallFurniture, drawHallPresent, hallShelfBooks, hallShelfStack, HALL_BANNER_HEIGHT, HALL_BOOKCASE_WIDTH, HALL_BOOKCASE_X, HALL_BOOKCASE_Z, HALL_PEDESTAL_DEPTH, HALL_PEDESTAL_WIDTH, HALL_PILLAR_X, HALL_RUG, HALL_SCONCE_X, HALL_PLANTER_X, HALL_TABLE_X, HALL_TROPHY_ACCENTS, paintHallBanner, paintHallExitMat, paintHallFloor, paintHallRug, paintHallStone } from '../js/games/castle-interior-art.js';
import { HALL_EXIT_MAT } from '../js/games/trophy-logic.js';

function recordingContext() {
  const calls = [];
  const context = {
    fillRect(...args) { calls.push(['fillRect', this.fillStyle, ...args]); },
    strokeRect(...args) { calls.push(['strokeRect', this.strokeStyle, ...args]); },
    fillText(...args) { calls.push(['fillText', ...args]); },
    drawImage(...args) { calls.push(['drawImage', ...args]); },
    beginPath() {}, closePath() {}, fill() { calls.push(['fill', this.fillStyle]); }, stroke() {},
    moveTo(...args) { calls.push(['moveTo', ...args]); },
    lineTo(...args) { calls.push(['lineTo', ...args]); },
    roundRect(...args) { calls.push(['roundRect', ...args]); },
    ellipse(...args) { calls.push(['ellipse', ...args]); },
    arc(...args) { calls.push(['arc', ...args]); },
    save() {}, restore() {}, clip() {},
    bezierCurveTo(...args) { calls.push(['bezierCurveTo', ...args]); }
  };
  return { context, calls };
}

test('castle stone, flooring and rug have deterministic, detailed textures', () => {
  for (const [paint, minimumMarks] of [[paintHallStone, 500], [paintHallFloor, 1000], [paintHallRug, 1400]]) {
    const first = recordingContext(), second = recordingContext();
    paint(first.context); paint(second.context);
    assert.deepEqual(first.calls, second.calls);
    assert.ok(first.calls.length >= minimumMarks);
    assert.ok(new Set(first.calls.filter(([name]) => name === 'fillRect').map(([, color]) => color)).size >= 4);
    assert.ok(first.calls.some(([name]) => name === 'strokeRect') || paint === paintHallStone);
  }
});

test('the woven exit mat has an unlabelled curved, decorative border', () => {
  const first = recordingContext(), second = recordingContext();
  paintHallExitMat(first.context); paintHallExitMat(second.context);
  assert.deepEqual(first.calls, second.calls);
  assert.ok(first.calls.length > 500);
  assert.ok(!first.calls.some(([name]) => name === 'fillText'));
  assert.ok(first.calls.filter(([name]) => name === 'ellipse').length >= 3);
  const geometry = createHallExitMatGeometry();
  try {
    assert.ok(Math.abs(geometry.boundingBox.min.x + HALL_EXIT_MAT.width / 2) < 0.001);
    assert.ok(Math.abs(geometry.boundingBox.max.x - HALL_EXIT_MAT.width / 2) < 0.001);
    assert.ok(Math.abs(geometry.boundingBox.min.y + HALL_EXIT_MAT.depth / 2) < 0.001);
    assert.ok(Math.abs(geometry.boundingBox.max.y - HALL_EXIT_MAT.depth / 2) < 0.001);
    const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv'), indices = geometry.getIndex();
    for (let i = 0; i < position.count; i += 1) {
      assert.ok(Math.abs(uv.getX(i) - (position.getX(i) + HALL_EXIT_MAT.width / 2) / HALL_EXIT_MAT.width) < 1e-6);
      assert.ok(Math.abs(uv.getY(i) - (position.getY(i) + HALL_EXIT_MAT.depth / 2) / HALL_EXIT_MAT.depth) < 1e-6);
    }
    let area = 0;
    for (let i = 0; i < indices.count; i += 3) {
      const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
      area += Math.abs((position.getX(b) - position.getX(a)) * (position.getY(c) - position.getY(a))
        - (position.getY(b) - position.getY(a)) * (position.getX(c) - position.getX(a))) / 2;
    }
    const semicircleArea = Math.PI * HALL_EXIT_MAT.width / 2 * HALL_EXIT_MAT.depth / 2;
    assert.ok(Math.abs(area - semicircleArea) / semicircleArea < 0.01);
  } finally { geometry.dispose(); }
  assert.ok(HALL_RUG.depth > 175 && HALL_RUG.width > HALL_RUG.depth);
  assert.ok(HALL_RUG.z + HALL_RUG.depth / 2 < HALL_EXIT_MAT.z - HALL_EXIT_MAT.depth / 2);
});

test('the main rug is centred higher in the hall beneath the present', () => {
  assert.equal(HALL_RUG.z, 320);
  assert.ok(Math.abs(HALL_RUG.z - 325) <= 5);
  assert.ok(HALL_RUG.z - HALL_RUG.depth / 2 > 163.5);
});

test('each embroidered banner uses its stand color and a distinct keepsake emblem', () => {
  const signatures = [];
  for (const [index, color] of HALL_TROPHY_ACCENTS.entries()) {
    const first = recordingContext(), second = recordingContext();
    paintHallBanner(first.context, index); paintHallBanner(second.context, index);
    assert.deepEqual(first.calls, second.calls);
    assert.deepEqual(first.calls.find(([operation]) => operation === 'fillRect'), ['fillRect', color, 0, 0, 256, 320]);
    assert.ok(first.calls.length > 500, 'woven shading and stitched borders add detail');
    signatures.push(JSON.stringify(first.calls.slice(-40)));
  }
  assert.equal(new Set(HALL_TROPHY_ACCENTS).size, 5);
  assert.equal(new Set(signatures).size, 5);
  assert.throws(() => paintHallBanner(recordingContext().context, 5), RangeError);
  assert.throws(() => paintHallBanner(recordingContext().context, 'length'), RangeError);
});

test('the banner is pointed and has UVs covering its full embroidered texture', () => {
  const geometry = createHallBannerGeometry();
  try {
    const position = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
    assert.equal(position.count, uv.count);
    assert.equal(geometry.boundingBox.min.y, 0);
    assert.equal(geometry.boundingBox.max.y, 105);
    assert.ok(geometry.boundingBox.max.y > 72 * 1.4);
    for (let i = 0; i < position.count; i += 1) {
      assert.ok(Math.abs(uv.getX(i) - (position.getX(i) + 35.5) / 71) < 1e-6);
      assert.ok(Math.abs(uv.getY(i) - position.getY(i) / HALL_BANNER_HEIGHT) < 1e-6);
    }
  } finally { geometry.dispose(); }
});

test('illustrated room includes furnishings at the same locations as the 3D hall', () => {
  const { context, calls } = recordingContext();
  drawHallFurniture(context);
  assert.deepEqual(HALL_TABLE_X, [205, 835]);
  assert.deepEqual(HALL_PLANTER_X, [192, 848]);
  assert.deepEqual(HALL_SCONCE_X, [68, 972]);
  for (const x of HALL_TABLE_X) {
    assert.ok(calls.some(([name, color, px, py]) => name === 'fillRect' && color === '#4a3b30' && px === x - 38 && py === 305));
  }
  for (const [xs, z] of [[HALL_SCONCE_X, 35], [HALL_PILLAR_X, 56]]) for (const x of xs) {
    assert.ok(calls.some(([name, color, px, py, width]) => name === 'fillRect' && color === '#5a4331' && px === x - 7 && py === z && width === 14));
  }
  assert.equal(HALL_BOOKCASE_Z[1], (HALL_BOOKCASE_Z[0] + HALL_BOOKCASE_Z[2]) / 2);
  for (const x of HALL_BOOKCASE_X) for (const z of HALL_BOOKCASE_Z) {
    assert.ok(calls.some(([name, color, px, py, width]) => name === 'fillRect' && color === '#49372b' && px === x - 46 && py === z - 8 && width === HALL_BOOKCASE_WIDTH));
  }
  for (const color of ['#e2d0aa', '#55b6a1', '#718eb6', '#ba6b58', '#8eaf91', '#ddcda6']) {
    assert.ok(calls.some((call) => call[1] === color), `${color} appears in the illustrated furniture`);
  }
  assert.equal(calls.filter(([name, color]) => name === 'fill' && color === '#f2e4c5').length, HALL_SCONCE_X.length + HALL_PILLAR_X.length);
  assert.equal(calls.filter(([name, color]) => name === 'fill' && color === '#ffc86b').length, HALL_SCONCE_X.length + HALL_PILLAR_X.length);
});

test('wall sconces have a mounting plate, wax candle, wick and glowing flame', () => {
  const parts = [], parent = {}, cylinder = {}, cone = {}, orb = {};
  const box = (...args) => { parts.push({ kind: 'box', args }); return {}; };
  const round = (...args) => {
    const part = { kind: 'round', args };
    parts.push(part); return part;
  };
  const flame = addHallSconce(68, 43, { box, round, cylinder, cone, orb, parent });
  assert.ok(parts.some(({ kind, args }) => kind === 'box' && args[6] === '#5a4331' && args[2] === 43));
  assert.ok(parts.some(({ kind, args }) => kind === 'box' && args[6] === '#5a4331' && args[3] === 14 && args[4] < 48));
  assert.ok(parts.some(({ kind, args }) => kind === 'round' && args[0] === cylinder && args[7] === '#f2e4c5'));
  assert.ok(parts.filter(({ kind, args }) => kind === 'round' && args[7] === '#fff1d2').length >= 4, 'candles have wax tops and drips');
  assert.ok(parts.some(({ kind, args }) => kind === 'box' && args[6] === '#40342b'));
  assert.equal(flame.args[0], cone);
  assert.equal(flame.args[7], '#ffc86b');
  assert.equal(flame.args[9], true);
});

test('wider bookcases fit their collision footprint and contain varied books', () => {
  const parts = [], parent = {}, orb = {};
  const box = (...args) => { parts.push({ kind: 'box', args }); return {}; };
  const round = (...args) => { parts.push({ kind: 'round', args }); return {}; };
  addHallBookcase(40, 160, { box, round, orb, parent });
  assert.ok(HALL_BOOKCASE_WIDTH > 32 * 2);
  assert.ok(parts.length > 100);
  assert.ok(new Set(parts.filter(({ kind }) => kind === 'box').map(({ args }) => args[6])).size >= 8);
  for (const { kind, args } of parts) {
    const offset = kind === 'round' ? 1 : 0;
    assert.ok(Math.abs(args[offset] - 40) + args[offset + 3] / 2 <= HALL_BOOKCASE_WIDTH / 2);
    assert.ok(Math.abs(args[offset + 2] - 163) + args[offset + 5] / 2 <= 12);
  }
});

test('books vary in height, width, colour and decoration between shelves and bookcases', () => {
  const stacks = HALL_BOOKCASE_X.flatMap((x) => HALL_BOOKCASE_Z.flatMap((z) =>
    Array.from({ length: 4 }, (_, shelf) => hallShelfStack(x, z, shelf))));
  const present = stacks.filter(Boolean);
  assert.ok(present.length && present.length < stacks.length);
  assert.ok(new Set(present.map((stack) => stack.left)).size >= 3);
  assert.ok(new Set(present.map((stack) => stack.books.length)).size >= 3);
  assert.ok(new Set(present.flatMap((stack) => stack.books.map((book) => book.color))).size >= 5);
  assert.ok(new Set(present.flatMap((stack) => stack.books.map((book) => book.width))).size >= 4);
  const shelves = HALL_BOOKCASE_X.flatMap((x) => HALL_BOOKCASE_Z.flatMap((z) =>
    Array.from({ length: 4 }, (_, shelf) => hallShelfBooks(x, z, shelf))));
  const books = shelves.flat();
  assert.equal(new Set(shelves.map((shelf) => JSON.stringify(shelf))).size, shelves.length);
  assert.ok(new Set(books.map((book) => book.width)).size >= 4);
  assert.ok(new Set(books.map((book) => book.height)).size >= 10);
  assert.ok(new Set(books.map((book) => book.color)).size >= 8);
  assert.equal(new Set(books.map((book) => book.style)).size, 4);
  for (const shelf of shelves) for (const [index, book] of shelf.entries()) {
    assert.ok(book.left >= -41 && book.left + book.width <= 41);
    if (index) assert.ok(book.left > shelf[index - 1].left + shelf[index - 1].width);
  }
});

test('both planters contain layered orange tulips and purple lisianthus with buds', () => {
  const make = (index) => {
    const parts = [], parent = {}, shape = {};
    const round = (...args) => { parts.push(args); return { rotation: { x: 0, z: 0 } }; };
    addHallPlanter(192, 510, index, { round, cylinder: shape, orb: shape, parent });
    return parts;
  };
  const first = make(0), second = make(1);
  const stemPositions = (parts) => parts.filter((args) => args[7] === '#5e7944')
    .map((args) => [args[1] - 192, args[3] - 510]);
  assert.deepEqual(stemPositions(first), [
    [-10, -8], [4, -10], [12, 3], [-4, 9], [-13, 3],
    [-3, -2], [8, -3], [8, 10], [-12, -13], [13, -10]
  ]);
  assert.deepEqual(stemPositions(second), stemPositions(first));
  for (const parts of [first, second]) {
    assert.ok(parts.length > 100);
    for (const color of ['#584437', '#80614b', '#c19c6c', '#dbc095', '#f0d7a4']) {
      assert.ok(parts.some((args) => args[7] === color), `${color} details the pot`);
    }
    assert.equal(parts.filter((args) => args[7] === '#f0d7a4').length, 12);
    for (const color of ['#d95518', '#e87922', '#48204e', '#77417a', '#4b2852', '#dcc094']) {
      assert.ok(parts.some((args) => args[7] === color), `${color} is present in each bouquet`);
    }
    assert.ok(parts.filter((args) => ['#d95518', '#e87922', '#bd421b'].includes(args[7])).length >= 24);
    assert.ok(parts.filter((args) => ['#48204e', '#62306b', '#77417a', '#502457'].includes(args[7])).length >= 32);
    assert.ok(parts.filter((args) => args[7] === '#5e7944').length >= 10);
  }
  for (const args of [...first, ...second]) {
    assert.ok(Math.abs(args[1] - 192) + args[4] / 2 <= 29);
    assert.ok(Math.abs(args[3] - 510) + args[6] / 2 <= 29);
  }
  const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  const orb = new THREE.SphereGeometry(0.5, 16, 10), material = new THREE.MeshBasicMaterial();
  try {
    for (const index of [0, 1]) {
      const parent = new THREE.Group();
      const round = (shape, x, y, z, w, h, d) => {
        const mesh = new THREE.Mesh(shape, material);
        mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
      };
      addHallPlanter(192, 510, index, { round, cylinder, orb, parent });
      const bounds = new THREE.Box3().setFromObject(parent);
      assert.ok(bounds.min.x >= 192 - 29 && bounds.max.x <= 192 + 29);
      assert.ok(bounds.min.z >= 510 - 29 && bounds.max.z <= 510 + 29);
    }
  } finally { cylinder.dispose(); orb.dispose(); material.dispose(); }
});

test('illustrated planters include orange tulips and purple lisianthus', () => {
  const { context, calls } = recordingContext();
  drawHallFurniture(context);
  for (const color of ['#5c4436', '#9d7958', '#5a4536', '#f0d7a4', '#d95518', '#e87922', '#48204e', '#77417a', '#4b2852']) {
    assert.ok(calls.filter(([name, fill]) => name === 'fill' && fill === color).length >= 2, color);
  }
  assert.equal(calls.filter(([name, fill]) => name === 'fill' && fill === '#f0d7a4').length, 24);
  const flowerCenters = calls.flatMap((call, i) => call[0] === 'arc'
    && ['#9d361b', '#35173a'].includes(calls[i + 1]?.[1]) ? [[call[1], call[2]]] : []);
  const left = flowerCenters.filter(([x]) => x < 520).map(([x, z]) => [x - 192, z - 510]);
  const right = flowerCenters.filter(([x]) => x > 520).map(([x, z]) => [x - 848, z - 510]);
  assert.equal(left.length, 8);
  assert.deepEqual(right, left);
});

test('the tables have different magical study items within their footprints', () => {
  const build = (index) => {
    const parts = [], shape = {}, parent = {};
    const add = (kind) => (...args) => {
      parts.push({ kind, args }); return { rotation: { x: 0, z: 0 } };
    };
    addHallTable(85, 330, index, { box: add('box'), round: add('round'), cylinder: shape, cone: shape, orb: shape, parent });
    return parts;
  };
  const left = build(0), right = build(1);
  for (const color of ['#e2d0aa', '#55b6a1', '#ece0c7']) {
    assert.ok(left.some(({ kind, args }) => args[kind === 'round' ? 7 : 6] === color));
  }
  for (const color of ['#718eb6', '#ba6b58', '#8eaf91', '#ddcda6']) {
    assert.ok(right.some(({ kind, args }) => args[kind === 'round' ? 7 : 6] === color));
  }
  for (const { kind, args } of [...left, ...right]) {
    const offset = kind === 'round' ? 1 : 0;
    assert.ok(Math.abs(args[offset] - 85) + args[offset + 3] / 2 <= 38);
    assert.ok(Math.abs(args[offset + 2] - 330) + args[offset + 5] / 2 <= 25);
  }
});

test('slender pedestals retain their individual accents and fit their collision footprints', () => {
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  const pedestalGeometry = createHallPedestalGeometry();
  const orb = new THREE.SphereGeometry(0.5, 16, 10), material = new THREE.MeshBasicMaterial();
  try {
    assert.ok(HALL_PEDESTAL_WIDTH < 108 && HALL_PEDESTAL_DEPTH <= 87);
    assert.ok(pedestalGeometry.getAttribute('position').count > boxGeometry.getAttribute('position').count);
    assert.ok(Array.from(pedestalGeometry.getAttribute('normal').array).some((value) => Math.abs(value) > 0.01 && Math.abs(value) < 0.99));
    for (const [index, accent] of HALL_TROPHY_ACCENTS.entries()) {
      const parent = new THREE.Group(), colors = [];
      const add = (geometry, x, y, z, w, h, d, color) => {
        colors.push(color);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
      };
      const box = (...args) => add(boxGeometry, ...args);
      const roundedBox = (...args) => add(pedestalGeometry, ...args);
      const halo = addHallPedestal(230, 120, index, { box, roundedBox, round: add, cylinder, orb, parent });
      assert.equal(halo.rotation.x, Math.PI / 2);
      assert.equal(colors.filter((color) => color === accent).length, 3);
      assert.ok(colors.includes('#d3b983') && colors.includes('#e0c99a'));
      assert.ok(colors.includes('#795035') && colors.filter((color) => color === '#98704b').length >= 6);
      assert.ok(parent.children.filter((part) => part.geometry === pedestalGeometry).length >= 12);
      assert.ok(colors.filter((color) => color === '#e6cc92').length >= 12);
      const bounds = new THREE.Box3().setFromObject(parent);
      assert.ok(bounds.min.x >= 230 - HALL_PEDESTAL_WIDTH / 2 && bounds.max.x <= 230 + HALL_PEDESTAL_WIDTH / 2);
      assert.ok(bounds.min.z >= 120 - HALL_PEDESTAL_DEPTH / 2 && bounds.max.z <= 120 + HALL_PEDESTAL_DEPTH / 2);
    }
    assert.throws(() => addHallPedestal(230, 120, 5, {}), RangeError);
  } finally { boxGeometry.dispose(); pedestalGeometry.dispose(); cylinder.dispose(); orb.dispose(); material.dispose(); }
});

test('illustrated displays distinguish empty and earned keepsakes', () => {
  const { context, calls } = recordingContext();
  drawHallDisplay(context, 110, 120, 0, null);
  assert.ok(!calls.some(([name]) => name === 'fillText'), 'empty displays have no labels');
  assert.ok(calls.filter(([name]) => name === 'roundRect').length >= 7);
  assert.ok(calls.some(([name, color]) => name === 'fill' && color === '#885d3b'));
  const image = {};
  drawHallDisplay(context, 255, 120, 1, image);
  assert.ok(calls.some(([name, source]) => name === 'drawImage' && source === image));
  for (const accent of HALL_TROPHY_ACCENTS.slice(0, 2)) {
    assert.ok(calls.some(([name, color]) => name === 'fill' && color === accent));
  }
  assert.throws(() => drawHallDisplay(context, 0, 0, 5, null), RangeError);
});

test('the blue gift rests without a circular stand and fits its collision radius', () => {
  const { context, calls } = recordingContext();
  drawHallPresent(context, 400, 325);
  assert.ok(!calls.some(([name, shade]) => name === 'fill' && shade === '#5a4940'));
  assert.ok(!calls.some(([name, , , radius]) => name === 'arc' && radius === 35));
  for (const color of ['#315a87', '#4577aa', '#e8c879']) {
    assert.ok(calls.some(([name, shade]) => name === 'fillRect' && shade === color));
  }
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
  const orb = new THREE.SphereGeometry(0.5, 16, 10), material = new THREE.MeshBasicMaterial();
  try {
    const parent = new THREE.Group(), colors = [];
    const add = (geometry, x, y, z, w, h, d, color) => {
      colors.push(color);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z); mesh.scale.set(w, h, d); parent.add(mesh); return mesh;
    };
    addHallPresent({ box: (...args) => add(boxGeometry, ...args), round: add, orb, parent });
    assert.ok(parent.children.every((part) => part.geometry !== cylinder), 'the gift has no cylindrical stand');
    const body = parent.children.find((part) => part.position.y === 23 && part.scale.y === 46);
    assert.equal(new THREE.Box3().setFromObject(body).min.y, 0, 'the gift sits at floor level');
    for (const color of ['#315a87', '#4577aa', '#e8c879', '#f6d991', '#a9c7d9']) {
      assert.ok(colors.includes(color), `${color} is present on the gift`);
    }
    assert.ok(colors.filter((color) => color === '#a9c7d9').length >= 16);
    for (const part of parent.children) {
      if (part.geometry === cylinder) {
        assert.ok(Math.max(Math.abs(part.position.x) + part.scale.x / 2, Math.abs(part.position.z) + part.scale.z / 2) <= 47);
      } else {
        const bounds = new THREE.Box3().setFromObject(part);
        for (const x of [bounds.min.x, bounds.max.x]) for (const z of [bounds.min.z, bounds.max.z]) {
          assert.ok(Math.hypot(x, z) <= 47);
        }
      }
    }
  } finally { boxGeometry.dispose(); cylinder.dispose(); orb.dispose(); material.dispose(); }
});
