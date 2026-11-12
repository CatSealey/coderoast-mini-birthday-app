const musicBase = `${import.meta.env?.BASE_URL || '/'}music/`;
export const AREA_TRACKS = Object.freeze({
  home: Object.freeze({ file: `${musicBase}home.mp3`, title: 'Footloose — Kenny Loggins' }),
  escape: Object.freeze({ file: `${musicBase}abigail.mp3`, title: 'Talking Body — Tove Lo' }),
  town: Object.freeze({ file: `${musicBase}lucky-chucks.mp3`, title: 'Addicted — Haley Joelle' }),
  park: Object.freeze({ file: `${musicBase}thirteen.mp3`, title: 'Ocean Eyes — Billie Eilish' }),
  forest: Object.freeze({ file: `${musicBase}goape.mp3`, title: 'Stay — Rihanna' }),
  harvest: Object.freeze({ file: `${musicBase}fright-nights.mp3`, title: 'Take on the World — You Me At Six' })
});

const happyBirthdayNotes = [
  [392, 0.18], [392, 0.18], [440, 0.36], [392, 0.36], [523, 0.36], [494, 0.72],
  [392, 0.18], [392, 0.18], [440, 0.36], [392, 0.36], [587, 0.36], [523, 0.72],
  [392, 0.18], [392, 0.18], [784, 0.36], [659, 0.36], [523, 0.36], [494, 0.36], [440, 0.72],
  [698, 0.18], [698, 0.18], [659, 0.36], [523, 0.36], [587, 0.36], [523, 0.84]
];

export function createAudioController(button, environment = window, { settingsButton, onStatus = () => {} } = {}) {
  const AudioContextConstructor = environment.AudioContext || environment.webkitAudioContext;
  const icon = button.querySelector('#audioIcon');
  const label = button.querySelector('#audioText');
  const track = new environment.Audio();
  track.loop = true;
  track.preload = 'none';
  track.volume = 0.35;
  let context = null;
  let timer = 0;
  let playing = false;
  let userChoseMusic = false;
  let celebrationPrepared = false;
  let celebrationActive = false;
  let celebrationAutoEnabled = false;
  let celebrationGeneration = 0;
  let noteIndex = 0;
  let disposed = false;
  let area = 'home';
  let trackArea = null;
  let musicGeneration = 0;
  let reportedFailureGeneration = -1;
  const musicVoices = new Set();

  function reportTrackFailure(generation, error) {
    if (disposed || generation !== musicGeneration || reportedFailureGeneration === generation) return;
    reportedFailureGeneration = generation;
    trackArea = null;
    onStatus(`Could not play ${AREA_TRACKS[area].title}. Check the music file and try again.`, error);
  }

  function handleTrackError() {
    if (playing && !celebrationActive && track.error) {
      reportTrackFailure(musicGeneration, new Error(track.error.message || `Media error ${track.error.code}`));
    }
  }
  track.addEventListener('error', handleTrackError);

  function tone(frequency, duration, waveform = 'sine', volume = 0.07, delay = 0, music = false) {
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    if (music) {
      musicVoices.add(oscillator);
      oscillator.onended = () => musicVoices.delete(oscillator);
    }
    oscillator.start(start);
    oscillator.stop(start + duration);
  }

  function playSound(effect) {
    if (!context || context.state !== 'running') return;
    if (effect === 'success') {
      [523, 659, 784].forEach((frequency, index) => {
        tone(frequency, 0.22, 'triangle', 0.1, index * 0.07);
      });
    } else if (effect === 'error') {
      tone(180, 0.16, 'triangle', 0.06);
    } else if (effect === 'levelUp') {
      [392, 494, 587, 784, 988].forEach((frequency, index) => {
        tone(frequency, 0.24, 'sine', 0.1, index * 0.09);
      });
    } else {
      tone(370, 0.045, 'square', 0.025);
    }
  }

  function updateButton() {
    button.setAttribute('aria-pressed', String(playing));
    icon.textContent = playing ? '🔊' : '🎵';
    label.textContent = playing ? (celebrationActive ? 'Happy Birthday playing' : 'Music on') : 'Music off';
    if (settingsButton) {
      settingsButton.setAttribute('aria-pressed', String(playing));
      settingsButton.textContent = playing ? 'Music: On' : 'Music: Off';
    }
  }

  function stopMusic() {
    musicGeneration += 1;
    track.pause();
    environment.clearTimeout(timer);
    timer = 0;
    for (const oscillator of musicVoices) oscillator.stop();
    musicVoices.clear();
  }

  function startMusic() {
    stopMusic();
    noteIndex = 0;
    if (!playing || disposed) {
      onStatus('Music is off.');
      return;
    }
    if (!celebrationActive) {
      const current = AREA_TRACKS[area];
      const generation = musicGeneration;
      if (trackArea !== area) {
        track.src = current.file;
        trackArea = area;
      }
      onStatus(`Starting ${current.title}…`);
      let playback;
      try {
        playback = track.play();
      } catch (error) {
        reportTrackFailure(generation, error);
        return;
      }
      Promise.resolve(playback).then(() => {
        if (!disposed && generation === musicGeneration && reportedFailureGeneration !== generation) {
          onStatus(`Playing ${current.title}.`, null, current.title);
        }
      }).catch((error) => {
        reportTrackFailure(generation, error);
      });
      return;
    }
    onStatus('Starting Happy Birthday…');
    if (!context || context.state !== 'running') return;
    onStatus('Playing Happy Birthday.', null, 'Happy Birthday');
    const playNext = () => {
      if (!playing || !context || context.state !== 'running') return;
      if (celebrationActive && noteIndex === happyBirthdayNotes.length) {
        stopBirthdayCelebration();
        return;
      }
      const [frequency, duration] = happyBirthdayNotes[noteIndex];
      tone(frequency, duration * 0.9, 'triangle', 0.045, 0, true);
      noteIndex += 1;
      timer = environment.setTimeout(playNext, duration * 1000);
    };
    playNext();
  }

  async function ensureContext() {
    if (!AudioContextConstructor) throw new Error('The audio context is unavailable.');
    if (!context) context = new AudioContextConstructor();
    if (context.state === 'suspended') await context.resume();
    if (context.state !== 'running') throw new Error('The audio context could not be started.');
  }

  async function toggleMusic() {
    userChoseMusic = true;
    playing = !playing;
    updateButton();
    if (playing) {
      if (!celebrationActive) startMusic();
      try {
        await ensureContext();
      } catch (error) {
        playing = false;
        stopMusic();
        updateButton();
        throw error;
      }
      if (!disposed && playing && celebrationActive) startMusic();
    } else {
      stopMusic();
      onStatus('Music is off.');
    }
  }

  function setArea(nextArea) {
    if (!Object.hasOwn(AREA_TRACKS, nextArea)) throw new Error(`Unknown music area: ${nextArea}`);
    if (area === nextArea) return;
    area = nextArea;
    if (playing && !celebrationActive) startMusic();
  }

  async function prepareBirthdayCelebration() {
    const generation = ++celebrationGeneration;
    celebrationPrepared = true;
    if (!AudioContextConstructor || (userChoseMusic && !playing)) return;
    try {
      await ensureContext();
    } catch (error) {
      if (generation === celebrationGeneration) celebrationPrepared = false;
      throw error;
    }
    if (!disposed && generation === celebrationGeneration && celebrationPrepared && celebrationActive && playing) startMusic();
  }

  function startBirthdayCelebration() {
    if (!celebrationPrepared || !AudioContextConstructor) return;
    celebrationActive = true;
    celebrationAutoEnabled = !userChoseMusic;
    if (celebrationAutoEnabled) playing = true;
    updateButton();
    startMusic();
  }

  function stopBirthdayCelebration() {
    if (!celebrationPrepared) return;
    celebrationGeneration += 1;
    celebrationPrepared = false;
    const wasActive = celebrationActive;
    celebrationActive = false;
    if (celebrationAutoEnabled && !userChoseMusic) playing = false;
    celebrationAutoEnabled = false;
    if (wasActive) {
      updateButton();
      startMusic();
    }
  }

  function finishBirthdayCelebration() {
    if (!celebrationActive || !playing || !timer) stopBirthdayCelebration();
  }

  function dispose() {
    disposed = true;
    stopMusic();
    track.removeEventListener('error', handleTrackError);
    if (context && context.state !== 'closed') void context.close();
  }

  updateButton();
  onStatus('Music is off.');
  return { playSound, toggleMusic, setArea, prepareBirthdayCelebration, startBirthdayCelebration, finishBirthdayCelebration, stopBirthdayCelebration, dispose };
}
