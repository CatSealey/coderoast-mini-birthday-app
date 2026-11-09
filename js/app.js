import '../css/styles.css';
import { createAudioController } from './audio.js';
import { renderChapterMap } from './chapter-maps.js';
import { mountRuneGame } from './games/runes.js';
import { mountPoolGame } from './games/pool.js';
import { mountCoasterGame } from './games/coaster.js';
import { mountCanopyGame } from './games/canopy.js';
import { mountMazeGame } from './games/maze.js';

const STORAGE_KEY = 'rs3-birthday-adventure-progress';

const memories = [
  {
    title: 'Kettering Escape Key',
    icon: '🗝️',
    description: 'A tiny trophy for making it through the Annabelle escape room together. The doll was creepy; having you there made it fun.'
  },
  {
    title: 'Lucky Chucks Eight-Ball',
    icon: '🎱',
    description: 'For our legendary pool form at Lucky Chucks. We may not have sunk many balls, but we definitely had a good time.'
  },
  {
    title: 'Thirteen Nerve Cape',
    icon: '🎢',
    description: 'Awarded for surviving Thirteen at Alton Towers after you let me discover the drop the exciting way.'
  },
  {
    title: 'GoApe Night-Sky Token',
    icon: '🌙',
    description: 'A little reminder of the glowing GoApe canopy, the nighttime adventure, and reaching that zip-line together.'
  },
  {
    title: 'Fright Night Lucky Charm',
    icon: '🎃',
    description: 'For making it through Earls Barton Fright Night side by side. The best part of every spooky adventure is having you with me.'
  }
];

const chapters = [
  {
    title: 'Level 1: Annabelle Escape (Kettering)',
    location: "KETTERING · ANNABELLE'S ROOM",
    sceneName: 'The old escape room',
    landmark: '🏚️',
    description: 'Watch the warding rune sequence, then repeat it to open the escape-room door.'
  },
  {
    title: 'Level 2: Lucky Chucks Pool Night',
    location: 'KETTERING · LUCKY CHUCKS',
    sceneName: 'Lucky Chucks pool hall',
    landmark: '🎱',
    description: 'Set your aim and power, then sink the eight-ball with a clean trick shot.'
  },
  {
    title: 'Level 3: Thirteen Coaster Drop',
    location: 'ALTON TOWERS · THIRTEEN',
    sceneName: 'The lift hill at Thirteen',
    landmark: '🎢',
    description: 'Catch three surprise drops at exactly the right moment. Space works on PC.'
  },
  {
    title: 'Level 4: Night-time GoApe Canopy',
    location: 'GOAPE · THE NIGHT CANOPY',
    sceneName: 'The forest canopy',
    landmark: '🌙',
    description: 'Run and jump across the glowing platforms to reach the zip-line.'
  },
  {
    title: 'Level 5: Earls Barton Fright Night',
    location: 'EARLS BARTON · FRIGHT NIGHT',
    sceneName: 'The haunted corn maze',
    landmark: '🎃',
    description: 'Explore the corn maze, find the lantern key, and reach the locked exit.'
  }
];

const gameMounts = [
  mountRuneGame,
  mountPoolGame,
  mountCoasterGame,
  mountCanopyGame,
  mountMazeGame
];

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Array.isArray(saved.completed) && saved.completed.length === chapters.length
      && saved.completed.every((value) => typeof value === 'boolean')) {
      return saved.completed;
    }
  } catch (error) {
    console.error('Could not restore birthday quest progress.', error);
  }
  return Array(chapters.length).fill(false);
}

let completed = readProgress();
let activeChapter = 0;
let disposeGame = () => {};
const audio = createAudioController(document.querySelector('#toggleAudioBtn'));
const gameRoot = document.querySelector('#gameCanvasContainer');
const stageTitle = document.querySelector('#stageTitle');
const stageBadge = document.querySelector('#stageBadge');
const dialogue = document.querySelector('#dialogueText');
const chapterMap = document.querySelector('#chapterMapContainer');

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completed }));
  } catch (error) {
    console.error('Could not save birthday quest progress.', error);
    dialogue.textContent = 'Your browser could not save quest progress. Keep this tab open to continue.';
  }
}

function renderInventory() {
  const grid = document.querySelector('#inventoryGrid');
  grid.replaceChildren();

  memories.forEach((memory, index) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `inventory-slot ${completed[index] ? 'inventory-slot--collected' : 'inventory-slot--locked'}`;
    slot.textContent = completed[index] ? memory.icon : '🔒';
    slot.disabled = !completed[index];
    slot.setAttribute('aria-label', completed[index] ? `Open ${memory.title} keepsake` : 'Locked keepsake');
    if (completed[index]) slot.dataset.memory = String(index);
    grid.append(slot);
  });

  const count = completed.filter(Boolean).length;
  document.querySelector('#itemCount').textContent = String(count);
  document.querySelector('#birthdayXpCopy').textContent = count === memories.length
    ? 'All birthday memories collected!'
    : `${memories.length - count} more ${memories.length - count === 1 ? 'memory' : 'memories'} to collect`;
  document.querySelector('#questProgressText').textContent = count === memories.length
    ? `Complete · ${count}/5`
    : `In progress · ${count}/5`;
  document.querySelector('#heroProgressText').textContent = `${count} of 5`;
  document.querySelector('#questProgressBar').setAttribute('aria-valuenow', String(count));
  document.querySelector('#progressFill').style.width = `${count / memories.length * 100}%`;
}

function renderChapterNavigation() {
  chapters.forEach((chapter, index) => {
    const button = document.querySelector(`#qbtn-${index + 1}`);
    const status = document.querySelector(`#qstatus-${index + 1}`);
    const isAvailable = index === 0 || completed[index - 1];
    button.disabled = !isAvailable;
    button.classList.toggle('opacity-60', !isAvailable);
    if (index === activeChapter) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    status.textContent = completed[index] ? 'Completed ✓' : isAvailable ? 'Available' : 'Locked';
    status.className = `quest-row__status ${
      completed[index] ? 'quest-row__status--complete' : isAvailable ? 'quest-row__status--available' : 'quest-row__status--locked'
    }`;
  });
}

function renderCompletedChapter(index, replayComplete = false) {
  const memory = memories[index];
  const nextIndex = index + 1;
  const action = nextIndex < chapters.length
    ? `<button type="button" class="rs3-btn game-control game-action" data-level="${nextIndex + 1}">Continue to next chapter →</button>`
    : '<button type="button" class="rs3-btn game-control game-action" data-action="show-victory">Claim Danwell’s level 30 birthday reward 🎉</button>';
  gameRoot.innerHTML = `
    <section class="mini-game game-complete">
      <div class="game-complete__icon" aria-hidden="true">${memory.icon}</div>
      <p class="eyebrow">${replayComplete ? 'Replay complete' : 'Keepsake collected'}</p>
      <h3>${memory.title}</h3>
      <p>${memory.description}</p>
      <button type="button" class="rs3-btn game-control game-action" data-action="replay-chapter">Replay this chapter ↻</button>
      ${action}
    </section>
  `;
}

function completeChapter(index) {
  if (index !== activeChapter) return;
  disposeGame();
  disposeGame = () => {};
  const replayComplete = completed[index];
  if (!replayComplete) {
    completed[index] = true;
    saveProgress();
    renderInventory();
    renderChapterNavigation();
  }
  stageBadge.textContent = 'Completed';
  stageBadge.className = 'text-xs bg-green-900/60 border border-green-500 text-green-200 px-2 py-1 rounded';
  audio.playSound('levelUp');
  renderCompletedChapter(index, replayComplete);
}

function mountActiveChapter() {
  const chapterIndex = activeChapter;
  gameRoot.replaceChildren();
  disposeGame = gameMounts[chapterIndex](
    gameRoot,
    () => completeChapter(chapterIndex),
    (effect) => audio.playSound(effect)
  );
}

function replayChapter() {
  stageBadge.textContent = 'Replay';
  stageBadge.className = 'text-xs bg-blue-900/60 border border-blue-500 text-blue-200 px-2 py-1 rounded';
  dialogue.textContent = `Replay: ${chapters[activeChapter].description}`;
  mountActiveChapter();
}

function selectChapter(level) {
  const index = level - 1;
  if (!Number.isInteger(level) || index < 0 || index >= chapters.length) return;
  if (index > 0 && !completed[index - 1]) return;

  disposeGame();
  disposeGame = () => {};
  activeChapter = index;
  stageTitle.textContent = chapters[index].title;
  dialogue.textContent = chapters[index].description;
  chapterMap.innerHTML = renderChapterMap(index);
  document.querySelector('#worldLocation').textContent = chapters[index].location;
  document.querySelector('#worldSceneName').textContent = chapters[index].sceneName;
  document.querySelector('#worldLandmark').textContent = chapters[index].landmark;
  document.querySelector('#worldViewport').dataset.chapter = String(level);
  stageBadge.textContent = completed[index] ? 'Completed' : 'In progress';
  stageBadge.className = completed[index]
    ? 'text-xs bg-green-900/60 border border-green-500 text-green-200 px-2 py-1 rounded'
    : 'text-xs bg-amber-900/60 border border-amber-500 text-amber-100 px-2 py-1 rounded';
  renderChapterNavigation();

  if (completed[index]) {
    renderCompletedChapter(index);
    return;
  }
  mountActiveChapter();
}

function showModal(id) {
  document.querySelector(`#${id}`).classList.remove('hidden');
}

function closeModal(id) {
  document.querySelector(`#${id}`).classList.add('hidden');
}

function showMemory(index) {
  const memory = memories[index];
  if (!memory || !completed[index]) return;
  document.querySelector('#itemModalIcon').textContent = memory.icon;
  document.querySelector('#itemModalTitle').textContent = memory.title;
  document.querySelector('#itemModalDesc').textContent = memory.description;
  showModal('itemModal');
}

function restartQuest() {
  completed = Array(chapters.length).fill(false);
  saveProgress();
  renderInventory();
  closeModal('victoryModal');
  selectChapter(1);
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.level) {
    selectChapter(Number(button.dataset.level));
  } else if (button.dataset.memory !== undefined) {
    showMemory(Number(button.dataset.memory));
  } else if (button.dataset.action === 'toggle-audio') {
    audio.toggleMusic().catch((error) => {
      console.error('Birthday music could not be started.', error);
      document.querySelector('#audioText').textContent = 'Audio could not start';
    });
  } else if (button.dataset.action === 'toggle-rivalry') {
    document.querySelector('#rivalryModal').classList.toggle('hidden');
  } else if (button.dataset.action === 'close-item') {
    closeModal('itemModal');
  } else if (button.dataset.action === 'close-victory') {
    closeModal('victoryModal');
  } else if (button.dataset.action === 'restart-quest') {
    restartQuest();
  } else if (button.dataset.action === 'replay-chapter') {
    replayChapter();
  } else if (button.dataset.action === 'show-victory') {
    showModal('victoryModal');
    audio.playSound('levelUp');
  }
});

document.addEventListener('click', (event) => {
  const backdrop = event.target.closest('[data-modal-backdrop]');
  if (backdrop && event.target === backdrop) closeModal(backdrop.id);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  ['victoryModal', 'itemModal', 'rivalryModal'].forEach((id) => closeModal(id));
});

window.addEventListener('pagehide', () => {
  disposeGame();
  audio.dispose();
});

renderInventory();
renderChapterNavigation();
selectChapter(1);
