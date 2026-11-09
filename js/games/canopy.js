const WORLD = { width: 800, height: 360 };
const PLATFORMS = [
  { x: 0, y: 296, width: 155, color: '#78945b' },
  { x: 205, y: 244, width: 122, color: '#72aa91' },
  { x: 374, y: 184, width: 120, color: '#9a82bb' },
  { x: 540, y: 232, width: 122, color: '#60a7ad' },
  { x: 710, y: 296, width: 90, color: '#d3b970' }
];

export function mountCanopyGame(root, onComplete, playSound) {
  let player = { x: 48, y: 268, vx: 0, vy: 0, grounded: true };
  let checkpoint = { x: 48, y: 268 };
  let previousY = player.y;
  let frame = 0;
  let previousTime = 0;
  let disposed = false;
  let won = false;
  const held = new Set();

  root.innerHTML = `
    <section class="mini-game canopy-game">
      <header class="mini-game__header">
        <p class="eyebrow">GoApe · illuminated canopy</p>
        <h3>Make it to the zip-line</h3>
        <p>Run and jump between the glowing platforms. Every landing becomes a checkpoint.</p>
      </header>
      <canvas class="canopy-world" id="canopyWorld" aria-label="Platform game: guide your climber to the zip-line on the right"></canvas>
      <div class="canopy-controls">
        <div class="touch-pad" role="group" aria-label="Movement controls">
          <button type="button" class="rs3-btn game-control" data-hold="left" aria-label="Run left">◀</button>
          <button type="button" class="rs3-btn game-control" data-hold="right" aria-label="Run right">▶</button>
          <button type="button" class="rs3-btn game-control canopy-jump" data-jump aria-label="Jump">JUMP ↗</button>
        </div>
        <p class="game-hint">Keyboard: <kbd>←</kbd>/<kbd>→</kbd> or <kbd>A</kbd>/<kbd>D</kbd> to run, <kbd>Space</kbd>/<kbd>↑</kbd> to jump.</p>
      </div>
      <p class="game-status" id="canopyStatus" aria-live="polite">A running start helps. You can jump again after landing.</p>
    </section>
  `;

  const canvas = root.querySelector('#canopyWorld');
  const context = canvas.getContext('2d');
  const status = root.querySelector('#canopyStatus');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    context.setTransform(canvas.width / WORLD.width, 0, 0, canvas.height / WORLD.height, 0, 0);
    draw();
  }

  function draw() {
    if (disposed) return;
    context.clearRect(0, 0, WORLD.width, WORLD.height);
    const sky = context.createLinearGradient(0, 0, 0, WORLD.height);
    sky.addColorStop(0, '#142333');
    sky.addColorStop(1, '#1b3c3a');
    context.fillStyle = sky;
    context.fillRect(0, 0, WORLD.width, WORLD.height);

    for (let index = 0; index < 22; index += 1) {
      const x = (index * 137 + 43) % WORLD.width;
      const y = (index * 79 + 31) % 205;
      context.beginPath();
      context.arc(x, y, index % 3 === 0 ? 2 : 1.4, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255, 234, 173, .65)';
      context.fill();
    }

    PLATFORMS.forEach((platform) => {
      context.fillStyle = '#493c32';
      context.fillRect(platform.x, platform.y, platform.width, WORLD.height - platform.y);
      context.shadowColor = platform.color;
      context.shadowBlur = 18;
      context.fillStyle = platform.color;
      context.fillRect(platform.x, platform.y, platform.width, 9);
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(255,255,255,.15)';
      context.fillRect(platform.x + 8, platform.y + 13, platform.width - 16, 3);
    });

    context.strokeStyle = '#e8d18c';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(692, 90);
    context.lineTo(785, 56);
    context.stroke();
    context.fillStyle = '#f2d783';
    context.font = '26px sans-serif';
    context.fillText('🪢', 744, 72);
    context.font = '14px sans-serif';
    context.fillText('ZIP-LINE', 720, 42);

    context.font = '26px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('🐒', player.x + 13, player.y + 15);
  }

  function jump() {
    if (player.grounded && !won) {
      player.vy = -425;
      player.grounded = false;
      status.textContent = 'Jumping… steer toward the next glowing platform.';
      playSound('click');
    }
  }

  function update(now) {
    if (disposed) return;
    const dt = Math.min((now - (previousTime || now)) / 1000, 0.032);
    previousTime = now;
    if (!won) {
      const movingLeft = held.has('left');
      const movingRight = held.has('right');
      const wasGrounded = player.grounded;
      player.vx = (Number(movingRight) - Number(movingLeft)) * 220;
      player.x = Math.max(0, Math.min(WORLD.width - 26, player.x + player.vx * dt));
      previousY = player.y;
      player.vy += 980 * dt;
      player.y += player.vy * dt;
      player.grounded = false;

      for (const [platformIndex, platform] of PLATFORMS.entries()) {
        const wasAbove = previousY + 28 <= platform.y;
        const nowAtPlatform = player.y + 28 >= platform.y;
        const overlaps = player.x + 22 > platform.x && player.x + 4 < platform.x + platform.width;
        if (player.vy >= 0 && wasAbove && nowAtPlatform && overlaps) {
          player.y = platform.y - 28;
          player.vy = 0;
          player.grounded = true;
          if (!wasGrounded) {
            if (platformIndex > 0) checkpoint = { x: player.x, y: platform.y - 28 };
            status.textContent = 'Nice landing! Checkpoint reached — keep moving toward the zip-line.';
          }
          if (platform === PLATFORMS[PLATFORMS.length - 1] && player.x > 730) {
            won = true;
            status.textContent = 'You made it! Zip-line unlocked — what a view.';
            playSound('success');
            onComplete();
          }
          break;
        }
      }

      if (player.y > WORLD.height + 70) {
        player = { ...checkpoint, vx: 0, vy: 0, grounded: true };
        status.textContent = 'Whoops — back to your last platform. Try another jump!';
      }
    }
    draw();
    frame = requestAnimationFrame(update);
  }

  const keyMap = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right'
  };
  const onKeyDown = (event) => {
    if (keyMap[event.code]) {
      event.preventDefault();
      held.add(keyMap[event.code]);
    } else if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
      event.preventDefault();
      if (!event.repeat) jump();
    }
  };
  const onKeyUp = (event) => {
    if (keyMap[event.code]) held.delete(keyMap[event.code]);
  };
  const onPointerUp = (event) => {
    const button = event.target.closest('[data-hold]');
    if (button) held.delete(button.dataset.hold);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('pointerup', onPointerUp);
  root.querySelectorAll('[data-hold]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      held.add(button.dataset.hold);
    });
    button.addEventListener('pointercancel', () => held.delete(button.dataset.hold));
  });
  root.querySelector('[data-jump]').addEventListener('click', jump);

  const observer = new ResizeObserver(resizeCanvas);
  observer.observe(canvas);
  resizeCanvas();
  frame = requestAnimationFrame(update);

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointerup', onPointerUp);
  };
}
