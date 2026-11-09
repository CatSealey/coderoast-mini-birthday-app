const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

const birthdayNotes = [
  [523, 0.18], [659, 0.18], [784, 0.28], [659, 0.18],
  [587, 0.18], [698, 0.18], [880, 0.34], [784, 0.3],
  [523, 0.18], [659, 0.18], [784, 0.28], [1047, 0.38]
];

export function createAudioController(button) {
  const icon = button.querySelector('#audioIcon');
  const label = button.querySelector('#audioText');
  let context = null;
  let interval = 0;
  let playing = false;
  let noteIndex = 0;

  if (!AudioContextConstructor) {
    button.disabled = true;
    label.textContent = 'Audio unavailable';
  }

  function tone(frequency, duration, waveform = 'sine', volume = 0.07, delay = 0) {
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

  async function toggleMusic() {
    if (!AudioContextConstructor) return;
    if (!context) context = new AudioContextConstructor();
    if (context.state === 'suspended') await context.resume();

    playing = !playing;
    button.setAttribute('aria-pressed', String(playing));
    if (playing) {
      icon.textContent = '🔊';
      label.textContent = 'Birthday tune playing';
      interval = window.setInterval(() => {
        const [frequency, duration] = birthdayNotes[noteIndex % birthdayNotes.length];
        tone(frequency, duration, 'triangle', 0.045);
        noteIndex += 1;
      }, 220);
    } else {
      window.clearInterval(interval);
      icon.textContent = '🎵';
      label.textContent = 'Play birthday tune';
    }
  }

  function dispose() {
    window.clearInterval(interval);
    if (context && context.state !== 'closed') void context.close();
  }

  return { playSound, toggleMusic, dispose };
}
