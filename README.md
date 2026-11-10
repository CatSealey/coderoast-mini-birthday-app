# RuneScape 3 Birthday Adventure

A responsive RuneScape-inspired birthday game for Danwell's 30th, with an expanded Gielinor-style world, separate regions that preserve landmark scale, longer road-linked journeys between five quests inspired by shared memories, and a custom game-client layout. Walk or click to travel to each quest location, meet its guide, and start the activity from the quest briefing.
Each chapter has its own illustrated field map. Completed chapters can be replayed independently without resetting keepsakes or overall quest progress.

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
npm run dev
```

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
- **Start a quest:** choose an unlocked journal entry to walk to its marker, or click a marker on the world. Press **E** or use the on-screen interaction button when close to its guide.
- **Chapter briefing:** read the quest introduction and field map, then choose **Begin quest activity**.
- **Warding runes:** watch, then repeat the sequence by tapping or clicking.
- **Lucky Chucks:** adjust aim and power with the sliders, then take the shot.
- **Thirteen:** hit the drop button or press Space when the cart falls.
- **GoApe:** use A/D or arrow keys to run and Space/Up to jump; on touch screens use the on-screen buttons.
- **Fright Night:** use WASD, arrow keys, or the on-screen directional pad to find the key and exit.
- **Replay:** choose any completed chapter in the quest journal and interact with its guide. Replaying does not remove keepsakes or reset quest progress.

The desktop interface follows an RPG client layout: quest journal and chat on the left, Danwell's angled, illustrated world view in the center, and a live world map, birthday progress, and keepsakes on the right. The original 2.5D scenery includes roads, forests, and distinct quest landmarks; the locations are separated by long journeys. Quest activities open in a framed quest window over the world. On smaller screens these panels stack and expose touch movement controls.

## Personalize

- Update birthday messages, chapter copy, and reward text in `index.html`.
- Edit keepsake names and descriptions in `js/app.js`.
- Adjust the games in their individual modules under `js/games/`.
- Update chapter map illustrations in `js/chapter-maps.js`.
- Adjust the overworld scenery and projection in `js/world/world-art.js`, and quest locations and routes in `js/world/world-data.js`.
- Change the palette and layout in `css/styles.css`.
