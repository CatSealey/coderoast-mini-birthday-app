# Project guide

This guide is for maintaining the birthday adventure. For player controls, see
the [player guide](PLAYER-GUIDE.md); for soundtrack credits, see the
[asset inventory](ASSET-CREDITS.md). For publishing, see the
[deployment guide](DEPLOYMENT.md).

## Overview

The project is a responsive, RuneScape-inspired birthday game built with
vanilla JavaScript, Vite, Three.js and CSS. It has a walkable overworld, five
keepsake quests, five optional Cat side quests, a castle trophy room and a
birthday finale. It is a client-side application: there is no game server,
account system or database.

Players accept quests from guides and enter their locations. Each main quest
awards a keepsake and 15 XP. Displaying all five keepsakes unlocks the present;
completing the hall awards the final 25 XP and reaches level 30. Side quests
are optional and do not award XP or affect the finale.

## Getting started

Requirements: Node.js 20.19+ or 22.12+, and npm. From the repository root:

```sh
npm ci
```

If `.env.local` does not already exist, copy `.env.example` to `.env.local`.
Edit `.env.local` and set `VITE_APP_PASSWORD` to a non-sensitive game password.
Do not commit this file or reuse a real account password. Then run:

```sh
npm run dev
```

Open the address printed by Vite, enter a character name and the configured
password, and start the game. Restart the dev server after changing the
environment variable. For phone testing, use the server's network address on
the same network; the Vite server is configured to listen on the network.

The password is a client-side gate only; it is included in the JavaScript
served to the browser. The security and deployment implications are described
in the [deployment guide](DEPLOYMENT.md#privacy-and-access).

## Repository map

| Path | Purpose |
| --- | --- |
| [`index.html`](../index.html) | Login, client shell, journal, controls and dialogs. |
| [`js/login.js`](../js/login.js), [`js/login-logic.js`](../js/login-logic.js) | Game entry and client-side name/password validation. |
| [`js/app.js`](../js/app.js) | Coordinates the world, quest interiors, journal, inventory, saves and settings. |
| [`js/world/`](../js/world/) | Overworld data, movement, collision, scenery, NPCs and rendering. |
| [`js/games/`](../js/games/) | Quest-specific logic, scenes, world controllers and the castle finale. |
| [`js/quest-progress.js`](../js/quest-progress.js), [`js/progression.js`](../js/progression.js) | Quest acceptance/completion and derived XP/level. |
| [`js/quest-journal.js`](../js/quest-journal.js), [`js/quest-items.js`](../js/quest-items.js) | Journal milestones and inventory derived from saves. |
| [`js/side-quests.js`](../js/side-quests.js) | Cat side-quest data and saved completion normalization. |
| [`js/audio.js`](../js/audio.js), [`public/music/`](../public/music/) | Area tracks, music controls, sound effects and birthday melody. |
| [`css/styles.css`](../css/styles.css), [`css/parts/`](../css/parts/) | Ordered stylesheet entry point and component styles. |
| [`assets/`](../assets/) | Illustrated keepsakes and other static artwork. |
| [`tests/`](../tests/) | Node test-runner regression tests. |
| [`vite.config.js`](../vite.config.js), [`package.json`](../package.json) | Vite configuration, dependencies and project scripts. |

## Application flow

1. `index.html` loads `js/login.js`. The login preloads the game module and
   validates the entered name and configured password.
2. `startGame()` in `js/app.js` restores saved state, initializes audio and
   mounts the overworld. Music is enabled on entry; both music buttons control
   the same state.
3. `js/world/overworld.js` handles input, navigation and interactions. Quest
   locations are defined in `world-data.js`; `world-regions.js` supplies
   region information used for the displayed location and area music.
4. Entering a quest mounts its world controller into the world viewport. The
   controller reports progress, completion, messages and exit through
   callbacks to `app.js`, and returns a disposal function. Leaving a quest
   disposes its scene and restores the overworld.
5. Quest and trophy state drives the journal, inventory and XP. When the
   present is collected, the trophy-room controller runs the birthday finale.

The world and quest scenes use Three.js when WebGL is available. Illustrated
canvas fallbacks are provided for browsers without WebGL. When changing a
visual or interaction, check both rendering paths and desktop and touch
controls.

## Quest implementation map

| Quest | Main files |
| --- | --- |
| Abigail Escape | `js/games/abigail-house.js`, `abigail-path.js`, `abigail-scene.js`, `abigail-world.js` |
| Lucky Chucks, Thirteen and GoApe | `js/games/adventure-logic.js`, `adventure-scene.js`, `adventure-world.js`; Thirteen also uses `coaster-course.js` and `coaster-art.js` |
| Fright Nights | `js/games/fright-logic.js`, `fright-clues.js`, `fright-scene.js`, `fright-world.js` |
| Hall of Memories and finale | `js/games/trophy-logic.js`, `trophy-models.js`, `trophy-room.js`, `birthday-ending.js` |

The world controllers manage input and animation; logic modules contain quest
state transitions and restore behavior; scene modules render the result. Keep
game logic, collision, clickable areas and both renderers consistent when
changing a quest.

## Saves and progress

`js/app.js` stores the shared game save in browser `localStorage` under
`rs3-birthday-adventure-progress`. It contains main quest acceptance and
completion, individual quest saves, trophy displays and hall progress, and
side-quest completion. XP and level are derived from completion rather than
being an independent authoritative save.

- Progress is shared by names on the same browser and device, not synced
  between devices or different site origins.
- Leaving an unfinished quest preserves its progress. Removing a quest
  resets its relevant progress; removing a completed main quest also removes
  its keepsake and XP and resets the hall finale. Settings offers a
  confirmation before restarting the entire game.
- Existing saves are normalized and restored by `quest-progress.js`, the
  relevant quest restore functions and trophy/side-quest restore helpers.
  Preserve old identifiers and test older saves when changing saved shapes or
  quest state.
- Saving can fail if browser storage is unavailable or full. The app reports
  save failures; do not assume progress was saved after an error.
- Browser data clearing and private browsing can remove saves. Test destructive
  flows using isolated browser storage rather than a real player's progress.

## Music and assets

`js/audio.js` maps region IDs to the MP3 files in `public/music/`. The
overworld chooses the area from the player's region; entering a quest selects
that quest's music. On leaving, the overworld region's track resumes. The
current title and artist appear beside the action-bar music button, and
Settings exposes the same on/off control. The birthday melody temporarily
replaces area music and respects an explicit mute.

Vite copies `public/` into the build. Keep filenames and the track mapping in
sync, and only distribute recordings you have permission to publish. Music
starts in response to entering the game; playback errors appear in Settings
and on the action bar.

## Changing the world or interface

- World positions and quest entrances are in `js/world/world-data.js`.
  Collision and route finding are in `world-collision.js`; the 3D world,
  illustrated fallback and minimap use separate rendering code. Check
  interaction ranges and navigable paths when moving scenery or characters.
- The player and Cat share appearance helpers in `character-appearance.js`,
  `character-body.js` and `games/character-legs.js`. Check quest scenes as
  well as the overworld when changing them.
- `css/styles.css` imports `css/parts/` in order. Later modules intentionally
  override earlier styles, including compact-screen rules. Check desktop and
  mobile after styling changes.
- For personalization, edit birthday messages and reward text in `index.html`,
  keepsake names in `js/app.js`, local characters and conversations in
  `js/world/world-npcs.js`, and chapter maps in `js/chapter-maps.js`.
- Quest scenery and activities live in `js/games/`; overworld 3D scenery is in
  `js/world/world-3d.js`, with canopy and coaster layouts in
  `js/world/world-scenery-data.js`.
- Keep accessible names, keyboard controls, touch controls and reduced-motion
  behavior intact when changing the interface or animations.

## Tests and builds

```sh
npm test          # all Node test-runner tests
npm run lint      # ESLint
npm run build     # production files in dist/
npm run preview   # serve the production build locally
```

For a focused test, run for example:

```sh
node --test tests/audio.test.js
node --test tests/adventure-world.test.js
```

The tests cover quest logic and saves, routes and collisions, audio,
progression, appearance and other behavior. For visual or interaction
changes, also check the browser: automated unit tests do not replace checking
the actual 3D and fallback views, responsive layouts or audio playback.

The build embeds `VITE_APP_PASSWORD` and emits the static site to `dist/`.
`dist/`, `node_modules/` and local environment files are Git-ignored. A Vite
large-chunk warning may appear even when the build succeeds.
