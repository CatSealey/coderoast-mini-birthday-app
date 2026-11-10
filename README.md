# RuneScape 3 Birthday Adventure

A responsive RuneScape-inspired birthday game for Danwell's 30th, with an expanded Gielinor-style world, separate regions that preserve landmark scale, longer road-linked journeys between five quests inspired by shared memories, and a custom game-client layout. Walk or click to travel to each quest location, meet its guide, and start the activity from the quest briefing.
Every quest is available from the start and can be completed in any order. Each has its own illustrated field map and awards its own numbered keepsake (1–5, in journal order). Completed chapters can be replayed independently without resetting keepsakes or overall quest progress. The birthday reward is available once all five quests are complete.

The character begins at level 29. Each distinct quest awards 20 birthday XP, reaching level 30 at 100 XP when all five are complete. Replays award no additional XP. XP and level are derived from the shared quest save, so existing saves keep their progress and restarting the adventure resets it.

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
- **Start a quest:** choose any journal entry to walk to its marker, or click a marker on the world. Press **E** or use the on-screen interaction button when close to its guide.
- **Talk to locals:** click or tap a named character to walk over, then use **E** or the interaction button to speak. Their words appear in a speech bubble and in the quest log. You can also walk near a character and speak to them; repeat the interaction to hear their other remarks. Conversations do not change quest progress.
- **Chapter briefing:** the quest guide's introduction appears in a speech bubble alongside the field map; choose **Begin quest activity** to start.
- **Warding runes:** watch, then repeat the sequence by tapping or clicking.
- **Lucky Chucks:** adjust aim and power with the sliders, then take the shot.
- **Thirteen:** hit the drop button or press Space when the cart falls.
- **GoApe:** use A/D or arrow keys to run and Space/Up to jump; on touch screens use the on-screen buttons.
- **Fright Nights:** use WASD, arrow keys, or the on-screen directional pad to find the key and exit.
- **Replay:** choose any completed chapter in the quest journal and interact with its guide. Replaying does not remove keepsakes or reset quest progress.

The desktop interface follows an RPG client layout: quest journal and chat on the left, Danwell's 3D world view in the center, and a live world map, birthday progress, and keepsakes on the right. The original, procedurally modelled scenery includes roads, forests, and distinct quest landmarks; the locations are separated by long journeys. The 3D view requires WebGL; browsers without it use the illustrated 2.5D view when a canvas is available. Quest activities open in a framed quest window over the world. On smaller screens these panels stack and expose touch movement controls.

The scenery is stylised rather than a recreation of RuneScape's assets. Buildings, trees, theme-park rides, canopy lights and corn-maze scenery are decorative: they do not block Danwell's movement. The park has distinct closed coaster circuits with moving trains; the forest has several raised platforms linked by bridges, ropes and a zipline. These outdoor structures are scenery, not playable rides or climbing routes.

Danwell starts at Lumbridge Castle. Borderless cobbled roads lead through adjoining regions: a haunted escape room, the Lucky Chucks town and archery range, an Alton Towers-inspired park with several rollercoasters, a night-time fir canopy lit by coloured lanterns, and Halloween corn mazes. Their terrain and vegetation transition across the world rather than ending at circular district edges. Outdoor rides, targets, platforms and maze walls are scenery, not physical obstacles or separate activities; quest activities are started by speaking to their guides.

## Personalize

- Update birthday messages, chapter copy, and reward text in `index.html`.
- Edit keepsake names and descriptions in `js/app.js`.
- Edit the local characters, their positions and conversations in `js/world/world-npcs.js`.
- Adjust the games in their individual modules under `js/games/`.
- Update chapter map illustrations in `js/chapter-maps.js`.
- Adjust 3D scenery models in `js/world/world-3d.js` and the canopy and coaster layouts in `js/world/world-scenery-data.js`. The map and fallback illustration live in `js/world/world-art.js`, and quest locations and routes in `js/world/world-data.js`.
- Change the palette and layout in `css/styles.css`.
