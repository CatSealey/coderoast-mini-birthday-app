export const ADVENTURE_NAMES = { 1: 'Lucky Chucks', 2: 'Thirteen', 3: 'GoApe' };
export const OBJECTS = {
  1: [
    { id: 'bar', name: 'Bar', x: 130, y: 120, kind: 'bar' },
    { id: 'rack-note', name: 'Scorecard', x: 285, y: 130, kind: 'note' },
    { id: 'drinks-table', name: 'Drinks table', x: 540, y: 440, kind: 'table' },
    { id: 'cue-rack', name: 'Cue rack', x: 835, y: 130, kind: 'rack' },
    { id: 'ball-box', name: 'Ball case', x: 115, y: 510, kind: 'box' },
    { id: 'pool-table', name: 'Pool table', x: 500, y: 230, kind: 'pool' },
    { id: 'tool-rack', name: 'Equipment cupboard', x: 290, y: 590, kind: 'tools' },
    { id: 'cabinet', name: 'Cabinet', x: 840, y: 500, kind: 'cabinet' },
    { id: 'love', name: 'My Love', x: 690, y: 460, kind: 'npc' }
  ],
  2: [
    { id: 'carriage', name: 'Thirteen carriage', x: 500, y: 530, kind: 'carriage' },
    { id: 'locker', name: 'Bag locker', x: 750, y: 510, kind: 'locker' },
    { id: 'amor', name: 'Meu Amor', x: 610, y: 530, kind: 'npc' }
  ],
  3: [
    { id: 'leaf', name: 'Glowing leaf', x: 200, y: 295, kind: 'collectible', height: 0 },
    { id: 'net', name: 'Climbing net', x: 330, y: 350, kind: 'net', height: 0 },
    { id: 'feather', name: 'Night feather', x: 440, y: 405, kind: 'collectible', height: 80 },
    { id: 'rope', name: 'Rope crossing', x: 500, y: 350, kind: 'rope', height: 80 },
    { id: 'acorn', name: 'Silver acorn', x: 680, y: 290, kind: 'collectible', height: 130 },
    { id: 'star', name: 'Forest star', x: 850, y: 405, kind: 'collectible', height: 130 },
    { id: 'zipline', name: 'Zip-wire', x: 900, y: 350, kind: 'zipline', height: 130 }
  ]
};

export const CANOPY_PLATFORMS = [
  { left: 40, right: 350, top: 265, bottom: 435, height: 0 },
  { left: 380, right: 525, top: 265, bottom: 435, height: 80 },
  { left: 600, right: 730, top: 265, bottom: 435, height: 130 },
  { left: 795, right: 960, top: 265, bottom: 435, height: 130 }
];
const ITEMS = ['leaf', 'feather', 'acorn', 'star'];
const initialMessages = {
  1: 'My Love is waiting by the table. Set up the drinks and pool equipment.',
  2: 'Find the carriage and board with Meu Amor.',
  3: 'Follow the lantern light, climb the net, cross the rope and collect four keepsakes.'
};

export function newAdventureState(index) {
  if (!ADVENTURE_NAMES[index]) throw new RangeError('Unknown adventure.');
  const base = { version: 3, player: { x: 90, y: index === 3 ? 350 : 540, height: 0 }, complete: false, message: initialMessages[index] };
  if (index === 1) return { ...base, drinks: false, drinksPlaced: false, cues: false, balls: false, cuesPlaced: false,
    ballsPlaced: false, ballLost: false, ballFound: false, noteRead: false, caseUnlocked: false, puzzle: false,
    hook: false, shot: false };
  if (index === 2) return { ...base, phase: 'boarding', progress: 0, speed: 0, stalled: 0, signals: 0, bags: false, ticket: false };
  return { ...base, collected: [], checkpoint: 0, flight: null, traversal: null, zipline: false, zipProgress: 0, treasuresUsed: false };
}

export function restoreAdventureState(index, saved) {
  const initial = newAdventureState(index);
  if (!saved) return initial;
  if (saved.version !== 3) {
    return { ...initial, legacyProgress: saved, complete: saved.complete === true };
  }
  const player = saved.player;
  const validPlayer = player && Number.isFinite(player.x) && player.x >= 40 && player.x <= 960
    && Number.isFinite(player.y) && player.y >= 40 && player.y <= 660 && Number.isFinite(player.height)
    && player.height >= 0 && player.height <= 200;
  const flags = index === 1 ? ['drinks', 'drinksPlaced', 'cues', 'balls', 'cuesPlaced', 'ballsPlaced', 'ballLost', 'ballFound']
    : index === 2 ? ['bags', 'ticket'] : [];
  const valid = validPlayer && flags.every((flag) => typeof saved[flag] === 'boolean')
    && (index !== 1 || ['noteRead', 'caseUnlocked', 'hook'].every((flag) => saved[flag] === undefined || typeof saved[flag] === 'boolean'))
    && typeof saved.complete === 'boolean'
    && (index !== 2 || (['boarding', 'riding', 'dropping', 'returning', 'platform', 'finished'].includes(saved.phase)
      && Number.isFinite(saved.progress) && saved.progress >= 0 && saved.progress <= 1
      && Number.isFinite(saved.speed) && saved.speed >= 0 && saved.speed <= 1
      && Number.isFinite(saved.stalled) && saved.stalled >= 0
      && (saved.signals === undefined || (Number.isInteger(saved.signals) && saved.signals >= 0 && saved.signals <= 2))))
    && (index !== 3 || (Array.isArray(saved.collected) && saved.collected.every((id) => ITEMS.includes(id))
      && new Set(saved.collected).size === saved.collected.length && Number.isInteger(saved.checkpoint)
      && saved.checkpoint >= 0 && saved.checkpoint < CANOPY_PLATFORMS.length
      && typeof saved.zipline === 'boolean' && typeof saved.treasuresUsed === 'boolean'
      && (saved.traversal === null || (['net', 'rope'].includes(saved.traversal?.kind)
        && Number.isFinite(saved.traversal.progress) && saved.traversal.progress >= 0 && saved.traversal.progress <= 1
        && (saved.traversal.elapsed === undefined || (Number.isFinite(saved.traversal.elapsed) && saved.traversal.elapsed >= 0))
        && (saved.traversal.armed === undefined || typeof saved.traversal.armed === 'boolean')))
      && Number.isFinite(saved.zipProgress) && saved.zipProgress >= 0 && saved.zipProgress <= 1));
  if (!valid) {
    console.warn(`Invalid saved ${ADVENTURE_NAMES[index]} progress; returning to the entrance.`);
    return initial;
  }
  const restored = { ...initial, ...saved, player: { ...player }, message: initialMessages[index] };
  if (index === 1) {
    restored.puzzle = false;
    restored.shot = false;
    if (saved.caseUnlocked === undefined && (saved.balls || saved.ballsPlaced)) restored.caseUnlocked = true;
  }
  if (index === 2 && saved.signals === undefined && saved.phase === 'riding') {
    restored.signals = saved.progress >= 0.48 ? 2 : saved.progress >= 0.22 ? 1 : 0;
  }
  if (index === 2 && restored.phase !== 'boarding' && !restored.complete) {
    restored.message = {
      riding: 'Your ride resumes. Clear both signals and stop in the drop zone.',
      dropping: 'The track is dropping!',
      returning: 'The lower track carries you back to the dock.',
      platform: restored.bags ? 'Take the bags to Meu Amor.' : 'The ride has returned. Find the bags in the locker.'
    }[restored.phase] || initialMessages[2];
  }
  if (index === 3) {
    restored.collected = [...saved.collected];
    restored.flight = null;
    if (restored.traversal) restored.traversal = { ...restored.traversal,
      progress: Math.min(2, Math.floor(restored.traversal.progress * 3)) / 3,
      elapsed: restored.traversal.elapsed ?? 0, armed: restored.traversal.armed ?? true };
    if (restored.traversal) restored.message = 'Time your moves as the marker passes through the safe zone.';
    const platform = CANOPY_PLATFORMS[restored.checkpoint];
    if (!restored.zipline && !restored.traversal && platformAt(restored.player.x, restored.player.y, restored.player.height) < 0) {
      restored.player = { x: (platform.left + platform.right) / 2, y: 350, height: platform.height };
    }
  }
  return restored;
}

export function platformAt(x, y, height) {
  return CANOPY_PLATFORMS.findIndex((platform) => x >= platform.left && x <= platform.right
    && y >= platform.top && y <= platform.bottom && Math.abs(platform.height - height) < 1);
}

export function walkAdventure(index, state, dx, dy, seconds) {
  if (state.complete || (index === 3 && (state.zipline || state.traversal)) || (index === 2 && state.phase !== 'boarding' && state.phase !== 'platform')
    || !Number.isFinite(seconds) || seconds <= 0) return state;
  const length = Math.hypot(dx, dy);
  if (!length) return state;
  const distance = Math.min(length, 175 * seconds);
  const x = Math.max(40, Math.min(960, state.player.x + dx / length * distance));
  const y = Math.max(40, Math.min(660, state.player.y + dy / length * distance));
  if (index === 3 && !state.flight && platformAt(x, y, state.player.height) < 0) return state;
  return { ...state, player: { ...state.player, x, y } };
}

export function jumpCanopy(state) {
  if (state.complete || state.flight || state.zipline || state.traversal) return state;
  return { ...state, flight: { velocity: 250 }, message: 'Jump across the gap and land on the next lit platform.' };
}

export function tickCanopy(state, seconds) {
  if (state.traversal && seconds > 0) {
    const elapsed = state.traversal.elapsed + seconds;
    const meter = canopyMeter(elapsed);
    return { ...state, traversal: { ...state.traversal, elapsed,
      armed: state.traversal.armed || meter < 0.35 || meter > 0.65 } };
  }
  if (state.zipline && !state.complete && seconds > 0) {
    const zipProgress = Math.min(1, state.zipProgress + seconds / 3);
    return { ...state, zipProgress, player: { x: 900 + 60 * zipProgress, y: 350 + 220 * zipProgress, height: 130 * (1 - zipProgress) },
      ...(zipProgress === 1 ? { complete: true, message: 'You ride the zip-wire down through the glowing trees!' } : {}) };
  }
  if (!state.flight || seconds <= 0) return state;
  const velocity = state.flight.velocity - 500 * seconds;
  const height = state.player.height + velocity * seconds;
  if (velocity <= 0) {
    const landed = CANOPY_PLATFORMS.findIndex((p) => state.player.x >= p.left && state.player.x <= p.right
      && state.player.y >= p.top && state.player.y <= p.bottom && state.player.height >= p.height && height <= p.height);
    if (landed >= 0) return { ...state, player: { ...state.player, height: CANOPY_PLATFORMS[landed].height },
      flight: null, checkpoint: Math.max(state.checkpoint, landed), message: 'Safe landing! Follow the next lantern.' };
  }
  if (height < -90) {
    const platform = CANOPY_PLATFORMS[state.checkpoint];
    return { ...state, player: { x: (platform.left + platform.right) / 2, y: 350, height: platform.height },
      flight: null, message: 'You slipped into the dark and returned to your last checkpoint.' };
  }
  return { ...state, player: { ...state.player, height }, flight: { velocity } };
}

export function canopyMeter(elapsed) {
  return (1 - Math.cos(elapsed * Math.PI)) / 2;
}

export function advanceCanopy(state) {
  if (!state.traversal) return state;
  const { kind, progress, elapsed, armed } = state.traversal;
  const meter = canopyMeter(elapsed);
  if (!armed) return message(state, 'Wait for the marker to leave the safe zone before the next move.');
  if (meter < 0.35 || meter > 0.65) {
    const platform = CANOPY_PLATFORMS[state.checkpoint];
    return { ...state, traversal: null,
      player: { x: kind === 'net' ? 320 : 485, y: 350, height: platform.height },
      message: 'You lost your footing and returned to the platform. Try the crossing again.' };
  }
  const next = Math.min(1, progress + 1 / 3);
  const player = kind === 'net' ? { x: 330 + 70 * next, y: 350, height: 80 * next }
    : { x: 500 + 115 * next, y: 350, height: 80 + 50 * next };
  return { ...state, player, traversal: next >= 1 ? null : { kind, progress: next, elapsed, armed: false },
    ...(next >= 1 ? { checkpoint: Math.max(state.checkpoint, kind === 'net' ? 1 : 2),
      message: kind === 'net' ? 'You climbed to the lantern-lit platform.' : 'You crossed the rope to the next platform.' }
      : { message: 'Good timing. Wait for the marker to return to the safe zone.' }) };
}

function message(state, text) { return { ...state, message: text }; }

export function interactAdventure(index, state, id) {
  const object = OBJECTS[index].find((item) => item.id === id);
  if (!object || state.complete || (index === 3 && (state.flight || state.zipline || state.traversal))) return state;
  if (Math.hypot(state.player.x - object.x, state.player.y - object.y) > 85
    || Math.abs(state.player.height - (object.height || 0)) > 25) return message(state, `Move closer to ${object.name}.`);
  if (index === 1) {
    if (id === 'bar') return state.drinksPlaced ? message(state, 'The drinks are already on the table.')
      : { ...state, drinks: true, message: 'You collect two drinks from the bar.' };
    if (id === 'drinks-table') return state.drinksPlaced ? message(state, 'The drinks are ready.')
      : state.drinks ? { ...state, drinks: false, drinksPlaced: true, message: 'You put the drinks beside the pool table.' }
        : message(state, 'Get the drinks from the bar first.');
    if (id === 'cue-rack') return state.cuesPlaced ? message(state, 'The cues are already at the pool table.')
      : { ...state, cues: true, message: 'You pick up the pool cues.' };
    if (id === 'rack-note') return { ...state, noteRead: true,
      message: 'Scorecard: The case code is half the table pockets, then one cue each for you and My Love, then the eight-ball.' };
    if (id === 'ball-box') return state.ballsPlaced ? message(state, 'The balls are already on the pool table.')
      : state.caseUnlocked ? { ...state, balls: true, message: 'You pick up the pool balls.' }
        : state.noteRead ? { ...state, puzzle: true, message: 'Use the scorecard and the pool table to work out the three-digit case code.' }
          : message(state, 'The ball case is locked. Find a clue to its code in the pub.');
    if (id === 'pool-table') {
      if (state.ballLost) return message(state, 'The eight-ball rolled away. Search around the cabinet.');
      if (state.cuesPlaced && state.ballsPlaced) return { ...state, shot: true,
        message: 'Line up your break and choose a controlled power. The guide shows where the cue ball will travel.' };
      if (!state.cues && !state.balls) return message(state, 'Find the cues and ball case before setting up the table.');
      const cuesPlaced = state.cuesPlaced || state.cues, ballsPlaced = state.ballsPlaced || state.balls;
      return { ...state, cues: false, balls: false, cuesPlaced, ballsPlaced,
        message: cuesPlaced && ballsPlaced ? 'The table is ready. Investigate it again to take the break.' : 'You set the equipment on the pool table. Something is still missing.' };
    }
    if (id === 'tool-rack') return !state.ballLost ? message(state, 'Pool brushes, a rest and a long retrieval hook hang inside.')
      : state.ballFound ? message(state, 'The eight-ball is already out from under the cabinet.')
        : state.hook ? message(state, 'You already have the retrieval hook.')
          : { ...state, hook: true, message: 'You take the long retrieval hook from the equipment cupboard.' };
    if (id === 'cabinet') return !state.ballLost ? message(state, 'There is nothing under the cabinet yet.')
      : state.ballFound ? message(state, 'You already retrieved the eight-ball.')
        : !state.hook ? message(state, 'The eight-ball is too far under the cabinet to reach. Look for a long tool in the equipment cupboard.')
          : { ...state, hook: false, ballFound: true, message: 'You use the retrieval hook to pull the eight-ball from under the cabinet.' };
    if (id === 'love') return state.drinksPlaced && state.ballFound
      ? { ...state, ballFound: false, complete: true, message: 'My Love: You found it! Now we can enjoy our pool night together.' }
      : message(state, 'My Love: Set out our drinks and pool equipment, then find the missing eight-ball.');
  }
  if (index === 2) {
    if (id === 'carriage') return state.phase === 'boarding'
      ? { ...state, phase: 'riding', speed: 0.35, message: 'Meu Amor sits beside you. Keep moving and brake in the marked drop zone.' }
      : message(state, 'The carriage has returned to the dock.');
    if (id === 'locker') return state.phase !== 'platform' ? message(state, 'Collect the bags after the ride returns.')
      : state.bags ? message(state, 'You already have the bags.') : { ...state, bags: true, message: 'You take the bags from the locker.' };
    if (id === 'amor') return state.phase === 'platform' && state.bags
      ? { ...state, bags: false, ticket: true, phase: 'finished', complete: true, message: 'Meu Amor: What a ride! Here is your ticket to leave.' }
      : message(state, 'Meu Amor: Ride together first, then bring our bags from the locker.');
  }
  if (index === 3) {
    if (ITEMS.includes(id)) return state.collected.includes(id) ? message(state, `You already found the ${object.name.toLowerCase()}.`)
      : { ...state, collected: [...state.collected, id], message: `You found the ${object.name.toLowerCase()}!` };
    if (id === 'net') return { ...state, player: { x: 330, y: 350, height: 0 }, traversal: { kind: 'net', progress: 0, elapsed: 0, armed: true },
      message: 'Climb when the moving marker reaches the safe zone. Time three moves to cross.' };
    if (id === 'rope') return { ...state, player: { x: 500, y: 350, height: 80 }, traversal: { kind: 'rope', progress: 0, elapsed: 0, armed: true },
      message: 'Balance across the rope: time three moves as the marker passes through the safe zone.' };
    if (id === 'zipline') return state.collected.length === 4
      ? { ...state, zipline: true, zipProgress: 0, treasuresUsed: true, message: 'You present the four treasures and clip onto the zip-wire!' }
      : message(state, `Find all four forest treasures before taking the zip-wire (${state.collected.length}/4).`);
  }
  return state;
}

export function takePoolShot(state, aim, power) {
  if (!state.shot || !Number.isFinite(aim) || !Number.isFinite(power) || aim < -35 || aim > 35 || power < 0 || power > 100) return state;
  if (Math.abs(aim) > 7 || power < 55 || power > 75) {
    const hint = Math.abs(aim) > 7 ? 'The cue ball missed the rack. Adjust the line towards the centre.'
      : power < 55 ? 'The break was too gentle. Try a little more power.'
        : 'That break was too hard. Try a more controlled shot.';
    return { ...state, message: hint };
  }
  return { ...state, shot: false, ballLost: true, message: 'The break scatters the balls, but the eight-ball rolls away under the cabinet!' };
}

export function unlockBallCase(state, code) {
  if (!state.puzzle || !['321', '312', '231'].includes(code)) return state;
  return code === '321'
    ? { ...state, puzzle: false, caseUnlocked: true, balls: true, message: 'The case clicks open. You take the pool balls.' }
    : { ...state, puzzle: false, message: 'That code does not work. Check the scorecard, cues and table pockets.' };
}

export function controlCoaster(state, command) {
  if (state.phase !== 'riding') return state;
  if (command === 'faster') return { ...state, speed: Math.min(1, state.speed + 0.12), message: 'Accelerating along the track.' };
  if (command === 'slower') return { ...state, speed: Math.max(0, state.speed - 0.12), message: 'Braking. Stop inside the highlighted drop zone.' };
  if (command === 'stop') {
    if (state.signals === 2 && state.progress >= 0.64 && state.progress <= 0.72 && state.speed <= 0.35) {
      return { ...state, speed: 0, phase: 'dropping', progress: 0, message: 'Perfect stop! The track drops to the lower level.' };
    }
    return { ...state, speed: 0.35, progress: 0, stalled: 0, signals: 0, message: 'Missed the stopping zone or a speed signal. The carriage returns to the start for another lap.' };
  }
  return state;
}

export function tickCoaster(state, seconds) {
  if (seconds <= 0) return state;
  if (state.phase === 'riding') {
    const stalled = state.speed < 0.2 ? state.stalled + seconds : 0;
    if (stalled >= 3) return { ...state, speed: 0.35, progress: 0, stalled: 0, signals: 0, message: 'Too slow for too long! The carriage returns to the dock for another lap.' };
    const progress = state.progress + state.speed * seconds * 0.075;
    let signals = state.signals;
    for (const [i, point, minimum, maximum] of [[0, 0.22, 0.55, 0.8], [1, 0.48, 0.24, 0.4]]) {
      if (state.progress < point && progress >= point && signals === i) {
        if (state.speed < minimum || state.speed > maximum) return { ...state, progress: 0, speed: 0.35, stalled: 0, signals: 0,
          message: `Signal ${i + 1} missed: speed must be ${minimum * 100}–${maximum * 100}%. Try another lap.` };
        signals += 1;
      }
    }
    if (progress >= 1) return { ...state, progress: 0, stalled, signals: 0, message: 'The drop zone passed. Try another lap.' };
    return { ...state, progress, stalled, signals,
      ...(signals !== state.signals ? { message: `Signal ${signals} cleared. ${signals === 1 ? 'Brake for the second signal.' : 'Brake for the drop zone.'}` } : {}) };
  }
  if (state.phase === 'dropping') {
    const progress = Math.min(1, state.progress + seconds / 3);
    return { ...state, progress, ...(progress === 1 ? { phase: 'returning', progress: 0, message: 'The lower track carries you back to the dock.' } : {}) };
  }
  if (state.phase === 'returning') {
    const progress = Math.min(1, state.progress + seconds / 5);
    return { ...state, progress, ...(progress === 1 ? { phase: 'platform', progress: 1, player: { x: 500, y: 530, height: 0 },
      message: 'You and Meu Amor step out. Retrieve the bags from the locker.' } : {}) };
  }
  return state;
}
