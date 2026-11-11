import { QUEST_LOCATIONS, WORLD_SPAWN } from './world-data.js';

export const WORLD_NPCS = Object.freeze([
  {
    name: 'Ellis the Gardener', x: WORLD_SPAWN.x - 105, y: WORLD_SPAWN.y + 105, color: '#789164',
    dialogue: [
      'Welcome home, {player}! The roads lead to all sorts of birthday adventures.',
      'Take your time exploring. Lumbridge Castle will be here when you return.'
    ]
  },
  {
    name: 'Rowan the Traveller', x: WORLD_SPAWN.x + 185, y: WORLD_SPAWN.y + 60, color: '#9b7659',
    dialogue: [
      'Happy 30th! You can visit the quests in any order you like.',
      'The world map is handy for choosing a distant destination.'
    ]
  },
  {
    name: 'Edith the Caretaker', x: QUEST_LOCATIONS[0].x - 250, y: QUEST_LOCATIONS[0].y - 10, color: '#766b7f',
    dialogue: [
      'I keep hearing creaks from the old escape room. I hope they are just the floorboards.',
      'Mara knows the warding runes. Perhaps she can help you get inside.'
    ]
  },
  {
    name: 'Nell the Archer', x: QUEST_LOCATIONS[1].x + 285, y: QUEST_LOCATIONS[1].y - 5, color: '#648064',
    dialogue: [
      'A steady hand helps with archery and pool alike. Welcome to Lucky Chucks!',
      'Chuck has a trick shot waiting if you fancy a challenge.'
    ]
  },
  {
    name: 'Finn the Attendant', x: QUEST_LOCATIONS[2].x + 180, y: QUEST_LOCATIONS[2].y + 130, color: '#a76b50',
    dialogue: [
      'Welcome to the park! Listen carefully on Thirteen; the drop can surprise you.',
      'There is plenty to see here, even if you keep both feet on the ground.'
    ]
  },
  {
    name: 'Fern the Ranger', x: QUEST_LOCATIONS[3].x - 180, y: QUEST_LOCATIONS[3].y + 60, color: '#5d8279',
    dialogue: [
      'The lanterns make the canopy feel magical after dark, don’t they?',
      'Ash can show you the way to the zip-line challenge.'
    ]
  },
  {
    name: 'Holly the Pumpkin Keeper', x: QUEST_LOCATIONS[4].x + 190, y: QUEST_LOCATIONS[4].y - 85, color: '#a97144',
    dialogue: [
      'Mind the corn! This maze has more turns than my pumpkin patch.',
      'There are seven clues to find in the maze, and seven mechanisms to solve.'
    ]
  }
]);
