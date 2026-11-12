import { createAudioController } from './audio.js';
import { mountAbigailWorld } from './games/abigail-world.js';
import { mountAdventureWorld } from './games/adventure-world.js';
import { restoreAdventureState } from './games/adventure-logic.js';
import { mountFrightWorld } from './games/fright-world.js';
import { restoreFrightState } from './games/fright-logic.js';
import { mountTrophyRoom } from './games/trophy-room.js';
import { presentAvailable, restoreDisplays, restoreTrophyQuest } from './games/trophy-logic.js';
import { restoreHouseState } from './games/abigail-house.js';
import { questItems } from './quest-items.js';
import { mountOverworld } from './world/overworld.js';
import { QUEST_LOCATIONS } from './world/world-data.js';
import { areAllQuestsComplete, isQuestAvailable } from './world/world-logic.js';
import { birthdayProgress, XP_PER_QUEST } from './progression.js';
import { freshGameProgress, normalizeQuestProgress, questGuideSpeech, removeQuestProgress } from './quest-progress.js';
import { questJournalSteps, trophyJournalSteps } from './quest-journal.js';
import { BIRTHDAY_TICKET_MARKUP } from './games/birthday-ending.js';
import { SIDE_QUESTS, restoreSideQuestProgress } from './side-quests.js';

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
  const birthdayTicketImage = new URL('../assets/keepsakes/birthday-ticket.svg', import.meta.url).href;

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
      objective: 'Set up the drinks and pool table, find the eight-ball and speak to Cat.'
    },
    {
      title: 'Thirteen Coaster Drop',
      location: 'ALTON TOWERS · THIRTEEN',
      description: 'Ride with Cat and collect park items before the surprise drop.',
      objective: 'Hold left or right for all park items, ride backwards and retrieve the bags.'
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
      objective: 'Find the clues, solve the seven mechanisms and escape through the teleport or entrance gate.'
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
        const trophyDisplays = restoreDisplays(saved.trophyDisplays, state.completed);
        const trophyQuest = restoreTrophyQuest(saved.trophyQuest, trophyDisplays);
        if (!presentAvailable(trophyDisplays, state.completed)) trophyQuest.completed = false;
        return { ...state, gameSaves, trophyDisplays, trophyQuest, sideQuestCompleted: restoreSideQuestProgress(saved.sideQuestCompleted) };
      }
    } catch (error) {
      console.error('Could not restore birthday quest progress.', error);
    }
    return freshGameProgress(chapters.length);
  }

  const progress = readProgress();
  let completed = progress.completed;
  let accepted = progress.accepted;
  let gameSaves = progress.gameSaves;
  let trophyDisplays = progress.trophyDisplays;
  let trophyQuest = progress.trophyQuest;
  let sideQuestCompleted = progress.sideQuestCompleted;
  let inTrophyRoom = false;
  let suppressGameSaves = false;
  let inventorySignature = null;
  const journalStepSignatures = Array(chapters.length + 1).fill(null);
  let activeChapter = 0;
  let disposeGame = () => { };
  const audio = createAudioController(document.querySelector('#toggleAudioBtn'));
  const worldLocation = document.querySelector('#worldLocation');
  const stageTitle = document.querySelector('#stageTitle');
  const stageBadge = document.querySelector('#stageBadge');
  const dialogue = document.querySelector('#dialogueText');
  const questDialog = document.querySelector('#questDialog');
  const removeQuestDialog = document.querySelector('#removeQuestDialog');
  const settingsDialog = document.querySelector('#settingsDialog');
  const settingsMain = document.querySelector('#settingsMain');
  const restartConfirmation = document.querySelector('#restartConfirmation');
  const restartError = document.querySelector('#restartError');
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
  let removingTrophyQuest = false;
  let itemModalTrigger = null;

  document.querySelector('#characterName').textContent = characterName;
  document.querySelector('#characterAdventure').textContent = `${characterName.toUpperCase()}'S ADVENTURE`;

  function saveProgress(progressToSave = { completed, accepted, gameSaves, trophyDisplays, trophyQuest }) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sideQuestCompleted, ...progressToSave }));
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
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `inventory-slot ${trophyQuest.completed ? 'inventory-slot--collected' : 'inventory-slot--locked'}`;
    slot.disabled = !trophyQuest.completed;
    if (trophyQuest.completed) {
      slot.dataset.action = 'open-birthday-ticket';
      slot.setAttribute('aria-label', 'Open birthday ticket keepsake');
      const image = document.createElement('img');
      image.src = birthdayTicketImage;
      image.alt = '';
      slot.append(image);
    } else {
      slot.textContent = '?';
      slot.setAttribute('aria-label', 'Mystery keepsake not yet collected');
    }
    grid.append(slot);
    renderQuestItems();

    const { questsCompleted: count, xp, targetXp, level } = birthdayProgress(completed, trophyQuest.completed);
    const questCount = count + Number(trophyQuest.completed);
    document.querySelector('#characterProfile').setAttribute('aria-label', `Character ${characterName}, level ${level}`);
    document.querySelector('#characterLevel').textContent = `COMBAT LVL ${level}`;
    document.querySelector('#birthdayLevel').textContent = `LV ${level}`;
    document.querySelector('#actionbarLevel').textContent = String(level);
    document.querySelector('#birthdayXp').textContent = `${xp} / ${targetXp} XP`;
    document.querySelector('#itemCount').textContent = String(count);
    document.querySelector('#birthdayXpCopy').textContent = level === 30
      ? 'Level 30 reached! All birthday memories collected.'
      : `${targetXp - xp} XP to level 30 · 15 XP per keepsake quest, 25 XP for the finale`;
    document.querySelector('#questProgressText').textContent = questCount === 6
      ? 'Complete · 6/6'
      : `In progress · ${questCount}/6`;
    document.querySelector('#heroProgressText').textContent = `${questCount} of 6`;
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
      const emptyCount = Math.max(0, 6 - items.length);
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
    renderJournalSteps(index);
  }

  function renderSteps(list, count, steps, index) {
    const signature = JSON.stringify(steps);
    if (signature === journalStepSignatures[index]) return;
    journalStepSignatures[index] = signature;
    count.textContent = `(${steps.filter((entry) => entry.done).length}/${steps.length})`;
    function renderStep({ text, done, status, substeps }) {
      const item = document.createElement('li');
      const marker = document.createElement('span');
      marker.className = `quest-steps__marker${done ? ' quest-steps__marker--done' : ''}`;
      marker.setAttribute('aria-hidden', 'true');
      marker.textContent = done ? '✓' : status ? '–' : '○';
      const content = document.createElement('div');
      content.className = 'quest-steps__content';
      const label = document.createElement('span');
      label.textContent = `${text} — ${status || (done ? 'Done' : 'To do')}`;
      content.append(label);
      if (substeps?.length) {
        const nested = document.createElement('ol');
        nested.className = 'quest-steps__substeps';
        nested.append(...substeps.map(renderStep));
        content.append(nested);
      }
      item.append(marker, content);
      return item;
    }
    const scrollTop = list.scrollTop;
    list.replaceChildren(...steps.map(renderStep));
    list.scrollTop = scrollTop;
  }

  function renderJournalSteps(index) {
    renderSteps(document.querySelector(`#questSteps-${index + 1}`),
      document.querySelector(`#questStepsCount-${index + 1}`),
      questJournalSteps(index, gameSaves[index], completed[index]), index);
  }

  function renderTrophySteps() {
    renderSteps(document.querySelector('#trophySteps'), document.querySelector('#trophyStepsCount'),
      trophyJournalSteps(trophyDisplays, trophyQuest.completed), chapters.length);
  }

  function renderSideQuests() {
    const list = document.querySelector('#sideQuestList');
    const buttons = SIDE_QUESTS.map((quest) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quest-row';
      button.dataset.sideQuest = String(quest.id);
      button.setAttribute('aria-label', `${quest.title} — ${sideQuestCompleted[quest.id] ? 'completed' : 'not completed'}. Find Cat.`);
      const icon = document.createElement('span');
      icon.className = 'quest-row__icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '✪';
      const copy = document.createElement('span');
      copy.className = 'quest-row__copy';
      const title = document.createElement('strong');
      title.textContent = quest.title;
      const location = document.createElement('small');
      location.textContent = `${QUEST_LOCATIONS[quest.id].name} · Find Cat`;
      copy.append(title, location);
      const status = document.createElement('span');
      status.className = `quest-row__status${sideQuestCompleted[quest.id] ? ' quest-row__status--complete' : ''}`;
      status.setAttribute('aria-hidden', 'true');
      status.textContent = sideQuestCompleted[quest.id] ? '✓ Done' : '○ To do';
      button.append(icon, copy, status);
      return button;
    });
    list.replaceChildren(...buttons);
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
      renderJournalSteps(index);
    });
    document.querySelector('#trophyQuestEntry').hidden = !trophyQuest.accepted;
    const trophyStatus = document.querySelector('#trophyQuestStatus');
    trophyStatus.textContent = trophyQuest.completed ? 'Completed ✓' : 'Accepted';
    trophyStatus.className = `quest-row__status ${trophyQuest.completed ? 'quest-row__status--complete' : 'quest-row__status--available'}`;
    renderTrophySteps();
    renderSideQuests();
    document.querySelector('#questJournalHint').textContent = accepted.some(Boolean) || trophyQuest.accepted
      ? 'Select an accepted quest to travel to its entrance.'
      : 'Find quest givers marked on the world map, or explore the side quests below.';
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
        <p>Keepsake ${index + 1} collected · ${XP_PER_QUEST} XP earned.</p>
        <button type="button" class="rs3-btn game-control" data-action="abigail-leave">Return to the world</button>
      </div>
    `;
      abigailRoot.querySelector('[data-action="abigail-leave"]').focus();
      return;
    }
    const memory = memories[index];
    gameRoot.innerHTML = `
    <section class="mini-game game-complete">
      <div class="game-complete__icon" aria-hidden="true">${index + 1}</div>
      <p class="eyebrow">Keepsake ${index + 1} collected</p>
      <h3>${memory.icon} ${memory.title}</h3>
      <p>${memory.description}</p>
      <button type="button" class="rs3-btn game-control game-action" data-action="close-quest">Return to the world</button>
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
    world.setQuestStates(completed, accepted, trophyQuest.completed);
    setStageStatus('Chapter complete', 'world-stage-badge--complete');
    dialogue.textContent = `Keepsake ${index + 1} collected. You earned ${XP_PER_QUEST} XP${areAllQuestsComplete(completed) ? '. Display your keepsakes in the castle and collect the final present to reach level 30.' : '.'}`;
    audio.playSound('success');
    renderCompletedChapter(index);
    document.querySelector('#questDialogHint').textContent = `Quest complete. You earned ${XP_PER_QUEST} XP.`;
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
    world.setQuestStates(completed, accepted, trophyQuest.completed);
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

  function leaveTrophyRoom() {
    if (!inTrophyRoom) return;
    disposeGame(); disposeGame = () => { };
    abigailRoot.replaceChildren(); abigailRoot.hidden = true; inTrophyRoom = false;
    obscuredWorldControls.forEach((element) => { element.inert = false; });
    document.querySelector('.world-map-hint').textContent = 'Tap a marker to travel. The house marks Lumbridge Castle.';
    world.setPaused(false);
    stageTitle.textContent = 'Birthday adventure';
    setStageStatus('Exploring', '');
    document.querySelector('#worldCanvas').focus();
  }

  function enterTrophyRoom() {
    if (inTrophyRoom || worldQuestIndex !== null) return;
    if (!trophyQuest.accepted) {
      dialogue.textContent = 'Speak to Elowen the Curator outside the castle to accept The Hall of Memories.';
      document.querySelector('#worldMessage').textContent = dialogue.textContent;
      return;
    }
    inTrophyRoom = true;
    abigailRoot.hidden = false;
    obscuredWorldControls.forEach((element) => { element.inert = true; });
    document.querySelector('.world-map-hint').textContent = 'The world map shows your location outside the trophy room.';
    stageTitle.textContent = 'Lumbridge Castle · Trophy Room';
    setStageStatus('Trophy room', '');
    world.setPaused(true);
    disposeGame = mountTrophyRoom(abigailRoot, {
      characterName, memories, images: keepsakeImages, completed, displays: trophyDisplays,
      onDisplays: (displays) => { trophyDisplays = displays; saveProgress(); renderTrophySteps(); },
      onPresent: () => {
        if (!presentAvailable(trophyDisplays, completed)) return false;
        if (!trophyQuest.completed) {
          const nextTrophyQuest = { accepted: true, completed: true };
          if (!saveProgress({ completed, accepted, gameSaves, trophyDisplays, trophyQuest: nextTrophyQuest })) {
            document.querySelector('#worldMessage').textContent = 'The present could not be saved. Please try again.';
            return false;
          }
          trophyQuest = nextTrophyQuest;
          renderInventory();
          renderChapterNavigation();
          world.setQuestStates(completed, accepted, trophyQuest.completed);
          audio.playSound('levelUp');
        }
        audio.prepareBirthdayCelebration().catch((error) => {
          console.error('Birthday music could not be started.', error);
          document.querySelector('#audioText').textContent = 'Audio could not start';
        });
        return true;
      },
      onCakeArrives: () => audio.startBirthdayCelebration(),
      onBirthdayFinished: () => audio.finishBirthdayCelebration(),
      onBirthdayEnd: () => audio.stopBirthdayCelebration(),
      onLeave: leaveTrophyRoom,
      onMessage: (message) => { dialogue.textContent = message; document.querySelector('#worldMessage').textContent = message; }
    });
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
    leaveTrophyRoom();
    activeChapter = index;
    stageTitle.textContent = `Journey to ${QUEST_LOCATIONS[index].name}`;
    worldLocation.textContent = QUEST_LOCATIONS[index].region;
    setStageStatus(completed[index] ? 'Quest complete' : 'Destination set', '');
    dialogue.textContent = `Walking to ${QUEST_LOCATIONS[index].entrance.name}. Interact with the entrance when you arrive.`;
    renderChapterNavigation();
    world.setQuestStates(completed, accepted, trophyQuest.completed);
    world.selectQuest(index, walk);
  }

  function showModal(id) {
    const modal = document.querySelector(`#${id}`);
    if (id === 'itemModal') itemModalTrigger = document.activeElement;
    modal.classList.remove('hidden');
    if (id === 'itemModal') modal.querySelector('[data-action="close-item"]').focus();
  }

  function closeModal(id) {
    const modal = document.querySelector(`#${id}`);
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    if (id === 'itemModal') {
      if (itemModalTrigger?.isConnected) itemModalTrigger.focus();
      itemModalTrigger = null;
    }
  }

  function showMemory(index) {
    const memory = memories[index];
    if (!memory || !completed[index]) return;
    const image = document.createElement('img');
    image.src = keepsakeImages[index];
    image.alt = '';
    document.querySelector('#itemModalIcon').replaceChildren(image);
    document.querySelector('#itemModalTitle').textContent = `Keepsake ${index + 1}: ${memory.icon} ${memory.title}`;
    document.querySelector('#itemModalType').textContent = 'Quest Memory Item';
    document.querySelector('#itemModalDesc').textContent = memory.description;
    showModal('itemModal');
  }

  function showBirthdayTicket() {
    if (!trophyQuest.completed) return;
    const image = document.createElement('img');
    image.src = birthdayTicketImage;
    image.alt = '';
    document.querySelector('#itemModalIcon').replaceChildren(image);
    document.querySelector('#itemModalTitle').textContent = 'Birthday ticket';
    document.querySelector('#itemModalType').textContent = 'Birthday keepsake';
    document.querySelector('#itemModalDesc').innerHTML = BIRTHDAY_TICKET_MARKUP;
    showModal('itemModal');
  }

  function promptRemoveQuest(index) {
    if (!isQuestAvailable(index, completed) || (!accepted[index] && !completed[index])) return;
    questToRemove = index;
    document.querySelector('#removeQuestTitle').textContent = `Remove ${chapters[index].title}?`;
    document.querySelector('#removeQuestDescription').textContent = completed[index]
      ? `This removes its completion, keepsake and ${XP_PER_QUEST} XP.${trophyQuest.completed ? ' It also resets the hall finale and removes its 25 XP and level 30.' : ''} You can accept and complete it again by speaking to ${QUEST_LOCATIONS[index].guide}.`
      : `This removes the quest and its unfinished progress. You can accept it again by speaking to ${QUEST_LOCATIONS[index].guide}.`;
    if (worldQuestIndex === null) world.setPaused(true);
    removeQuestDialog.showModal();
  }

  function closeRemoveQuestDialog() {
    questToRemove = null;
    removingTrophyQuest = false;
    removeQuestDialog.close();
    if (worldQuestIndex === null && !inTrophyRoom) world.setPaused(false);
  }

  function confirmRemoveQuest() {
    if (removingTrophyQuest) {
      const updated = {
        completed, accepted, gameSaves, trophyDisplays: Array(memories.length).fill(false),
        trophyQuest: { accepted: false, completed: false }
      };
      if (!saveProgress(updated)) {
        document.querySelector('#removeQuestDescription').textContent = 'The quest could not be removed because your browser could not save progress. Please try again.';
        return;
      }
      closeRemoveQuestDialog(); leaveTrophyRoom();
      trophyDisplays = updated.trophyDisplays; trophyQuest = updated.trophyQuest;
      document.querySelector('#trophyQuestEntry .quest-steps').open = false;
      renderInventory();
      renderChapterNavigation();
      world.setQuestStates(completed, accepted, trophyQuest.completed);
      dialogue.textContent = 'The Hall of Memories was removed. Speak to Elowen to start again.';
      document.querySelector('#worldMessage').textContent = dialogue.textContent;
      document.querySelector('#questPanelTitle').focus();
      return;
    }
    const index = questToRemove;
    if (index === null || (!accepted[index] && !completed[index])) return;
    const updated = { ...removeQuestProgress({ completed, accepted }, index), gameSaves: [...gameSaves], trophyDisplays: [...trophyDisplays], trophyQuest: { ...trophyQuest, completed: false } };
    updated.gameSaves[index] = null;
    updated.trophyDisplays[index] = false;
    if (!saveProgress(updated)) {
      document.querySelector('#removeQuestDescription').textContent = 'The quest could not be removed because your browser could not save progress. Your quest is unchanged; please try again.';
      return;
    }
    const wasActive = activeChapter === index;
    closeRemoveQuestDialog();
    leaveTrophyRoom();
    if (worldQuestIndex === index) {
      suppressGameSaves = true;
      leaveWorldQuest();
      suppressGameSaves = false;
    }
    completed = updated.completed;
    accepted = updated.accepted;
    gameSaves = updated.gameSaves;
    trophyDisplays = updated.trophyDisplays;
    trophyQuest = updated.trophyQuest;
    document.querySelector(`#qentry-${index + 1} .quest-steps`).open = false;
    world.clearQuestSelection(index);
    if (wasActive && worldQuestIndex === null) {
      activeChapter = null;
      stageTitle.textContent = "Birthday adventure";
      setStageStatus('Exploring', '');
    }
    renderInventory();
    renderChapterNavigation();
    world.setQuestStates(completed, accepted, trophyQuest.completed);
    dialogue.textContent = `${chapters[index].title} removed. Speak to ${QUEST_LOCATIONS[index].guide} to start again.`;
    document.querySelector('#worldMessage').textContent = dialogue.textContent;
    document.querySelector('#questPanelTitle').focus();
  }

  function showSettings() {
    settingsMain.hidden = false;
    restartConfirmation.hidden = true;
    restartError.hidden = true;
    settingsDialog.setAttribute('aria-labelledby', 'settingsTitle');
    settingsDialog.setAttribute('aria-describedby', 'settingsDescription');
    if (worldQuestIndex === null && !inTrophyRoom) world.setPaused(true);
    settingsDialog.showModal();
  }

  function closeSettings() {
    settingsDialog.close();
    if (worldQuestIndex === null && !inTrophyRoom) world.setPaused(false);
  }

  function showRestartConfirmation(show) {
    settingsMain.hidden = show;
    restartConfirmation.hidden = !show;
    restartError.hidden = true;
    settingsDialog.setAttribute('aria-labelledby', show ? 'restartTitle' : 'settingsTitle');
    settingsDialog.setAttribute('aria-describedby', show ? 'restartDescription' : 'settingsDescription');
    settingsDialog.querySelector(show ? '[data-action="cancel-restart"]' : '[data-action="request-restart"]').focus();
  }

  function restartGame() {
    const fresh = freshGameProgress(chapters.length);
    if (!saveProgress(fresh)) {
      restartError.textContent = 'The game could not be restarted because your browser could not save progress. Your existing progress is unchanged.';
      restartError.hidden = false;
      return;
    }
    suppressGameSaves = true;
    completed = fresh.completed; accepted = fresh.accepted; gameSaves = fresh.gameSaves;
    trophyDisplays = fresh.trophyDisplays; trophyQuest = fresh.trophyQuest; sideQuestCompleted = fresh.sideQuestCompleted;
    settingsDialog.close();
    leaveWorldQuest(); leaveTrophyRoom();
    if (questDialog.open) closeQuestDialog();
    suppressGameSaves = false;
    activeChapter = null;
    document.querySelectorAll('.quest-steps').forEach((details) => { details.open = false; });
    world.reset();
    world.setQuestStates(completed, accepted, false);
    world.setPaused(false);
    stageTitle.textContent = 'Birthday adventure';
    setStageStatus('Exploring', '');
    renderInventory(); renderChapterNavigation();
    dialogue.textContent = 'Your adventure has restarted. Find a quest giver to begin.';
    document.querySelector('#worldMessage').textContent = dialogue.textContent;
    document.querySelector('#worldCanvas').focus();
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
    onCastle: enterTrophyRoom,
    onTrophyGuide: () => {
      const words = trophyQuest.completed
        ? 'The hall is complete, and your birthday present is waiting inside whenever you wish to revisit it.'
        : trophyQuest.accepted
          ? 'Bring your five keepsakes to the hall and place each one on its display. A birthday surprise awaits.'
          : 'I care for a hall of memories in the castle. Will you gather your five keepsakes and display them there? I have a birthday surprise for you.';
      world.showTrophySpeech(words, !trophyQuest.accepted);
    },
    onAcceptTrophy: () => {
      trophyQuest = { accepted: true, completed: false }; saveProgress(); renderChapterNavigation();
      dialogue.textContent = 'The Hall of Memories added to your journal. Enter the castle to display your keepsakes.';
      document.querySelector('#worldMessage').textContent = dialogue.textContent;
    },
    onSideQuest: (index) => {
      if (sideQuestCompleted[index]) return true;
      const next = [...sideQuestCompleted];
      next[index] = true;
      if (!saveProgress({ completed, accepted, gameSaves, trophyDisplays, trophyQuest, sideQuestCompleted: next })) return false;
      sideQuestCompleted = next;
      renderSideQuests();
      return true;
    },
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
    if (button.dataset.sideQuest !== undefined) {
      const index = Number(button.dataset.sideQuest);
      if (!SIDE_QUESTS[index]) return;
      leaveWorldQuest(); leaveTrophyRoom();
      activeChapter = null;
      stageTitle.textContent = `Find Cat · ${SIDE_QUESTS[index].title}`;
      setStageStatus('Destination set', '');
      world.selectSideQuest(index);
      return;
    }
    if (button.classList.contains('quest-item')) {
      const show = !button.classList.contains('quest-item--show-name');
      document.querySelectorAll('.quest-item--show-name').forEach((item) => item.classList.remove('quest-item--show-name'));
      button.classList.toggle('quest-item--show-name', show);
    } else if (button.dataset.action === 'trophy-quest') {
      leaveWorldQuest(); leaveTrophyRoom();
      world.walkToCastle();
    } else if (button.dataset.action === 'remove-trophy-quest') {
      if (!trophyQuest.accepted) return;
      removingTrophyQuest = true;
      document.querySelector('#removeQuestTitle').textContent = 'Remove The Hall of Memories?';
      document.querySelector('#removeQuestDescription').textContent = 'This resets the hall quest and its displays. Your five keepsakes and their XP remain, but the finale’s 25 XP and level 30 are removed if earned. Speak to Elowen to accept it again.';
      if (worldQuestIndex === null) world.setPaused(true);
      removeQuestDialog.showModal();
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
    } else if (button.dataset.action === 'open-birthday-ticket') {
      showBirthdayTicket();
    } else if (button.dataset.action === 'toggle-audio') {
      audio.toggleMusic().catch((error) => {
        console.error('Birthday music could not be started.', error);
        document.querySelector('#audioText').textContent = 'Audio could not start';
      });
    } else if (button.dataset.action === 'abigail-leave') {
      leaveWorldQuest();
    } else if (button.dataset.action === 'open-settings') {
      showSettings();
    } else if (button.dataset.action === 'close-settings') {
      closeSettings();
    } else if (button.dataset.action === 'request-restart') {
      showRestartConfirmation(true);
    } else if (button.dataset.action === 'cancel-restart') {
      showRestartConfirmation(false);
    } else if (button.dataset.action === 'confirm-restart') {
      restartGame();
    } else if (button.dataset.action === 'close-item') {
      closeModal('itemModal');
    } else if (button.dataset.action === 'close-quest') {
      closeQuestDialog();
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

  settingsDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (!restartConfirmation.hidden) showRestartConfirmation(false);
    else closeSettings();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    closeModal('itemModal');
  });

  document.querySelector('.quest-journal__scroll').addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
      event.stopPropagation();
    }
  });
  window.addEventListener('pagehide', () => {
    disposeGame();
    world.dispose();
    audio.dispose();
  });

  renderInventory();
  renderChapterNavigation();
  world.setQuestStates(completed, accepted, trophyQuest.completed);
}
