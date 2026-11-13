import { QUEST_LOCATIONS, WORLD_SPAWN } from './world-data.js';

export const WORLD_REGIONS = Object.freeze([
  Object.freeze({ id: 'home', center: WORLD_SPAWN, name: 'LUMBRIDGE CASTLE · GAYLINOR', color: [113, 132, 75] }),
  Object.freeze({ id: 'escape', center: QUEST_LOCATIONS[0], name: QUEST_LOCATIONS[0].region, color: [68, 78, 70] }),
  Object.freeze({ id: 'town', center: QUEST_LOCATIONS[1], name: QUEST_LOCATIONS[1].region, color: [151, 137, 106] }),
  Object.freeze({ id: 'park', center: QUEST_LOCATIONS[2], name: QUEST_LOCATIONS[2].region, color: [160, 137, 100] }),
  Object.freeze({ id: 'forest', center: QUEST_LOCATIONS[3], name: QUEST_LOCATIONS[3].region, color: [25, 49, 45] }),
  Object.freeze({ id: 'harvest', center: QUEST_LOCATIONS[4], name: QUEST_LOCATIONS[4].region, color: [130, 93, 44] })
]);

export function regionBlendAt({ x, y }) {
  const warpedX = x + 110 * Math.sin(y / 350) + 60 * Math.sin((x + y) / 270);
  const warpedY = y + 100 * Math.sin(x / 420) + 55 * Math.sin((x - y) / 310);
  let first = WORLD_REGIONS[0];
  let second = first;
  let firstDistance = Infinity;
  let secondDistance = Infinity;
  for (const region of WORLD_REGIONS) {
    const distance = Math.hypot(warpedX - region.center.x, warpedY - region.center.y);
    if (distance < firstDistance) {
      second = first;
      secondDistance = firstDistance;
      first = region;
      firstDistance = distance;
    } else if (distance < secondDistance) {
      second = region;
      secondDistance = distance;
    }
  }
  const blend = Math.max(0, 0.5 * (1 - (secondDistance - firstDistance) / 180));
  return { region: first, neighbor: second, blend };
}
