import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldArt } from '../js/world/world-art.js';
import { QUEST_LOCATIONS, WORLD_SIZE } from '../js/world/world-data.js';
import { TOWN_PLAZA } from '../js/world/town-scenery.js';

test('minimap preserves unpaved town terrain while retaining the rest of the world ground', () => {
  const previousDocument = globalThis.document;
  const canvases = [], events = [];
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = { width: 0, height: 0 };
      const index = canvases.length;
      let firstStone = false;
      const methods = {
        createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
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
        roundRect: () => {
          if (!firstStone) events.push({ index, method: 'roundRect' });
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
    const firstStone = events.findIndex((event) => event.index === 0 && event.method === 'roundRect');
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
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
