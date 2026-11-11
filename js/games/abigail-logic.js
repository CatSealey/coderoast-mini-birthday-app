export const ABIGAIL_ROOMS = Object.freeze({
  vestibule: {
    name: 'The Vestibule',
    objects: [
      { id: 'diary', name: 'Caretaker’s diary', icon: '📖', x: 1, y: 1 },
      { id: 'mara', name: 'Mara the Wardkeeper', icon: '🧙‍♀️', x: 3, y: 1 },
      { id: 'doll', name: 'Abigail’s doll', icon: '🧸', x: 5, y: 1 },
      { id: 'chamberDoor', name: 'Locked chamber door', icon: '🚪', x: 6, y: 2 }
    ]
  },
  chamber: {
    name: 'The Warding Chamber',
    objects: [
      { id: 'returnDoor', name: 'Door to the vestibule', icon: '🚪', x: 0, y: 2 },
      { id: 'mara', name: 'Mara the Wardkeeper', icon: '🧙‍♀️', x: 1, y: 3 },
      { id: 'book', name: 'Wardkeeper’s book', icon: '📜', x: 1, y: 1 },
      { id: 'ward', name: 'Runic ward', icon: '🔮', x: 3, y: 1 },
      { id: 'chest', name: 'Sealed chest', icon: '🗝️', x: 5, y: 3 },
      { id: 'exit', name: 'Escape door', icon: '🚪', x: 6, y: 2 }
    ]
  }
});

export const ABIGAIL_RUNES = Object.freeze(['Star', 'Moon', 'Diamond']);
export const ABIGAIL_SOLUTION = Object.freeze(['Star', 'Moon', 'Diamond']);
export const ABIGAIL_RUNE_OPTIONS = Object.freeze([
  Object.freeze({ name: 'Moon', symbol: '☾' }),
  Object.freeze({ name: 'Diamond', symbol: '◇' }),
  Object.freeze({ name: 'Star', symbol: '✦' })
]);

export function newAbigailState() {
  return {
    room: 'vestibule', player: { x: 1, y: 3 }, diaryRead: false,
    hasKey: false, wardSolved: false, hasToken: false, runeInput: [], puzzleOpen: false, complete: false,
    message: 'Mara: Abigail’s room has locked itself. Search for clues and a way into the warding chamber.'
  };
}

export function abigailObjective(state) {
  if (!state.hasKey) return 'Search the vestibule for a way into the chamber.';
  if (state.room === 'vestibule') return 'Use the small key on the chamber door.';
  if (!state.diaryRead) return 'The ward needs a clue. Return to the diary in the vestibule.';
  if (!state.wardSolved) return 'Use the diary clue to break the runic ward.';
  if (!state.hasToken) return 'Search the unsealed chest for the escape token.';
  return 'Use the escape token on the exit door.';
}

export function moveAbigail(state, direction) {
  const movement = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction];
  if (!movement || state.complete || state.puzzleOpen) return state;
  const x = state.player.x + movement[0], y = state.player.y + movement[1];
  if (x < 0 || x >= 7 || y < 0 || y >= 5) return { ...state, message: 'The stone wall blocks the way.' };
  const object = ABIGAIL_ROOMS[state.room].objects.find((item) => item.x === x && item.y === y);
  if (object) return interactAbigail(state, object.id);
  return { ...state, player: { x, y } };
}

export function interactAbigail(state, id) {
  if (state.complete || state.puzzleOpen) return state;
  const object = ABIGAIL_ROOMS[state.room].objects.find((item) => item.id === id);
  if (!object) return state;
  if (Math.abs(state.player.x - object.x) + Math.abs(state.player.y - object.y) !== 1) {
    return { ...state, message: `Move next to ${object.name} to inspect it.` };
  }
  return applyAbigailInteraction(state, id);
}

export function applyAbigailInteraction(state, id) {
  if (state.complete || state.puzzleOpen) return state;
  switch (id) {
    case 'mara':
      if (state.room === 'vestibule') {
        return { ...state, message: state.hasKey
          ? 'Mara: That key should open the chamber. The diary might help us once we get inside.'
          : 'Mara: Abigail used to hide things near her doll. Look closely, and search for clues.' };
      }
      return { ...state, message: state.hasToken
        ? 'Mara: You found the token! The exit is on the other side of the chamber.'
        : state.wardSolved ? 'Mara: The ward is down. Check the chest.'
        : 'Mara: The ward is protecting the chest. The diary in the vestibule may explain its symbols.' };
    case 'diary':
      return { ...state, diaryRead: true, message: 'Diary: “First a star guides us, then the moon rises, then a diamond shines.”' };
    case 'doll':
      return { ...state, hasKey: true, message: state.hasKey
        ? 'The doll watches silently. You already found its small key.'
        : 'A small key is tucked behind Abigail’s doll. You put it in your inventory.' };
    case 'chamberDoor':
      return state.hasKey
        ? { ...state, room: 'chamber', player: { x: 1, y: 2 }, message: 'The small key turns. Beyond the door, a ward glows in the darkness.' }
        : { ...state, message: 'The chamber door is locked. Something in the room may hold a key.' };
    case 'returnDoor':
      return { ...state, room: 'vestibule', player: { x: 5, y: 2 }, message: 'You return to the vestibule. The chamber door remains unlocked.' };
    case 'book':
      return { ...state, message: 'Wardkeeper’s book: “The diary remembers the three symbols. Touch them in order to break the ward.”' };
    case 'ward':
      if (state.wardSolved) return { ...state, message: 'The ward is quiet now. The chest is no longer sealed.' };
      return state.diaryRead
        ? { ...state, puzzleOpen: true, runeInput: [], message: 'Choose the three runes in the order described in the diary.' }
        : { ...state, message: 'The ward needs three runes in order. Perhaps the vestibule holds a clue.' };
    case 'chest':
      return state.wardSolved
        ? { ...state, hasToken: true, message: state.hasToken
          ? 'The chest is empty. You already have the escape token.'
          : 'Inside the chest is an escape token. You put it in your inventory.' }
        : { ...state, message: 'The chest is sealed by the glowing ward.' };
    case 'exit':
      return state.hasToken
        ? { ...state, complete: true, message: 'The token unlocks the exit. Abigail’s room is behind you!' }
        : { ...state, message: 'The exit needs an escape token. Search the chamber.' };
    default:
      return state;
  }
}

export function chooseAbigailRune(state, rune) {
  if (!state.puzzleOpen || !ABIGAIL_RUNES.includes(rune)) return state;
  const runeInput = [...state.runeInput, rune];
  if (rune !== ABIGAIL_SOLUTION[runeInput.length - 1]) {
    return { ...state, runeInput: [], message: 'The ward flickers and resets. Check the diary clue and try again.' };
  }
  if (runeInput.length === ABIGAIL_SOLUTION.length) {
    return { ...state, wardSolved: true, puzzleOpen: false, runeInput: [], message: 'The ward fades. A lock clicks open on the chest.' };
  }
  return { ...state, runeInput, message: `${runeInput.length} of 3 runes placed. Choose the next symbol.` };
}
