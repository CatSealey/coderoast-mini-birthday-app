import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OBJECTS, PUB_STOOLS, newAdventureState } from '../js/games/adventure-logic.js';
import { PUB_CAMERA_OFFSET, PUB_DRINKS_TABLE_HEIGHT, PUB_FURNITURE_PALETTE, PUB_POOL_LIGHTS, PUB_RACK_CUES, PUB_RUG, PUB_SHORT_CUE_SCALE, PUB_STOOL_SEAT_COLOR, PUB_TABLE_STOOL_SEAT, addPubCue, addPubDrinksTable, addPubFurnitureDetails, addPubStoolDetails, addPubTableStool, addPubWallDetails, attachPubCatCue, drawPubHeldCue, drawPubInterior, drawPubObject, paintPubFloor, paintPubRug, pubCameraFraming, pubCatHoldsCue, pubCuesTaken } from '../js/games/pub-interior-art.js';
import { createCharacterArms, swingCharacterArms } from '../js/character-body.js';

function recordingContext() {
  const calls = [];
  const context = { createRadialGradient: () => ({ addColorStop() {} }) };
  for (const method of ['fillRect', 'strokeRect', 'drawImage', 'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'fill', 'stroke']) {
    context[method] = (...args) => calls.push([method, context.fillStyle, ...args]);
  }
  return { context, calls };
}

test('pub flooring and woven rug are detailed and deterministic', () => {
  for (const [paint, minimum] of [[paintPubFloor, 1000], [paintPubRug, 600]]) {
    const first = recordingContext(), second = recordingContext();
    paint(first.context); paint(second.context);
    assert.deepEqual(first.calls, second.calls);
    assert.ok(first.calls.length > minimum);
    assert.ok(new Set(first.calls.filter(([name]) => name === 'fillRect').map(([, color]) => color)).size >= 5);
  }
});

test('the rug is blue and every stool has a maroon seat in both views', () => {
  const rug = recordingContext();
  paintPubRug(rug.context);
  const field = rug.calls.find(([name, , x, y, w, h]) => name === 'fillRect' && x === 13 && y === 13 && w === 314 && h === 169);
  const blue = new THREE.Color(field[1]);
  assert.ok(blue.b > blue.g && blue.g > blue.r);
  const maroon = new THREE.Color(PUB_STOOL_SEAT_COLOR);
  assert.ok(maroon.r > maroon.b && maroon.b > maroon.g);
  const seats = [];
  addPubStoolDetails({
    box: () => ({}),
    round: (geometry, x, y, z, w, h, d, color) => { if (color === PUB_STOOL_SEAT_COLOR) seats.push({ x, z }); },
    cylinder: {}, sphere: {}, parent: {}
  });
  assert.equal(seats.length, PUB_STOOLS.length);
  const room = recordingContext();
  drawPubInterior(room.context, {}, {});
  assert.equal(room.calls.filter(([name, color]) => name === 'fill' && color === PUB_STOOL_SEAT_COLOR).length, PUB_STOOLS.length);
});

test('table stools are smaller and lower than before while bar stools stay unchanged', () => {
  const barStools = PUB_STOOLS.filter(({ y }) => y === 205);
  const tableStools = PUB_STOOLS.filter(({ y }) => y !== 205);
  assert.equal(barStools.length, 3);
  assert.ok(barStools.every(({ radius }) => radius === 17.5));
  assert.equal(tableStools.length, 4);
  assert.ok(tableStools.every(({ radius }) => radius === 18.5));
  const seats = [];
  addPubStoolDetails({
    box: () => ({}),
    round: (geometry, x, y, z, w, h, d, color) => {
      if (color === PUB_STOOL_SEAT_COLOR) seats.push({ x, y, z, w });
    },
    cylinder: {}, sphere: {}, parent: {}
  });
  for (const stool of tableStools) {
    const seat = seats.find(({ x, z }) => x === stool.x && z === stool.y);
    assert.equal(seat.y, PUB_TABLE_STOOL_SEAT + 1);
    assert.equal(seat.w, stool.radius * 2 - 4);
    const pieces = [];
    addPubTableStool(stool, {
      box: (x, y, z, w, h, d) => { pieces.push({ y, h }); },
      round: (geometry, x, y, z, w, h, d) => { pieces.push({ y, h }); },
      cylinder: {}, parent: {}
    });
    assert.equal(pieces.length, 5);
    assert.ok(pieces.slice(0, 4).every(({ y, h }) => y - h / 2 === 0 && y + h / 2 >= pieces[4].y - pieces[4].h / 2));
    assert.ok(pieces[4].y + pieces[4].h / 2 >= seat.y - 1);
  }
});

test('the lowered drinks table keeps its legs, decoration and drinks aligned', () => {
  const object = OBJECTS[1].find(({ kind }) => kind === 'table'), pieces = [];
  const parent = {}, drinksParent = {};
  const box = (x, y, z, w, h, d, color, owner) => {
    const piece = { x, y, z, w, h, d, color, owner }; pieces.push(piece); return piece;
  };
  const round = (geometry, x, y, z, w, h, d, color, owner) => {
    const piece = { x, y, z, w, h, d, color, owner }; pieces.push(piece); return piece;
  };
  const tabletop = addPubDrinksTable(object, { box, round, cylinder: {}, parent, drinksParent });
  addPubFurnitureDetails(object, { box, round, cylinder: {}, sphere: {}, parent });
  assert.equal(tabletop.y, 34);
  assert.ok(tabletop.y < 46);
  const legs = pieces.filter(({ color }) => color === '#5e4330');
  assert.equal(legs.length, 4);
  assert.ok(legs.every(({ y, h }) => y - h / 2 === 0 && y + h / 2 === PUB_DRINKS_TABLE_HEIGHT));
  const grain = pieces.filter(({ color, h }) => ['#be946a', '#805b40'].includes(color) && h === 0.2);
  assert.equal(grain.length, 22);
  const surface = Math.max(...grain.map(({ y, h }) => y + h / 2));
  assert.ok(surface - (PUB_TABLE_STOOL_SEAT + 2) >= 10);
  assert.ok(surface < 45);
  const drinks = pieces.filter(({ owner, color }) => owner === drinksParent && color === '#d6ae6e');
  const foam = pieces.filter(({ owner, color }) => owner === drinksParent && color === '#eee3b3');
  assert.equal(drinks.length, 2);
  assert.equal(foam.length, 2);
  assert.ok(drinks.every(({ y, h }) => Math.abs(y - h / 2 - surface) < 1e-8));
  assert.ok(foam.every(({ x, y, h }) => drinks.some((drink) =>
    drink.x === x && Math.abs(y - h / 2 - drink.y - drink.h / 2) < 1e-8)));
});

test('the furniture has visible wood grain and the pool table has supported feet', () => {
  for (const kind of ['bar', 'table', 'tools', 'cabinet']) {
    const object = OBJECTS[1].find((item) => item.kind === kind), pieces = [];
    const box = (x, y, z, w, h, d, color) => { pieces.push({ x, y, z, w, h, d, color }); return { rotation: {} }; };
    const round = () => ({ rotation: {} });
    addPubFurnitureDetails(object, { box, round, cylinder: {}, sphere: {}, parent: {} });
    const grains = pieces.filter(({ color, h, w }) =>
      kind === 'bar' || kind === 'table' ? ['#be946a', '#805b40'].includes(color) && h === 0.2
        : color === PUB_FURNITURE_PALETTE[kind].door && w === 0.5);
    assert.ok(grains.length >= 16, `${kind} has wood grain`);
    if (kind === 'tools' || kind === 'cabinet') {
      const topHeight = kind === 'tools' ? 90 : 56;
      assert.equal(pieces.filter(({ y, h, d }) => y === topHeight + 1.05 && h === 0.2 && d === 0.5).length, 20);
    }
    const drawing = recordingContext();
    drawPubObject(drawing.context, object, newAdventureState(1), 0);
    const grainColor = kind === 'bar' || kind === 'table' ? '#be946a' : PUB_FURNITURE_PALETTE[kind].door;
    assert.ok(drawing.calls.filter(([name, color, , , w, h]) =>
      name === 'fillRect' && color === grainColor && (h === 0.7 || w === 0.6)).length >= 8);
  }
  const pool = OBJECTS[1].find(({ kind }) => kind === 'pool'), pieces = [];
  const box = (x, y, z, w, h, d, color) => { pieces.push({ x, y, z, w, h, d, color }); return { rotation: {} }; };
  addPubFurnitureDetails(pool, { box, round: () => ({ rotation: {} }), cylinder: {}, sphere: {}, parent: {} });
  assert.equal(pieces.filter(({ y, color }) => y === 3 && color === '#62432e').length, 4);
  assert.equal(pieces.filter(({ y, color }) => y === 12 && color === '#593e2c').length, 4);
});

test('the pool table has a cue-end baulk line and detailed side panels', () => {
  const pool = OBJECTS[1].find(({ kind }) => kind === 'pool'), pieces = [];
  const box = (x, y, z, w, h, d, color) => {
    const piece = { x, y, z, w, h, d, color, rotation: {} }; pieces.push(piece); return piece;
  };
  const round = () => ({ rotation: {} });
  addPubFurnitureDetails(pool, { box, round, cylinder: {}, sphere: {}, parent: {} });
  const line = pieces.find(({ color }) => color === '#eeeae0');
  assert.deepEqual([line.x, line.y, line.z, line.w, line.h, line.d],
    [pool.x - 55, 72.1, pool.y, 1, 0.1, 100]);
  assert.ok(pool.x - 65 < line.x, 'the cue ball starts behind the line');
  assert.equal(pieces.filter(({ color, w, h }) => color === '#80583b' && w === 67 && h === 14).length, 4);
  assert.equal(pieces.filter(({ color, rotation }) => color === '#d3b17a' && rotation.z === Math.PI / 4).length, 2);
  const drawing = recordingContext();
  drawPubObject(drawing.context, pool, { ...newAdventureState(1), ballsPlaced: true }, 0);
  const lineIndex = drawing.calls.findIndex(([name, color, x, y, w, h]) =>
    name === 'fillRect' && color === '#eeeae0' && x === pool.x - 55.75 && y === pool.y - 50 && w === 1.5 && h === 100);
  const ballIndex = drawing.calls.findIndex(([name, color]) => name === 'fill' && color === '#f2ead8');
  assert.ok(lineIndex >= 0 && ballIndex > lineIndex, 'the illustrated line is beneath the cue ball');
});

test('pub furniture detailing stays inside the existing collision footprints', () => {
  const parts = [];
  const box = (x, y, z, w, h, d) => {
    const part = { x, z, w, h, d, rotation: { x: 0, y: 0 } }; parts.push(part); return part;
  };
  const round = (geometry, x, y, z, w, h, d) => {
    const part = { x, z, w, h, d, rotation: { x: 0, y: 0 } }; parts.push(part); return part;
  };
  const helpers = { box, round, cylinder: {}, sphere: {}, parent: {} };
  for (const object of OBJECTS[1].filter(({ kind }) => kind !== 'npc')) {
    parts.length = 0;
    addPubFurnitureDetails(object, helpers);
    assert.ok(parts.length > 0, `${object.name} has detailing`);
    for (const part of parts) {
      const depth = Math.abs(Math.cos(part.rotation.x)) * part.d + Math.abs(Math.sin(part.rotation.x)) * part.h;
      const rx = (Math.abs(Math.cos(part.rotation.y)) * part.w + Math.abs(Math.sin(part.rotation.y)) * depth) / 2;
      const rz = (Math.abs(Math.sin(part.rotation.y)) * part.w + Math.abs(Math.cos(part.rotation.y)) * depth) / 2;
      assert.ok(Math.abs(part.x - object.x) + rx <= object.footprint.width / 2 + 1e-6, `${object.name}: x extent`);
      assert.ok(Math.abs(part.z - object.y) + rz <= object.footprint.depth / 2 + 1e-6, `${object.name}: z extent`);
    }
  }
  parts.length = 0;
  addPubStoolDetails(helpers);
  for (const part of parts) {
    assert.ok(PUB_STOOLS.some((stool) => Math.hypot(part.x - stool.x, part.z - stool.y) + Math.max(part.w, part.d) / 2
      <= stool.radius + 1e-6));
  }
});

test('cupboards and ball case have contrasting, full-height details in both views', () => {
  const luminance = (hex) => {
    const color = new THREE.Color(hex);
    return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
  };
  for (const kind of ['tools', 'cabinet', 'box']) {
    const palette = PUB_FURNITURE_PALETTE[kind], object = OBJECTS[1].find((item) => item.kind === kind);
    if (kind !== 'box') {
      const previousInset = kind === 'tools' ? '#d4ae7c' : '#dabc90';
      assert.ok(luminance(palette.inset) < luminance(previousInset) * 0.7, `${kind} panels are darker`);
    }
    for (const color of Object.values(palette)) {
      const { r, g, b } = new THREE.Color(color);
      assert.ok(r >= g && g >= b, `${kind} uses warm wood colours`);
    }
    const contrast = (a, b) => {
      const values = [luminance(a), luminance(b)].sort((first, second) => first - second);
      return (values[1] + 0.05) / (values[0] + 0.05);
    };
    assert.ok(contrast(palette.inset, palette.body) >= 3);
    assert.ok(contrast(palette.frame, palette.body) >= 3);
    const pieces = [];
    const box = (x, y, z, w, h, d, color) => { pieces.push({ h, color }); return { rotation: {} }; };
    const round = (geometry, x, y, z, w, h, d, color) => { pieces.push({ h, color }); return { rotation: {} }; };
    addPubFurnitureDetails(object, { box, round, cylinder: {}, sphere: {}, parent: {} });
    assert.ok(pieces.some(({ color, h }) => color === palette.inset && h >= (kind === 'tools' ? 60 : 30)));
    assert.ok(pieces.length >= 25, `${kind} has panels, mouldings and hardware`);
    const drawing = recordingContext();
    drawPubObject(drawing.context, object, newAdventureState(1), 0);
    for (const color of [palette.body, palette.frame, palette.door, palette.inset]) {
      assert.ok(drawing.calls.some(([name, fill]) => name === 'fillRect' && fill === color));
    }
  }
});

test('bar and cue stand have layered detailing in both views', () => {
  for (const [kind, minimum] of [['bar', 65], ['rack', 25]]) {
    const object = OBJECTS[1].find((item) => item.kind === kind), pieces = [];
    const box = (x, y, z, w, h, d, color) => { pieces.push(color); return { rotation: {} }; };
    const round = (geometry, x, y, z, w, h, d, color) => { pieces.push(color); return { rotation: {} }; };
    addPubFurnitureDetails(object, { box, round, cylinder: {}, sphere: {}, parent: {} });
    assert.ok(pieces.length >= minimum, `${kind} has layered fittings`);
    const drawing = recordingContext();
    drawPubObject(drawing.context, object, newAdventureState(1), 0);
    assert.ok(drawing.calls.some(([name, color]) => name === 'fillRect' && color === (kind === 'bar' ? '#513b31' : '#674630')));
  }
});

test('pub wall decorations and pool lights do not add obstacles to walking areas', () => {
  const parts = [];
  const box = (x, y, z, w, h, d) => { parts.push({ x, y, z, w, h, d }); return { rotation: {} }; };
  const round = (geometry, x, y, z, w, h, d, color, parent, glow) => { parts.push({ x, y, z, w, h, d, glow }); return { rotation: {} }; };
  addPubWallDetails({ box, round, cylinder: {}, sphere: {}, parent: {} });
  assert.ok(parts.length > 100);
  for (const part of parts) {
    assert.ok(part.z + part.d / 2 <= 110 || part.y - part.h / 2 > 100);
    assert.ok(part.z <= 110 || part.x - part.w / 2 >= 40, 'no decorations are left floating beside the removed wall');
  }
  assert.equal(parts.filter(({ glow }) => glow).length, PUB_POOL_LIGHTS.length * 2);
});

test('the pub camera fits the whole room, back wall and lights at desktop and mobile aspect ratios', () => {
  const bounds = [
    { xs: [0, 1000], zs: [0, 700], ys: [0] },
    { xs: [-10, 1010], zs: [-10, 10], ys: [0, 165] },
    { xs: [435, 565], zs: [183, 211], ys: [150, 205] }
  ];
  for (const [width, height] of [[1080, 720], [1440, 600], [375, 700], [700, 1000]]) {
    const framing = pubCameraFraming(width, height), halfWidth = framing.height * width / height / 2;
    const camera = new THREE.OrthographicCamera(framing.centerX - halfWidth, framing.centerX + halfWidth,
      framing.centerY + framing.height / 2, framing.centerY - framing.height / 2, 1, 4000);
    camera.position.set(500 + PUB_CAMERA_OFFSET.x, PUB_CAMERA_OFFSET.y, 350 + PUB_CAMERA_OFFSET.z);
    camera.lookAt(500, 0, 350); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity;
    for (const { xs, zs, ys } of bounds) for (const x of xs) for (const z of zs) for (const y of ys) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      assert.ok(Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1, `${width}x${height}: ${x},${y},${z}`);
      const screenY = (1 - point.y) * height / 2;
      assert.ok(screenY >= Math.min(16, height * 0.04)
        && screenY <= height - Math.min(76, height * 0.12), `${width}x${height}: room clears the overlays`);
      minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
    }
    if (width === 1080) assert.ok((maxX - minX) / 2 > 0.9, 'the room fills over 90% of a desktop viewport');
    const nearLeft = new THREE.Vector3(0, 0, 700).project(camera);
    const nearRight = new THREE.Vector3(1000, 0, 700).project(camera);
    const farLeft = new THREE.Vector3(0, 0, 0).project(camera);
    assert.ok(Math.abs(nearLeft.x - farLeft.x) < 1e-10, 'the floor does not skew sideways');
    assert.ok(Math.abs(nearLeft.y - nearRight.y) < 1e-10, 'the front and back edges are level');
  }
});

test('cues have detailed shafts, grips and tips in both orientations', () => {
  for (const horizontal of [false, true]) {
    const pieces = [];
    const box = () => ({ rotation: {} });
    const round = (geometry, x, y, z, w, h, d, color) => {
      const piece = { x, y, z, w, h, d, color, rotation: {} }; pieces.push(piece); return piece;
    };
    addPubCue({ box, round, cylinder: {}, parent: {} }, 0, 50, 0, horizontal);
    assert.ok(pieces.length >= 6);
    assert.ok(pieces.some(({ color }) => color === '#76503a'));
    assert.ok(pieces.some(({ color }) => color === '#597184'));
    if (horizontal) assert.ok(pieces.every(({ rotation }) => rotation.z === Math.PI / 2));
  }
});

test('Cat’s full-length cue tilts away from her head while staying at her hand', () => {
  const cat = new THREE.Group(), cue = new THREE.Group();
  const box = (x, y, z, width, height, depth, color, owner) => {
    const part = new THREE.Object3D();
    part.position.set(x, y, z); owner.add(part); return part;
  };
  const arms = createCharacterArms(cat, box, {
    offset: 16, shoulderY: 54, length: 28, width: 7, depth: 8, color: '#263d30', skin: '#dfb38c'
  });
  const arm = arms[0];
  attachPubCatCue(cue, arm);
  cat.updateMatrixWorld(true);
  const grip = cue.localToWorld(new THREE.Vector3(0, 0, 0));
  const expected = arm.localToWorld(new THREE.Vector3(0, -30, 4));
  assert.ok(grip.distanceTo(expected) < 1e-10);
  assert.equal(cue.scale.y, 1);
  for (const height of [60, 70, 80]) {
    const cueX = grip.x - (height - grip.y) * Math.tan(cue.rotation.z);
    assert.ok(cueX + 2.1 < -12, `cue clears Cat's head at height ${height}`);
  }
  for (const phase of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) {
    swingCharacterArms(arms, phase, true);
    cat.updateMatrixWorld(true);
    const hand = arm.userData.hand.getWorldPosition(new THREE.Vector3());
    const cueGrip = cue.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(cueGrip.distanceTo(hand) - 4) < 1e-10);
  }
});

test('the shorter cue is placed at the cue-ball end and Cat holds the longer cue until they leave', () => {
  const pool = OBJECTS[1].find(({ kind }) => kind === 'pool'), initial = newAdventureState(1);
  const empty = recordingContext(), placed = recordingContext(), held = recordingContext();
  drawPubObject(empty.context, pool, initial, 0);
  drawPubObject(placed.context, pool, { ...initial, cuesPlaced: true }, 0);
  assert.ok(!empty.calls.some(([name, color]) => name === 'fillRect' && color === '#597184'));
  assert.ok(placed.calls.some(([name, color, x, y]) =>
    name === 'fillRect' && color === '#597184' && x === pool.x - 126 + 15 * PUB_SHORT_CUE_SCALE && y === pool.y + 9 - 10 * PUB_SHORT_CUE_SCALE));
  assert.ok(placed.calls.some(([name, , x, y]) => name === 'moveTo' && x === pool.x - 125 && y === pool.y + 10));
  assert.ok(placed.calls.some(([name, , x, y]) => name === 'lineTo'
    && x === pool.x - 125 + 15 * PUB_SHORT_CUE_SCALE && y === pool.y + 10 - 10 * PUB_SHORT_CUE_SCALE));
  assert.equal(pubCatHoldsCue(initial), false);
  assert.equal(pubCatHoldsCue({ ...initial, cuesPlaced: true }), false);
  assert.equal(pubCatHoldsCue({ ...initial, catCueGiven: true }), true);
  assert.equal(pubCatHoldsCue({ ...initial, catCueGiven: true, pubEnding: 'dialogue' }), false);
  assert.equal(pubCatHoldsCue({ ...initial, catCueGiven: true, pubTogether: true }), false);
  drawPubHeldCue(held.context, 100, 100);
  assert.ok(held.calls.some(([name, color, x, y, width, height]) =>
    name === 'fillRect' && color === '#dfc18d' && x === 90 && y === 85 && width === 2 && height === 40));
  assert.ok(held.calls.some(([name, color, x, y]) =>
    name === 'fillRect' && color === '#76503a' && x === 89.5 && y === 112));
});

test('the rack starts with four cues including one shorter cue and keeps two after pickup', () => {
  const rack = OBJECTS[1].find(({ kind }) => kind === 'rack'), initial = newAdventureState(1);
  const before = recordingContext(), after = recordingContext();
  drawPubObject(before.context, rack, initial, 0);
  drawPubObject(after.context, rack, { ...initial, cues: true }, 0);
  const shafts = (calls) => calls.filter(([name, color]) => name === 'fillRect' && color === '#e2c38a');
  assert.equal(shafts(before.calls).length, 4);
  assert.equal(shafts(after.calls).length, 2);
  assert.equal(shafts(before.calls).filter(([, , , , , height]) => height < 16).length, 1);
  assert.equal(PUB_RACK_CUES.filter(({ short, taken }) => short && taken).length, 1);
  assert.equal(PUB_RACK_CUES.filter(({ taken }) => taken).length, 2);
  assert.equal(pubCuesTaken(initial), false);
  for (const flag of ['cues', 'cuesPlaced', 'catCueGiven']) {
    assert.equal(pubCuesTaken({ ...initial, [flag]: true }), true);
  }
});

test('illustrated pub shows the rug and state-dependent pool equipment and drinks', () => {
  const floor = {}, rug = {};
  const room = recordingContext();
  drawPubInterior(room.context, floor, rug);
  assert.ok(room.calls.some(([name, , image, x, y, w, h]) =>
    name === 'drawImage' && image === rug && x === PUB_RUG.x - PUB_RUG.width / 2
      && y === PUB_RUG.y - PUB_RUG.depth / 2 && w === PUB_RUG.width && h === PUB_RUG.depth));
  const pool = OBJECTS[1].find(({ kind }) => kind === 'pool');
  const table = OBJECTS[1].find(({ kind }) => kind === 'table');
  const initial = newAdventureState(1);
  const empty = recordingContext(), ready = recordingContext(), drinks = recordingContext();
  drawPubObject(empty.context, pool, initial, 0);
  drawPubObject(ready.context, pool, { ...initial, ballsPlaced: true, cuesPlaced: true }, 0);
  drawPubObject(drinks.context, table, { ...initial, drinksPlaced: true }, 0);
  assert.equal(empty.calls.filter(([name]) => name === 'arc').length, 6 + PUB_POOL_LIGHTS.length);
  assert.ok(ready.calls.filter(([name]) => name === 'arc').length >= 28);
  assert.equal(drinks.calls.filter(([name]) => name === 'arc').length, 4);
});
