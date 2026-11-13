import { CASTLE_ENTRANCE, INTERACTION_RANGE, QUEST_LOCATIONS, WORLD_SIZE, WORLD_SPAWN } from './world-data.js';
import { regionBlendAt } from './world-regions.js';
import { roadDistance } from './world-art.js';
import { WORLD_NPCS } from './world-npcs.js';
import { CANOPY_OFFSET, CANOPY_PLATFORMS, harvestPumpkins, placeQuestDecorations } from './world-scenery-data.js';
import { PARK_RIDES } from './park-scenery.js';
import { createMazeWalls } from './maze-scenery.js';
import { isTownPlaza, TOWN_BENCHES, TOWN_CHURCH, TOWN_LAMPS, TOWN_TABLES, TOWN_VENUES } from './town-scenery.js';
import { PACE_DISTANCE, SIDE_QUESTS } from '../side-quests.js';

const random = (index, salt) => {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};
export const WORLD_CHARACTER_RADIUS = 16;
const HARVEST_MAZE_OFFSET = Object.freeze({ x: -200, y: 150 });
export const MAZE_REGION_CLEARANCE = 80;

function mazeWallFitsHarvest(wall) {
  const halfWidth = (wall.vertical ? 12 : 75) + MAZE_REGION_CLEARANCE;
  const halfHeight = (wall.vertical ? 75 : 12) + MAZE_REGION_CLEARANCE;
  const xSteps = Math.ceil(halfWidth * 2 / 10);
  const ySteps = Math.ceil(halfHeight * 2 / 10);
  for (let x = 0; x <= xSteps; x += 1) {
    for (let y = 0; y <= ySteps; y += 1) {
      const point = {
        x: wall.x - halfWidth + 2 * halfWidth * x / xSteps,
        y: wall.y - halfHeight + 2 * halfHeight * y / ySteps
      };
      if (point.x < 0 || point.y < 0 || point.x > WORLD_SIZE.width || point.y > WORLD_SIZE.height
        || regionBlendAt(point).region.id !== 'harvest') return false;
    }
  }
  return true;
}

export function worldTrees() {
  const forest = QUEST_LOCATIONS[3], trees = [];
  for (let i = 0; i < 1350; i += 1) {
    const x = 70 + random(i, 20) * (WORLD_SIZE.width - 140);
    const z = 70 + random(i, 21) * (WORLD_SIZE.height - 140);
    if (roadDistance({ x, y: z }) < 100 || isTownPlaza({ x, y: z }, 50)
      || Math.hypot(x - TOWN_CHURCH.x, z - TOWN_CHURCH.y) < 300
      || QUEST_LOCATIONS.some((quest) => Math.hypot(x - quest.x, z - quest.y) < 310)
      || WORLD_NPCS.some((npc) => Math.hypot(x - npc.x, z - npc.y) < 105)
      || WORLD_NPCS.some((npc) => npc.sideQuest !== undefined && Math.abs(x - npc.x) < 150
        && z > npc.y - 80 && z < npc.y + 240)
      || CANOPY_PLATFORMS.some((platform) => Math.hypot(x - forest.x - CANOPY_OFFSET.x - platform.x,
        z - forest.y - CANOPY_OFFSET.z - platform.z) < 75)
      || Math.hypot(x - WORLD_SPAWN.x, z - WORLD_SPAWN.y) < 300) continue;
    const region = regionBlendAt({ x, y: z }).region.id;
    if (region === 'park' || region === 'harvest') continue;
    trees.push({ x, z, region, size: 0.65 + random(i, 22) * 0.9, variant: i % 3, angle: random(i, 33) * Math.PI * 2 });
  }
  return trees;
}

export function worldCornWalls() {
  const harvest = QUEST_LOCATIONS[4];
  const tickets = SIDE_QUESTS[4];
  return createMazeWalls(8, 8).map((wall) => ({
    x: harvest.x + HARVEST_MAZE_OFFSET.x + (wall.x - 4 + (wall.vertical ? 0 : 0.5)) * 135,
    y: harvest.y + HARVEST_MAZE_OFFSET.y + (wall.y - 4 + (wall.vertical ? 0.5 : 0)) * 135,
    vertical: wall.vertical
  })).filter((wall) => Math.hypot(wall.x - harvest.x, wall.y - harvest.y) >= 190
    && !(Math.abs(wall.x - tickets.x) < (wall.vertical ? 7 : 67.5) + 85
      && wall.y - (wall.vertical ? 67.5 : 7) < tickets.y + 180
      && wall.y + (wall.vertical ? 67.5 : 7) > tickets.y - 80)
    && ![-0.5, 0, 0.5].some((offset) => roadDistance({
      x: wall.x + (wall.vertical ? 0 : offset * 135), y: wall.y + (wall.vertical ? offset * 135 : 0)
    }) < 105)
    && mazeWallFitsHarvest(wall));
}

export function worldObstacles(trees = worldTrees()) {
  const [escape, , park, forest, harvest] = QUEST_LOCATIONS;
  const rect = (x, y, width, depth) => ({ x, y, width, depth });
  const circle = (x, y, radius) => ({ x, y, radius });
  const obstacles = [
    ...[...QUEST_LOCATIONS, ...WORLD_NPCS].map((npc) => npc.prop === 'pace'
      ? rect(npc.x, npc.y, (WORLD_CHARACTER_RADIUS + PACE_DISTANCE) * 2, WORLD_CHARACTER_RADIUS * 2)
      : circle(npc.x, npc.y, WORLD_CHARACTER_RADIUS)),
    rect(WORLD_SPAWN.x + 50, WORLD_SPAWN.y - 250, 231, 155),
    rect(WORLD_SPAWN.x - 205, WORLD_SPAWN.y - 95, 102, 84),
    rect(escape.x - 70, escape.y - 185, 147, 121),
    ...TOWN_VENUES.map(({ x, y, width, depth }) => rect(x, y, width, depth)),
    rect(TOWN_CHURCH.x, TOWN_CHURCH.y, TOWN_CHURCH.width, TOWN_CHURCH.depth),
    ...TOWN_TABLES.map(({ x, y, radius }) => circle(x, y, radius)),
    ...TOWN_BENCHES.map(({ x, y, width, depth }) => rect(x, y, width, depth)),
    ...TOWN_LAMPS.map(({ x, y, radius }) => circle(x, y, radius)),
    ...[[park.x + 205, park.y + 45], [park.x - 380, park.y + 260], [park.x + 350, park.y + 300]]
      .map(([x, y]) => rect(x, y, 82, 45)),
    ...[park.entrance, forest.entrance, harvest.entrance].flatMap(({ x, y }) =>
      [-65, 65].map((offset) => rect(x + offset, y, 18, 20))),
    ...trees.flatMap((tree) => [circle(tree.x, tree.z, 10 * tree.size),
      ...(tree.variant === 0 ? [circle(tree.x + 48, tree.z + 18, 13)] : [])])
  ];
  WORLD_NPCS.filter((npc) => npc.prop === 'grave').forEach((npc) => {
    obstacles.push(rect(npc.x + 48, npc.y, 58, 32));
  });
  [WORLD_SPAWN, escape, park, harvest].forEach((location) => {
    obstacles.push(circle(location.x - 75, location.y - 50, 7), circle(location.x + 95, location.y + 75, 7));
  });
  const tower = PARK_RIDES.find((ride) => ride.type === 'dropTower');
  if (!tower) throw new Error('The theme park is missing its drop tower.');
  obstacles.push(rect(tower.x, tower.y, 34, 34), rect(park.x + 320, park.y - 260, 10, 12),
    circle(park.x - 310, park.y - 210, 68));
  worldCornWalls().forEach((wall) => obstacles.push(rect(wall.x, wall.y, wall.vertical ? 14 : 135, wall.vertical ? 135 : 14)));
  placeQuestDecorations(escape, 'escape', 22, 560, 12).forEach(({ x, y, scale }) => obstacles.push(circle(x, y, 14 * scale)));
  harvestPumpkins().forEach(({ x, y, scale }) => obstacles.push(circle(x, y, 15 * scale)));
  return obstacles;
}

export function createCollision(obstacles, radius = 12) {
  const buckets = new Map(), cell = 120;
  for (const obstacle of obstacles) {
    const w = obstacle.radius ?? obstacle.width / 2, h = obstacle.radius ?? obstacle.depth / 2;
    for (let x = Math.floor((obstacle.x - w - radius) / cell); x <= Math.floor((obstacle.x + w + radius) / cell); x += 1)
      for (let y = Math.floor((obstacle.y - h - radius) / cell); y <= Math.floor((obstacle.y + h + radius) / cell); y += 1) {
        const key = `${x},${y}`, items = buckets.get(key) || [];
        items.push(obstacle); buckets.set(key, items);
      }
  }
  function blocked(point) {
    if (point.x < radius || point.y < radius || point.x > WORLD_SIZE.width - radius || point.y > WORLD_SIZE.height - radius) return true;
    return (buckets.get(`${Math.floor(point.x / cell)},${Math.floor(point.y / cell)}`) || []).some((o) => {
      if (o.radius !== undefined) return Math.hypot(point.x - o.x, point.y - o.y) < o.radius + radius;
      const dx = Math.max(Math.abs(point.x - o.x) - o.width / 2, 0);
      const dy = Math.max(Math.abs(point.y - o.y) - o.depth / 2, 0);
      return dx * dx + dy * dy < radius * radius;
    });
  }
  function clearSegment(a, b) {
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
    for (let i = 1; i <= count; i += 1) {
      if (blocked({ x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count })) return false;
    }
    return true;
  }
  function move(position, dx, dy) {
    const next = { x: position.x + dx, y: position.y + dy };
    if (clearSegment(position, next)) return next;
    const x = { x: position.x + dx, y: position.y };
    const y = { x: position.x, y: position.y + dy };
    if (clearSegment(position, x)) return x;
    if (clearSegment(position, y)) return y;
    return position;
  }
  return { blocked, clearSegment, move };
}

export function findWorldPath(start, destination, collision) {
  if (!collision.blocked(destination) && collision.clearSegment(start, destination)) return [destination];
  const step = 40, cols = Math.ceil(WORLD_SIZE.width / step), rows = Math.ceil(WORLD_SIZE.height / step);
  const point = (index) => ({ x: (index % cols) * step + step / 2, y: Math.floor(index / cols) * step + step / 2 });
  const idx = (x, y) => y * cols + x;
  const sx = Math.max(0, Math.min(cols - 1, Math.floor(start.x / step)));
  const sy = Math.max(0, Math.min(rows - 1, Math.floor(start.y / step)));
  const goalX = Math.floor(destination.x / step), goalY = Math.floor(destination.y / step);
  const candidates = [];
  for (let r = 0; r <= 4 && !candidates.length; r += 1) {
    for (let y = Math.max(0, goalY - r); y <= Math.min(rows - 1, goalY + r); y += 1)
      for (let x = Math.max(0, goalX - r); x <= Math.min(cols - 1, goalX + r); x += 1) {
        const p = point(idx(x, y));
        if (!collision.blocked(p)) candidates.push({ index: idx(x, y), distance: Math.hypot(p.x - destination.x, p.y - destination.y) });
      }

  }
  candidates.sort((a, b) => a.distance - b.distance);
  if (!candidates.length) return null;
  const goal = candidates[0].index, goalPoint = point(goal), startIndex = idx(sx, sy);
  const costs = new Map([[startIndex, 0]]), previous = new Map(), open = [{ index: startIndex, score: 0 }], closed = new Set();
  while (open.length) {
    open.sort((a, b) => b.score - a.score);
    const current = open.pop().index;
    if (closed.has(current)) continue;
    if (current === goal) {
      const result = [];
      for (let node = current; node !== startIndex; node = previous.get(node)) result.push(point(node));
      result.reverse();
      if (!collision.blocked(destination) && collision.clearSegment(result.at(-1) || start, destination)) result.push(destination);
      return result;
    }
    closed.add(current);
    const cx = current % cols, cy = Math.floor(current / cols), from = current === startIndex ? start : point(current);
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (!dx && !dy) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const next = idx(x, y), to = point(next);
      if (closed.has(next) || !collision.clearSegment(from, to)) continue;
      const cost = costs.get(current) + Math.hypot(to.x - from.x, to.y - from.y);
      if (cost >= (costs.get(next) ?? Infinity)) continue;
      costs.set(next, cost); previous.set(next, current);
      open.push({ index: next, score: cost + Math.hypot(to.x - goalPoint.x, to.y - goalPoint.y) });
    }
  }
  return null;
}

export function findCharacterApproach(start, character, collision) {
  if (Math.hypot(start.x - character.x, start.y - character.y) <= INTERACTION_RANGE
    && !collision.blocked(start)) return [];
  const direction = Math.atan2(start.y - character.y, start.x - character.x);
  for (const radius of [50, 65]) {
    for (let i = 0; i < 16; i += 1) {
      const angle = direction + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8;
      const target = { x: character.x + Math.cos(angle) * radius, y: character.y + Math.sin(angle) * radius };
      if (collision.blocked(target)) continue;
      const route = findWorldPath(start, target, collision);
      const endpoint = route?.at(-1);
      if (endpoint && Math.hypot(endpoint.x - character.x, endpoint.y - character.y) <= INTERACTION_RANGE) return route;
    }
  }
  return null;
}

export { CASTLE_ENTRANCE };
