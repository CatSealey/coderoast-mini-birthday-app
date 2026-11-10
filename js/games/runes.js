import { createRuneSequence, RUNE_GLYPHS } from './logic.js';

const RUNE_NAMES = ['Star', 'Moon', 'Diamond', 'Spark'];
const ROUND_LENGTHS = [3, 4, 5];

export function mountRuneGame(root, onComplete, playSound) {
  let round = 0;
  let pattern = [];
  let inputIndex = 0;
  let locked = true;
  let disposed = false;
  const timers = new Set();

  root.innerHTML = `
    <section class="mini-game rune-game">
      <header class="mini-game__header">
        <p class="eyebrow">Kettering · Abigail's room</p>
        <h3>Remember the warding runes</h3>
        <p>Watch the sequence, then repeat it. Each round adds one rune.</p>
      </header>
      <div class="game-stat-row">
        <span id="runeRound">Round 1 of 3</span>
        <span id="runeProgress">0 / 3 remembered</span>
      </div>
      <div class="rune-sequence" id="runeSequence" aria-hidden="true">✦ &nbsp; ? &nbsp; ? &nbsp; ?</div>
      <div class="rune-grid" role="group" aria-label="Warding runes">
        ${RUNE_GLYPHS.map((glyph, index) => `
          <button type="button" class="rune-tile game-control" data-rune="${index}" aria-label="${RUNE_NAMES[index]} rune" disabled>
            <span aria-hidden="true">${glyph}</span><small>${RUNE_NAMES[index]}</small>
          </button>
        `).join('')}
      </div>
      <p class="game-status" id="runeStatus" aria-live="polite">Watch closely…</p>
      <button type="button" class="rs3-btn game-control game-action" data-action="replay">Show sequence again</button>
    </section>
  `;

  const status = root.querySelector('#runeStatus');
  const progress = root.querySelector('#runeProgress');
  const roundLabel = root.querySelector('#runeRound');
  const sequenceDisplay = root.querySelector('#runeSequence');
  const runeButtons = [...root.querySelectorAll('[data-rune]')];

  function later(callback, delay) {
    const timer = setTimeout(() => {
      timers.delete(timer);
      if (!disposed) callback();
    }, delay);
    timers.add(timer);
  }

  function showPattern() {
    locked = true;
    inputIndex = 0;
    progress.textContent = `0 / ${pattern.length} remembered`;
    status.textContent = 'Watch closely…';
    runeButtons.forEach((button) => {
      button.disabled = true;
      button.classList.remove('rune-tile--lit');
    });

    pattern.forEach((rune, index) => {
      later(() => {
        runeButtons.forEach((button) => button.classList.remove('rune-tile--lit'));
        runeButtons[rune].classList.add('rune-tile--lit');
        sequenceDisplay.textContent = `${RUNE_GLYPHS[rune]}   ${index + 1} / ${pattern.length}`;
        playSound('click');
      }, 450 + index * 780);
      later(() => runeButtons[rune].classList.remove('rune-tile--lit'), 850 + index * 780);
    });

    later(() => {
      locked = false;
      runeButtons.forEach((button) => { button.disabled = false; });
      sequenceDisplay.textContent = `${pattern.length} runes to remember`;
      status.textContent = 'Your turn — repeat the runes in order.';
    }, 450 + pattern.length * 780);
  }

  function startRound() {
    pattern = createRuneSequence(ROUND_LENGTHS[round]);
    inputIndex = 0;
    roundLabel.textContent = `Round ${round + 1} of ${ROUND_LENGTHS.length}`;
    sequenceDisplay.textContent = 'Get ready…';
    showPattern();
  }

  root.addEventListener('click', (event) => {
    const replayButton = event.target.closest('[data-action="replay"]');
    if (replayButton && !locked) {
      showPattern();
      return;
    }

    const runeButton = event.target.closest('[data-rune]');
    if (!runeButton || locked) return;
    playSound('click');

    const selectedRune = Number(runeButton.dataset.rune);
    if (selectedRune !== pattern[inputIndex]) {
      locked = true;
      inputIndex = 0;
      progress.textContent = `0 / ${pattern.length} remembered`;
      status.textContent = 'That rune was out of order. Take a breath and try this round again.';
      runeButtons.forEach((button) => { button.disabled = true; });
      later(showPattern, 900);
      return;
    }

    inputIndex += 1;
    progress.textContent = `${inputIndex} / ${pattern.length} remembered`;
    runeButton.classList.add('rune-tile--lit');
    later(() => runeButton.classList.remove('rune-tile--lit'), 180);

    if (inputIndex < pattern.length) return;
    playSound('success');
    round += 1;
    if (round === ROUND_LENGTHS.length) {
      onComplete();
      return;
    }
    locked = true;
    status.textContent = 'Perfect! The ward is weakening…';
    later(startRound, 850);
  });

  startRound();
  return () => {
    disposed = true;
    timers.forEach(clearTimeout);
    timers.clear();
  };
}
