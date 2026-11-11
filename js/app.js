import { createAudioController } from './audio.js';
import { mountAbigailWorld } from './games/abigail-world.js';
import { mountAdventureWorld } from './games/adventure-world.js';
import { restoreAdventureState } from './games/adventure-logic.js';
import { mountFrightWorld } from './games/fright-world.js';
import { restoreFrightState } from './games/fright-logic.js';
import { restoreHouseState } from './games/abigail-house.js';
import { questItems } from './quest-items.js';
import { mountOverworld } from './world/overworld.js';
import { QUEST_LOCATIONS } from './world/world-data.js';
import { areAllQuestsComplete, isQuestAvailable } from './world/world-logic.js';
import { birthdayProgress, XP_PER_QUEST } from './progression.js';
import { normalizeQuestProgress, questGuideSpeech, removeQuestProgress } from './quest-progress.js';

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
  const keepsakeImages = [
    new URL('../assets/keepsakes/abigail.svg', import.meta.url).href,
    new URL('../assets/keepsakes/chucks.svg', import.meta.url).href,
    new URL('../assets/keepsakes/thirteen.svg', import.meta.url).href,
    new URL('../assets/keepsakes/goape.svg', import.meta.url).href,
    new URL('../assets/keepsakes/frights.svg', import.meta.url).href
  ];

  const chapters = [
    {
      title: 'Abigail Escape',
      location: "KETTERING · ABIGAIL'S ROOM",
      description: 'Explore Abigail’s rooms, uncover clues and unlock the escape door.',
      objective: 'Search for a key and clues, break the ward and find the escape token.'
    },
    {
      title: 'Lucky Chucks Pool Night',
      location: 'KETTERING · LUCKY CHUCKS',
      description: 'Prepare drinks and pool equipment, then recover the runaway eight-ball.',
      objective: 'Set up the drinks and pool table, find the eight-ball and speak to My Love.'
    },
    {
      title: 'Thirteen Coaster Drop',
      location: 'ALTON TOWERS · THIRTEEN',
      description: 'Ride with Meu Amor, control the carriage and stop at the drop.',
      objective: 'Board the carriage, stop in the drop zone and retrieve the bags after the ride.'
    },
    {
      title: 'Night-time GoApe Canopy',
      location: 'GOAPE · THE NIGHT CANOPY',
      description: 'Follow the lights through a treetop course and collect four treasures.',
      objective: 'Jump, climb and cross the ropes, then take the zip-wire with all four treasures.'
    },
    {
      title: 'Earls Barton Fright Nights',
      location: 'EARLS BARTON · Fright Nights',
      description: 'Explore seven unsettling corners of the maze and recover their hidden objects.',
      objective: 'Find the seven clues, solve their mechanisms and return to the escape gate.'
    }
  ];

  function readProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.completed) && saved.completed.length === chapters.length
        && saved.completed.every((value) => typeof value === 'boolean')) {
        const state = normalizeQuestProgress(saved, chapters.length);
        const gameSaves = Array.isArray(saved.gameSaves) && saved.gameSaves.length === chapters.length
          ? saved.gameSaves.map((entry, index) => state.accepted[index] && entry && typeof entry === 'object' && !Array.isArray(entry) ? entry : null)
          : Array(chapters.length).fill(null);
        if (gameSaves[0]) gameSaves[0] = restoreHouseState(gameSaves[0]);
        for (const index of [1, 2, 3]) if (gameSaves[index]) gameSaves[index] = restoreAdventureState(index, gameSaves[index]);
        if (gameSaves[4]) gameSaves[4] = restoreFrightState(gameSaves[4]);
        gameSaves.forEach((entry, index) => {
          if (entry?.complete === true) state.completed[index] = true;
        });
        return { ...state, gameSaves };
      }
    } catch (error) {
      console.error('Could not restore birthday quest progress.', error);
    }
    return { ...normalizeQuestProgress(null, chapters.length), gameSaves: Array(chapters.length).fill(null) };
  }

  const progress = readProgress();
  let completed = progress.completed;
  let accepted = progress.accepted;
  let gameSaves = progress.gameSaves;
  let suppressGameSaves = false;
  let inventorySignature = null;
  let activeChapter = 0;
  let disposeGame = () => { };
  const audio = createAudioController(document.querySelector('#toggleAudioBtn'));
  const worldLocation = document.querySelector('#worldLocation');
  const stageTitle = document.querySelector('#stageTitle');
  const stageBadge = document.querySelector('#stageBadge');
  const dialogue = document.querySelector('#dialogueText');
  const questDialog = document.querySelector('#questDialog');
  const removeQuestDialog = document.querySelector('#removeQuestDialog');
  const gameRoot = document.querySelector('#questGameRoot');
  const abigailRoot = document.querySelector('#abigailWorldRoot');
  const obscuredWorldControls = [
    document.querySelector('#worldCanvas'),
    document.querySelector('#worldMapCanvas'),
    document.querySelector('.world-move-pad'),
    document.querySelector('#worldInteract')
  ];
  let worldQuestIndex = null;
  let questToRemove = null;

  document.querySelector('#characterName').textContent = characterName;
  document.querySelector('#characterAdventure').textContent = `${characterName.toUpperCase()}'S ADVENTURE`;

  function saveProgress(progressToSave = { completed, accepted, gameSaves }) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressToSave));
      document.querySelector('#saveNotice').hidden = true;
      return true;
    } catch (error) {
      console.error('Could not save birthday quest progress.', error);
      document.querySelector('#saveNotice').hidden = false;
      dialogue.textContent = 'Your browser could not save quest progress. Keep this tab open to continue.';
      return false;
    }
  }

  function renderInventory() {
    const grid = document.querySelector('#inventoryGrid');
    grid.replaceChildren();

    memories.forEach((memory, index) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `inventory-slot ${completed[index] ? 'inventory-slot--collected' : 'inventory-slot--locked'}`;
      if (completed[index]) {
        const image = document.createElement('img');
        image.src = keepsakeImages[index];
        image.alt = '';
        slot.append(image);
      } else slot.textContent = String(index + 1);
      slot.disabled = !completed[index];
      slot.setAttribute('aria-label', completed[index]
        ? `Open keepsake ${index + 1}: ${memory.title}`
        : `Keepsake ${index + 1} not yet collected`);
      if (completed[index]) slot.dataset.memory = String(index);
      grid.append(slot);
    });
    renderQuestItems();

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

  function renderQuestItems() {
    const items = questItems(gameSaves);
    const signature = JSON.stringify(items);
    if (signature === inventorySignature) return;
    inventorySignature = signature;
    for (const id of ['questInventory', 'activityInventory']) {
      const container = document.querySelector(`#${id}`);
      container.replaceChildren();
      items.forEach((item) => {
        const entry = document.createElement('button');
        entry.type = 'button';
        entry.className = 'inventory-slot inventory-slot--collected quest-item';
        entry.title = item.name;
        entry.dataset.tooltip = item.name;
        entry.setAttribute('aria-label', `${item.name}, ${item.quest}`);
        const icon = document.createElement('img');
        icon.src = item.image;
        icon.alt = '';
        entry.append(icon);
        container.append(entry);
      });
      const emptyCount = Math.max(0, 5 - items.length);
      for (let index = 0; index < emptyCount; index += 1) {
        const empty = document.createElement('div');
        empty.className = 'inventory-slot inventory-slot--locked';
        empty.setAttribute('aria-hidden', 'true');
        container.append(empty);
      }
      container.setAttribute('aria-label', items.length
        ? `${items.length} quest ${items.length === 1 ? 'item' : 'items'}`
        : 'No quest items collected yet');
      document.querySelector(`#${id}Hint`).textContent = items.length
        ? 'Hover, focus or tap an item to see its name.'
        : 'No quest items collected yet.';
    }
  }

  function updateQuestProgress(index, state) {
    if (suppressGameSaves) return;
    gameSaves[index] = structuredClone(state);
    saveProgress();
    renderQuestItems();
  }

  function renderChapterNavigation() {
    chapters.forEach((chapter, index) => {
      const button = document.querySelector(`#qbtn-${index + 1}`);
      const status = document.querySelector(`#qstatus-${index + 1}`);
      document.querySelector(`#qentry-${index + 1}`).hidden = !accepted[index] && !completed[index];
      button.disabled = false;
      button.classList.remove('opacity-60');
      if (index === activeChapter) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      status.textContent = completed[index] ? 'Completed ✓' : 'Accepted';
      status.className = `quest-row__status ${completed[index] ? 'quest-row__status--complete' : 'quest-row__status--available'}`;
    });
    document.querySelector('#questJournalHint').textContent = accepted.some(Boolean)
      ? 'Select an accepted quest to travel to its entrance.'
      : 'Your journal is empty. Find quest givers marked on the world map.';
  }

  function setStageStatus(text, className = '') {
    stageBadge.textContent = text;
    stageBadge.className = `world-stage-badge ${className}`.trim();
  }

  function renderCompletedChapter(index) {
    if (index === worldQuestIndex) {
      abigailRoot.innerHTML = `
      <div class="abigail-world__complete">
        <p class="eyebrow">QUEST COMPLETE</p>
        <h2>${['Escaped Abigail’s room!', 'Pool night ready!', 'Thirteen complete!', 'Canopy adventure complete!', 'Escaped Fright Nights!'][index]}</h2>
        <p>Keepsake ${index + 1} collected · 20 XP earned.</p>
        <button type="button" class="rs3-btn game-control" data-action="abigail-leave">Return to the world</button>
        ${areAllQuestsComplete(completed) ? '<button type="button" class="rs3-btn game-control" data-action="show-victory">Claim birthday reward</button>' : ''}
      </div>
    `;
      abigailRoot.querySelector('[data-action="abigail-leave"]').focus();
      return;
    }
    const memory = memories[index];
    const rewardAction = areAllQuestsComplete(completed)
      ? '<button type="button" class="rs3-btn game-control game-action" data-action="show-victory">Claim character’s level 30 birthday reward 🎉</button>'
      : '';
    gameRoot.innerHTML = `
    <section class="mini-game game-complete">
      <div class="game-complete__icon" aria-hidden="true">${index + 1}</div>
      <p class="eyebrow">Keepsake ${index + 1} collected</p>
      <h3>${memory.icon} ${memory.title}</h3>
      <p>${memory.description}</p>
      <button type="button" class="rs3-btn game-control game-action" data-action="close-quest">Return to the world</button>
      ${rewardAction}
    </section>
  `;
  }

  function completeChapter(index) {
    if (index !== activeChapter || completed[index]) return;
    disposeGame();
    disposeGame = () => { };
    if (gameSaves[index]) gameSaves[index].complete = true;
    renderQuestItems();
    completed[index] = true;
    saveProgress();
    renderInventory();
    renderChapterNavigation();
    world.setQuestStates(completed, accepted);
    setStageStatus('Chapter complete', 'world-stage-badge--complete');
    dialogue.textContent = `Keepsake ${index + 1} collected. You earned ${XP_PER_QUEST} XP${areAllQuestsComplete(completed) ? ' and reached level 30!' : '.'}`;
    audio.playSound('levelUp');
    renderCompletedChapter(index);
    document.querySelector('#questDialogHint').textContent = `Quest complete. You earned ${XP_PER_QUEST} XP${areAllQuestsComplete(completed) ? ' and reached level 30!' : '.'}`;
  }

  function speakToQuestGuide(index) {
    if (!isQuestAvailable(index, completed)) return;
    activeChapter = index;
    const quest = QUEST_LOCATIONS[index];
    stageTitle.textContent = `Journey to ${quest.name}`;
    worldLocation.textContent = quest.region;
    renderChapterNavigation();
    const speech = questGuideSpeech(quest, chapters[index].title, accepted[index], completed[index]);
    setStageStatus(completed[index] ? 'Quest complete' : 'Quest available', '');
    world.showGuideSpeech(index, speech.text, speech.offer);
  }

  function acceptQuest(index) {
    if (!isQuestAvailable(index, completed) || accepted[index]) return;
    activeChapter = index;
    accepted[index] = true;
    saveProgress();
    renderChapterNavigation();
    world.setQuestStates(completed, accepted);
    world.selectQuest(index, true);
  }

  function enterQuest(index) {
    if (completed[index]) {
      if (index === 2 && gameSaves[2]?.ticket) {
        gameSaves[2] = { ...gameSaves[2], ticket: false };
        saveProgress();
        renderQuestItems();
        dialogue.textContent = 'You use your Thirteen exit ticket to leave the ride.';
        document.querySelector('#worldMessage').textContent = dialogue.textContent;
        return true;
      }
      dialogue.textContent = `${chapters[index].title} is complete. Remove it from your journal to start again.`;
      document.querySelector('#worldMessage').textContent = dialogue.textContent;
      return true;
    }
    if (!accepted[index] && !completed[index]) {
      dialogue.textContent = `Speak to ${QUEST_LOCATIONS[index].guide} to accept the quest first.`;
      return false;
    }
    activeChapter = index;
    renderChapterNavigation();
    startWorldQuest(index);
    return true;
  }
  function startWorldQuest(index) {
    disposeGame();
    disposeGame = () => { };
    activeChapter = index;
    worldQuestIndex = index;
    abigailRoot.hidden = false;
    obscuredWorldControls.forEach((element) => { element.inert = true; });
    document.querySelector('.world-map-hint').textContent = 'The world map shows your location outside the quest.';
    stageTitle.textContent = ['Abigail Escape · The Wardkeeper’s Escape', 'Lucky Chucks · Pool Night',
      'Thirteen · The Ride', 'GoApe · The Night Canopy', 'Fright Nights · The Seven Fears'][index];
    setStageStatus('Quest in progress', 'world-stage-badge--active');
    world.setPaused(true);
    const mount = index === 0 ? mountAbigailWorld : index === 4 ? mountFrightWorld : mountAdventureWorld;
    disposeGame = mount(abigailRoot, {
      index,
      characterName,
      savedState: gameSaves[index],
      onProgress: (state) => updateQuestProgress(index, state),
      onComplete: () => completeChapter(index),
      onLeave: leaveWorldQuest,
      onMessage: (message) => {
        dialogue.textContent = message;
        document.querySelector('#worldMessage').textContent = message;
      },
      playSound: (effect) => audio.playSound(effect)
    });
  }

  function leaveWorldQuest() {
    if (worldQuestIndex === null) return;
    if (worldQuestIndex === 2 && completed[2] && gameSaves[2]?.ticket) {
      gameSaves[2] = { ...gameSaves[2], ticket: false };
      saveProgress();
      renderQuestItems();
    }
    disposeGame();
    disposeGame = () => { };
    abigailRoot.replaceChildren();
    abigailRoot.hidden = true;
    worldQuestIndex = null;
    obscuredWorldControls.forEach((element) => { element.inert = false; });
    document.querySelector('.world-map-hint').textContent = 'Tap a marker to travel. The house marks Lumbridge Castle.';
    world.setPaused(false);
    stageTitle.textContent = `Journey to ${QUEST_LOCATIONS[activeChapter].name}`;
    setStageStatus('Exploring', '');
    document.querySelector('#worldCanvas').focus();
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
    leaveWorldQuest();
    activeChapter = index;
    stageTitle.textContent = `Journey to ${QUEST_LOCATIONS[index].name}`;
    worldLocation.textContent = QUEST_LOCATIONS[index].region;
    setStageStatus(completed[index] ? 'Quest complete' : 'Destination set', '');
    dialogue.textContent = `Walking to ${QUEST_LOCATIONS[index].entrance.name}. Interact with the entrance when you arrive.`;
    renderChapterNavigation();
    world.setQuestStates(completed, accepted);
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
    const image = document.createElement('img');
    image.src = keepsakeImages[index];
    image.alt = '';
    document.querySelector('#itemModalIcon').replaceChildren(image);
    document.querySelector('#itemModalTitle').textContent = `Keepsake ${index + 1}: ${memory.icon} ${memory.title}`;
    document.querySelector('#itemModalDesc').textContent = memory.description;
    showModal('itemModal');
  }

  function promptRemoveQuest(index) {
    if (!isQuestAvailable(index, completed) || (!accepted[index] && !completed[index])) return;
    questToRemove = index;
    document.querySelector('#removeQuestTitle').textContent = `Remove ${chapters[index].title}?`;
    document.querySelector('#removeQuestDescription').textContent = completed[index]
      ? `This removes its completion, keepsake and ${XP_PER_QUEST} XP. Your level and birthday reward eligibility may change. You can accept and complete it again by speaking to ${QUEST_LOCATIONS[index].guide}.`
      : `This removes the quest and its unfinished progress. You can accept it again by speaking to ${QUEST_LOCATIONS[index].guide}.`;
    if (worldQuestIndex === null) world.setPaused(true);
    removeQuestDialog.showModal();
  }

  function closeRemoveQuestDialog() {
    questToRemove = null;
    removeQuestDialog.close();
    if (worldQuestIndex === null) world.setPaused(false);
  }

  function confirmRemoveQuest() {
    const index = questToRemove;
    if (index === null || (!accepted[index] && !completed[index])) return;
    const updated = { ...removeQuestProgress({ completed, accepted }, index), gameSaves: [...gameSaves] };
    updated.gameSaves[index] = null;
    if (!saveProgress(updated)) {
      document.querySelector('#removeQuestDescription').textContent = 'The quest could not be removed because your browser could not save progress. Your quest is unchanged; please try again.';
      return;
    }
    const wasActive = activeChapter === index;
    closeRemoveQuestDialog();
    if (worldQuestIndex === index) {
      suppressGameSaves = true;
      leaveWorldQuest();
      suppressGameSaves = false;
    }
    completed = updated.completed;
    accepted = updated.accepted;
    gameSaves = updated.gameSaves;
    world.clearQuestSelection(index);
    if (wasActive && worldQuestIndex === null) {
      activeChapter = null;
      stageTitle.textContent = "Level 30 birthday adventure";
      setStageStatus('Exploring', '');
    }
    renderInventory();
    renderChapterNavigation();
    world.setQuestStates(completed, accepted);
    dialogue.textContent = `${chapters[index].title} removed. Speak to ${QUEST_LOCATIONS[index].guide} to start again.`;
    document.querySelector('#worldMessage').textContent = dialogue.textContent;
    document.querySelector('#questPanelTitle').focus();
  }

  const world = mountOverworld({
    characterName,
    worldCanvas: document.querySelector('#worldCanvas'),
    mapCanvas: document.querySelector('#worldMapCanvas'),
    interactButton: document.querySelector('#worldInteract'),
    messageElement: document.querySelector('#worldMessage'),
    locationElement: worldLocation,
    targetElement: document.querySelector('#worldTarget'),
    onGuide: speakToQuestGuide,
    onAcceptQuest: acceptQuest,
    onEntrance: enterQuest,
    onMessage: (message) => { dialogue.textContent = message; },
    onQuestSelected: (index) => {
      activeChapter = index;
      stageTitle.textContent = `Journey to ${QUEST_LOCATIONS[index].name}`;
      setStageStatus(completed[index] ? 'Quest complete' : 'Destination set', '');
      renderChapterNavigation();
    }
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.classList.contains('quest-item')) {
      const show = !button.classList.contains('quest-item--show-name');
      document.querySelectorAll('.quest-item--show-name').forEach((item) => item.classList.remove('quest-item--show-name'));
      button.classList.toggle('quest-item--show-name', show);
    } else if (button.dataset.removeQuest !== undefined) {
      promptRemoveQuest(Number(button.dataset.removeQuest));
    } else if (button.dataset.action === 'cancel-remove-quest') {
      closeRemoveQuestDialog();
    } else if (button.dataset.action === 'confirm-remove-quest') {
      confirmRemoveQuest();
    } else if (button.dataset.level) {
      if (questDialog.open) closeQuestDialog();
      selectChapter(Number(button.dataset.level));
    } else if (button.dataset.memory !== undefined) {
      showMemory(Number(button.dataset.memory));
    } else if (button.dataset.action === 'toggle-audio') {
      audio.toggleMusic().catch((error) => {
        console.error('Birthday music could not be started.', error);
        document.querySelector('#audioText').textContent = 'Audio could not start';
      });
    } else if (button.dataset.action === 'abigail-leave') {
      leaveWorldQuest();
    } else if (button.dataset.action === 'toggle-rivalry') {
      document.querySelector('#rivalryModal').classList.toggle('hidden');
    } else if (button.dataset.action === 'close-item') {
      closeModal('itemModal');
    } else if (button.dataset.action === 'close-victory') {
      closeModal('victoryModal');
    } else if (button.dataset.action === 'close-quest') {
      closeQuestDialog();
    } else if (button.dataset.action === 'show-victory') {
      if (!areAllQuestsComplete(completed)) {
        dialogue.textContent = 'Complete all five quests to claim the birthday reward.';
        return;
      }
      leaveWorldQuest();
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

  removeQuestDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeRemoveQuestDialog();
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
  world.setQuestStates(completed, accepted);
}
