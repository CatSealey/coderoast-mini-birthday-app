import { createAudioController } from './audio.js';
import { renderChapterMap } from './chapter-maps.js';
import { mountRuneGame } from './games/runes.js';
import { mountPoolGame } from './games/pool.js';
import { mountCoasterGame } from './games/coaster.js';
import { mountCanopyGame } from './games/canopy.js';
import { mountMazeGame } from './games/maze.js';
import { mountOverworld } from './world/overworld.js';
import { QUEST_LOCATIONS } from './world/world-data.js';
import { areAllQuestsComplete, isQuestAvailable } from './world/world-logic.js';
import { birthdayProgress, XP_PER_QUEST } from './progression.js';

export function startGame(characterName) {
const STORAGE_KEY = 'rs3-birthday-adventure-progress';

const memories = [
  {
    title: 'Kettering Escape Key',
    icon: '🗝️',
    description: 'A tiny trophy for making it through the Abigail escape room together. The doll was creepy; having you there made it fun.'
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
    title: 'Fright Nights Lucky Charm',
    icon: '🎃',
    description: 'For making it through Earls Barton Fright Nights side by side. The best part of every spooky adventure is having you with me.'
  }
];

const chapters = [
  {
    title: 'Abigail Escape',
    location: "KETTERING · ABIGAIL'S ROOM",
    description: 'Watch the warding rune sequence, then repeat it to open the escape-room door.',
    objective: 'Remember the warding runes and repeat each sequence to break the room’s spell.'
  },
  {
    title: 'Lucky Chucks Pool Night',
    location: 'KETTERING · LUCKY CHUCKS',
    description: 'Set your aim and power, then sink the eight-ball with a clean trick shot.',
    objective: 'Line up your shot and pocket the eight-ball with a controlled strike.'
  },
  {
    title: 'Thirteen Coaster Drop',
    location: 'ALTON TOWERS · THIRTEEN',
    description: 'Catch three surprise drops at exactly the right moment. Space works on PC.',
    objective: 'React to three lift-hill signals and release the cart at the perfect moment.'
  },
  {
    title: 'Night-time GoApe Canopy',
    location: 'GOAPE · THE NIGHT CANOPY',
    description: 'Run and jump across the glowing platforms to reach the zip-line.',
    objective: 'Cross the treetop platforms and reach the glowing zip-line.'
  },
  {
    title: 'Earls Barton Fright Nights',
    location: 'EARLS BARTON · Fright Nights',
    description: 'Explore the corn maze, find the lantern key, and reach the locked exit.',
    objective: 'Find the lantern key, avoid the ghost, and unlock the maze exit.'
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
let disposeGame = () => { };
const audio = createAudioController(document.querySelector('#toggleAudioBtn'));
const worldLocation = document.querySelector('#worldLocation');
const stageTitle = document.querySelector('#stageTitle');
const stageBadge = document.querySelector('#stageBadge');
const dialogue = document.querySelector('#dialogueText');
const questDialog = document.querySelector('#questDialog');
const questBriefing = document.querySelector('#questBriefing');
const questActivity = document.querySelector('#questActivity');
const gameRoot = document.querySelector('#questGameRoot');

document.querySelector('#characterName').textContent = characterName;
document.querySelector('#characterAdventure').textContent = `${characterName.toUpperCase()}'S ADVENTURE`;

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
    slot.textContent = String(index + 1);
    slot.disabled = !completed[index];
    slot.setAttribute('aria-label', completed[index]
      ? `Open keepsake ${index + 1}: ${memory.title}`
      : `Keepsake ${index + 1} not yet collected`);
    if (completed[index]) slot.dataset.memory = String(index);
    grid.append(slot);
  });

  const { questsCompleted: count, xp, targetXp, level } = birthdayProgress(completed);
  document.querySelector('#characterProfile').setAttribute('aria-label', `Character ${characterName}, level ${level}`);
  document.querySelector('#characterLevel').textContent = `COMBAT LVL ${level}`;
  document.querySelector('#birthdayLevel').textContent = `LV ${level}`;
  document.querySelector('#actionbarLevel').textContent = String(level);
  document.querySelector('#birthdayXp').textContent = `${xp} / ${targetXp} XP`;
  document.querySelector('#itemCount').textContent = String(count);
  document.querySelector('#birthdayXpCopy').textContent = level === 30
    ? 'Level 30 reached! All birthday memories collected.'
    : `${targetXp - xp} XP to level 30 · ${XP_PER_QUEST} XP per quest`;
  document.querySelector('#questProgressText').textContent = count === memories.length
    ? `Complete · ${count}/5`
    : `In progress · ${count}/5`;
  document.querySelector('#heroProgressText').textContent = `${count} of 5`;
  document.querySelector('#questProgressBar').setAttribute('aria-valuemax', String(targetXp));
  document.querySelector('#questProgressBar').setAttribute('aria-valuenow', String(xp));
  document.querySelector('#questProgressBar').setAttribute('aria-valuetext', `${xp} of ${targetXp} XP`);
  document.querySelector('#progressFill').style.width = `${xp / targetXp * 100}%`;
}

function renderChapterNavigation() {
  chapters.forEach((chapter, index) => {
    const button = document.querySelector(`#qbtn-${index + 1}`);
    const status = document.querySelector(`#qstatus-${index + 1}`);
    button.disabled = false;
    button.classList.remove('opacity-60');
    if (index === activeChapter) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
    status.textContent = completed[index] ? 'Completed ✓' : 'Available';
    status.className = `quest-row__status ${completed[index] ? 'quest-row__status--complete' : 'quest-row__status--available'}`;
  });
}

function setStageStatus(text, className = '') {
  stageBadge.textContent = text;
  stageBadge.className = `world-stage-badge ${className}`.trim();
}

function renderCompletedChapter(index, replayComplete = false) {
  const memory = memories[index];
  const rewardAction = areAllQuestsComplete(completed)
    ? '<button type="button" class="rs3-btn game-control game-action" data-action="show-victory">Claim Danwell’s level 30 birthday reward 🎉</button>'
    : '';
  gameRoot.innerHTML = `
    <section class="mini-game game-complete">
      <div class="game-complete__icon" aria-hidden="true">${index + 1}</div>
      <p class="eyebrow">${replayComplete ? 'Replay complete' : `Keepsake ${index + 1} collected`}</p>
      <h3>${memory.icon} ${memory.title}</h3>
      <p>${memory.description}</p>
      <button type="button" class="rs3-btn game-control game-action" data-action="replay-chapter">Replay this activity ↻</button>
      <button type="button" class="rs3-btn game-control game-action" data-action="close-quest">Return to the world</button>
      ${rewardAction}
    </section>
  `;
}

function completeChapter(index) {
  if (index !== activeChapter) return;
  disposeGame();
  disposeGame = () => { };
  const replayComplete = completed[index];
  if (!replayComplete) {
    completed[index] = true;
    saveProgress();
    renderInventory();
    renderChapterNavigation();
    world.setQuestStates(completed);
  }
  setStageStatus('Chapter complete', 'world-stage-badge--complete');
  dialogue.textContent = replayComplete
    ? `${memories[index].title} replayed. Your keepsake, XP and quest progress remain unchanged.`
    : `Keepsake ${index + 1} collected. You earned ${XP_PER_QUEST} XP${areAllQuestsComplete(completed) ? ' and reached level 30!' : '.'}`;
  audio.playSound('levelUp');
  renderCompletedChapter(index, replayComplete);
  document.querySelector('#questDialogHint').textContent = replayComplete
    ? 'Your keepsake is safe. Return to the world whenever you are ready.'
    : `Quest complete. You earned ${XP_PER_QUEST} XP${areAllQuestsComplete(completed) ? ' and reached level 30!' : '.'}`;
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

function beginQuestActivity() {
  if (!questDialog.open || !isQuestAvailable(activeChapter, completed)) return;
  questBriefing.hidden = true;
  questActivity.hidden = false;
  document.querySelector('#questObjective').textContent = chapters[activeChapter].objective;
  document.querySelector('#questDialogHint').textContent = 'Complete the objective to earn this chapter’s keepsake.';
  document.querySelector('#beginQuestButton').hidden = true;
  setStageStatus(completed[activeChapter] ? 'Replay in progress' : 'Quest in progress', 'world-stage-badge--active');
  mountActiveChapter();
}

function showQuestBriefing(index, replay = false) {
  if (!isQuestAvailable(index, completed)) return;
  activeChapter = index;
  const quest = QUEST_LOCATIONS[index];
  const chapter = chapters[index];
  stageTitle.textContent = `Journey to ${quest.name}`;
  worldLocation.textContent = quest.region;
  dialogue.textContent = replay
    ? `You’re back at ${quest.name}. Interact with the guide to replay this chapter.`
    : `You found ${quest.name}. Speak with ${quest.guide} to begin the chapter.`;
  renderChapterNavigation();

  document.querySelector('#questDialogTitle').textContent = chapter.title;
  document.querySelector('#questFieldMap').innerHTML = renderChapterMap(index);
  document.querySelector('#questGuideName').textContent = quest.guide;
  document.querySelector('#questGuideIcon').textContent = quest.icon;
  document.querySelector('#questIntroduction').textContent = replay && completed[index]
    ? `You’ve been here before. ${quest.introduction} Replay it whenever you like; your keepsake stays collected.`
    : quest.introduction;
  document.querySelector('#questDialogHint').textContent = completed[index]
    ? 'This chapter is complete and can be replayed at any time.'
    : 'Talk to the guide to begin this chapter.';
  document.querySelector('#beginQuestButton').textContent = completed[index]
    ? 'Replay quest activity ↻'
    : 'Begin quest activity →';
  document.querySelector('#beginQuestButton').hidden = false;
  questBriefing.hidden = false;
  questActivity.hidden = true;
  disposeGame();
  disposeGame = () => { };
  gameRoot.replaceChildren();
  setStageStatus(completed[index] ? 'Replay available' : 'Quest available', '');
  world.setPaused(true);
  if (!questDialog.open) questDialog.showModal();
}

function closeQuestDialog() {
  disposeGame();
  disposeGame = () => { };
  gameRoot.replaceChildren();
  world.setPaused(false);
  if (questDialog.open) questDialog.close();
  setStageStatus('Exploring', '');
}

function selectChapter(level, walk = true) {
  const index = level - 1;
  if (!Number.isInteger(level) || index < 0 || index >= chapters.length) return;
  activeChapter = index;
  stageTitle.textContent = `Journey to ${QUEST_LOCATIONS[index].name}`;
  worldLocation.textContent = QUEST_LOCATIONS[index].region;
  setStageStatus(completed[index] ? 'Replay available' : 'Destination set', '');
  dialogue.textContent = `Walking to ${QUEST_LOCATIONS[index].name}. Interact with ${QUEST_LOCATIONS[index].guide} when you arrive.`;
  renderChapterNavigation();
  world.setQuestStates(completed);
  world.selectQuest(index, walk);
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
  document.querySelector('#itemModalIcon').textContent = String(index + 1);
  document.querySelector('#itemModalTitle').textContent = `Keepsake ${index + 1}: ${memory.icon} ${memory.title}`;
  document.querySelector('#itemModalDesc').textContent = memory.description;
  showModal('itemModal');
}

function restartQuest() {
  completed = Array(chapters.length).fill(false);
  saveProgress();
  renderInventory();
  renderChapterNavigation();
  world.setQuestStates(completed);
  closeModal('victoryModal');
  closeQuestDialog();
  selectChapter(1);
}

const world = mountOverworld({
  characterName,
  worldCanvas: document.querySelector('#worldCanvas'),
  mapCanvas: document.querySelector('#worldMapCanvas'),
  interactButton: document.querySelector('#worldInteract'),
  messageElement: document.querySelector('#worldMessage'),
  locationElement: worldLocation,
  targetElement: document.querySelector('#worldTarget'),
  onInteract: showQuestBriefing,
  onMessage: (message) => { dialogue.textContent = message; },
  onQuestSelected: (index) => {
    activeChapter = index;
    stageTitle.textContent = `Journey to ${QUEST_LOCATIONS[index].name}`;
    setStageStatus(completed[index] ? 'Replay available' : 'Destination set', '');
    renderChapterNavigation();
  }
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.level) {
    if (questDialog.open) closeQuestDialog();
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
  } else if (button.dataset.action === 'close-quest') {
    closeQuestDialog();
  } else if (button.dataset.action === 'begin-quest') {
    beginQuestActivity();
  } else if (button.dataset.action === 'replay-chapter') {
    beginQuestActivity();
  } else if (button.dataset.action === 'show-victory') {
    if (!areAllQuestsComplete(completed)) {
      dialogue.textContent = 'Complete all five quests to claim the birthday reward.';
      return;
    }
    closeQuestDialog();
    showModal('victoryModal');
    audio.playSound('levelUp');
  }
});

document.addEventListener('click', (event) => {
  const backdrop = event.target.closest('[data-modal-backdrop]');
  if (backdrop && event.target === backdrop) closeModal(backdrop.id);
});

questDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeQuestDialog();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  ['victoryModal', 'itemModal', 'rivalryModal'].forEach((id) => closeModal(id));
});

window.addEventListener('pagehide', () => {
  disposeGame();
  world.dispose();
  audio.dispose();
});

renderInventory();
renderChapterNavigation();
world.setQuestStates(completed);
selectChapter(1, false);
}
