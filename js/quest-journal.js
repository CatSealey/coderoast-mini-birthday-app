import { FRIGHT_OBJECTS, FRIGHT_THEMES } from './games/fright-logic.js';
import { COASTER_GOAL, COASTER_TREATS } from './games/coaster-course.js';

const step = (text, done) => ({ text, done: Boolean(done) });

export function questJournalSteps(index, saved, completed = false) {
  const state = saved || {};
  const done = completed || state.complete === true;
  const items = state.collected || [];
  let steps;
  switch (index) {
    case 0:
      steps = [
        step('Find the small key behind Abigail’s doll.', state.hasKey || state.chamberUnlocked),
        step('Read the caretaker’s diary.', state.diaryRead),
        step('Unlock the chamber door.', state.chamberUnlocked),
        ...['Star', 'Moon', 'Diamond'].map((rune) => step(`Find the ${rune} rune.`, state.collectedRunes?.includes(rune) || state.wardSolved)),
        step('Use the diary and runes to break the ward.', state.wardSolved),
        step('Take the escape token from the chest.', state.hasToken),
        step('Use the token to escape.', done)
      ];
      break;
    case 1:
      steps = [
        step('Collect drinks from the bar.', state.drinks || state.drinksPlaced),
        step('Place the drinks on the table.', state.drinksPlaced),
        step('Read the scorecard for the ball case code.', state.noteRead || state.caseUnlocked),
        step('Find the pool cues.', state.cues || state.cuesPlaced),
        step('Unlock the ball case and collect the balls.', state.balls || state.ballsPlaced || state.caseUnlocked),
        step('Place the cues on the pool table.', state.cuesPlaced),
        step('Place the balls on the pool table.', state.ballsPlaced),
        step('Make a controlled break.', state.ballLost),
        step('Get the retrieval hook from the cupboard.', state.hook || state.ballFound || state.pubEnding),
        step('Retrieve the eight-ball from under the cabinet.', state.ballFound || state.pubEnding),
        step('Give the eight-ball to Cat.', state.pubEnding || done),
        step('Leave Lucky Chucks together.', done)
      ];
      break;
    case 2: {
      const phase = state.phase || 'boarding';
      const dropped = ['dropping', 'returning', 'platform', 'finished'].includes(phase);
      const legacySignals = state.signals ?? (state.progress >= 0.48 ? 2 : state.progress >= 0.22 ? 1 : 0);
      const count = state.rideVersion === 3 ? COASTER_TREATS.filter((treat) => state.treats?.includes(treat.id)).length
        : dropped || (state.rideVersion === 2 && legacySignals === 3) ? COASTER_GOAL
          : phase === 'riding' ? Math.min(legacySignals, 2) : 0;
      const goalReached = count >= COASTER_GOAL;
      steps = [
        step('Board the carriage with Cat.', phase !== 'boarding'),
        step(`Collect all park items (${Math.min(count, COASTER_GOAL)}/${COASTER_GOAL}).`, goalReached),
        step('Take the drop and ride backwards.', dropped),
        step('Climb back to the station.', phase === 'platform' || phase === 'finished'),
        step('Collect the bags from the locker.', state.bags || state.rideEnding || phase === 'finished'),
        step('Give the bags to Cat.', state.rideEnding || done),
        step('Leave Thirteen together.', done)
      ];
      break;
    }
    case 3:
      steps = [
        step('Find the glowing leaf.', items.includes('leaf') || state.treasuresUsed),
        step('Climb the net.', state.checkpoint >= 1),
        step('Find the night feather.', items.includes('feather') || state.treasuresUsed),
        step('Cross the rope.', state.checkpoint >= 2),
        step('Find the silver acorn.', items.includes('acorn') || state.treasuresUsed),
        step('Jump to the next platform.', state.checkpoint >= 3),
        step('Find the forest star.', items.includes('star') || state.treasuresUsed),
        step('Cross the high rope bridge.', state.checkpoint >= 4),
        step('Light the first lantern.', state.lanterns?.includes('lantern-1')),
        step('Jump to the second lantern platform.', state.checkpoint >= 5),
        step('Light the second lantern.', state.lanterns?.includes('lantern-2')),
        step('Climb the summit net.', state.checkpoint >= 6),
        step('Cross the summit rope bridge.', state.checkpoint >= 7),
        step('Light the final lantern.', state.lanterns?.includes('lantern-3')),
        step('Present all four treasures at the zip-wire.', state.treasuresUsed),
        step('Ride the zip-wire to the finish.', done)
      ];
      break;
    case 4:
      steps = FRIGHT_THEMES.map((theme) => {
        const foundClues = new Set(state.clues || []);
        const clues = FRIGHT_OBJECTS.filter((object) => object.kind === 'clue' && object.theme === theme.id);
        const found = clues.filter((clue) => foundClues.has(clue.id)).length;
        const collected = items.includes(theme.id);
        const progress = collected || done ? '' : ` (${found}/${clues.length} clues${state.tools?.includes(theme.id) ? ', tool found' : ''})`;
        const substeps = clues.map((clue, index) => {
          if (foundClues.has(clue.id)) return step(`${clue.name}: ${clue.text}`, true);
          if (done) return { ...step(`${theme.name} clue ${index + 1}.`, false), status: 'Not recorded' };
          return step(`Find ${theme.name} clue ${index + 1}.`, false);
        });
        return { ...step(`${theme.name}: recover the ${theme.item.toLowerCase()}${progress}.`, collected), substeps };
      });
      steps.push(step('Escape with all seven objects using the teleport or escape gate.', done));
      break;
    default:
      throw new RangeError('Unknown quest.');
  }
  return done ? steps.map((entry) => ({ ...entry, done: true })) : steps;
}

export function trophyJournalSteps(displays, completed = false) {
  const names = ['Abigail', 'Lucky Chucks', 'Thirteen', 'GoApe', 'Fright Nights'];
  return [
    ...names.map((name, index) => step(`Display the ${name} keepsake.`, displays[index] || completed)),
    step('Collect the birthday present.', completed)
  ];
}
