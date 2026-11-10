import test from 'node:test';
import assert from 'node:assert/strict';
import { speechBubblePosition } from '../js/world/speech-bubble.js';

test('speech bubbles follow their speaker while remaining inside the viewport', () => {
  const viewport = { width: 400, height: 300 };
  const bubble = { width: 200, height: 80 };
  assert.deepEqual(speechBubblePosition({ x: 200, y: 200 }, viewport, bubble), { x: 100, y: 110, tailX: 100 });
  assert.deepEqual(speechBubblePosition({ x: 15, y: 50 }, viewport, bubble), { x: 8, y: 8, tailX: 12 });
  assert.deepEqual(speechBubblePosition({ x: 390, y: 295 }, viewport, bubble), { x: 192, y: 205, tailX: 188 });
});
