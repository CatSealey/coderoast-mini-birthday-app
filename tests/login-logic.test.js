import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLogin } from '../js/login-logic.js';

test('login requires a configured password, a valid name, and a matching password', () => {
  assert.match(validateLogin('Player', 'guess', '').error, /not been configured/);
  assert.match(validateLogin(' ', 'shared', 'shared').error, /character name/i);
  assert.match(validateLogin('x'.repeat(21), 'shared', 'shared').error, /character name/i);
  assert.match(validateLogin('A\nB', 'shared', 'shared').error, /character name/i);
  assert.match(validateLogin('Player', 'wrong', 'shared').error, /incorrect password/i);
  assert.deepEqual(validateLogin('  Player One  ', 'shared', 'shared'), { characterName: 'Player One' });
  assert.deepEqual(validateLogin('<Player>', 'shared', 'shared'), { characterName: '<Player>' });
});
