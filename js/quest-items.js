import { FRIGHT_THEMES } from './games/fright-logic.js';

const images = {
  key: new URL('../assets/items/small-key.svg', import.meta.url).href,
  Star: new URL('../assets/items/star-rune.svg', import.meta.url).href,
  Moon: new URL('../assets/items/moon-rune.svg', import.meta.url).href,
  Diamond: new URL('../assets/items/diamond-rune.svg', import.meta.url).href,
  token: new URL('../assets/items/escape-token.svg', import.meta.url).href,
  lantern: new URL('../assets/items/lantern-key.svg', import.meta.url).href,
  disease: new URL('../assets/items/remedy-vial.svg', import.meta.url).href,
  ai: new URL('../assets/items/memory-chip.svg', import.meta.url).href,
  darkness: new URL('../assets/items/starlight-lens.svg', import.meta.url).href,
  chainsaws: new URL('../assets/items/safety-cog.svg', import.meta.url).href,
  bogeymen: new URL('../assets/items/dream-catcher.svg', import.meta.url).href,
  claustrophobia: new URL('../assets/items/air-charm.svg', import.meta.url).href,
  clowns: new URL('../assets/items/carnival-mask.svg', import.meta.url).href
};
const adventureImages = {
  drinks: new URL('../assets/items/drinks.svg', import.meta.url).href,
  cues: new URL('../assets/items/pool-cues.svg', import.meta.url).href,
  balls: new URL('../assets/items/pool-balls.svg', import.meta.url).href,
  eight: new URL('../assets/items/eight-ball.svg', import.meta.url).href,
  hook: new URL('../assets/items/retrieval-hook.svg', import.meta.url).href,
  bags: new URL('../assets/items/bags.svg', import.meta.url).href,
  ticket: new URL('../assets/items/ticket.svg', import.meta.url).href,
  leaf: new URL('../assets/items/canopy-leaf.svg', import.meta.url).href,
  feather: new URL('../assets/items/canopy-feather.svg', import.meta.url).href,
  acorn: new URL('../assets/items/canopy-acorn.svg', import.meta.url).href,
  star: new URL('../assets/items/canopy-star.svg', import.meta.url).href
};
const frightToolImages = {
  disease: new URL('../assets/items/fright-gloves.svg', import.meta.url).href,
  ai: new URL('../assets/items/fright-access-key.svg', import.meta.url).href,
  darkness: new URL('../assets/items/fright-matches.svg', import.meta.url).href,
  chainsaws: new URL('../assets/items/fright-wrench.svg', import.meta.url).href,
  bogeymen: new URL('../assets/items/fright-lantern.svg', import.meta.url).href,
  claustrophobia: new URL('../assets/items/fright-prybar.svg', import.meta.url).href,
  clowns: new URL('../assets/items/fright-pin.svg', import.meta.url).href
};

export function questItems(saves) {
  const items = [];
  const house = saves[0];
  if (house?.hasKey && !house.chamberUnlocked) items.push({ name: 'Small key', image: images.key, quest: 'Abigail Escape' });
  if (house?.collectedRunes && !house.wardSolved) {
    house.collectedRunes.forEach((rune) => items.push({ name: `${rune} rune`, image: images[rune], quest: 'Abigail Escape' }));
  }
  if (house?.hasToken && !house.complete) items.push({ name: 'Escape token', image: images.token, quest: 'Abigail Escape' });
  const pub = saves[1];
  if (pub?.version === 3) {
    if (pub.drinks) items.push({ name: 'Drinks', image: adventureImages.drinks, quest: 'Lucky Chucks' });
    if (pub.cues) items.push({ name: 'Pool cues', image: adventureImages.cues, quest: 'Lucky Chucks' });
    if (pub.balls) items.push({ name: 'Pool balls', image: adventureImages.balls, quest: 'Lucky Chucks' });
    if (pub.hook) items.push({ name: 'Retrieval hook', image: adventureImages.hook, quest: 'Lucky Chucks' });
    if (pub.ballFound) items.push({ name: 'Eight-ball', image: adventureImages.eight, quest: 'Lucky Chucks' });
  }
  const ride = saves[2];
  if (ride?.version === 3) {
    if (ride.bags) items.push({ name: 'Bags', image: adventureImages.bags, quest: 'Thirteen' });
    if (ride.ticket) items.push({ name: 'Exit ticket', image: adventureImages.ticket, quest: 'Thirteen' });
  }
  const canopy = saves[3];
  if (canopy?.version === 3 && !canopy.treasuresUsed && Array.isArray(canopy.collected)) {
    const names = { leaf: 'Glowing leaf', feather: 'Night feather', acorn: 'Silver acorn', star: 'Forest star' };
    canopy.collected.forEach((id) => {
      if (names[id]) items.push({ name: names[id], image: adventureImages[id], quest: 'GoApe' });
    });
  }
  const fright = saves[4];
  if ((fright?.hasKey || fright?.legacyKey) && !fright.complete) items.push({ name: 'Lantern key', image: images.lantern, quest: 'Fright Nights' });
  if (!fright?.complete && Array.isArray(fright?.tools)) {
    FRIGHT_THEMES.filter((theme) => fright.tools.includes(theme.id) && !fright.collected?.includes(theme.id))
      .forEach((theme) => items.push({ name: theme.tool.name, image: frightToolImages[theme.id], quest: 'Fright Nights' }));
  }
  if (!fright?.complete && Array.isArray(fright?.collected)) {
    FRIGHT_THEMES.filter((theme) => fright.collected.includes(theme.id))
      .forEach((theme) => items.push({ name: theme.item, image: images[theme.id], quest: 'Fright Nights' }));
  }
  return items;
}
