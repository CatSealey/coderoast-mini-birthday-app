import test from 'node:test';
import assert from 'node:assert/strict';
import { CANOPY_PLATFORMS, CANOPY_ZIPLINE, COASTER_EXIT, COASTER_GOODBYE, COASTER_JOIN_POINT, OBJECTS, POOL_TABLE_FOOTPRINT, PUB_EXIT, PUB_GOODBYE, PUB_JOIN_POINT, PUB_OBSTACLES, PUB_PARTNER_OFFSET, advanceCanopy, adventureObjectInRange, canopyMeter, canopyTarget, canopyZipPosition, coasterCouplePath, coasterPath, coasterWalkable, controlCoaster, createCanopyTarget, finishCoasterExit, finishCoasterGoodbye, finishPubExit, finishPubGoodbye, interactAdventure, jumpCanopy, newAdventureState, pubCouplePath, pubPath, pubWalkable, restoreAdventureState, takePoolShot, tickCanopy, tickCoaster, unlockBallCase, walkAdventure, walkCoasterCouple, walkPubCouple } from '../js/games/adventure-logic.js';
import { COASTER_DROP_SECONDS, COASTER_GOAL, COASTER_PLATFORM, COASTER_REJOIN_PROGRESS, COASTER_RETURN_SECONDS, COASTER_RIDE_SECONDS, COASTER_TREATS, coasterDirection, coasterHeading, coasterLanePosition, coasterPosition, coasterRailPosition } from '../js/games/coaster-course.js';
import { createCollision } from '../js/world/world-collision.js';
import { createAdventureScene } from '../js/games/adventure-scene.js';
import { questItems } from '../js/quest-items.js';
import { CAT_OUTFIT, CHARACTER_HAIR, PLAYER_OUTFIT } from '../js/character-appearance.js';

function visit(index, state, id) {
  const object = OBJECTS[index].find((item) => item.id === id);
  return interactAdventure(index, { ...state, player: { x: object.x, y: object.y, height: object.height || 0 } }, id);
}
function inventory(index, state) {
  const saves = [null, null, null, null, null]; saves[index] = state;
  return questItems(saves).map((item) => item.name);
}
function runCanopy(state, seconds) {
  for (let t = 0; t < seconds * 20; t += 1) state = tickCanopy(state, 0.05);
  return state;
}

function walkRoute(state, object) {
  const route = pubPath(state.player, object, object);
  assert.ok(route?.length, `route to ${object.name}`);
  for (const point of route) {
    let attempts = 200;
    while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.01 && attempts-- > 0) {
      const next = walkAdventure(1, state, point.x - state.player.x, point.y - state.player.y, 0.05);
      assert.notStrictEqual(next, state, `route to ${object.name} got stuck`);
      assert.ok(pubWalkable(next.player), `route to ${object.name} entered furniture`);
      state = next;
    }
    assert.ok(attempts > 0, `route to ${object.name} reached waypoint`);
  }
  assert.ok(adventureObjectInRange(1, state.player, object), `${object.name} is in range`);
  return state;
}

test('pub fallback displays character names without furniture labels', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const labels = [];
  const colors = [];
  const ctx = {
    setTransform() { }, fillRect() { colors.push(this.fillStyle); }, beginPath() { }, arc() { }, ellipse() { }, fill() { colors.push(this.fillStyle); },
    fillText(text) { labels.push(text); }
  };
  const canvas = {
    getContext: () => ctx,
    addEventListener() { },
    removeEventListener() { }
  };
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  globalThis.window = { devicePixelRatio: 1 };
  try {
    const scene = createAdventureScene(canvas, 1, () => { }, 'Dani');
    scene.resize(1000, 700);
    scene.draw(newAdventureState(1));
    assert.deepEqual(labels, ['Cat', 'Dani']);
    assert.ok(colors.includes(PLAYER_OUTFIT));
    assert.ok(colors.includes(CAT_OUTFIT));
    assert.ok(colors.includes(CHARACTER_HAIR));
    scene.dispose();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('Thirteen fallback keeps the locker visible without its floating label', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const labels = [];
  const ctx = {
    setTransform() { }, fillRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, stroke() { },
    arc() { }, ellipse() { }, fill() { }, save() { }, translate() { }, rotate() { }, restore() { }, drawImage() { },
    fillText(text) { labels.push(text); }
  };
  const iconCtx = {
    clearRect() { }, beginPath() { }, arc() { }, ellipse() { }, fill() { }, stroke() { }, moveTo() { },
    lineTo() { }, closePath() { }, fillRect() { }, strokeRect() { }, fillText() { }, quadraticCurveTo() { }
  };
  const canvas = { getContext: () => ctx, addEventListener() { }, removeEventListener() { } };
  globalThis.document = { createElement: () => ({ getContext: (type) => type === '2d' ? iconCtx : null }) };
  globalThis.window = { devicePixelRatio: 1 };
  try {
    const scene = createAdventureScene(canvas, 2, () => { }, 'Dani');
    scene.resize(1000, 700);
    scene.draw(newAdventureState(2));
    assert.ok(labels.includes('Thirteen carriage'));
    assert.ok(labels.includes('Cat'));
    assert.ok(!labels.includes('Bag locker'));
    scene.dispose();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('Thirteen fallback keeps missed items visible through each ride phase', () => {
  const previousDocument = globalThis.document, previousWindow = globalThis.window;
  const drawn = [];
  const ctx = {
    setTransform() { }, fillRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, stroke() { },
    arc() { }, ellipse() { }, fill() { }, save() { }, translate() { }, rotate() { }, restore() { }, fillText() { },
    drawImage(image) { drawn.push(image); }
  };
  const iconCtx = {
    clearRect() { }, beginPath() { }, arc() { }, ellipse() { }, fill() { }, stroke() { }, moveTo() { },
    lineTo() { }, closePath() { }, fillRect() { }, strokeRect() { }, fillText() { }, quadraticCurveTo() { }
  };
  const canvas = { getContext: () => ctx, addEventListener() { }, removeEventListener() { } };
  globalThis.document = { createElement: () => ({ getContext: (type) => type === '2d' ? iconCtx : null }) };
  globalThis.window = { devicePixelRatio: 1 };
  try {
    const scene = createAdventureScene(canvas, 2, () => { }, 'Dani');
    scene.resize(1000, 700);
    const state = newAdventureState(2);
    scene.draw(state);
    const icons = drawn.splice(0);
    assert.equal(icons.length, COASTER_TREATS.length);
    for (const phase of ['riding', 'dropping', 'returning', 'platform']) {
      scene.draw({ ...state, phase, progress: 0.9, treats: [COASTER_TREATS[1].id] });
      assert.deepEqual(drawn.splice(0), icons.filter((_, i) => i !== 1), `${phase}: missed items stay visible`);
    }
    scene.dispose();
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('all pub furniture and stools block swept movement', () => {
  for (const obstacle of PUB_OBSTACLES) {
    const collider = createCollision([obstacle], 10);
    const w = obstacle.radius ?? obstacle.width / 2;
    const h = obstacle.radius ?? obstacle.depth / 2;
    const starts = [
      { x: obstacle.x - w - 14, y: obstacle.y }, { x: obstacle.x + w + 14, y: obstacle.y },
      { x: obstacle.x, y: obstacle.y - h - 14 }, { x: obstacle.x, y: obstacle.y + h + 14 }
    ].filter(pubWalkable);
    assert.ok(starts.length, `accessible side of ${obstacle.id || 'stool'}`);
    for (const player of starts) {
      const state = { ...newAdventureState(1), player: { ...player, height: 0 } };
      const next = walkAdventure(1, state, obstacle.x - player.x, obstacle.y - player.y, 3);
      assert.ok(!collider.blocked(next.player), `cannot walk through ${obstacle.id || 'stool'}`);
      assert.strictEqual(next, state, `movement toward ${obstacle.id || 'stool'} is stopped`);
    }
  }
  const state = { ...newAdventureState(1), player: { x: 375, y: 425, height: 0 } };
  const next = walkAdventure(1, state, 90, 90, 1);
  assert.ok(pubWalkable(next.player), 'diagonal movement cannot enter a stool');
});

test('new and restored pub positions remain outside furniture without losing progress', () => {
  assert.ok(pubWalkable(newAdventureState(1).player));
  const points = [{ x: 90, y: 540 }, ...PUB_OBSTACLES.map(({ x, y }) => ({ x, y }))];
  for (const point of points) {
    const saved = { ...newAdventureState(1), cues: true, drinksPlaced: true, player: { ...point, height: 0 } };
    const restored = restoreAdventureState(1, saved);
    assert.ok(pubWalkable(restored.player), `restored position ${point.x},${point.y}`);
    assert.equal(restored.cues, true);
    assert.equal(restored.drinksPlaced, true);
    assert.match(restored.message, /clear of the furniture/);
    walkRoute(restored, OBJECTS[1].find((item) => item.id === 'pool-table'));
  }
});

test('every pub quest object can be reached from multiple sides', () => {
  const starts = [{ x: 70, y: 560 }, { x: 500, y: 350 }, { x: 900, y: 600 }, { x: 700, y: 100 }];
  for (const object of OBJECTS[1]) for (const player of starts) {
    assert.ok(pubWalkable(player));
    walkRoute({ ...newAdventureState(1), player: { ...player, height: 0 } }, object);
  }
});

test('the entire Lucky Chucks quest is playable by walking to each object', () => {
  let state = newAdventureState(1);
  function approach(id) {
    const object = OBJECTS[1].find((item) => item.id === id);
    state = interactAdventure(1, walkRoute(state, object), id);
  }
  approach('bar');
  assert.equal(state.drinks, true);
  approach('drinks-table');
  assert.equal(state.drinksPlaced, true);
  approach('cue-rack');
  assert.equal(state.cues, true);
  approach('rack-note');
  assert.equal(state.noteRead, true);
  approach('ball-box');
  assert.equal(state.puzzle, true);
  state = unlockBallCase(state, '321');
  assert.equal(state.balls, true);
  approach('pool-table');
  assert.equal(state.cuesPlaced && state.ballsPlaced, true);
  approach('pool-table');
  assert.equal(state.shot, true);
  state = takePoolShot(state, 0, 65);
  assert.equal(state.ballLost, true);
  approach('tool-rack');
  assert.equal(state.hook, true);
  approach('cabinet');
  assert.equal(state.ballFound, true);
  approach('love');
  assert.equal(state.pubEnding, 'dialogue');
  assert.equal(state.complete, false);
});

test('pool table blocks movement from every side, including long and diagonal steps', () => {
  const starts = [
    [{ x: 500, y: 120 }, 0, 500],
    [{ x: 500, y: 340 }, 0, -500],
    [{ x: 350, y: 230 }, 500, 0],
    [{ x: 650, y: 230 }, -500, 0]
  ];
  for (const [position, dx, dy] of starts) {
    const state = { ...newAdventureState(1), player: { ...position, height: 0 } };
    assert.strictEqual(walkAdventure(1, state, dx, dy, 3), state);
  }
  const state = { ...newAdventureState(1), player: { x: 360, y: 145, height: 0 } };
  const moved = walkAdventure(1, state, 100, 100, 0.3);
  assert.ok(moved.player.x < POOL_TABLE_FOOTPRINT.x - POOL_TABLE_FOOTPRINT.width / 2
    || moved.player.y < POOL_TABLE_FOOTPRINT.y - POOL_TABLE_FOOTPRINT.depth / 2);
});

test('click routes go around the pool table and its edges remain interactable', () => {
  const object = OBJECTS[1].find((item) => item.id === 'pool-table');
  for (const start of [{ x: 500, y: 100 }, { x: 500, y: 350 }, { x: 300, y: 230 }, { x: 700, y: 230 }]) {
    const route = pubPath(start, object, object);
    assert.ok(route?.length);
    let state = { ...newAdventureState(1), cues: true, player: { ...start, height: 0 } };
    for (const point of route) {
      let attempts = 200;
      while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.01 && attempts-- > 0) {
        const next = walkAdventure(1, state, point.x - state.player.x, point.y - state.player.y, 0.05);
        assert.notStrictEqual(next, state, 'the route must not get stuck at the table');
        state = next;
      }
      assert.ok(attempts > 0);
    }
    assert.equal(adventureObjectInRange(1, state.player, object), true);
    assert.equal(interactAdventure(1, state, object.id).cuesPlaced, true);
  }
  const route = pubPath({ x: 300, y: 230 }, { x: 700, y: 230 });
  assert.ok(route.length > 1, 'a route across the table goes around it');
  let state = { ...newAdventureState(1), player: { x: 300, y: 230, height: 0 } };
  for (const point of route) {
    let attempts = 200;
    while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.01 && attempts-- > 0) {
      const next = walkAdventure(1, state, point.x - state.player.x, point.y - state.player.y, 0.05);
      assert.notStrictEqual(next, state, 'the detour must remain walkable');
      state = next;
    }
    assert.ok(attempts > 0);
  }
  assert.ok(Math.hypot(state.player.x - 700, state.player.y - 230) < 0.01);
  assert.equal(pubPath({ x: 300, y: 230 }, { x: 500, y: 230 }), null);
});

test('old saves inside the pool table are moved safely outside without losing progress', () => {
  const saved = { ...newAdventureState(1), cues: true, player: { x: 500, y: 230, height: 0 } };
  const restored = restoreAdventureState(1, saved);
  assert.equal(restored.cues, true);
  assert.notDeepEqual(restored.player, saved.player);
  assert.match(restored.message, /clear of the furniture/);
  assert.ok(pubPath(restored.player, { x: 470, y: 360 }));
});

test('Lucky Chucks requires drinks, equipment and the recovered ball before speaking to Cat', () => {
  let state = newAdventureState(1);
  assert.equal(visit(1, state, 'love').complete, false);
  state = visit(1, state, 'bar');
  assert.deepEqual(inventory(1, state), ['Drinks']);
  state = visit(1, state, 'drinks-table');
  assert.equal(state.drinksPlaced, true);
  assert.deepEqual(inventory(1, state), []);
  state = visit(1, state, 'cue-rack');
  state = visit(1, state, 'pool-table');
  assert.equal(state.cuesPlaced, true);
  assert.equal(state.ballLost, false);
  state = visit(1, state, 'ball-box');
  assert.equal(state.puzzle, false);
  assert.deepEqual(inventory(1, state), []);
  state = visit(1, state, 'rack-note');
  state = visit(1, state, 'ball-box');
  assert.equal(state.puzzle, true);
  state = unlockBallCase(state, '312');
  assert.equal(state.balls, false);
  state = visit(1, state, 'ball-box');
  state = unlockBallCase(state, '321');
  assert.deepEqual(inventory(1, state), ['Pool balls']);
  state = visit(1, state, 'pool-table');
  assert.equal(state.ballsPlaced, true);
  assert.equal(state.ballLost, false);
  state = visit(1, state, 'pool-table');
  assert.equal(state.shot, true);
  assert.equal(takePoolShot(state, 20, 65).ballLost, false);
  assert.equal(takePoolShot(state, 0, 40).ballLost, false);
  assert.equal(takePoolShot(state, 0, 90).ballLost, false);
  assert.equal(takePoolShot(state, 7, 55).ballLost, true);
  assert.equal(takePoolShot(state, -7, 75).ballLost, true);
  state = takePoolShot(state, 0, 65);
  assert.equal(state.ballLost, true);
  state = restoreAdventureState(1, JSON.parse(JSON.stringify(state)));
  assert.equal(visit(1, state, 'love').complete, false);
  state = visit(1, state, 'cabinet');
  assert.equal(state.ballFound, false);
  state = visit(1, state, 'tool-rack');
  assert.deepEqual(inventory(1, state), ['Retrieval hook']);
  state = restoreAdventureState(1, JSON.parse(JSON.stringify(state)));
  assert.deepEqual(inventory(1, state), ['Retrieval hook']);
  state = visit(1, state, 'cabinet');
  assert.deepEqual(inventory(1, state), ['Eight-ball']);
  state = visit(1, state, 'love');
  assert.equal(state.pubEnding, 'dialogue');
  assert.equal(state.complete, false);
  assert.deepEqual(inventory(1, state), []);
});

test('the goodbye survives saves and the couple walks safely to the exit before completing', () => {
  let state = {
    ...newAdventureState(1), drinksPlaced: true, ballFound: true,
    player: { x: 724, y: 460, height: 0 }
  };
  state = interactAdventure(1, state, 'love');
  assert.equal(state.pubEnding, 'dialogue');
  assert.equal(state.message, PUB_GOODBYE);
  assert.strictEqual(finishPubExit(state), state);
  state = restoreAdventureState(1, JSON.parse(JSON.stringify(state)));
  assert.equal(state.message, PUB_GOODBYE);
  state = finishPubGoodbye(state);
  assert.equal(state.pubEnding, 'ready');
  assert.equal(state.complete, false);
  assert.strictEqual(finishPubExit(state), state);
  state = restoreAdventureState(1, JSON.parse(JSON.stringify(state)));
  assert.equal(state.pubEnding, 'ready');

  const furniture = createCollision(PUB_OBSTACLES.filter((obstacle) => obstacle.id !== 'love'), 10);
  const route = pubCouplePath(PUB_JOIN_POINT);
  assert.ok(route?.length);
  for (const point of route) {
    let attempts = 200;
    while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.01 && attempts-- > 0) {
      const next = walkPubCouple(state, point, 0.05);
      assert.notStrictEqual(next, state, 'the couple cannot get stuck');
      assert.equal(furniture.blocked(next.player), false);
      assert.equal(furniture.blocked({ x: next.player.x + PUB_PARTNER_OFFSET, y: next.player.y }), false);
      state = next;
    }
    assert.ok(attempts > 0);
  }
  assert.ok(Math.hypot(state.player.x - PUB_EXIT.x, state.player.y - PUB_EXIT.y) < 0.01);
  assert.equal(finishPubExit(state).complete, true);
});

test('older goodbye saves resume without losing the handed-over eight-ball', () => {
  for (const dialogueStep of [0, 1, 2]) {
    const saved = {
      ...newAdventureState(1), drinksPlaced: true, ballLost: true, pubEnding: 'dialogue', dialogueStep,
      player: { x: 724, y: 460, height: 0 }
    };
    const restored = restoreAdventureState(1, saved);
    assert.equal(restored.pubEnding, 'dialogue');
    assert.equal(restored.message, PUB_GOODBYE);
    assert.equal(restored.ballLost, true);
    assert.equal(restored.ballFound, false);
  }
});

test('the player can rejoin Cat from every accessible side', () => {
  for (let i = 0; i < 16; i += 1) {
    const angle = i * Math.PI / 8;
    const player = { x: 690 + Math.cos(angle) * 35, y: 460 + Math.sin(angle) * 35, height: 0 };
    if (!pubWalkable(player)) continue;
    const route = pubPath(player, PUB_JOIN_POINT);
    assert.ok(route?.length, `joining route from angle ${angle}`);
    let state = { ...newAdventureState(1), pubEnding: 'ready', player };
    for (const point of route) {
      let attempts = 200;
      while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.01 && attempts-- > 0) {
        const next = walkAdventure(1, state, point.x - state.player.x, point.y - state.player.y, 0.05);
        assert.notStrictEqual(next, state, 'the joining route cannot get stuck');
        state = next;
      }
      assert.ok(attempts > 0);
    }
  }
});

test('opening pool controls is resumable and old in-progress saves retain their equipment', () => {
  let state = { ...newAdventureState(1), cuesPlaced: true, ballsPlaced: true };
  state = visit(1, state, 'pool-table');
  assert.equal(state.shot, true);
  state = restoreAdventureState(1, JSON.parse(JSON.stringify(state)));
  assert.equal(state.shot, false);
  assert.equal(state.cuesPlaced, true);
  assert.equal(state.ballsPlaced, true);
  assert.equal(visit(1, state, 'pool-table').shot, true);
  const { hook, shot, ...old } = state;
  void hook; void shot;
  assert.equal(restoreAdventureState(1, old).ballsPlaced, true);
});

test('existing version 3 pub saves retain progress when the case puzzle is introduced', () => {
  const { noteRead, caseUnlocked, puzzle, ...previous } = newAdventureState(1);
  void noteRead; void caseUnlocked; void puzzle;
  const saved = { ...previous, drinks: true, balls: true };
  const restored = restoreAdventureState(1, saved);
  assert.equal(restored.drinks, true);
  assert.equal(restored.balls, true);
  assert.equal(restored.caseUnlocked, true);
  assert.equal(restored.puzzle, false);
});

test('Thirteen station is beside the carriage and boarding and hand-in remain reachable', () => {
  const [carriage, locker, amor] = OBJECTS[2];
  const heading = coasterHeading('riding', 0);
  const carriageHalfDepth = 35 * Math.abs(Math.sin(heading)) + 24 * Math.abs(Math.cos(heading));
  assert.ok(carriage.y + carriageHalfDepth < COASTER_PLATFORM.top, 'platform does not overlap carriage or wheels');
  for (const point of [newAdventureState(2).player, locker, amor]) {
    assert.ok(point.x >= COASTER_PLATFORM.left && point.x <= COASTER_PLATFORM.right);
    assert.ok(point.y >= COASTER_PLATFORM.top && point.y <= COASTER_PLATFORM.bottom);
  }
  let state = newAdventureState(2);
  state = walkAdventure(2, state, carriage.x - state.player.x, 0, 3);
  assert.ok(adventureObjectInRange(2, state.player, carriage));
  state = interactAdventure(2, state, 'carriage');
  assert.equal(state.phase, 'riding');
  state = { ...state, phase: 'returning', progress: 0.99, treats: COASTER_TREATS.map((item) => item.id) };
  state = tickCoaster(state, 1);
  assert.equal(state.phase, 'platform');
  assert.ok(state.player.y >= COASTER_PLATFORM.top && state.player.y <= COASTER_PLATFORM.bottom);
  for (const point of coasterPath(state.player, locker, locker)) {
    state = walkAdventure(2, state, point.x - state.player.x, point.y - state.player.y, 5);
  }
  assert.ok(adventureObjectInRange(2, state.player, locker));
  state = interactAdventure(2, state, 'locker');
  assert.equal(state.bags, true);
  state = walkAdventure(2, state, amor.x - state.player.x, amor.y - state.player.y, 2);
  assert.ok(adventureObjectInRange(2, state.player, amor));
  state = interactAdventure(2, state, 'amor');
  assert.equal(state.complete, false);
  assert.equal(state.message, COASTER_GOODBYE);
  state = restoreAdventureState(2, JSON.parse(JSON.stringify(state)));
  assert.equal(state.message, COASTER_GOODBYE);
  assert.strictEqual(finishCoasterExit(state), state);
  state = finishCoasterGoodbye(state);
  state = restoreAdventureState(2, JSON.parse(JSON.stringify(state)));
  for (const point of coasterPath(state.player, COASTER_JOIN_POINT)) {
    state = walkAdventure(2, state, point.x - state.player.x, point.y - state.player.y, 5);
    assert.ok(Math.hypot(point.x - state.player.x, point.y - state.player.y) < 0.01);
  }
  for (const point of coasterCouplePath(state.player)) {
    state = walkCoasterCouple(state, point, 5);
    assert.ok(Math.hypot(point.x - state.player.x, point.y - state.player.y) < 0.01);
  }
  assert.equal(finishCoasterExit(state).complete, true);
});

test('Thirteen locker blocks swept movement and remains accessible from both sides', () => {
  const locker = OBJECTS[2].find((item) => item.id === 'locker');
  const collision = createCollision([{ x: locker.x, y: locker.y, ...locker.footprint }], 10);
  assert.ok(locker.y + locker.footprint.depth / 2 <= COASTER_PLATFORM.bottom);
  for (const player of [{ x: locker.x - 70, y: 655 }, { x: locker.x + 70, y: 655 }, { x: locker.x, y: 590 }]) {
    let state = { ...newAdventureState(2), phase: 'platform', player: { ...player, height: 0 } };
    const crossed = walkAdventure(2, state, locker.x - player.x, locker.y - player.y, 10);
    assert.ok(!collision.blocked(crossed.player));
    const route = coasterPath(state.player, locker, locker);
    assert.ok(route?.length);
    for (const point of route) {
      let attempts = 300;
      while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.01 && attempts-- > 0) {
        const next = walkAdventure(2, state, point.x - state.player.x, point.y - state.player.y, 0.05);
        assert.notStrictEqual(next, state);
        assert.ok(coasterWalkable(next.player));
        state = next;
      }
      assert.ok(attempts > 0);
    }
    assert.ok(adventureObjectInRange(2, state.player, locker));
    assert.equal(interactAdventure(2, state, 'locker').bags, true);
  }
  const allItems = COASTER_TREATS.map((item) => item.id);
  const restored = restoreAdventureState(2, {
    ...newAdventureState(2), phase: 'platform', bags: true,
    treats: allItems, player: { x: locker.x, y: 655, height: 0 }
  });
  assert.ok(coasterWalkable(restored.player));
  assert.equal(restored.bags, true);
  assert.deepEqual(restored.treats, allItems);
});

test('Thirteen exit route keeps both characters clear of the locker', () => {
  const route = coasterCouplePath(COASTER_JOIN_POINT);
  assert.ok(route?.length);
  let state = { ...newAdventureState(2), phase: 'platform', rideEnding: 'ready', player: { ...COASTER_JOIN_POINT, height: 0 } };
  for (const point of route) {
    let attempts = 300;
    while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.01 && attempts-- > 0) {
      const next = walkCoasterCouple(state, point, 0.05);
      assert.notStrictEqual(next, state);
      assert.ok(coasterWalkable(next.player));
      assert.ok(coasterWalkable({ x: next.player.x + PUB_PARTNER_OFFSET, y: next.player.y }));
      state = next;
    }
    assert.ok(attempts > 0);
  }
  assert.ok(Math.hypot(state.player.x - COASTER_EXIT.x, state.player.y - COASTER_EXIT.y) < 0.01);
  assert.equal(finishCoasterExit(state).complete, true);
});

test('Thirteen click routes go around the locker', () => {
  const locker = OBJECTS[2].find((item) => item.id === 'locker');
  const destination = { x: locker.x + 70, y: 655 };
  let state = { ...newAdventureState(2), phase: 'platform', player: { x: locker.x - 70, y: 655, height: 0 } };
  const route = coasterPath(state.player, destination);
  assert.ok(route?.length);
  for (const point of route) {
    let attempts = 300;
    while (Math.hypot(point.x - state.player.x, point.y - state.player.y) > 0.01 && attempts-- > 0) {
      const next = walkAdventure(2, state, point.x - state.player.x, point.y - state.player.y, 0.05);
      assert.notStrictEqual(next, state);
      assert.ok(coasterWalkable(next.player));
      state = next;
    }
    assert.ok(attempts > 0);
  }
  assert.ok(Math.hypot(state.player.x - destination.x, state.player.y - destination.y) < 0.01);
});

test('Thirteen park items retain old saved IDs and give named collection feedback', () => {
  assert.equal(new Set(COASTER_TREATS.map((item) => item.kind)).size, COASTER_TREATS.length);
  assert.equal(new Set(COASTER_TREATS.map((item) => item.name)).size, COASTER_TREATS.length);
  assert.deepEqual(COASTER_TREATS.slice(0, 5).map((item) => item.kind), ['pizza', 'cup', 'map', 'ticket', 'umbrella']);
  assert.deepEqual(COASTER_TREATS.map((item) => item.id), Array.from({ length: 5 }, (_, i) => `sweet-${i + 1}`));
  const saved = { ...newAdventureState(2), phase: 'riding', progress: 0.2, treats: ['sweet-1'] };
  const restored = restoreAdventureState(2, JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(restored.treats, ['sweet-1']);
  const oldItems = { ...saved, treats: ['sweet-1', 'sweet-6', 'sweet-7', 'sweet-8'] };
  assert.deepEqual(restoreAdventureState(2, JSON.parse(JSON.stringify(oldItems))).treats, ['sweet-1']);
  const collected = tickCoaster(controlCoaster(restored, 'right'), 1);
  assert.deepEqual(collected.treats, ['sweet-1', 'sweet-2']);
  assert.match(collected.message, /Refill cup/);
});

test('Thirteen ride and return are slightly faster while the drop stays sudden', () => {
  assert.equal(COASTER_RIDE_SECONDS, 20);
  assert.equal(COASTER_RETURN_SECONDS, 8.5);
  assert.equal(COASTER_DROP_SECONDS, 0.75);
  let state = { ...newAdventureState(2), phase: 'riding' };
  state = tickCoaster(state, COASTER_RIDE_SECONDS / 2);
  assert.equal(state.progress, 0.5);
  state = tickCoaster(state, COASTER_RIDE_SECONDS / 2);
  assert.equal(state.phase, 'dropping');
  state = tickCoaster(state, COASTER_DROP_SECONDS);
  state = tickCoaster(state, COASTER_RETURN_SECONDS / 2);
  assert.equal(state.progress, 0.5);
});

test('Thirteen requires every item before returning to the platform', () => {
  assert.equal(COASTER_GOAL, 5);
  const firstFour = COASTER_TREATS.slice(0, -1).map((item) => item.id);
  let state = { ...newAdventureState(2), phase: 'returning', progress: 0.99, treats: firstFour };
  state = tickCoaster(state, COASTER_RETURN_SECONDS);
  assert.equal(state.phase, 'riding');
  assert.deepEqual(state.treats, firstFour);
  state = controlCoaster(state, COASTER_TREATS.at(-1).lane < 0 ? 'left' : 'right');
  state = tickCoaster(state, COASTER_RIDE_SECONDS * (COASTER_TREATS.at(-1).progress + 0.001));
  assert.deepEqual(state.treats, COASTER_TREATS.map((item) => item.id));
  state = tickCoaster(state, COASTER_RIDE_SECONDS);
  state = tickCoaster(state, COASTER_DROP_SECONDS);
  state = tickCoaster(state, COASTER_RETURN_SECONDS);
  assert.equal(state.phase, 'platform');
});

test('Thirteen resumes unfinished old platform saves to collect the remaining items', () => {
  const items = COASTER_TREATS.slice(0, 4).map((item) => item.id);
  const saved = {
    ...newAdventureState(2), phase: 'platform', progress: 1,
    treats: [...items, 'sweet-6', 'sweet-7', 'sweet-8'], bags: true
  };
  const restored = restoreAdventureState(2, JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.phase, 'riding');
  assert.equal(restored.progress, 0);
  assert.equal(restored.bags, true);
  assert.deepEqual(restored.treats, items);
  const fullyCollected = restoreAdventureState(2, { ...saved, treats: [...items, 'sweet-5', 'sweet-8'] });
  assert.equal(fullyCollected.phase, 'platform');
  assert.deepEqual(fullyCollected.treats, COASTER_TREATS.map((item) => item.id));
  for (const ending of ['dialogue', 'ready']) {
    assert.equal(restoreAdventureState(2, { ...saved, rideEnding: ending }).phase, 'platform');
  }
  assert.equal(restoreAdventureState(2, { ...saved, phase: 'finished', complete: true }).complete, true);
});

test('Thirteen collects park items, retries via the backwards track, and awards a ticket after bags', () => {
  let state = newAdventureState(2);
  assert.equal(visit(2, state, 'locker').bags, false);
  state = visit(2, state, 'carriage');
  assert.equal(state.phase, 'riding');
  for (const [index, treat] of COASTER_TREATS.entries()) {
    const lane = index < 2 ? treat.lane : -treat.lane;
    state = controlCoaster(state, lane < 0 ? 'left' : 'right');
    state = tickCoaster(state, (treat.progress - state.progress + 0.001) * COASTER_RIDE_SECONDS);
  }
  assert.equal(state.treats.length, 2);
  state = tickCoaster(state, COASTER_RIDE_SECONDS);
  assert.equal(state.phase, 'dropping');
  state = restoreAdventureState(2, JSON.parse(JSON.stringify(state)));
  state = tickCoaster(state, COASTER_DROP_SECONDS);
  assert.equal(state.phase, 'returning');
  state = tickCoaster(state, COASTER_RETURN_SECONDS);
  assert.equal(state.phase, 'riding');
  assert.equal(state.treats.length, 2);
  for (const treat of COASTER_TREATS) {
    state = controlCoaster(state, treat.lane < 0 ? 'left' : 'right');
    state = tickCoaster(state, (treat.progress - state.progress + 0.001) * COASTER_RIDE_SECONDS);
  }
  assert.equal(state.treats.length, COASTER_TREATS.length);
  state = tickCoaster(state, COASTER_RIDE_SECONDS);
  state = tickCoaster(state, COASTER_DROP_SECONDS);
  state = restoreAdventureState(2, JSON.parse(JSON.stringify(state)));
  state = tickCoaster(state, COASTER_RETURN_SECONDS);
  assert.equal(state.phase, 'platform');
  assert.equal(visit(2, state, 'amor').complete, false);
  state = visit(2, state, 'locker');
  const parkNames = COASTER_TREATS.map((item) => item.name);
  assert.deepEqual(inventory(2, state), [...parkNames, 'Bags']);
  state = visit(2, state, 'amor');
  assert.equal(state.complete, false);
  assert.equal(state.rideEnding, 'dialogue');
  assert.deepEqual(inventory(2, state), [...parkNames, 'Exit ticket']);
  assert.deepEqual(inventory(2, { ...state, ticket: false }), parkNames);
  assert.deepEqual(inventory(2, { ...state, complete: true }), ['Exit ticket']);
});

test('Thirteen steering collects only the chosen lane without duplicating saved treats', () => {
  let state = { ...newAdventureState(2), phase: 'riding' };
  assert.strictEqual(controlCoaster(state, 'tap'), state);
  state = controlCoaster(state, 'left');
  state = tickCoaster(state, COASTER_RIDE_SECONDS * COASTER_TREATS[0].progress);
  assert.deepEqual(state.treats, [COASTER_TREATS[0].id]);
  state = tickCoaster(state, 0.1);
  assert.equal(state.treats.length, 1);
  state = tickCoaster(state, COASTER_RIDE_SECONDS);
  assert.ok(state.treats.length < COASTER_GOAL);
  assert.equal(new Set(state.treats).size, state.treats.length);
});

test('Thirteen only collects when the matching direction is actively held', () => {
  const first = COASTER_TREATS[0], second = COASTER_TREATS[1];
  let state = { ...newAdventureState(2), phase: 'riding' };
  state = tickCoaster(state, first.progress * COASTER_RIDE_SECONDS);
  assert.deepEqual(state.treats, []);
  state = { ...state, progress: first.progress - 0.01 };
  state = controlCoaster(state, 'right');
  state = tickCoaster(state, 0.02 * COASTER_RIDE_SECONDS);
  assert.deepEqual(state.treats, []);
  state = { ...state, progress: first.progress - 0.01 };
  state = controlCoaster(state, 'left');
  state = controlCoaster(state, 'neutral');
  state = tickCoaster(state, 0.02 * COASTER_RIDE_SECONDS);
  assert.deepEqual(state.treats, []);
  state = { ...state, progress: first.progress - 0.01 };
  state = controlCoaster(state, 'left');
  state = tickCoaster(state, 0.02 * COASTER_RIDE_SECONDS);
  assert.deepEqual(state.treats, [first.id]);
  state = controlCoaster(state, 'right');
  state = tickCoaster(state, (second.progress - state.progress + 0.001) * COASTER_RIDE_SECONDS);
  assert.deepEqual(state.treats, [first.id, second.id]);
  state = restoreAdventureState(2, JSON.parse(JSON.stringify(state)));
  assert.equal(state.lane, 0);
  assert.deepEqual(state.treats, [first.id, second.id]);
});

test('Thirteen track joins the drop, lower backwards track, climb and station continuously', () => {
  const top = coasterPosition('riding', 1), dropTop = coasterPosition('dropping', 0);
  const bottom = coasterPosition('dropping', 1), lowerStart = coasterPosition('returning', 0);
  assert.deepEqual(top, dropTop);
  assert.deepEqual(bottom, lowerStart);
  assert.deepEqual(coasterPosition('returning', 1), coasterPosition('riding', 0));
  const junction = coasterPosition('returning', COASTER_REJOIN_PROGRESS);
  const mainJunction = coasterPosition('riding', 0.1);
  assert.ok(Math.hypot(junction.x - mainJunction.x, junction.y - mainJunction.y, junction.height - mainJunction.height) < 1e-8);
  const onMain = coasterPosition('returning', 0.9), correspondingMain = coasterPosition('riding', 0.05);
  assert.ok(Math.hypot(onMain.x - correspondingMain.x, onMain.y - correspondingMain.y, onMain.height - correspondingMain.height) < 1e-8);
  assert.ok(top.height > bottom.height + 50);
  assert.ok(junction.height > coasterPosition('returning', 0.65).height + 40);
  const out = coasterDirection('riding', 1), back = coasterDirection('returning', 0);
  assert.ok(out.x * back.x + out.y * back.y < -0.95);
  for (const side of [-1, 1]) {
    for (const [phase, progress, other, otherProgress, otherSide] of [
      ['riding', 1, 'dropping', 0, side],
      ['dropping', 1, 'returning', 0, -side],
      ['returning', COASTER_REJOIN_PROGRESS, 'riding', 0.1, -side]
    ]) {
      const a = coasterRailPosition(phase, progress, side), b = coasterRailPosition(other, otherProgress, otherSide);
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.height - b.height) < 0.25, `${phase} rail connects to ${other}`);
    }
  }
  for (let i = 0; i <= 200; i += 1) for (let j = 0; j <= 200; j += 1) {
    if (i < 40 && j > 120) continue;
    const upper = coasterPosition('riding', i / 200), lower = coasterPosition('returning', j / 200);
    if (Math.hypot(upper.x - lower.x, upper.y - lower.y) < 30) {
      assert.ok(upper.height - lower.height >= 80, `track clearance at ${i / 200}, ${j / 200}`);
    }
  }
  for (const treat of COASTER_TREATS) {
    const point = coasterLanePosition(treat.progress, treat.lane);
    assert.ok(Object.values(point).every(Number.isFinite));
  }
});

test('Thirteen carriage faces along the rails and the surprise drop accelerates in under a second', () => {
  for (const phase of ['riding', 'dropping', 'returning']) for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
    const direction = coasterDirection(phase, progress), heading = coasterHeading(phase, progress);
    const facing = { x: Math.sin(heading), y: Math.cos(heading) };
    const dot = direction.x * facing.x + direction.y * facing.y;
    assert.ok(phase === 'returning' ? dot < -0.999 : dot > 0.999, `${phase} at ${progress}`);
  }
  const top = coasterPosition('dropping', 0).height;
  const halfway = coasterPosition('dropping', 0.5).height;
  const bottom = coasterPosition('dropping', 1).height;
  assert.ok(top - halfway < halfway - bottom);
  assert.ok(COASTER_DROP_SECONDS < 1);
  let state = { ...newAdventureState(2), phase: 'dropping' };
  state = tickCoaster(state, COASTER_DROP_SECONDS / 2);
  assert.equal(state.phase, 'dropping');
  assert.equal(state.progress, 0.5);
  state = tickCoaster(state, COASTER_DROP_SECONDS / 2);
  assert.equal(state.phase, 'returning');
});

function crossCanopy(state) {
  while (state.traversal) {
    state = waitForCanopyWindow(state);
    state = advanceCanopy(state);
  }
  return state;
}

function waitForCanopyWindow(state) {
  for (let i = 0; i < 2000; i += 1) {
    state = tickCanopy(state, 0.01);
    const { start, end } = canopyTarget(state.traversal);
    const meter = canopyMeter(state.traversal.elapsed);
    if (state.traversal.armed && meter >= start && meter <= end) return state;
  }
  assert.fail('Timed crossing never offered an attainable target.');
}

test('GoApe timing targets move within bounds and use smaller randomized widths', () => {
  const narrow = createCanopyTarget(() => 0);
  const wide = createCanopyTarget(() => 0.999);
  assert.equal(narrow.width, 0.12);
  assert.ok(wide.width > 0.21 && wide.width < 0.22);
  assert.notDeepEqual(narrow, wide);
  for (const target of [narrow, wide]) {
    const positions = [];
    for (let elapsed = 0; elapsed <= 8; elapsed += 0.1) {
      const zone = canopyTarget({ target, elapsed });
      assert.ok(zone.start >= 0.08 && zone.end <= 0.92);
      assert.ok(Math.abs((zone.end - zone.start) - target.width) < 1e-12);
      positions.push(zone.start);
    }
    assert.ok(Math.max(...positions) - Math.min(...positions) > 0.5);
  }
});

test('GoApe zip-wire and rider clear the course and continue after a mid-ride save', () => {
  for (let i = 0; i <= 1000; i += 1) {
    const player = canopyZipPosition(i / 1000);
    for (const platform of CANOPY_PLATFORMS) {
      if (player.x < platform.left || player.x > platform.right || player.y < platform.top || player.y > platform.bottom) continue;
      assert.ok(player.height >= platform.height, 'Rider must remain above the platform');
      assert.ok(player.height + CANOPY_ZIPLINE.cableHeight > platform.height + 50, 'Cable must clear the platform railings');
    }
  }
  let state = {
    ...newAdventureState(3), checkpoint: 7, player: { ...CANOPY_ZIPLINE.start },
    collected: ['leaf', 'feather', 'acorn', 'star'], lanterns: ['lantern-1', 'lantern-2', 'lantern-3']
  };
  state = interactAdventure(3, state, 'zipline');
  state = tickCanopy(state, 1.8);
  assert.ok(state.player.x > 1850);
  state = restoreAdventureState(3, JSON.parse(JSON.stringify(state)));
  assert.equal(state.zipline, true);
  assert.ok(state.player.x > 1850);
  assert.equal(runCanopy(state, 1.3).complete, true);
});

test('GoApe requires its crossings, jumps, lanterns and four treasures for the zip-wire', () => {
  let state = newAdventureState(3);
  assert.equal(visit(3, state, 'zipline').complete, false);
  state = visit(3, state, 'leaf');
  state = visit(3, state, 'net');
  assert.equal(state.traversal.kind, 'net');
  assert.equal(advanceCanopy(state).traversal, null);
  state = visit(3, state, 'net');
  state = waitForCanopyWindow(state);
  state = advanceCanopy(state);
  assert.equal(state.traversal.progress, 1 / 3);
  assert.equal(advanceCanopy(state).traversal.progress, 1 / 3);
  state = restoreAdventureState(3, JSON.parse(JSON.stringify(state)));
  state = crossCanopy(state);
  assert.equal(state.player.height, 80);
  assert.equal(state.checkpoint, 1);
  state = visit(3, state, 'feather');
  state = visit(3, state, 'rope');
  state = crossCanopy(state);
  assert.equal(state.player.height, 130);
  state = visit(3, state, 'acorn');
  state = { ...state, player: { x: 725, y: 350, height: 130 } };
  assert.strictEqual(walkAdventure(3, state, 100, 0, 0.1), state);
  state = jumpCanopy(state);
  for (let i = 0; i < 21; i += 1) {
    state = walkAdventure(3, state, 100, 0, 0.05);
    state = tickCanopy(state, 0.05);
  }
  assert.equal(state.flight, null);
  assert.equal(state.checkpoint, 3);
  state = visit(3, state, 'star');
  assert.equal(inventory(3, state).length, 4);
  const saves = [null, null, null, state, null];
  assert.equal(new Set(questItems(saves).map((item) => item.image)).size, 4);
  assert.equal(visit(3, state, 'zipline').zipline, false);
  state = visit(3, state, 'high-rope');
  state = crossCanopy(state);
  assert.equal(state.checkpoint, 4);
  state = visit(3, state, 'lantern-1');
  state = { ...state, player: { x: 1175, y: 350, height: 165 } };
  state = jumpCanopy(state);
  for (let i = 0; i < 21; i += 1) {
    state = walkAdventure(3, state, 100, 0, 0.05);
    state = tickCanopy(state, 0.05);
  }
  assert.equal(state.checkpoint, 5);
  state = visit(3, state, 'lantern-2');
  state = visit(3, state, 'high-net');
  state = crossCanopy(state);
  assert.equal(state.checkpoint, 6);
  state = visit(3, state, 'summit-rope');
  state = crossCanopy(state);
  assert.equal(state.checkpoint, 7);
  state = visit(3, state, 'lantern-3');
  assert.deepEqual(state.lanterns, ['lantern-1', 'lantern-2', 'lantern-3']);
  state = visit(3, state, 'zipline');
  assert.equal(state.complete, false);
  assert.equal(state.zipline, true);
  assert.equal(inventory(3, state).length, 0);
  state = restoreAdventureState(3, JSON.parse(JSON.stringify(state)));
  state = runCanopy(state, 3.1);
  assert.equal(state.complete, true);
});

test('GoApe lantern order, crossing failures and mid-crossing saves are preserved', () => {
  let state = newAdventureState(3);
  assert.deepEqual(visit(3, state, 'lantern-2').lanterns, []);
  state = {
    ...state, checkpoint: 3, collected: ['leaf', 'feather', 'acorn', 'star'],
    player: { x: 945, y: 350, height: 130 }
  };
  state = interactAdventure(3, state, 'high-rope');
  const failed = advanceCanopy(state);
  assert.equal(failed.traversal, null);
  assert.equal(failed.player.height, 130);
  state = waitForCanopyWindow(state);
  state = advanceCanopy(state);
  assert.equal(state.traversal.progress, 0.25);
  const savedTarget = { ...state.traversal.target };
  state = restoreAdventureState(3, JSON.parse(JSON.stringify(state)));
  assert.equal(state.traversal.crossingId, 'high-rope');
  assert.deepEqual(state.traversal.target, savedTarget);
  state = crossCanopy(state);
  assert.equal(state.checkpoint, 4);
});

test('the expanded GoApe course is playable by walking without teleporting', () => {
  let state = newAdventureState(3);
  const walkTo = (x, y) => {
    let remaining = 200;
    while (Math.hypot(x - state.player.x, y - state.player.y) > 0.01 && remaining-- > 0) {
      const next = walkAdventure(3, state, x - state.player.x, y - state.player.y, 0.05);
      assert.notStrictEqual(next, state, `Unable to walk to ${x}, ${y} from ${JSON.stringify(state.player)}`);
      state = next;
    }
    assert.ok(remaining > 0);
  };
  const interact = (id) => {
    const object = OBJECTS[3].find((item) => item.id === id);
    assert.ok(adventureObjectInRange(3, state.player, object), `${id} must be in range`);
    state = interactAdventure(3, state, id);
  };
  const jumpAcross = (x, checkpoint) => {
    walkTo(x, 350);
    state = jumpCanopy(state);
    for (let i = 0; i < 21; i += 1) {
      state = walkAdventure(3, state, 175, 0, 0.05);
      state = tickCanopy(state, 0.05);
    }
    assert.equal(state.checkpoint, checkpoint);
  };
  walkTo(200, 295); interact('leaf');
  walkTo(330, 350); interact('net'); state = crossCanopy(state);
  walkTo(440, 405); interact('feather');
  walkTo(500, 350); interact('rope'); state = crossCanopy(state);
  walkTo(680, 290); interact('acorn');
  jumpAcross(725, 3);
  walkTo(850, 405); interact('star');
  walkTo(945, 350); interact('high-rope'); state = crossCanopy(state);
  walkTo(1110, 300); interact('lantern-1');
  jumpAcross(1175, 5);
  walkTo(1300, 405); interact('lantern-2');
  walkTo(1370, 350); interact('high-net'); state = crossCanopy(state);
  walkTo(1575, 350); interact('summit-rope'); state = crossCanopy(state);
  walkTo(1720, 300); interact('lantern-3');
  walkTo(1800, 350); interact('zipline');
  assert.equal(runCanopy(state, 3.1).complete, true);
});

test('GoApe prevents leaving required treasures or lanterns behind on one-way crossings', () => {
  let state = { ...newAdventureState(3), checkpoint: 3, player: { x: 945, y: 350, height: 130 } };
  state = interactAdventure(3, state, 'high-rope');
  assert.equal(state.traversal, null);
  assert.match(state.message, /four treasures/);
  state = {
    ...state, checkpoint: 5, collected: ['leaf', 'feather', 'acorn', 'star'],
    lanterns: ['lantern-1'], player: { x: 1370, y: 350, height: 165 }
  };
  state = interactAdventure(3, state, 'high-net');
  assert.equal(state.traversal, null);
  assert.match(state.message, /first two lanterns/);
});

test('legacy GoApe zip-wire saves finish the original ride', () => {
  const { courseVersion, lanterns, ...old } = newAdventureState(3);
  void courseVersion; void lanterns;
  const state = restoreAdventureState(3, {
    ...old, checkpoint: 3, player: { x: 930, y: 460, height: 65 },
    collected: ['leaf', 'feather', 'acorn', 'star'], zipline: true, zipProgress: 0.5, treasuresUsed: true
  });
  assert.equal(state.legacyZipline, true);
  assert.equal(runCanopy(state, 1.6).complete, true);
});

test('legacy GoApe platform saves keep their treasures and continue on the longer course', () => {
  const { courseVersion, lanterns, ...old } = newAdventureState(3);
  void courseVersion; void lanterns;
  const state = restoreAdventureState(3, {
    ...old, checkpoint: 3, player: { x: 850, y: 405, height: 130 },
    collected: ['leaf', 'feather', 'acorn', 'star']
  });
  assert.equal(state.checkpoint, 3);
  assert.deepEqual(state.collected, ['leaf', 'feather', 'acorn', 'star']);
  assert.deepEqual(state.lanterns, []);
  assert.equal(state.complete, false);
});

test('coaster and canopy migrate earlier saves without losing progress', () => {
  const { treats, lane, rideVersion, ...oldRide } = { ...newAdventureState(2), phase: 'riding', progress: 0.3 };
  void treats; void lane; void rideVersion;
  assert.equal(restoreAdventureState(2, oldRide).treats.length, 1);
  assert.equal(restoreAdventureState(2, { ...oldRide, progress: 0.65 }).treats.length, 2);
  const oldTimedRide = restoreAdventureState(2, { ...oldRide, rideVersion: 2, signals: 2, progress: 0.8 });
  assert.equal(oldTimedRide.treats.length, 2);
  assert.equal(oldTimedRide.progress, 0);
  for (const phase of ['boarding', 'dropping', 'returning', 'platform', 'finished']) {
    const saved = { ...oldRide, phase, complete: phase === 'finished', bags: phase === 'platform', ticket: phase === 'finished' };
    const restoredRide = restoreAdventureState(2, saved);
    assert.equal(restoredRide.phase, phase);
    assert.equal(restoredRide.bags, saved.bags);
    assert.equal(restoredRide.ticket, saved.ticket);
    assert.equal(restoredRide.complete, saved.complete);
  }
  const afterFinalTap = restoreAdventureState(2, { ...oldRide, rideVersion: 2, signals: 3 });
  assert.equal(afterFinalTap.phase, 'dropping');
  assert.equal(afterFinalTap.treats.length, COASTER_GOAL);
  const savedRide = { ...newAdventureState(2), phase: 'riding', progress: 0.48, lane: 1, treats: [COASTER_TREATS[0].id] };
  const restoredRide = restoreAdventureState(2, JSON.parse(JSON.stringify(savedRide)));
  assert.deepEqual(restoredRide.treats, savedRide.treats);
  assert.equal(restoredRide.progress, savedRide.progress);
  assert.equal(restoredRide.lane, 0);
  const oldCanopy = { ...newAdventureState(3), collected: ['leaf'], traversal: { kind: 'net', progress: 0.5 } };
  const restored = restoreAdventureState(3, oldCanopy);
  assert.deepEqual(restored.collected, ['leaf']);
  assert.equal(restored.traversal.progress, 1 / 3);
  assert.equal(restored.traversal.armed, true);
});

test('older unfinished saves remain preserved while redesigned quests start at the entrance', () => {
  for (const index of [1, 2, 3]) {
    const old = { checkpoint: 3, complete: false };
    const restored = restoreAdventureState(index, old);
    assert.deepEqual(restored.legacyProgress, old);
    assert.equal(restored.complete, false);
    assert.equal(restoreAdventureState(index, { ...old, complete: true }).complete, true);
  }
});
