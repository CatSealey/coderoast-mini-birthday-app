import { findWorldPath } from '../world/world-collision.js';
import { TROPHY_EXIT } from './trophy-logic.js';

export const BIRTHDAY_ENTRANCE = Object.freeze({ x: TROPHY_EXIT.x, y: TROPHY_EXIT.z - 55 });

export function birthdayArrivalPath(player, collision) {
  const angle = Math.atan2(BIRTHDAY_ENTRANCE.y - player.z, BIRTHDAY_ENTRANCE.x - player.x);
  for (let i = 0; i < 16; i += 1) {
    const direction = angle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 8;
    const destination = { x: player.x + Math.cos(direction) * 48, y: player.z + Math.sin(direction) * 48 };
    if (collision.blocked(destination)) continue;
    const path = findWorldPath(BIRTHDAY_ENTRANCE, destination, collision);
    const end = path?.at(-1);
    if (end && Math.hypot(end.x - destination.x, end.y - destination.y) < 1) return path;
  }
  return null;
}

export const BIRTHDAY_FAMILY = Object.freeze([
  Object.freeze({ id: 'gran', outfit: '#8b7194', hair: '#c4beb2', size: 0.92 }),
  Object.freeze({ id: 'grandad', outfit: '#6f7c82', hair: '#b3ada3', size: 0.97 }),
  Object.freeze({ id: 'mum', outfit: '#b27372', hair: '#604438', size: 1 }),
  Object.freeze({ id: 'sister', outfit: '#8a79a9', hair: '#5d4034', size: 0.96 }),
  Object.freeze({ id: 'nephew-1', outfit: '#6885a1', hair: '#654a38', size: 0.68 }),
  Object.freeze({ id: 'nephew-2', outfit: '#a18956', hair: '#513c32', size: 0.68 }),
  Object.freeze({ id: 'cousin', outfit: '#657a64', hair: '#47372e', size: 1 })
]);

export function birthdayFamilyPaths(player, loveDestination, collision) {
  const positions = [{ x: player.x, y: player.z }, loveDestination];
  const paths = [];
  const angle = Math.PI / 2;
  for (const member of BIRTHDAY_FAMILY) {
    let path = null;
    for (const radius of [125, 180, 235]) {
      for (let i = 0; i < 24 && !path; i += 1) {
        const direction = angle + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 12;
        const destination = { x: player.x + Math.cos(direction) * radius, y: player.z + Math.sin(direction) * radius };
        if (collision.blocked(destination) || positions.some((point) => Math.hypot(point.x - destination.x, point.y - destination.y) < 60)) continue;
        const route = findWorldPath(BIRTHDAY_ENTRANCE, destination, collision);
        const end = route?.at(-1);
        if (end && Math.hypot(end.x - destination.x, end.y - destination.y) < 1) path = route;
      }
      if (path) break;
    }
    if (!path) return null;
    positions.push(path.at(-1));
    paths.push({ member, path });
  }
  return paths;
}

export const BIRTHDAY_DIALOGUE = Object.freeze([
  Object.freeze({ speaker: 'Cat', message: 'Happy birthday, meu amor! We brought you a cake.' }),
  Object.freeze({ speaker: 'Cat', message: 'Your family are all here to celebrate with you!' }),
  Object.freeze({ speaker: 'Cat', message: 'You made it to level 30!' }),
  Object.freeze({ speaker: 'player', message: 'Thank you, my love!' }),
  Object.freeze({ speaker: 'Cat', message: 'And your ticket for cuddles and films is ready whenever you are.' })
]);

export function createBirthdayEnding(onChange) {
  let phase = 'idle', line = 0;
  const notify = () => onChange(phase, phase === 'dialogue' ? BIRTHDAY_DIALOGUE[line] : null);
  return {
    start() { phase = 'arriving'; line = 0; notify(); },
    arrive() { if (phase === 'arriving') { phase = 'dialogue'; notify(); } },
    advance() {
      if (phase !== 'dialogue') return;
      line += 1;
      if (line === BIRTHDAY_DIALOGUE.length) phase = 'finished';
      notify();
    },
    stop() { phase = 'idle'; line = 0; }
  };
}
