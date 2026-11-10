import { MAZE } from './games/maze.js';

const MAP_WIDTH = 600;
const MAP_HEIGHT = 250;

const CHAPTER_MAPS = [
  {
    title: 'Abigail Escape · Kettering',
    description: 'A floor plan showing the vestibule, warding chamber, and escape door.',
    scene: `
      <path class="map-route" d="M75 132 H218 V74 H368 V132 H520" />
      <rect class="map-room" x="30" y="65" width="160" height="135" rx="8" />
      <rect class="map-room map-room--goal" x="218" y="30" width="150" height="170" rx="8" />
      <rect class="map-room" x="396" y="65" width="174" height="135" rx="8" />
      <path class="map-wall" d="M190 132h28M368 132h28M95 65v36M520 65v36" />
      <text class="map-label" x="110" y="115">THE VESTIBULE</text>
      <text class="map-label" x="293" y="91">WARDING RUNES</text>
      <text class="map-label" x="293" y="111">FIND THE CLUE</text>
      <text class="map-label" x="482" y="115">THE EXIT</text>
      <circle class="map-landmark" cx="70" cy="145" r="13" />
      <text class="map-icon" x="70" y="150">S</text>
      <path class="map-pin" d="M490 148a14 14 0 1 1 28 0c0 12-14 28-14 28s-14-16-14-28z" />
      <circle class="map-pin-center" cx="504" cy="148" r="4" />
      <text class="map-caption" x="48" y="222">ENTRY</text>
      <text class="map-caption" x="468" y="222">ESCAPE DOOR</text>
    `
  },
  {
    title: 'Lucky Chucks · Pool Hall',
    description: 'A venue map showing the entrance, bar, pool tables, and the Lucky Chucks trick-shot table.',
    scene: `
      <rect class="map-room" x="35" y="28" width="530" height="190" rx="18" />
      <path class="map-wall" d="M190 29v189M395 29v189M35 128h155M395 128h170" />
      <path class="map-route" d="M82 187V158H275V91H482" />
      <rect class="map-table" x="225" y="48" width="125" height="68" rx="10" />
      <rect class="map-table map-room--goal" x="423" y="48" width="120" height="68" rx="10" />
      <rect class="map-table" x="225" y="144" width="125" height="54" rx="10" />
      <circle class="map-ball" cx="251" cy="81" r="7" />
      <circle class="map-ball map-ball--gold" cx="288" cy="81" r="7" />
      <circle class="map-ball" cx="325" cy="81" r="7" />
      <circle class="map-ball map-ball--gold" cx="453" cy="81" r="7" />
      <circle class="map-ball" cx="482" cy="81" r="7" />
      <circle class="map-ball" cx="511" cy="81" r="7" />
      <text class="map-label" x="115" y="75">BAR</text>
      <text class="map-label" x="286" y="137">POOL TABLES</text>
      <text class="map-label" x="483" y="137">LUCKY CHUCKS</text>
      <text class="map-label" x="95" y="165">LOUNGE</text>
      <circle class="map-landmark" cx="82" cy="187" r="13" />
      <text class="map-icon" x="82" y="192">S</text>
      <path class="map-pin" d="M469 160a14 14 0 1 1 28 0c0 12-14 28-14 28s-14-16-14-28z" />
      <circle class="map-pin-center" cx="483" cy="160" r="4" />
      <text class="map-caption" x="48" y="242">ENTRANCE</text>
    `
  },
  {
    title: 'Alton Towers · Thirteen',
    description: 'A theme-park ride map tracing the queue, lift hill, dramatic drop, and station.',
    scene: `
      <path class="map-park-path" d="M45 197c83-70 113-113 201-113s104 117 187 117 101-64 128-119" />
      <path class="map-track" d="M62 192c70-59 121-93 184-93s84 118 177 118 98-59 124-111" />
      <path class="map-track-line" d="M62 192c70-59 121-93 184-93s84 118 177 118 98-59 124-111" />
      <path class="map-route" d="M45 197c83-70 113-113 201-113s104 117 187 117 101-64 128-119" />
      <path class="map-wall" d="M260 97l22-48M282 49l32 0M444 214v-46M461 168v-42M478 152v-36" />
      <circle class="map-landmark" cx="62" cy="192" r="17" />
      <text class="map-icon" x="62" y="197">S</text>
      <circle class="map-landmark" cx="247" cy="98" r="11" />
      <text class="map-label" x="164" y="48">THE LIFT HILL</text>
      <text class="map-label" x="323" y="175">THE BIG DROP</text>
      <text class="map-label" x="452" y="77">THIRTEEN</text>
      <path class="map-pin" d="M518 111a14 14 0 1 1 28 0c0 12-14 28-14 28s-14-16-14-28z" />
      <circle class="map-pin-center" cx="532" cy="111" r="4" />
      <text class="map-caption" x="43" y="229">STATION</text>
      <text class="map-caption" x="473" y="159">DROP ZONE</text>
    `
  },
  {
    title: 'GoApe · Night Canopy',
    description: 'A treetop route map across the forest platforms to the glowing zip-line.',
    scene: `
      <circle class="map-tree" cx="95" cy="90" r="54" />
      <circle class="map-tree" cx="205" cy="157" r="65" />
      <circle class="map-tree" cx="329" cy="82" r="57" />
      <circle class="map-tree" cx="431" cy="165" r="67" />
      <circle class="map-tree" cx="527" cy="84" r="46" />
      <path class="map-bridge" d="M61 176 122 131 185 128 244 94 305 105 359 144 421 126 486 109 540 74" />
      <path class="map-route" d="M61 176 122 131 185 128 244 94 305 105 359 144 421 126 486 109 540 74" />
      <rect class="map-platform" x="43" y="162" width="38" height="25" rx="5" />
      <rect class="map-platform" x="168" y="113" width="38" height="25" rx="5" />
      <rect class="map-platform" x="287" y="91" width="38" height="25" rx="5" />
      <rect class="map-platform" x="402" y="113" width="38" height="25" rx="5" />
      <circle class="map-landmark" cx="61" cy="174" r="12" />
      <text class="map-icon" x="61" y="179">S</text>
      <path class="map-pin" d="M526 57a14 14 0 1 1 28 0c0 12-14 28-14 28s-14-16-14-28z" />
      <circle class="map-pin-center" cx="540" cy="57" r="4" />
      <text class="map-label" x="225" y="219">CANOPY BRIDGES</text>
      <text class="map-label" x="481" y="217">ZIP-LINE</text>
    `
  },
  {
    title: 'Earls Barton · Fright Nights',
    description: 'A maze map with the starting camp, lantern key, and exit marked.',
    scene: `
      ${MAZE.flatMap((row, y) => [...row].map((tile, x) => {
      const px = 148 + x * 34;
      const py = 14 + y * 31;
      if (tile === '#') return `<rect class="map-maze-wall" x="${px}" y="${py}" width="30" height="27" rx="3" />`;
      if (tile === 'S') return `<rect class="map-maze-start" x="${px}" y="${py}" width="30" height="27" rx="3" />`;
      if (tile === 'E') return `<rect class="map-maze-exit" x="${px}" y="${py}" width="30" height="27" rx="3" />`;
      if (x === 1 && y === 5) return `<rect class="map-maze-key" x="${px}" y="${py}" width="30" height="27" rx="3" />`;
      return `<rect class="map-maze-path" x="${px}" y="${py}" width="30" height="27" rx="3" />`;
    })).join('')}
      <path class="map-route" d="M197 59h68v62h-68v62h204V90" />
      <text class="map-map-label" x="25" y="47">CAMP</text>
      <text class="map-map-label" x="25" y="128">LANTERN</text>
      <text class="map-map-label" x="475" y="62">EXIT</text>
      <text class="map-caption" x="25" y="66">START</text>
      <text class="map-caption" x="25" y="147">KEY</text>
      <text class="map-caption" x="475" y="82">GATE</text>
    `
  }
];

function renderChapterMap(index) {
  const map = CHAPTER_MAPS[index];
  if (!map) throw new RangeError(`Unknown chapter map: ${index}`);
  const headingId = `chapterMapTitle-${index + 1}`;
  const descriptionId = `chapterMapDescription-${index + 1}`;

  return `
    <section class="chapter-map" aria-labelledby="${headingId}">
      <div class="chapter-map__heading">
        <div>
          <p class="eyebrow">Field map · Chapter ${index + 1}</p>
          <h3 id="${headingId}">${map.title}</h3>
        </div>
        <span class="chapter-map__compass" aria-hidden="true">N<br>✦</span>
      </div>
      <svg class="chapter-map__art" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img" aria-labelledby="${headingId} ${descriptionId}" focusable="false">
        <desc id="${descriptionId}">${map.description}</desc>
        ${map.scene}
      </svg>
      <p class="chapter-map__legend"><span><i class="map-legend__start"></i> Start</span><span><i class="map-legend__route"></i> Quest route</span><span><i class="map-legend__goal"></i> Objective</span></p>
    </section>
  `;
}

export { CHAPTER_MAPS, renderChapterMap };
