// The course sits behind the GoApe entrance, leaving the foreground clear.
export const CANOPY_OFFSET = Object.freeze({ x: 0, z: -520 });

// Platform coordinates are offsets from the course center.
export const CANOPY_PLATFORMS = Object.freeze([
  { x: -340, z: -310, height: 145, size: 76 },
  { x: -85, z: -370, height: 180, size: 92 },
  { x: 220, z: -300, height: 155, size: 78 },
  { x: 355, z: -55, height: 192, size: 86 },
  { x: 230, z: 230, height: 160, size: 78 },
  { x: -65, z: 300, height: 185, size: 92 },
  { x: -350, z: 180, height: 150, size: 80 }
]);

export const CANOPY_LINKS = Object.freeze([
  { from: 0, to: 1, type: 'bridge' },
  { from: 1, to: 2, type: 'rope' },
  { from: 2, to: 3, type: 'bridge' },
  { from: 3, to: 4, type: 'rope' },
  { from: 4, to: 5, type: 'bridge' },
  { from: 5, to: 6, type: 'rope' },
  { from: 6, to: 0, type: 'bridge' },
  { from: 1, to: 5, type: 'zipline' }
]);

// Each ride is a closed path in three dimensions. Heights and footprints are
// intentionally different so the rides are recognizable from the ground.
export const COASTER_TRACKS = Object.freeze({
  thirteen: [
    [-180, 34, 65], [-125, 70, 65], [-75, 165, 55], [5, 65, 50],
    [80, 48, 65], [155, 38, 35], [185, 35, -35], [140, 50, -85],
    [45, 70, -85], [-50, 42, -80], [-145, 35, -65], [-185, 34, -25]
  ],
  loopCoaster: [
    [-185, 32, 75], [-120, 110, 75], [-55, 45, 75], [20, 38, 75],
    [60, 75, 75], [48, 135, 75], [0, 145, 75], [-10, 95, 75],
    [28, 48, 75], [120, 52, 65], [185, 36, 20], [155, 40, -65],
    [60, 65, -90], [-45, 42, -80], [-155, 35, -60]
  ],
  woodCoaster: [
    [-190, 38, 80], [-125, 90, 80], [-65, 180, 75], [0, 45, 65],
    [85, 125, 55], [170, 45, 35], [190, 38, -40], [115, 80, -95],
    [10, 55, -100], [-100, 100, -90], [-180, 38, -35]
  ],
  twistingCoaster: [
    [-180, 38, 60], [-115, 115, 65], [-30, 45, 80], [75, 130, 45],
    [175, 38, 40], [150, 70, -50], [65, 110, -90], [-25, 45, -70],
    [-100, 85, -90], [-185, 40, -40]
  ]
});

export function scatterScenery({ center, count, radius, seed, accept }) {
  const items = [];
  for (let i = 0; i < count * 30 && items.length < count; i += 1) {
    const random = (salt) => {
      const value = Math.sin((i + seed) * 127.1 + salt * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };
    const angle = random(1) * Math.PI * 2;
    const distance = radius * Math.sqrt(random(2));
    const x = center.x + Math.cos(angle) * distance;
    const y = center.y + Math.sin(angle) * distance;
    if (!accept({ x, y }) || items.some((item) => Math.hypot(item.x - x, item.y - y) < 38)) continue;
    items.push({ x, y, variant: Math.floor(random(3) * 3), scale: 0.7 + random(4) * 0.55, rotation: (random(5) - 0.5) * 0.7 });
  }
  return items;
}

export function placeQuestDecorations(center, region, count, radius, seed) {
  return scatterScenery({
    center, count, radius, seed,
    accept: (point) => point.x > 40 && point.x < WORLD_SIZE.width - 40
      && point.y > 40 && point.y < WORLD_SIZE.height - 40
      && regionBlendAt(point).region.id === region && roadDistance(point) > 85
      && Math.hypot(point.x - center.x, point.y - center.y) > 120
      && SIDE_QUESTS.every((quest) => Math.hypot(point.x - quest.x, point.y - quest.y) > 95)
  });
}

export function harvestPumpkins() {
  const harvest = QUEST_LOCATIONS[4];
  const pumpkins = placeQuestDecorations(harvest, 'harvest', 35, 760, 48);
  const graves = placeQuestDecorations(QUEST_LOCATIONS[0], 'escape', 22, 560, 12);
  const transition = scatterScenery({
    center: harvest, count: 3, radius: 760, seed: 318,
    accept: (point) => {
      const { region, neighbor, blend } = regionBlendAt(point);
      return point.x > 40 && point.x < WORLD_SIZE.width - 40
        && point.y > 40 && point.y < WORLD_SIZE.height - 40
        && region.id === 'escape' && neighbor.id === 'harvest' && blend > 0
        && roadDistance(point) > 85
        && [...QUEST_LOCATIONS, ...WORLD_NPCS].every((npc) => Math.hypot(point.x - npc.x, point.y - npc.y) > 100)
        && [...pumpkins, ...graves].every((item) => Math.hypot(point.x - item.x, point.y - item.y) > 50);
    }
  });
  return [...pumpkins, ...transition];
}

import { QUEST_LOCATIONS, WORLD_SIZE } from './world-data.js';
import { roadDistance } from './world-art.js';
import { regionBlendAt } from './world-regions.js';
import { SIDE_QUESTS } from '../side-quests.js';
import { WORLD_NPCS } from './world-npcs.js';
