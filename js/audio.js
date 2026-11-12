const birthdayNotes = [
  [523, 0.18], [659, 0.18], [784, 0.28], [659, 0.18],
  [587, 0.18], [698, 0.18], [880, 0.34], [784, 0.3],
  [523, 0.18], [659, 0.18], [784, 0.28], [1047, 0.38]
];

const happyBirthdayNotes = [
  [392, 0.18], [392, 0.18], [440, 0.36], [392, 0.36], [523, 0.36], [494, 0.72],
  [392, 0.18], [392, 0.18], [440, 0.36], [392, 0.36], [587, 0.36], [523, 0.72],
  [392, 0.18], [392, 0.18], [784, 0.36], [659, 0.36], [523, 0.36], [494, 0.36], [440, 0.72],
  [698, 0.18], [698, 0.18], [659, 0.36], [523, 0.36], [587, 0.36], [523, 0.84]
];

export function createAudioController(button, environment = window) {
  const AudioContextConstructor = environment.AudioContext || environment.webkitAudioContext;
  const icon = button.querySelector('#audioIcon');
  const label = button.querySelector('#audioText');
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
  const musicVoices = new Set();

  if (!AudioContextConstructor) {
    button.disabled = true;
    label.textContent = 'Audio unavailable';
  }

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
    label.textContent = playing ? (celebrationActive ? 'Happy Birthday playing' : 'Birthday tune playing') : 'Play birthday tune';
  }

  function stopMusic() {
    environment.clearTimeout(timer);
    timer = 0;
    for (const oscillator of musicVoices) oscillator.stop();
    musicVoices.clear();
  }

  function startMusic() {
    stopMusic();
    noteIndex = 0;
    if (!playing || !context || context.state !== 'running') return;
    const playNext = () => {
      if (!playing || !context || context.state !== 'running') return;
      if (celebrationActive && noteIndex === happyBirthdayNotes.length) {
        stopBirthdayCelebration();
        return;
      }
      const notes = celebrationActive ? happyBirthdayNotes : birthdayNotes;
      const [frequency, duration] = notes[noteIndex % notes.length];
      tone(frequency, duration * 0.9, 'triangle', 0.045, 0, true);
      noteIndex += 1;
      timer = environment.setTimeout(playNext, (celebrationActive ? duration : 0.22) * 1000);
    };
    playNext();
  }

  async function ensureContext() {
    if (!context) context = new AudioContextConstructor();
    if (context.state === 'suspended') await context.resume();
    if (context.state !== 'running') throw new Error('The audio context could not be started.');
  }

  async function toggleMusic() {
    if (!AudioContextConstructor) return;
    userChoseMusic = true;
    playing = !playing;
    updateButton();
    if (playing) {
      try {
        await ensureContext();
      } catch (error) {
        playing = false;
        updateButton();
        throw error;
      }
      if (!disposed && playing) startMusic();
    } else {
      stopMusic();
    }
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
    if (context && context.state !== 'closed') void context.close();
  }

  return { playSound, toggleMusic, prepareBirthdayCelebration, startBirthdayCelebration, finishBirthdayCelebration, stopBirthdayCelebration, dispose };
}
