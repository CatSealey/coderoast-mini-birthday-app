# RuneScape 3 Birthday Adventure

A responsive RuneScape-inspired birthday game for Dani's 30th, with an expanded Gielinor-style world, separate regions that preserve landmark scale, longer road-linked journeys between five quests inspired by shared memories, and a custom game-client layout. Find a guide, accept their quest, and enter its landmark to begin.
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
- **Lucky Chucks:** explore the pub, collect drinks at the bar and put them on the drinks table. Read the scorecard and use the pool table to work out the locked ball case's code. Find the cues and balls, set them on the pool table, and investigate it again to take a break: align the guide with the rack and choose controlled power. Find a tool to retrieve the runaway eight-ball from under the cabinet and give it to My Love. The aim and power sliders work with mouse, touch and keyboard.
- **Thirteen:** board the carriage with Meu Amor. Use the speed controls (or Up/Down) to clear the first signal at 22% of the track at 55–80% speed, then the second at 48% at 24–40% speed. Stop (Space) within the marked 64–72% drop zone at 35% speed or less. Missing a signal, stopping incorrectly or staying below 20% for three seconds resets the lap. After the drop and return, collect the bags from the locker and give them to Meu Amor. The awarded ticket is used when returning to the world; if you reload before leaving, interact with the completed ride entrance to use it.
- **GoApe:** follow the lantern-lit route and search the platforms for four treasures. At the climbing net and rope, press Space or Move as the marker passes through the green zone, three times; let the marker leave the zone between moves. Bad timing returns you to the platform, without losing your treasures. Jump between the later platforms with Space or the Jump button, then present the treasures at the zip-wire. If you fall, you return to your last platform checkpoint.
- **Fright Nights:** enter the walkable maze, then use WASD, arrow keys, click-to-walk or the on-screen controls to explore seven distinct themed areas: Disease, AI, Darkness, Chainsaws, Bogeymen, Claustrophobia and Clowns. For each area, find its clue and tool, then solve the three-step mechanism to recover its object. Wrong answers reset that mechanism but preserve your items. Press E or use **Investigate** near a sign, tool, mechanism or gate; the **Clues & nearby objects** panel keeps discovered clues, including while a mechanism is open. Return to the entrance gate with all seven objects to escape. Your position, clues, tools and objects are saved when you leave. An older unfinished maze save starts at the new entrance and keeps any lantern key until the gate is opened.
- **Inventory:** quest items appear as illustrated slots, five across, separately from keepsakes. Hover, focus or tap a slot to see its name. Items and quest progress are saved on this browser and device. Items leave the inventory when used, including the pool setup, bags, exit ticket and canopy treasures. Incorrect answers do not consume items. Other unused items remain until used or their quest is removed. Earlier unfinished versions of the pool, coaster and canopy quests start their redesigned quest at the entrance; completed quests stay complete.
- **Remove a quest:** use the ✕ beside its journal entry and confirm. This removes its acceptance and unfinished progress; for completed quests it also removes the keepsake and 20 XP, which can lower the level and lock the birthday reward. Speak to its guide to accept it again. Other quests are unchanged.

The desktop interface follows an RPG client layout: quest journal and chat on the left, Dani's 3D world view in the center, and a live world map, birthday progress, and keepsakes on the right. The original, procedurally modelled scenery includes roads, forests, and distinct quest landmarks; the locations are separated by long journeys. The 3D view requires WebGL; browsers without it use an illustrated fallback when a canvas is available. Each quest takes over the world view. On smaller screens these panels stack and expose touch movement controls.

The scenery is stylised rather than a recreation of RuneScape's assets. Buildings, trees, theme-park rides, canopy lights and corn-maze scenery are decorative: they do not block Dani's movement. The park has distinct closed coaster circuits with moving trains; the forest has several raised platforms linked by bridges, ropes and a zipline. These outdoor structures are scenery, not playable rides or climbing routes.

Dani starts at Lumbridge Castle. Borderless cobbled roads lead through adjoining regions: a haunted escape room, the Lucky Chucks town and archery range, an Alton Towers-inspired park with several rollercoasters, a night-time fir canopy lit by coloured lanterns, and Halloween corn mazes. Their terrain and vegetation transition across the world rather than ending at circular district edges. Outdoor rides, targets, platforms and maze walls are scenery, not physical obstacles or separate activities; accepted quest activities begin at their marked entrances.

## Personalize

- Update birthday messages, chapter copy, and reward text in `index.html`.
- Edit keepsake names and descriptions in `js/app.js`.
- Edit the local characters, their positions and conversations in `js/world/world-npcs.js`.
- Adjust the games in their individual modules under `js/games/`.
- Update chapter map illustrations in `js/chapter-maps.js`.
- Adjust 3D scenery models in `js/world/world-3d.js` and the canopy and coaster layouts in `js/world/world-scenery-data.js`. The map and fallback illustration live in `js/world/world-art.js`, and quest locations and routes in `js/world/world-data.js`.
- Change the palette and layout in `css/styles.css`.
