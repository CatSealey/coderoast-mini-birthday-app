import test from 'node:test';
import assert from 'node:assert/strict';
import { abigailPath } from '../js/games/abigail-path.js';
import { interactAbigail, moveAbigail, newAbigailState } from '../js/games/abigail-logic.js';

test('paths avoid objects, reach destinations, and approach interactable objects', () => {
  let state = newAbigailState();
  const path = abigailPath(state, { x: 5, y: 1 }, true);
  assert.ok(path.length > 0);
  path.forEach((direction) => { state = moveAbigail(state, direction); });
  assert.equal(Math.abs(state.player.x - 5) + Math.abs(state.player.y - 1), 1);
  state = interactAbigail(state, 'doll');
  assert.equal(state.hasKey, true);
  assert.deepEqual(abigailPath(state, state.player), []);
  assert.equal(abigailPath(state, { x: 10, y: 10 }), null);
});
