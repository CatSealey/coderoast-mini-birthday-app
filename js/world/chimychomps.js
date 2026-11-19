import { WORLD_SIZE } from './world-data.js';

export const CHIMYCHOMPS = Object.freeze([
  ['home', 2000, 2000], ['home', 2640, 2480], ['home', 2880, 1680],
  ['escape', 1840, 1600], ['escape', 1040, 1680], ['escape', 1600, 880],
  ['town', 3200, 2480], ['town', 3840, 2800], ['town', 3760, 3280],
  ['park', 4880, 640], ['park', 4160, 640], ['park', 4880, 1360],
  ['forest', 5120, 2960], ['forest', 4320, 2640], ['forest', 4160, 2960],
  ['harvest', 1440, 3120], ['harvest', 1360, 2240], ['harvest', 1680, 2640]
].map(([region, x, y], index) => Object.freeze({ id: `chomp-${index}`, region, x, y })));

export const STATUE_INTERACTION_RANGE = 74;

export function restoreEncounters(saved, completed, displays) {
  const defeated = Array.isArray(saved?.defeated)
    ? [...new Set(saved.defeated.filter((id) => CHIMYCHOMPS.some((creature) => creature.id === id)))] : [];
  const seen = new Set();
  const statues = [];
  if (Array.isArray(saved?.statues)) {
    for (const statue of saved.statues) {
      if (!Number.isFinite(statue?.x) || !Number.isFinite(statue?.y)
        || statue.x < 0 || statue.x > WORLD_SIZE.width || statue.y < 0 || statue.y > WORLD_SIZE.height
        || !Array.isArray(statue.keepsakes)) continue;
      const keepsakes = statue.keepsakes.filter((index) => {
        if (!Number.isInteger(index) || !completed[index] || displays[index] || seen.has(index)) return false;
        seen.add(index);
        return true;
      });
      if (keepsakes.length) statues.push({ x: statue.x, y: statue.y, keepsakes });
    }
  }
  return { defeated, statues };
}

export function carriedKeepsakes(completed, displays, encounters) {
  const dropped = new Set(encounters.statues.flatMap((statue) => statue.keepsakes));
  return completed.map((done, index) => done && !displays[index] && !dropped.has(index));
}

export function explodeChomp(encounters, creature, position, completed, displays) {
  if (!CHIMYCHOMPS.some((item) => item.id === creature.id) || encounters.defeated.includes(creature.id)) {
    throw new RangeError('ChimyChompChomp is not active.');
  }
  const keepsakes = carriedKeepsakes(completed, displays, encounters)
    .flatMap((carried, index) => carried ? [index] : []);
  return {
    defeated: [...encounters.defeated, creature.id],
    statues: keepsakes.length ? [...encounters.statues, { ...position, keepsakes }] : [...encounters.statues]
  };
}

export function recoverStatue(encounters, index) {
  if (!Number.isInteger(index) || index < 0 || index >= encounters.statues.length) {
    throw new RangeError('Unknown angel statue.');
  }
  return { defeated: [...encounters.defeated], statues: encounters.statues.filter((_, slot) => slot !== index) };
}
