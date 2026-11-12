import { QUEST_LOCATIONS } from './world/world-data.js';

const entries = [
  { title: 'Nope.', offset: [250, 200], prop: 'doll', dialogue: 'I am not going to touch that, you will have to do it!' },
  { title: 'Nervous...', offset: [-550, 300], prop: 'pace', dialogue: 'I thought you were never going to kiss me.' },
  { title: 'How much?!', offset: [-250, 300], prop: 'cup', dialogue: '£50 for a cup seems a bit excessive!' },
  { title: 'David White', offset: [-250, 200], prop: 'grave', dialogue: 'Little girl.... little grave!' },
  { title: 'What Tickets?', offset: [250, 220], prop: 'tickets', dialogue: 'We had fast track this whole time...' }
];

export const SIDE_QUESTS = Object.freeze(entries.map((entry, index) => Object.freeze({
  id: index,
  title: entry.title,
  x: QUEST_LOCATIONS[index].x + entry.offset[0],
  y: QUEST_LOCATIONS[index].y + entry.offset[1],
  prop: entry.prop,
  dialogue: entry.dialogue
})));

export const PACE_DISTANCE = 20;

export function sideQuestPosition(quest, time) {
  return { x: quest.x + (quest.prop === 'pace' ? Math.sin(time / 650) * PACE_DISTANCE : 0), y: quest.y };
}

export function restoreSideQuestProgress(saved) {
  return SIDE_QUESTS.map((_, index) => Array.isArray(saved) && saved[index] === true);
}
