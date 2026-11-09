# RuneScape 3 Birthday Adventure

A responsive RuneScape-inspired birthday game for Danwell's 30th, with a single playable character, a custom game-client layout, and five mini-games inspired by shared memories.
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
│   └── games/           # One module per mini-game
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

- **Warding runes:** watch, then repeat the sequence by tapping or clicking.
- **Lucky Chucks:** adjust aim and power with the sliders, then take the shot.
- **Thirteen:** hit the drop button or press Space when the cart falls.
- **GoApe:** use A/D or arrow keys to run and Space/Up to jump; on touch screens use the on-screen buttons.
- **Fright Night:** use WASD, arrow keys, or the on-screen directional pad to find the key and exit.
- **Replay:** choose any completed chapter in the quest log, then select **Replay this chapter**.

The desktop interface is arranged like an RPG client: quest journal and chat on the left, Danwell's world view in the center, and the chapter minimap, birthday progress, and keepsakes on the right. On smaller screens these panels stack for touch play.

## Personalize

- Update birthday messages, chapter copy, and reward text in `index.html`.
- Edit keepsake names and descriptions in `js/app.js`.
- Adjust the games in their individual modules under `js/games/`.
- Update chapter map illustrations in `js/chapter-maps.js`.
- Change the palette and layout in `css/styles.css`.
