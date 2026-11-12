import test from 'node:test';
import assert from 'node:assert/strict';
import { PACE_DISTANCE, SIDE_QUESTS, restoreSideQuestProgress, sideQuestPosition } from '../js/side-quests.js';
import { createCollision, findCharacterApproach, worldCornWalls, worldObstacles, worldTrees } from '../js/world/world-collision.js';
import { INTERACTION_RANGE, QUEST_LOCATIONS, WORLD_SPAWN } from '../js/world/world-data.js';
import { WORLD_NPCS } from '../js/world/world-npcs.js';

test('side quests preserve the requested titles, scenes and dialogue', () => {
  assert.deepEqual(SIDE_QUESTS.map(({ title }) => title),
    ['Nope.', 'Nervous...', 'How much?!', 'David White', 'What Tickets?']);
  assert.deepEqual(SIDE_QUESTS.map(({ prop }) => prop), ['doll', 'pace', 'cup', 'grave', 'tickets']);
  assert.deepEqual(SIDE_QUESTS.map(({ dialogue }) => dialogue), [
    'I am not going to touch that, you will have to do it!',
    'I thought you were never going to kiss me.',
    '£50 for a cup seems a bit excessive!',
    'Little girl.... little grave!',
    'We had fast track this whole time...'
  ]);
  SIDE_QUESTS.forEach((quest, index) => {
    assert.ok(Math.hypot(quest.x - QUEST_LOCATIONS[index].x, quest.y - QUEST_LOCATIONS[index].y) < 650);
    const npc = WORLD_NPCS.find((character) => character.sideQuest === index);
    assert.equal(npc.name, 'Cat');
    assert.deepEqual(npc.dialogue, [quest.dialogue]);
  });
});

test('side quest completion restores safely for new, old and partially saved games', () => {
  assert.deepEqual(restoreSideQuestProgress(undefined), [false, false, false, false, false]);
  assert.deepEqual(restoreSideQuestProgress([true, false, true, 'true', null]), [true, false, true, false, false]);
  assert.deepEqual(restoreSideQuestProgress([true]), [true, false, false, false, false]);
  assert.notStrictEqual(restoreSideQuestProgress(null), restoreSideQuestProgress(null));
});

test('each scene has a solid, reachable Cat and the pacing area remains solid', () => {
  const collision = createCollision(worldObstacles());
  for (const quest of SIDE_QUESTS) {
    const route = findCharacterApproach(WORLD_SPAWN, quest, collision);
    assert.ok(route?.length, `route to ${quest.title}`);
    const endpoint = route.at(-1);
    assert.ok(!collision.blocked(endpoint));
    assert.ok(Math.hypot(endpoint.x - quest.x, endpoint.y - quest.y) <= INTERACTION_RANGE);
    for (const time of [0, Math.PI * 325, Math.PI * 975]) {
      const position = sideQuestPosition(quest, time);
      assert.ok(collision.blocked(position), `${quest.title} Cat is solid at ${time}`);
      if (quest.prop === 'pace') assert.ok(Math.abs(position.x - quest.x) <= PACE_DISTANCE);
    }
  }
  const grave = SIDE_QUESTS[3];
  assert.ok(collision.blocked({ x: grave.x + 48, y: grave.y }), 'David and the grave are solid');
});

test('trees and corn leave the side quest scenes visible', () => {
  for (const quest of SIDE_QUESTS) {
    assert.ok(worldTrees().every((tree) => Math.abs(tree.x - quest.x) >= 150
      || tree.z <= quest.y - 80 || tree.z >= quest.y + 240), `${quest.title} has a clear foreground`);
  }
  const tickets = SIDE_QUESTS[4];
  assert.ok(worldCornWalls().every((wall) =>
    Math.abs(wall.x - tickets.x) >= (wall.vertical ? 7 : 67.5) + 85
    || wall.y - (wall.vertical ? 67.5 : 7) >= tickets.y + 180
    || wall.y + (wall.vertical ? 67.5 : 7) <= tickets.y - 80));
});
