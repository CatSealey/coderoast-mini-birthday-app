import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTER_MAPS, renderChapterMap } from '../js/chapter-maps.js';
import { createRuneSequence, evaluatePoolShot, moveMazePlayer } from '../js/games/logic.js';
import { MAZE } from '../js/games/maze.js';

test('rune sequence generation returns valid rune indexes and validates length', () => {
  assert.deepEqual(createRuneSequence(4, () => 0.6), [2, 2, 2, 2]);
  assert.throws(() => createRuneSequence(0), RangeError);
});

test('pool shot scoring rewards a close aim and controlled power', () => {
  assert.equal(evaluatePoolShot(2, 80).success, true);
  assert.equal(evaluatePoolShot(4, 72).success, false);
  assert.equal(evaluatePoolShot(0, 95).success, false);
});

test('maze movement allows open cells and blocks walls and invalid directions', () => {
  const grid = ['#####', '#...#', '#####'];
  const start = { x: 1, y: 1 };
  assert.strictEqual(moveMazePlayer(start, 'up', grid), start);
  assert.deepEqual(moveMazePlayer(start, 'sideways', grid), start);
  assert.strictEqual(moveMazePlayer(start, 'left', grid), start);
  assert.deepEqual(moveMazePlayer(start, 'right', grid), { x: 2, y: 1 });
});

test('Fright Night maze has a route from the start to both the key and exit', () => {
  const start = { x: 1, y: 1 };
  const key = { x: 1, y: 5 };
  const exit = { x: 7, y: 2 };
  const directions = ['up', 'down', 'left', 'right'];
  const queue = [start];
  const visited = new Set([`${start.x},${start.y}`]);

  while (queue.length) {
    const position = queue.shift();
    for (const direction of directions) {
      const next = moveMazePlayer(position, direction, MAZE);
      const keyForPosition = `${next.x},${next.y}`;
      if (next === position || visited.has(keyForPosition)) continue;
      visited.add(keyForPosition);
      queue.push(next);
    }
  }

  assert.equal(visited.has(`${key.x},${key.y}`), true);
  assert.equal(visited.has(`${exit.x},${exit.y}`), true);
});

test('every quest chapter has an accessible map with its own location details', () => {
  assert.equal(CHAPTER_MAPS.length, 5);
  CHAPTER_MAPS.forEach((map, index) => {
    const markup = renderChapterMap(index);
    assert.match(markup, /<svg[^>]+role="img"/);
    assert.match(markup, /Quest route/);
    assert.match(markup, new RegExp(map.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
  assert.throws(() => renderChapterMap(5), RangeError);
});
