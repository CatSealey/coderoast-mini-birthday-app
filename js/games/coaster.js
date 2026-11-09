const ROUNDS_TO_WIN = 3;
const WINDOW_MS = 1100;

export function mountCoasterGame(root, onComplete, playSound) {
  let round = 0;
  let phase = 'ready';
  let startTime = 0;
  let timeout = 0;
  let frame = 0;
  let disposed = false;
  const reactions = [];

  root.innerHTML = `
    <section class="mini-game coaster-game">
      <header class="mini-game__header">
        <p class="eyebrow">Alton Towers · Thirteen</p>
        <h3>The drop you didn't see coming</h3>
        <p>Wait for the vault doors to open. Hit the button as soon as the track drops.</p>
      </header>
      <div class="coaster-scene" id="coasterScene">
        <div class="coaster-skyline" aria-hidden="true">✦ &nbsp; ✧ &nbsp; ✦</div>
        <div class="coaster-track" aria-hidden="true"><span></span></div>
        <div class="coaster-cart" id="coasterCart" aria-hidden="true">🎢</div>
        <p class="coaster-callout" id="coasterCallout">Climbing…</p>
        <div class="coaster-timer"><span id="coasterTimer"></span></div>
      </div>
      <div class="game-stat-row">
        <span id="coasterRound">Drop 1 of ${ROUNDS_TO_WIN}</span>
        <span id="coasterBest">Best reaction: —</span>
      </div>
      <button type="button" class="rs3-btn game-control game-action coaster-button" id="dropButton">Wait for the drop…</button>
      <p class="game-status" id="coasterStatus" aria-live="polite">Don't blink. The first climb is starting.</p>
      <p class="game-hint">Keyboard: press <kbd>Space</kbd> when the track drops.</p>
    </section>
  `;

  const scene = root.querySelector('#coasterScene');
  const cart = root.querySelector('#coasterCart');
  const callout = root.querySelector('#coasterCallout');
  const timerBar = root.querySelector('#coasterTimer');
  const roundLabel = root.querySelector('#coasterRound');
  const bestLabel = root.querySelector('#coasterBest');
  const status = root.querySelector('#coasterStatus');
  const button = root.querySelector('#dropButton');

  function startRound() {
    if (disposed) return;
    phase = 'climbing';
    button.disabled = false;
    button.textContent = 'Wait for the drop…';
    scene.classList.remove('coaster-scene--drop');
    cart.classList.remove('coaster-cart--drop');
    timerBar.style.transform = 'scaleX(0)';
    callout.textContent = 'Climbing…';
    status.textContent = 'Wait for the track to drop. Press too early and you miss the moment.';
    timeout = window.setTimeout(() => {
      if (disposed) return;
      phase = 'drop';
      startTime = performance.now();
      scene.classList.add('coaster-scene--drop');
      cart.classList.add('coaster-cart--drop');
      callout.textContent = 'NOW!';
      button.textContent = 'DROP! PRESS NOW!';
      playSound('success');
      frame = requestAnimationFrame(updateTimer);
      timeout = window.setTimeout(() => resolveDrop(false), WINDOW_MS);
    }, 1700 + Math.random() * 2100);
  }

  function updateTimer(now) {
    if (disposed || phase !== 'drop') return;
    const remaining = Math.max(0, 1 - (now - startTime) / WINDOW_MS);
    timerBar.style.transform = `scaleX(${remaining})`;
    frame = requestAnimationFrame(updateTimer);
  }

  function resolveDrop(pressed) {
    if (phase !== 'drop') {
      if (phase === 'climbing') {
        window.clearTimeout(timeout);
        phase = 'missed';
        button.disabled = true;
        status.textContent = 'Too early! The vault is still climbing. The ride resets…';
        playSound('click');
        timeout = window.setTimeout(startRound, 800);
      }
      return;
    }

    window.clearTimeout(timeout);
    cancelAnimationFrame(frame);
    const reaction = performance.now() - startTime;
    if (!pressed || reaction > WINDOW_MS) {
      phase = 'missed';
      button.disabled = true;
      status.textContent = 'The drop got away from you. Catch your breath — you get another go.';
      timeout = window.setTimeout(startRound, 950);
      return;
    }

    reactions.push(Math.round(reaction));
    round += 1;
    playSound('success');
    if (round === ROUNDS_TO_WIN) {
      status.textContent = `Three drops caught! Your quickest reaction was ${Math.min(...reactions)} ms.`;
      onComplete();
      return;
    }
    phase = 'caught';
    roundLabel.textContent = `Drop ${round + 1} of ${ROUNDS_TO_WIN}`;
    bestLabel.textContent = `Best reaction: ${Math.min(...reactions)} ms`;
    status.textContent = `Got it in ${Math.round(reaction)} ms! The next drop is coming…`;
    button.disabled = true;
    timeout = window.setTimeout(startRound, 1050);
  }

  button.addEventListener('click', () => resolveDrop(true));
  const onKeyDown = (event) => {
    if (event.code === 'Space' || event.code === 'Enter') {
      if (event.target instanceof HTMLInputElement) return;
      event.preventDefault();
      resolveDrop(true);
    }
  };
  window.addEventListener('keydown', onKeyDown);
  startRound();

  return () => {
    disposed = true;
    window.clearTimeout(timeout);
    cancelAnimationFrame(frame);
    window.removeEventListener('keydown', onKeyDown);
  };
}
