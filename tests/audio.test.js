import test from 'node:test';
import assert from 'node:assert/strict';
import { AREA_TRACKS, createAudioController } from '../js/audio.js';

function audioFixture({ failResume = false, resumePromise = null, play = () => Promise.resolve() } = {}) {
  const notes = [], timers = new Map(), voices = [], contexts = [], media = [], statuses = [];
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
    Audio: class {
      constructor() { this._src = ''; this.loads = []; this.plays = []; this.paused = true; media.push(this); }
      set src(value) { this._src = value; this.loads.push(value); }
      get src() { return this._src; }
      play() { this.paused = false; this.plays.push(this.src); return play(this.src); }
      pause() { this.paused = true; }
      addEventListener(type, handler) { if (type === 'error') this.onError = handler; }
      removeEventListener() { this.onError = null; }
    },
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  const settingsButton = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
  const audio = createAudioController(button, environment, {
    settingsButton, onStatus(message, error, title) { statuses.push({ message, error, title }); }
  });
  return {
    audio, button, settingsButton, label, notes, voices, timers, contexts, media: media[0], statuses,
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
  const { audio, notes, button, media, nextNote } = audioFixture();
  await audio.toggleMusic();
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  audio.finishBirthdayCelebration();
  assert.equal(button.attributes['aria-pressed'], 'true');
  for (let i = 0; i < 25; i += 1) nextNote();
  assert.equal(notes.length, 25);
  assert.equal(media.plays.length, 2);
  assert.equal(media.paused, false);
  assert.equal(button.attributes['aria-pressed'], 'true');
  audio.dispose();
});

test('celebration replaces enabled music and plays even after an explicit mute', async () => {
  const { audio, button, notes, timers, media, nextNote } = audioFixture();
  await audio.toggleMusic();
  assert.equal(media.plays.at(-1), AREA_TRACKS.home.file);
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  assert.equal(notes.at(-1), 392);
  assert.equal(media.paused, true);
  audio.stopBirthdayCelebration();
  assert.equal(media.plays.at(-1), AREA_TRACKS.home.file);
  assert.equal(button.attributes['aria-pressed'], 'true');
  await audio.toggleMusic();
  const count = notes.length;
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  assert.equal(notes.length, count + 1);
  assert.equal(notes.at(-1), 392);
  assert.equal(button.attributes['aria-pressed'], 'true');
  for (let i = 0; i < 25; i += 1) nextNote();
  assert.equal(timers.size, 0);
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(media.paused, true);
  assert.equal(media.plays.length, 2);
  audio.dispose();
});

test('area music switches tracks and both music controls stay in sync', async () => {
  const { audio, button, settingsButton, media } = audioFixture();
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(settingsButton.textContent, 'Music: Off');
  await audio.toggleMusic();
  assert.equal(media.loop, true);
  assert.equal(media.plays.at(-1), AREA_TRACKS.home.file);
  assert.equal(button.attributes['aria-pressed'], 'true');
  assert.equal(settingsButton.attributes['aria-pressed'], 'true');
  for (const area of ['escape', 'town', 'park', 'forest', 'harvest', 'home']) {
    audio.setArea(area);
    assert.equal(media.plays.at(-1), AREA_TRACKS[area].file);
  }
  const count = media.plays.length;
  audio.setArea('home');
  assert.equal(media.plays.length, count);
  await audio.toggleMusic();
  assert.equal(media.paused, true);
  assert.equal(settingsButton.textContent, 'Music: Off');
  audio.setArea('town');
  assert.equal(media.plays.length, count);
  await audio.toggleMusic();
  assert.equal(media.plays.at(-1), AREA_TRACKS.town.file);
  assert.throws(() => audio.setArea('unknown'), /Unknown music area/);
  audio.dispose();
});

test('now-playing title follows playback, area changes, celebration and mute', async () => {
  const { audio, statuses } = audioFixture();
  await audio.toggleMusic();
  assert.equal(statuses.at(-1).title, AREA_TRACKS.home.title);
  for (const area of ['escape', 'town', 'park', 'forest', 'harvest']) {
    audio.setArea(area);
    await Promise.resolve();
    assert.equal(statuses.at(-1).title, AREA_TRACKS[area].title);
  }
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  assert.equal(statuses.at(-1).title, 'Happy Birthday');
  audio.stopBirthdayCelebration();
  await Promise.resolve();
  assert.equal(statuses.at(-1).title, AREA_TRACKS.harvest.title);
  await audio.toggleMusic();
  assert.equal(statuses.at(-1).title, undefined);
  audio.dispose();
});

test('missing tracks report an error and stale playback failures do not replace the current status', async () => {
  let rejectOld;
  const firstPlay = new Promise((resolve, reject) => { rejectOld = reject; });
  const { audio, statuses } = audioFixture({
    play: (src) => src === AREA_TRACKS.home.file ? firstPlay : Promise.reject(new Error('File unavailable'))
  });
  await audio.toggleMusic();
  audio.setArea('town');
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(statuses.at(-1).message, /Could not play Addicted/);
  assert.match(statuses.at(-1).error.message, /File unavailable/);
  assert.equal(statuses.at(-1).title, undefined);
  rejectOld(new Error('Old playback failed'));
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(statuses.at(-1).error.message, /File unavailable/);
  await audio.toggleMusic();
  assert.equal(statuses.at(-1).message, 'Music is off.');
  audio.dispose();
});

test('changing area during the birthday melody resumes the new area afterwards', async () => {
  const { audio, media } = audioFixture();
  await audio.toggleMusic();
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  audio.setArea('forest');
  assert.equal(media.paused, true);
  assert.equal(media.plays.length, 1);
  audio.stopBirthdayCelebration();
  assert.equal(media.plays.at(-1), AREA_TRACKS.forest.file);
  audio.dispose();
});

test('a later media error is reported without falsely showing the track as playing', async () => {
  const { audio, media, statuses } = audioFixture();
  await audio.toggleMusic();
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(statuses.at(-1).message, /Playing Footloose/);
  media.error = { code: 3, message: 'Decoding failed' };
  media.onError();
  assert.match(statuses.at(-1).message, /Could not play Footloose/);
  assert.match(statuses.at(-1).error.message, /Decoding failed/);
  await audio.toggleMusic();
  await audio.toggleMusic();
  assert.deepEqual(media.loads, [AREA_TRACKS.home.file, AREA_TRACKS.home.file]);
  audio.dispose();
});

test('muting an active celebration stops it, and a later celebration can play', async () => {
  const { audio, notes, timers, button, nextNote } = audioFixture();
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  await audio.toggleMusic();
  assert.equal(timers.size, 0);
  audio.stopBirthdayCelebration();
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  assert.deepEqual(notes, [392, 392]);
  for (let i = 0; i < 25; i += 1) nextNote();
  assert.equal(button.attributes['aria-pressed'], 'false');
  audio.dispose();
});

test('enabling music during a previously muted celebration keeps it on afterwards', async () => {
  const { audio, button, media, nextNote } = audioFixture();
  await audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  await audio.toggleMusic();
  await audio.toggleMusic();
  for (let i = 0; i < 25; i += 1) nextNote();
  assert.equal(button.attributes['aria-pressed'], 'true');
  assert.equal(media.paused, false);
  assert.equal(media.plays.at(-1), AREA_TRACKS.home.file);
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

test('a late preparation failure restores the muted setting', async () => {
  let rejectResume;
  const resumePromise = new Promise((resolve, reject) => { rejectResume = reject; });
  const { audio, button, settingsButton, notes, timers } = audioFixture({ resumePromise });
  const preparation = audio.prepareBirthdayCelebration();
  audio.startBirthdayCelebration();
  assert.equal(button.attributes['aria-pressed'], 'true');
  rejectResume(new Error('Audio blocked'));
  await assert.rejects(preparation, /Audio blocked/);
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(settingsButton.textContent, 'Music: Off');
  assert.deepEqual(notes, []);
  assert.equal(timers.size, 0);
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
