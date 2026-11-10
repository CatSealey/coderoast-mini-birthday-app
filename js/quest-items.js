const images = {
  key: new URL('../assets/items/small-key.svg', import.meta.url).href,
  Star: new URL('../assets/items/star-rune.svg', import.meta.url).href,
  Moon: new URL('../assets/items/moon-rune.svg', import.meta.url).href,
  Diamond: new URL('../assets/items/diamond-rune.svg', import.meta.url).href,
  token: new URL('../assets/items/escape-token.svg', import.meta.url).href,
  lantern: new URL('../assets/items/lantern-key.svg', import.meta.url).href
};

export function questItems(saves) {
  const items = [];
  const house = saves[0];
  if (house?.hasKey && !house.chamberUnlocked) items.push({ name: 'Small key', image: images.key, quest: 'Abigail Escape' });
  if (house?.collectedRunes && !house.wardSolved) {
    house.collectedRunes.forEach((rune) => items.push({ name: `${rune} rune`, image: images[rune], quest: 'Abigail Escape' }));
  }
  if (house?.hasToken && !house.complete) items.push({ name: 'Escape token', image: images.token, quest: 'Abigail Escape' });
  if (saves[4]?.hasKey && !saves[4].complete) items.push({ name: 'Lantern key', image: images.lantern, quest: 'Fright Nights' });
  return items;
}
