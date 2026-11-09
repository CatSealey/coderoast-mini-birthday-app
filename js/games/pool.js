import { evaluatePoolShot } from './logic.js';

const TABLE = { width: 800, height: 330 };
const CUE = { x: 150, y: 165 };
const OBJECT = { x: 510, y: 165 };
const POCKET = { x: 738, y: 165 };

export function mountPoolGame(root, onComplete, playSound) {
  let angle = 0;
  let power = 58;
  let animationFrame = 0;
  let disposed = false;
  let moving = false;
  let shot = null;
  let attempts = 0;

  root.innerHTML = `
    <section class="mini-game pool-game">
      <header class="mini-game__header">
        <p class="eyebrow">Lucky Chucks · trick shot</p>
        <h3>Sink the eight-ball</h3>
        <p>Line up the cue with the ball and pocket. Adjust your aim and power, then take your shot.</p>
      </header>
      <canvas class="pool-table" id="poolTable" aria-label="Pool table showing the cue ball, eight-ball, and target pocket"></canvas>
      <div class="pool-controls">
        <label class="game-slider">
          <span><span>Aim</span><output id="aimReadout">0°</output></span>
          <input class="game-range" id="aimRange" type="range" min="-18" max="18" step="1" value="0" aria-label="Aim angle">
          <span class="game-slider__hint">Tilt the cue up or down</span>
        </label>
        <label class="game-slider">
          <span><span>Power</span><output id="powerReadout">58%</output></span>
          <input class="game-range" id="powerRange" type="range" min="20" max="100" step="1" value="58" aria-label="Shot power">
          <span class="game-slider__hint">Too soft won't reach; too hard will rattle out</span>
        </label>
      </div>
      <div class="game-action-row">
        <p class="game-status" id="poolStatus" aria-live="polite">Line up the balls and find your perfect power.</p>
        <button type="button" class="rs3-btn game-control game-action" id="shootButton">Take the shot 🎱</button>
      </div>
    </section>
  `;

  const canvas = root.querySelector('#poolTable');
  const context = canvas.getContext('2d');
  const aimSlider = root.querySelector('#aimRange');
  const powerSlider = root.querySelector('#powerRange');
  const status = root.querySelector('#poolStatus');
  const shootButton = root.querySelector('#shootButton');
  const aimReadout = root.querySelector('#aimReadout');
  const powerReadout = root.querySelector('#powerReadout');

  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    context.setTransform(canvas.width / TABLE.width, 0, 0, canvas.height / TABLE.height, 0, 0);
    draw();
  }

  function drawBall(x, y, radius, fill, stripe = false) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(255,255,255,.55)';
    context.stroke();
    if (stripe) {
      context.beginPath();
      context.arc(x, y, radius * 0.45, 0, Math.PI * 2);
      context.fillStyle = '#f6f0dc';
      context.fill();
      context.fillStyle = '#171919';
      context.font = 'bold 12px sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText('8', x, y);
    }
  }

  function draw() {
    if (disposed || !context) return;
    context.clearRect(0, 0, TABLE.width, TABLE.height);
    context.fillStyle = '#172d29';
    context.fillRect(0, 0, TABLE.width, TABLE.height);
    context.strokeStyle = '#a47a45';
    context.lineWidth = 20;
    context.strokeRect(12, 12, TABLE.width - 24, TABLE.height - 24);
    context.strokeStyle = 'rgba(236, 214, 159, .25)';
    context.lineWidth = 2;
    context.strokeRect(32, 32, TABLE.width - 64, TABLE.height - 64);

    [
      [34, 34], [400, 23], [766, 34],
      [34, 296], [400, 307], [766, 296]
    ].forEach(([x, y]) => {
      context.beginPath();
      context.arc(x, y, 22, 0, Math.PI * 2);
      context.fillStyle = '#07100e';
      context.fill();
    });

    context.setLineDash([8, 8]);
    context.strokeStyle = 'rgba(239, 218, 164, .42)';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(POCKET.x, 62);
    context.lineTo(POCKET.x, 268);
    context.stroke();
    context.setLineDash([]);

    context.beginPath();
    context.arc(POCKET.x, POCKET.y, 27, 0, Math.PI * 2);
    context.fillStyle = '#07100e';
    context.fill();
    context.strokeStyle = '#d7b86f';
    context.lineWidth = 2;
    context.stroke();

    const targetAngle = shot ? shot.objectAngle : angle * 0.72;
    const targetPower = shot ? shot.power : power;
    const travel = shot ? shot.progress * shot.distance : 0;
    const objectX = OBJECT.x + Math.cos(targetAngle) * travel;
    const objectY = OBJECT.y - Math.sin(targetAngle) * travel;

    if (!shot) {
      const radians = angle * Math.PI / 180;
      context.setLineDash([7, 7]);
      context.strokeStyle = 'rgba(247, 234, 196, .6)';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(CUE.x, CUE.y);
      context.lineTo(OBJECT.x, OBJECT.y - Math.tan(radians) * (OBJECT.x - CUE.x));
      context.stroke();
      context.setLineDash([]);
    }

    if (shot && shot.success && shot.progress > 0.66) {
      const fade = Math.max(0, 1 - (shot.progress - 0.66) / 0.34);
      context.globalAlpha = fade;
    }
    drawBall(objectX, objectY, 20, '#e8b64e', true);
    context.globalAlpha = 1;
    drawBall(CUE.x, CUE.y, 18, '#f4f3e8');

    if (moving) {
      shot.progress = Math.min(1, shot.progress + 0.018 + targetPower * 0.00015);
      if (shot.progress >= 1) {
        moving = false;
        shot = null;
      } else {
        animationFrame = requestAnimationFrame(draw);
      }
    }
  }

  function updateControls() {
    angle = Number(aimSlider.value);
    power = Number(powerSlider.value);
    aimReadout.value = `${angle}°`;
    powerReadout.value = `${power}%`;
    if (!moving) draw();
  }

  function takeShot() {
    if (moving || disposed) return;
    attempts += 1;
    playSound('click');
    shootButton.disabled = true;
    const result = evaluatePoolShot(angle, power);
    const angleRadians = angle * Math.PI / 180;
    shot = {
      angle,
      power,
      objectAngle: angleRadians * 0.72,
      progress: 0,
      distance: 80 + power * 2.9,
      success: result.success
    };
    moving = true;
    draw();

    window.setTimeout(() => {
      if (disposed) return;
      moving = false;
      shot = null;
      shootButton.disabled = false;
      draw();
      if (result.success) {
        status.textContent = `Lovely shot! Eight-ball down on try ${attempts}.`;
        playSound('success');
        onComplete();
      } else if (result.angleError > 3) {
        status.textContent = `The cue was ${Math.round(result.angleError)}° off line. Adjust your aim and try again.`;
      } else {
        status.textContent = result.powerError > 14
          ? 'Good line, but the power was off. Ease it toward the pocket and try again.'
          : 'The ball rattled the pocket. Make a small adjustment and try again.';
      }
    }, 1000);
  }

  aimSlider.addEventListener('input', updateControls);
  powerSlider.addEventListener('input', updateControls);
  shootButton.addEventListener('click', takeShot);
  const observer = new ResizeObserver(fitCanvas);
  observer.observe(canvas);
  fitCanvas();

  return () => {
    disposed = true;
    moving = false;
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
  };
}
