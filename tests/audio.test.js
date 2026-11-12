import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioController } from '../js/audio.js';

function audioFixture({ failResume = false, resumePromise = null } = {}) {
  const notes = [], timers = new Map(), voices = [], contexts = [];
  let nextTimer = 1;
  const icon = {}, label = {};
  const button = {
    disabled: false, attributes: {},
    querySelector(selector) { return selector === '#audioIcon' ? icon : label; },
    setAttribute(name, value) { this.attributes[name] = value; }
  };
  class AudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; contexts.push(this); }
    async resume() {
      if (failResume) throw new Error('Audio blocked');
      if (resumePromise) await resumePromise;
      this.state = 'running';
    }
    async close() { this.state = 'closed'; }
    createOscillator() {
      const voice = {
        frequency: { setValueAtTime(value) { notes.push(value); } },
        connect() {}, start() {}, stop() { this.stopped = true; }
      };
      voices.push(voice);
      return voice;
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  }
  const environment = {
    AudioContext,
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  const audio = createAudioController(button, environment);
  return {
    audio, button, label, notes, voices, timers, contexts,
    nextNote() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      timer.callback();
      return timer.delay;
    }
  };
}

test('cake arrival plays Happy Birthday once and restores initially silent music', async () => {
  const { audio, button, label, notes, voices, timers, nextNote } = audioFixture();
  await audio.prepareBirthdayCelebration();
  assert.deepEqual(notes, []);
  audio.startBirthdayCelebration();
  assert.equal(button.attributes['aria-pressed'], 'true');
  assert.equal(label.textContent, 'Happy Birthday playing');
  assert.equal(nextNote(), 180);
  for (let i = 0; i < 23; i += 1) nextNote();
  assert.deepEqual(notes, [
    392, 392, 440, 392, 523, 494, 392, 392, 440, 392, 587, 523,
    392, 392, 784, 659, 523, 494, 440, 698, 698, 659, 523, 587, 523
  ]);
  nextNote();
  assert.equal(notes.length, 25);
  assert.equal(timers.size, 0);
  assert.equal(button.attributes['aria-pressed'], 'false');
  audio.stopBirthdayCelebration();
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(timers.size, 0);
  assert.ok(voices.every((voice) => voice.stopped));
  audio.dispose();
});

test('the melody finishes after dialogue ends and restores previously enabled music', async () => {
  const { audio, notes, button, nextNote } = audioFixture();
  await audio.toggleMusic();
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  audio.finishBirthdayCelebration();
  assert.equal(button.attributes['aria-pressed'], 'true');
  for (let i = 0; i < 25; i += 1) nextNote();
  assert.equal(notes.length, 27);
  assert.equal(notes.at(-1), 523);
  assert.equal(button.attributes['aria-pressed'], 'true');
  audio.dispose();
});

test('celebration temporarily replaces enabled music and respects an explicit mute', async () => {
  const { audio, button, notes, timers } = audioFixture();
  await audio.toggleMusic();
  assert.equal(notes.at(-1), 523);
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  assert.equal(notes.at(-1), 392);
  audio.stopBirthdayCelebration();
  assert.equal(notes.at(-1), 523);
  assert.equal(button.attributes['aria-pressed'], 'true');
  await audio.toggleMusic();
  const count = notes.length;
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  assert.equal(notes.length, count);
  assert.equal(timers.size, 0);
  assert.equal(button.attributes['aria-pressed'], 'false');
  await audio.toggleMusic();
  assert.equal(notes.at(-1), 392);
  audio.stopBirthdayCelebration();
  assert.equal(notes.at(-1), 523);
  audio.dispose();
});

test('muting auto-started celebration music stops it and remains muted on replay', async () => {
  const { audio, notes, timers, button } = audioFixture();
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  await audio.toggleMusic();
  assert.equal(timers.size, 0);
  audio.stopBirthdayCelebration();
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  assert.deepEqual(notes, [392]);
  assert.equal(button.attributes['aria-pressed'], 'false');
  audio.dispose();
});

test('audio failures propagate without presenting music as playing', async () => {
  const { audio, button } = audioFixture({ failResume: true });
  await assert.rejects(audio.prepareBirthdayCelebration(), /Audio blocked/);
  audio.startBirthdayCelebration();
  assert.notEqual(button.attributes['aria-pressed'], 'true');
  await assert.rejects(audio.toggleMusic(), /Audio blocked/);
  assert.equal(button.attributes['aria-pressed'], 'false');
  audio.dispose();
});

test('a late audio resume does not restart a celebration that has ended', async () => {
  let resolveResume;
  const resumePromise = new Promise((resolve) => { resolveResume = resolve; });
  const { audio, notes, timers, button } = audioFixture({ resumePromise });
  const preparation = audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  audio.stopBirthdayCelebration();
  resolveResume();
  await preparation;
  assert.deepEqual(notes, []);
  assert.equal(timers.size, 0);
  assert.equal(button.attributes['aria-pressed'], 'false');
  audio.dispose();
});
