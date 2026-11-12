# RuneScape 3 Birthday Adventure

A responsive RuneScape-inspired birthday game for Dani's 30th, with an expanded Gielinor-style world, separate regions that preserve landmark scale, longer road-linked journeys between five quests inspired by shared memories, and a custom game-client layout. Find a guide, accept their quest, and enter its landmark to begin.
The player wears black shorts and has long hair and a tattoo on her left leg. Cat has shoulder-length hair, a black T-shirt, dark green trousers and a Japanese-inspired tattoo sleeve on her right arm; both characters keep their appearances across the world, quests and birthday ending. Characters swing their arms as they walk, while keeping their hands posed for the birthday gifts.
The journal starts empty, while all five quest givers are marked on the map and can be visited in any order. Accepted quests appear in the journal. Each awards its own numbered keepsake (1–5, in journal order). Completed quests stay complete until removed from the journal; remove and accept a quest again to start it over. Existing completed quests remain in the journal. Speak to Elowen outside Lumbridge Castle to accept The Hall of Memories, then display each keepsake in the trophy room; a birthday present appears when all five have been placed.

Open **Quest steps** under any accepted quest in the journal to see what remains and which milestones are complete. Steps update from saved quest progress, including items already used. Fright Nights clues appear as subtasks under their areas, revealing their text only after discovery. Thirteen's collected park items are kept between laps, and missed items stay on the track until collected.

The character begins at level 29. Each of the five keepsake quests awards 15 birthday XP. The Hall of Memories awards the final 25 XP when the present is collected, reaching level 30 at 100 XP and starting the birthday ending. The birthday ticket is also added to Keepsakes, where it can be opened again after leaving the castle or reloading. It is separate from the five quest keepsakes and awards no extra XP. XP and level are derived from the shared quest save: an existing completed hall keeps level 30, while five keepsakes alone now leave the character at level 29. Removing a completed quest removes its XP; removing the hall or a keepsake quest resets the finale and removes the ticket until the finale is unlocked again.

## Project structure

```text
.
├── index.html
├── css/
│   ├── styles.css       # Ordered stylesheet entry point
│   └── parts/           # Theme, game, world, journal and responsive styles
├── js/
│   ├── app.js           # Quest state, navigation, and UI
│   ├── audio.js         # Music and sound effects
│   ├── character-appearance.js # Shared character colours, hairstyles and facial details
│   ├── character-body.js # Rounded character torsos and Cat's tattoo details
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

### Editing styles

The app loads `css/styles.css`, which imports the files in `css/parts/` in cascade order. Keep that order when adding or moving rules: later rules intentionally override earlier ones.

- `foundation.css` contains Tailwind directives, theme variables and shared controls.
- `mini-games.css`, `chapter-maps.css` and `mini-game-scenes.css` cover the original game and map components.
- `client-shell-journal.css`, `world-and-sidebars.css` and `quest-overlays-inventory.css` style the game client, quest journal, world and inventory.
- `client-responsive.css` contains the first group of client layout overrides; `world-controls.css` and `quest-dialog.css` contain later world and dialog rules.
- `quest-interiors.css` and `quest-activity.css` cover walkable quests and their controls; their later compact-screen overrides live in `compact-layout.css`.
- `birthday-ending.css` styles the castle finale dialogue controls.

Responsive rules are kept at their original positions in the cascade. When editing a component, check its later responsive module as well. Vite resolves the imports for development and bundles them into the production stylesheet.

### Editing overworld scenery

The overworld's 3D scenery is built in `js/world/world-3d.js`. Its illustrated fallback is drawn separately in `js/world/world-art.js`. Tree and corn placement and collision footprints are defined in `js/world/world-collision.js`; revisit both renderers and collision if changing an object's size or placement. Quest interiors have their own scenery.

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
- **Lucky Chucks:** explore the pub, collect drinks at the bar and put them on the drinks table. Read the scorecard and use the pool table to work out the locked ball case's code. Find the cues and balls, set them on the pool table, and investigate it again to take a break: align the guide with the rack and choose controlled power. Furniture, stools and Cat are solid; walk up to an object to investigate it, or click it to approach around obstacles. Find a tool to retrieve the runaway eight-ball from under the cabinet, give it to Cat, and watch them leave together after she speaks. The aim and power sliders work with mouse, touch and keyboard.
- **Thirteen:** board the carriage with Cat. Hold the matching left or right button or arrow key (A/D also work) as you pass each item to collect all five park items: pizza, a refill cup, a map, a Fastrack ticket and an umbrella. Releasing the controls leaves you in the middle, so items are missed. Collected items appear in the quest inventory and stay between laps until the quest is completed. After the drop, the carriage travels backwards along a lower track and climbs back to the station. If you need more items, it takes another lap and keeps the ones you already collected. After the ride, walk around the solid locker, collect the bags and give them to Cat; after she speaks, you leave together. The awarded ticket is used when returning to the world; if you reload before leaving, interact with the completed ride entrance to use it.
- **GoApe:** explore eight treetop platforms and collect four treasures before crossing the high rope bridge. Use Space or Move when the marker reaches the moving green zone to climb nets and cross ropes, letting it leave the zone between moves; the zone changes position and size, and later crossings require four or five successful moves. Jump across two gaps with Space or the Jump button, and light the three lanterns in order before presenting the treasures at the zip-wire. Bad timing or a fall returns you to a checkpoint without losing progress. Existing in-progress saves keep their treasures and checkpoints; an older zip-wire ride can still finish.
- **Fright Nights:** enter the expanded walkable maze, then use WASD, arrow keys, click-to-walk or the on-screen controls to explore seven distinct themed areas: Disease, AI, Darkness, Chainsaws, Bogeymen, Claustrophobia and Clowns. Search each area for three separate clues and its tool, then solve the three-step mechanism to recover its object. Wrong answers reset that mechanism but preserve your items. Press E or use **Investigate** near a clue, tool, mechanism or gate; discovered clues stack by area in the quest journal and remain available in the **Clues & nearby objects** panel, including while a mechanism is open. After finding all seven objects, use **Teleport out** to escape from anywhere, or return to the entrance gate. Your position, clues, tools and objects are saved when you leave. Saves from the earlier maze retain discovered clues, tools and objects but resume at the new entrance; older lantern keys are retained until the gate opens.
- **Inventory:** quest items appear as illustrated slots, five across, separately from keepsakes. Hover, focus or tap a slot to see its name. Items and quest progress are saved on this browser and device. Items leave the inventory when used, including the pool setup, bags, exit ticket and canopy treasures. Incorrect answers do not consume items. Other unused items remain until used or their quest is removed. Earlier unfinished versions of the pool, coaster and canopy quests start their redesigned quest at the entrance; completed quests stay complete.
- **Castle finale:** display all five keepsakes and open the present. Walk into position for the celebration as Cat and the family enter, with Gran carrying a cake. Use Continue or E to advance the speech bubbles; Cat's ticket for cuddles and films can be opened and read during the celebration. Open the present again to replay it.
- **Remove a quest:** use the ✕ beside its journal entry and confirm. This removes its acceptance and unfinished progress; for a completed keepsake quest it also removes the keepsake and its 15 XP and resets the hall finale. Removing the hall quest resets its displays and final 25 XP but keeps earned keepsakes. Speak to the relevant guide to accept it again.
- **Trophy room:** accept Elowen the Curator's quest outside the castle, then walk to the castle door and press E or use the entrance button. Select the quest in the journal or the house on the world map to set a route back. Inside the Hall of Memories, walk to each named display and press E or Investigate to place its earned keepsake as a 3D object. The present appears after all five are displayed; investigate it to open the cuddles-and-films ticket and complete the hall quest. To leave, click the door near the front of the room, walk up to it and press E or Investigate, or use the Leave room button. Displays are saved, and removing a completed memory quest clears its display until the quest is completed and the keepsake placed again. Removing the hall quest resets its displays without removing the earned keepsakes or XP. Existing saves with displays retain access to the hall. Browsers without WebGL use illustrated keepsakes.

The desktop interface follows an RPG client layout: quest journal and chat on the left, Dani's 3D world view in the center, and a live world map, birthday progress, and keepsakes on the right. The original, procedurally modelled scenery includes roads, forests, and distinct quest landmarks; the locations are separated by long journeys. The 3D view requires WebGL; browsers without it use an illustrated fallback when a canvas is available. Each quest takes over the world view. On smaller screens these panels stack and expose touch movement controls.

The scenery is stylised rather than a recreation of RuneScape's assets. Buildings, trees, theme-park rides, canopy lights and corn-maze scenery are decorative: they do not block Dani's movement. The park has distinct closed coaster circuits with moving trains; the forest has several raised platforms linked by bridges, ropes and a zipline. These outdoor structures are scenery, not playable rides or climbing routes.

Dani starts at Lumbridge Castle. Borderless cobbled roads lead through adjoining regions: a haunted escape room, the Lucky Chucks town and archery range, an Alton Towers-inspired park with several rollercoasters, a night-time fir canopy lit by coloured lanterns, and Halloween corn mazes. Their terrain and vegetation transition across the world rather than ending at circular district edges. Buildings, tree trunks, corn walls and many ground-level props are solid; click-to-walk routes around them. Raised tracks and platforms remain decorative, and accepted quest activities begin at their marked entrances.

## Personalize

- Update birthday messages, chapter copy, and reward text in `index.html`.
- Edit keepsake names and descriptions in `js/app.js`.
- Edit the local characters, their positions and conversations in `js/world/world-npcs.js`.
- Adjust the games in their individual modules under `js/games/`.
- Update chapter map illustrations in `js/chapter-maps.js`.
- Adjust 3D scenery models in `js/world/world-3d.js` and the canopy and coaster layouts in `js/world/world-scenery-data.js`. The map and fallback illustration live in `js/world/world-art.js`, and quest locations and routes in `js/world/world-data.js`.
- Change the palette and layout in `css/styles.css`.
