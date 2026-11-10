# RuneScape 3 Birthday Adventure

A responsive RuneScape-inspired birthday game for Danwell's 30th, with an expanded Gielinor-style world, separate regions that preserve landmark scale, longer road-linked journeys between five quests inspired by shared memories, and a custom game-client layout. Find a guide, accept their quest, and enter its landmark to begin.
The journal starts empty, while all five quest givers are marked on the map and can be visited in any order. Accepted quests appear in the journal. Each awards its own numbered keepsake (1–5, in journal order). Completed quests stay complete until removed from the journal; remove and accept a quest again to start it over. Existing completed quests remain in the journal. The birthday reward is available once all five quests are complete.

The character begins at level 29. Each distinct quest awards 20 birthday XP, reaching level 30 at 100 XP when all five are complete. XP and level are derived from the shared quest save, so existing saves keep their progress and removing a completed quest removes its XP.

## Project structure

```text
.
├── index.html
├── css/
│   └── styles.css       # Game-client theme and responsive layout
├── js/
│   ├── app.js           # Quest state, navigation, and UI
│   ├── audio.js         # Music and sound effects
│   ├── chapter-maps.js  # Illustrated quest field maps
│   ├── games/           # One module per mini-game
│   └── world/           # Walkable overworld, map, and movement rules
├── tests/               # Node test-runner unit tests
├── package.json
├── tailwind.config.js
└── vite.config.js
```

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Development

```sh
npm install
cp .env.example .env.local
# Edit .env.local and set VITE_APP_PASSWORD before starting Vite.
npm run dev
```

Before starting Vite, set `VITE_APP_PASSWORD` in `.env.local` to your shared password. Restart the development server after changing it. The app asks for a character name and this password on each page load; names are displayed in the world and interface. Quest progress continues to be shared by both players on the same browser and device.

**Privacy:** This is a casual client-side gate, not real authentication. The password and game files are included in the site and can be inspected or bypassed by visitors. Do not reuse a sensitive password or rely on this gate to protect private content. `.env.local` is ignored by Git, but its value is still embedded in the built site. Set `VITE_APP_PASSWORD` in the build environment before running `npm run build`, and rebuild whenever it changes. Without a configured password, the login remains disabled.

Vite prints a local URL to open on a PC or phone on the same network.

## Checks and production build

```sh
npm test
npm run lint
npm run build
npm run preview
```

The production-ready static site is written to `dist/`. Tailwind CSS is compiled locally; the optional Google Fonts stylesheet falls back to system fonts when offline.

## Game controls

- **Walk around Gielinor:** use WASD or the arrow keys; hold the on-screen D-pad on touch screens. Click/tap the world or minimap to set a destination.
- **Start a quest:** click a quest-giver marker on the map, then press **E** or use the interaction button near the guide. Accept the quest in their speech bubble; it appears in the journal. Follow the journal destination to the labelled entrance and interact there, or click the entrance label to walk there and enter.
- **Talk to locals:** click or tap a named character to walk over, then use **E** or the interaction button to speak. Their words appear in a speech bubble and in the quest log. You can also walk near a character and speak to them; repeat the interaction to hear their other remarks. Conversations do not change quest progress.
- **Quest offers:** the guide introduces the quest in a speech bubble. Choose **Accept quest** or **Not now**; you can also walk away or press Escape and speak to them again later.
- **Abigail Escape:** accept Mara's quest and enter the escape room to open the cutaway house in the world viewport. Walk freely through its five connected rooms using WASD, arrow keys or the on-screen arrows, or click the floor or an object to walk there. Press E or Space to investigate the nearest object. Search the three additional rooms for the runes, then place all three in the order found in the diary to break the ward. The **Clues & objects** panel also lists objects in the current room. Progress and collected items are saved when you leave; an open rune puzzle can be restarted at the ward. Browsers without WebGL use an illustrated house view.
- **Lucky Chucks:** adjust aim and power with the sliders, then take the shot.
- **Thirteen:** hit the drop button or press Space when the cart falls.
- **GoApe:** use A/D or arrow keys to run and Space/Up to jump; on touch screens use the on-screen buttons.
- **Fright Nights:** use WASD, arrow keys, or the on-screen directional pad to find the key and exit.
- **Inventory:** quest items appear as illustrated slots, five across, separately from keepsakes. Hover, focus or tap a slot to see its name. Items and quest progress are saved on this browser and device. An item leaves the inventory when used: the small key at the chamber door, all three runes when the ward is solved, the token at the escape door and the lantern key at the maze exit. An incorrect rune sequence does not consume them. Other unused items remain until used or their quest is removed. Pool settings, caught drops and GoApe platform checkpoints are saved too.
- **Remove a quest:** use the ✕ beside its journal entry and confirm. This removes its acceptance and unfinished progress; for completed quests it also removes the keepsake and 20 XP, which can lower the level and lock the birthday reward. Speak to its guide to accept it again. Other quests are unchanged.

The desktop interface follows an RPG client layout: quest journal and chat on the left, Danwell's 3D world view in the center, and a live world map, birthday progress, and keepsakes on the right. The original, procedurally modelled scenery includes roads, forests, and distinct quest landmarks; the locations are separated by long journeys. The 3D view requires WebGL; browsers without it use the illustrated 2.5D view when a canvas is available. Abigail's interior takes over the world view, while the other quest activities open in a framed window. On smaller screens these panels stack and expose touch movement controls.

The scenery is stylised rather than a recreation of RuneScape's assets. Buildings, trees, theme-park rides, canopy lights and corn-maze scenery are decorative: they do not block Danwell's movement. The park has distinct closed coaster circuits with moving trains; the forest has several raised platforms linked by bridges, ropes and a zipline. These outdoor structures are scenery, not playable rides or climbing routes.

Danwell starts at Lumbridge Castle. Borderless cobbled roads lead through adjoining regions: a haunted escape room, the Lucky Chucks town and archery range, an Alton Towers-inspired park with several rollercoasters, a night-time fir canopy lit by coloured lanterns, and Halloween corn mazes. Their terrain and vegetation transition across the world rather than ending at circular district edges. Outdoor rides, targets, platforms and maze walls are scenery, not physical obstacles or separate activities; accepted quest activities begin at their marked entrances.

## Personalize

- Update birthday messages, chapter copy, and reward text in `index.html`.
- Edit keepsake names and descriptions in `js/app.js`.
- Edit the local characters, their positions and conversations in `js/world/world-npcs.js`.
- Adjust the games in their individual modules under `js/games/`.
- Update chapter map illustrations in `js/chapter-maps.js`.
- Adjust 3D scenery models in `js/world/world-3d.js` and the canopy and coaster layouts in `js/world/world-scenery-data.js`. The map and fallback illustration live in `js/world/world-art.js`, and quest locations and routes in `js/world/world-data.js`.
- Change the palette and layout in `css/styles.css`.
