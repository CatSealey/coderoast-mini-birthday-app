import { FRIGHT_OBJECTS, FRIGHT_THEMES } from './fright-logic.js';

export function discoveredFrightClues(state) {
  const found = new Set(state?.clues || []);
  return FRIGHT_THEMES.map((theme) => ({
    theme,
    clues: FRIGHT_OBJECTS.filter((object) => object.kind === 'clue' && object.theme === theme.id && found.has(object.id)),
    hasTool: state?.tools?.includes(theme.id) === true
  })).filter((group) => group.clues.length);
}

export function renderFrightClues(container, state) {
  const groups = discoveredFrightClues(state);
  container.replaceChildren();
  if (!groups.length) {
    container.textContent = 'No clues found yet. Search each themed area for separate glowing clues.';
    return;
  }
  for (const { theme, clues, hasTool } of groups) {
    const section = document.createElement('section');
    section.className = 'fright-clue-group';
    const heading = document.createElement('strong');
    heading.textContent = `${theme.zone} · ${clues.length}/3 clues${hasTool ? ` · Carrying ${theme.tool.name}` : ''}`;
    section.append(heading);
    for (const clue of clues) {
      const line = document.createElement('p');
      line.textContent = `${clue.name}: ${clue.text}`;
      section.append(line);
    }
    container.append(section);
  }
}
