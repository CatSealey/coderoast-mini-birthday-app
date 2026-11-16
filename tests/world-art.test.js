import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraFor, createWorldArt } from '../js/world/world-art.js';
import { QUEST_LOCATIONS, WORLD_SIZE, WORLD_SPAWN } from '../js/world/world-data.js';
import { CASTLE_PALETTE, castleSupplyStyle } from '../js/world/castle-scenery.js';
import { CHURCH_STONE, CHURCH_WOOD, STOREFRONT_AWNINGS, TOWN_BENCHES, TOWN_CHURCH, TOWN_PLAZA, TOWN_VENUES } from '../js/world/town-scenery.js';
import { SURROUNDINGS_BOUNDS } from '../js/world/world-surroundings.js';
import { WORLD_SUPPLIES } from '../js/world/world-supplies.js';

test('minimap preserves unpaved town terrain while retaining the rest of the world ground', () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const canvases = [], events = [];
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = { width: 0, height: 0 };
      const index = canvases.length;
      let firstStone = false;
      const methods = {
        createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        getImageData: (...args) => {
          const image = { townTerrain: true };
          events.push({ index, method: 'getImageData', args, image });
          return image;
        },
        putImageData: (...args) => events.push({ index, method: 'putImageData', args }),
        drawImage: (...args) => events.push({ index, method: 'drawImage', args }),
        moveTo: (...args) => { if (index === 2) events.push({ index, method: 'moveTo', args }); },
        lineTo: (...args) => { if (index === 2) events.push({ index, method: 'lineTo', args }); },
        stroke: () => { if (index === 2) events.push({ index, method: 'stroke' }); },
        rect: (...args) => { if (index === 2) events.push({ index, method: 'rect', args }); },
        clip: () => { if (index === 2) events.push({ index, method: 'clip' }); },
        quadraticCurveTo: () => {
          if (!firstStone) events.push({ index, method: 'cobblestone' });
          firstStone = true;
        }
      };
      const context = new Proxy(methods, { get: (target, key) => target[key] || (() => {}) });
      canvas.getContext = () => context;
      canvases.push(canvas);
      return canvas;
    }
  };
  try {
    const art = createWorldArt();
    assert.equal(art.ground, canvases[0]);
    assert.equal(art.minimap, canvases[2]);
    const left = Math.max(0, Math.floor((TOWN_PLAZA.left - 30) / WORLD_SIZE.width * art.minimap.width));
    const top = Math.max(0, Math.floor((TOWN_PLAZA.top - 30) / WORLD_SIZE.height * art.minimap.height));
    const right = Math.min(art.minimap.width, Math.ceil((TOWN_PLAZA.right + 30) / WORLD_SIZE.width * art.minimap.width));
    const bottom = Math.min(art.minimap.height, Math.ceil((TOWN_PLAZA.bottom + 30) / WORLD_SIZE.height * art.minimap.height));
    const capture = events.findIndex((event) => event.index === 2 && event.method === 'getImageData');
    const firstStone = events.findIndex((event) => event.index === 0 && event.method === 'cobblestone');
    const mapDraws = events.filter((event) => event.index === 2 && event.method === 'drawImage');
    const restore = events.findIndex((event) => event.index === 2 && event.method === 'putImageData');
    assert.deepEqual(events[capture].args, [left, top, right - left, bottom - top]);
    assert.equal(mapDraws.length, 2);
    assert.ok(mapDraws.every((event) => event.args[0] === art.ground));
    assert.ok(capture < firstStone && firstStone < events.indexOf(mapDraws[1]) && events.indexOf(mapDraws[1]) < restore);
    assert.deepEqual(events[restore].args, [events[capture].image, left, top]);
    const route = events.slice(restore + 1).filter((event) => event.index === 2);
    assert.deepEqual(route.find((event) => event.method === 'rect').args, [left, top, right - left, bottom - top]);
    assert.ok(route.findIndex((event) => event.method === 'clip') < route.findIndex((event) => event.method === 'stroke'));
    assert.deepEqual(route.filter((event) => event.method === 'lineTo').at(-1).args,
      [QUEST_LOCATIONS[1].x / WORLD_SIZE.width * art.minimap.width, QUEST_LOCATIONS[1].y / WORLD_SIZE.height * art.minimap.height]);
    assert.equal(route.at(-1).method, 'stroke');

    globalThis.window = { devicePixelRatio: 1 };
    const drawnImages = [];
    const context = new Proxy({
      drawImage: (...args) => drawnImages.push(args),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }, { get: (target, key) => target[key] || (() => {}) });
    const position = { x: WORLD_SIZE.width, y: 0 };
    art.draw(context, cameraFor(position, 800, 600, 1), 1, 800, 600, []);
    assert.deepEqual(drawnImages[0], [art.surroundings, SURROUNDINGS_BOUNDS.left, SURROUNDINGS_BOUNDS.top,
      SURROUNDINGS_BOUNDS.right - SURROUNDINGS_BOUNDS.left, SURROUNDINGS_BOUNDS.bottom - SURROUNDINGS_BOUNDS.top]);
    assert.deepEqual(drawnImages[1], [art.ground, 0, 0, WORLD_SIZE.width, WORLD_SIZE.height]);

    const rectangles = [], paintedRectangles = [], filledColors = [], labels = [];
    const townContext = new Proxy({
      fillRect: (...args) => {
        rectangles.push(args);
        paintedRectangles.push({ color: townContext.fillStyle, args });
      },
      fill: () => filledColors.push(townContext.fillStyle),
      fillText: (...args) => labels.push(args),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }, { get: (target, key) => target[key] || (() => {}) });
    const bench = TOWN_BENCHES[0];
    art.draw(townContext, cameraFor(bench, 800, 600, 1), 1, 800, 600, []);
    for (const y of [-30, -24, -18]) {
      assert.ok(rectangles.some((rect) => rect[0] === -30 && rect[1] === y && rect[2] === 60 && rect[3] === 4));
    }
    rectangles.length = 0;
    const storefront = TOWN_VENUES.find((venue) => venue.kind !== 'games');
    art.draw(townContext, cameraFor(storefront, 800, 600, 1), 1, 800, 600, []);
    for (const awning of STOREFRONT_AWNINGS) {
      assert.ok(rectangles.some((rect) => rect[0] === awning.x - awning.width / 2
        && rect[1] === -64 && rect[2] === awning.width && rect[3] === 6));
    }
    assert.ok(!rectangles.some((rect) => rect[0] === -52 && rect[1] === -44 && rect[2] === 104 && rect[3] === 10));
    labels.length = 0;
    const tavern = TOWN_VENUES.find((venue) => venue.kind === 'games');
    art.draw(townContext, cameraFor(tavern, 800, 600, 1), 1, 800, 600, []);
    assert.ok(labels.some(([text]) => text === 'POOL · DARTS · GAMES'));
    for (const venue of TOWN_VENUES) {
      labels.length = 0;
      art.draw(townContext, cameraFor(venue, 800, 600, 1), 1, 800, 600, []);
      assert.ok(labels.some(([text]) => text === venue.name));
    }
    labels.length = 0;
    art.draw(townContext, cameraFor(QUEST_LOCATIONS[4].entrance, 800, 600, 1), 1, 800, 600, []);
    assert.ok(labels.some(([text]) => text === 'FRIGHT NIGHTS'));
    assert.ok(labels.some(([text]) => text === 'THE CORN MAZE'));
    const supplyEvents = [];
    const supplyContext = new Proxy({
      translate: (...args) => supplyEvents.push({ type: 'translate', args }),
      fillRect: (...args) => supplyEvents.push({ type: 'rect', args, color: supplyContext.fillStyle }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    }, { get: (target, key) => target[key] || (() => {}) });
    for (const item of WORLD_SUPPLIES) {
      supplyEvents.length = 0;
      art.draw(supplyContext, cameraFor(item, 800, 600, 1), 1, 800, 600, []);
      const start = supplyEvents.findIndex((event) => event.type === 'translate'
        && event.args[0] === item.x && event.args[1] === item.y * 0.68);
      assert.ok(start >= 0, `${item.kind} is visible at its world position`);
      const body = item.kind === 'barrel' ? [-9, -24, 18, 24] : [-10, -20, 20, 20];
      assert.deepEqual(supplyEvents[start + 1], {
        type: 'rect', args: body, color: castleSupplyStyle(item.kind, item.variant).wood
      });
    }
    paintedRectangles.length = 0;
    filledColors.length = 0;
    art.draw(townContext, cameraFor(TOWN_CHURCH, 800, 600, 1), 1, 800, 600, []);
    assert.ok(paintedRectangles.some(({ color, args }) => color === CHURCH_STONE.wall
      && args[0] === -58 && args[1] === -83 && args[2] === 116 && args[3] === 83));
    assert.ok(paintedRectangles.some(({ color, args }) => color === CHURCH_STONE.tower
      && args[0] === -53 && args[1] === -146 && args[2] === 45 && args[3] === 93));
    assert.ok(paintedRectangles.some(({ color, args }) => color === CHURCH_WOOD
      && args[0] === -6 && args[1] === -35 && args[2] === 15 && args[3] === 35));
    assert.ok(filledColors.filter((color) => color === CHURCH_WOOD).length >= 3);
    paintedRectangles.length = 0;
    filledColors.length = 0;
    const castle = { x: WORLD_SPAWN.x + 50, y: WORLD_SPAWN.y - 250 };
    art.draw(townContext, cameraFor(castle, 800, 600, 1), 1, 800, 600, []);
    for (const [x, y] of [[-125, -247], [81, -247], [-107, -175], [63, -175]]) {
      assert.ok(paintedRectangles.some(({ color, args }) => color === CASTLE_PALETTE.tower
        && args[0] === x && args[1] === y));
    }
    assert.ok(filledColors.includes(CASTLE_PALETTE.gate));
    paintedRectangles.length = 0;
    art.draw(townContext, { x: castle.x - 400, y: castle.y - 490 / 0.68 }, 1, 800, 100, []);
    assert.ok(paintedRectangles.some(({ color, args }) => color === CASTLE_PALETTE.tower
      && args[0] === -125 && args[1] === -247), 'rear towers remain visible when the castle base is below the viewport');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
