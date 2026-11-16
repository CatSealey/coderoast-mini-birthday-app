import test from 'node:test';
import assert from 'node:assert/strict';
import { ENTRANCE_MARKER_RADIUS, entranceMarkerHit } from '../js/world/entrance-marker.js';
import { cameraFor, projectWorld } from '../js/world/world-art.js';
import { QUEST_LOCATIONS } from '../js/world/world-data.js';

test('visible entrance rings are clickable at different zoom levels', () => {
  for (const zoom of [0.5, 1, 2]) {
    for (const { entrance } of QUEST_LOCATIONS) {
      const camera = cameraFor(entrance, 800, 600, zoom);
      const center = projectWorld(entrance, camera, zoom);
      assert.ok(entranceMarkerHit(center, center, zoom));
      assert.ok(entranceMarkerHit({ x: center.x + ENTRANCE_MARKER_RADIUS * zoom, y: center.y }, center, zoom));
      assert.ok(!entranceMarkerHit({ x: center.x + Math.max(24 * zoom, 18) + 1, y: center.y }, center, zoom));
      assert.ok(!entranceMarkerHit({ x: center.x, y: center.y - Math.max(14 * zoom, 12) - 1 }, center, zoom));
    }
  }
});
