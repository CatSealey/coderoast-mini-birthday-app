import { ABIGAIL_RUNES, applyAbigailInteraction, newAbigailState } from './abigail-logic.js';

export const HOUSE_BOUNDS = Object.freeze({ left: -550, right: 550, top: -240, bottom: 640 });
export const HOUSE_WALLS = Object.freeze([
  { left: -12, right: 12, top: -240, bottom: -80 },
  { left: -12, right: 12, top: 80, bottom: 240 },
  { left: -550, right: -430, top: 232, bottom: 248 },
  { left: -310, right: 40, top: 232, bottom: 248 },
  { left: 160, right: 310, top: 232, bottom: 248 },
  { left: 430, right: 550, top: 232, bottom: 248 },
  { left: -191, right: -175, top: 240, bottom: 640 },
  { left: 175, right: 191, top: 240, bottom: 640 }
]);
export const HOUSE_FURNITURE = Object.freeze([
  { left: -545, right: -510, top: 455, bottom: 590 },
  { left: -175, right: -110, top: 460, bottom: 585 },
  { left: 500, right: 545, top: 455, bottom: 585 }
]);
export const HOUSE_ROOM_NAMES = Object.freeze({
  vestibule: 'Vestibule', chamber: 'Warding Chamber',
  study: 'Astronomer’s Study', bedroom: 'Moonlit Bedroom', archive: 'Keeper’s Archive'
});
export function houseRoomAt(point) {
  if (point.y < 240) return point.x < 0 ? 'vestibule' : 'chamber';
  return point.x < -183 ? 'study' : point.x < 183 ? 'bedroom' : 'archive';
}
export const HOUSE_OBJECTS = Object.freeze([
  { id: 'diary', name: 'Caretaker’s diary', icon: '📖', x: -425, y: -145, radius: 34 },
  { id: 'mara', name: 'Mara the Wardkeeper', icon: '🧙‍♀️', x: -210, y: -125, radius: 24 },
  { id: 'doll', name: 'Abigail’s doll', icon: '🧸', x: -115, y: 145, radius: 30 },
  { id: 'chamberDoor', name: 'Chamber door', icon: '🚪', x: 0, y: 0, radius: 0 },
  { id: 'book', name: 'Wardkeeper’s book', icon: '📜', x: 155, y: -145, radius: 34 },
  { id: 'ward', name: 'Runic ward', icon: '🔮', x: 335, y: -145, radius: 34 },
  { id: 'chest', name: 'Sealed chest', icon: '🗝️', x: 350, y: 140, radius: 36 },
  { id: 'exit', name: 'Escape door', icon: '🚪', x: 540, y: 0, radius: 0 },
  { id: 'starCache', name: 'Astronomer’s desk', icon: '🔭', x: -380, y: 510, radius: 34, rune: 'Star' },
  { id: 'moonCache', name: 'Jewellery box', icon: '📦', x: 0, y: 510, radius: 34, rune: 'Moon' },
  { id: 'diamondCache', name: 'Keeper’s cabinet', icon: '🗄️', x: 380, y: 510, radius: 34, rune: 'Diamond' }
]);
export const INTERACTION_DISTANCE = 85;
const PLAYER_RADIUS = 15;
const SPEED = 210;

export function newHouseState() {
  return { ...newAbigailState(), player: { x: -400, y: 120 }, chamberUnlocked: false, collectedRunes: [] };
}

export function restoreHouseState(saved) {
  const initial = newHouseState();
  if (!saved) return initial;
  const flags = ['diaryRead', 'hasKey', 'wardSolved', 'hasToken', 'chamberUnlocked'];
  const runes = saved.collectedRunes;
  const player = saved.player;
  if (flags.some((key) => typeof saved[key] !== 'boolean')
    || !Array.isArray(runes) || runes.some((rune) => !ABIGAIL_RUNES.includes(rune))
    || new Set(runes).size !== runes.length
    || !player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) {
    console.warn('Invalid saved Abigail quest progress; starting the quest again.');
    return initial;
  }
  const state = { ...initial, ...Object.fromEntries(flags.map((key) => [key, saved[key]])),
    collectedRunes: [...runes], player: { x: player.x, y: player.y }, complete: saved.complete === true };
  if (!valid(state.player, houseObstacles(state))) {
    console.warn('Invalid saved Abigail position; returning to the vestibule.');
    state.player = initial.player;
  }
  state.room = houseRoomAt(state.player);
  return state;
}

export function houseObstacles(state) {
  const wall = [...HOUSE_WALLS, ...HOUSE_FURNITURE];
  if (!state.chamberUnlocked) wall.push({ left: -12, right: 12, top: -80, bottom: 80 });
  return [...wall, ...HOUSE_OBJECTS.filter((item) => item.radius).map((item) => ({
    left: item.x - item.radius, right: item.x + item.radius,
    top: item.y - item.radius, bottom: item.y + item.radius
  }))].map((rect) => ({
    left: rect.left - PLAYER_RADIUS, right: rect.right + PLAYER_RADIUS,
    top: rect.top - PLAYER_RADIUS, bottom: rect.bottom + PLAYER_RADIUS
  }));
}

function inside(point, rect) {
  return point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;
}

function clearSegment(a, b, rect) {
  let low = 0, high = 1;
  for (const [start, delta, min, max] of [
    [a.x, b.x - a.x, rect.left, rect.right], [a.y, b.y - a.y, rect.top, rect.bottom]
  ]) {
    if (Math.abs(delta) < 1e-9) {
      if (start <= min || start >= max) return true;
    } else {
      const t1 = (min - start) / delta, t2 = (max - start) / delta;
      low = Math.max(low, Math.min(t1, t2));
      high = Math.min(high, Math.max(t1, t2));
      if (low >= high) return true;
    }
  }
  return false;
}

function valid(point, obstacles) {
  return point.x >= HOUSE_BOUNDS.left + PLAYER_RADIUS && point.x <= HOUSE_BOUNDS.right - PLAYER_RADIUS
    && point.y >= HOUSE_BOUNDS.top + PLAYER_RADIUS && point.y <= HOUSE_BOUNDS.bottom - PLAYER_RADIUS
    && !obstacles.some((rect) => inside(point, rect));
}

export function housePath(state, destination) {
  const obstacles = houseObstacles(state);
  const target = {
    x: Math.max(HOUSE_BOUNDS.left + PLAYER_RADIUS, Math.min(HOUSE_BOUNDS.right - PLAYER_RADIUS, destination.x)),
    y: Math.max(HOUSE_BOUNDS.top + PLAYER_RADIUS, Math.min(HOUSE_BOUNDS.bottom - PLAYER_RADIUS, destination.y))
  };
  if (!valid(target, obstacles)) return null;
  const nodes = [state.player, target];
  for (const rect of obstacles) {
    for (const x of [rect.left - 1, rect.right + 1]) for (const y of [rect.top - 1, rect.bottom + 1]) {
      const point = { x, y };
      if (valid(point, obstacles)) nodes.push(point);
    }
  }
  const distances = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set();
  distances[0] = 0;
  while (visited.size < nodes.length) {
    let best = -1;
    for (let i = 0; i < nodes.length; i += 1) {
      if (!visited.has(i) && (best === -1 || distances[i] < distances[best])) best = i;
    }
    if (best === -1 || !Number.isFinite(distances[best]) || best === 1) break;
    visited.add(best);
    for (let i = 1; i < nodes.length; i += 1) {
      if (visited.has(i) || obstacles.some((rect) => !clearSegment(nodes[best], nodes[i], rect))) continue;
      const distance = distances[best] + Math.hypot(nodes[i].x - nodes[best].x, nodes[i].y - nodes[best].y);
      if (distance < distances[i]) { distances[i] = distance; previous[i] = best; }
    }
  }
  if (!Number.isFinite(distances[1])) return null;
  const path = [];
  for (let i = 1; i !== 0; i = previous[i]) path.unshift(nodes[i]);
  return path;
}

export function pathToHouseObject(state, id) {
  const item = HOUSE_OBJECTS.find((object) => object.id === id);
  if (!item) return null;
  if (Math.hypot(state.player.x - item.x, state.player.y - item.y) <= INTERACTION_DISTANCE) return [];
  let shortest = null, shortestLength = Infinity;
  for (let i = 0; i < 16; i += 1) {
    const angle = i * Math.PI / 8;
    const destination = { x: item.x + Math.cos(angle) * 70, y: item.y + Math.sin(angle) * 70 };
    if (id === 'chamberDoor' && !state.chamberUnlocked && destination.x > 0) continue;
    const path = housePath(state, destination);
    if (!path) continue;
    let length = 0, point = state.player;
    for (const next of path) { length += Math.hypot(next.x - point.x, next.y - point.y); point = next; }
    if (length < shortestLength) { shortest = path; shortestLength = length; }
  }
  return shortest;
}

export function walkHouse(state, dx, dy, seconds) {
  if (state.puzzleOpen || state.complete || !Number.isFinite(seconds) || seconds <= 0) return state;
  const length = Math.hypot(dx, dy);
  if (!length) return state;
  const distance = Math.min(length, SPEED * seconds);
  const candidate = { x: state.player.x + dx / length * distance, y: state.player.y + dy / length * distance };
  const obstacles = houseObstacles(state);
  if (!valid(candidate, obstacles) || obstacles.some((rect) => !clearSegment(state.player, candidate, rect))) return state;
  return { ...state, player: candidate, room: houseRoomAt(candidate) };
}

export function interactHouse(state, id) {
  const item = HOUSE_OBJECTS.find((object) => object.id === id);
  if (!item || state.puzzleOpen || state.complete) return state;
  if (Math.hypot(state.player.x - item.x, state.player.y - item.y) > INTERACTION_DISTANCE) {
    return { ...state, message: `Move closer to ${item.name} to investigate.` };
  }
  if (id === 'chamberDoor') {
    if (!state.hasKey) return { ...state, message: 'The chamber door is locked. Something in the house may hold a key.' };
    return { ...state, chamberUnlocked: true, message: 'The key opens the chamber door. Walk through to explore.' };
  }
  if (item.rune) {
    if (state.collectedRunes.includes(item.rune)) {
      return { ...state, message: `You have already found the ${item.rune.toLowerCase()} rune here.` };
    }
    return { ...state, collectedRunes: [...state.collectedRunes, item.rune],
      message: `You search ${item.name} and discover the ${item.rune.toLowerCase()} rune!` };
  }
  if (id === 'ward' && !state.wardSolved && state.collectedRunes.length < ABIGAIL_RUNES.length) {
    return { ...state, message: `The ward needs three runes. You have found ${state.collectedRunes.length} of 3; search the other rooms.` };
  }
  if (id === 'book') {
    return { ...state, message: 'Wardkeeper’s book: “Three runes are hidden in the other rooms. The diary remembers their order.”' };
  }
  if (id === 'mara' && !state.wardSolved && state.hasKey) {
    return { ...state, message: 'Mara: Search the other rooms for three runes. The diary will tell you their order.' };
  }
  return applyAbigailInteraction(state, id);
}
