import { BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, Vector3 } from 'three';
import { QUEST_LOCATIONS } from './world-data.js';
import { regionBlendAt } from './world-regions.js';
import { createCollision, worldObstacles } from './world-collision.js';
import { roadDistance, scatteredParkBanners } from './world-art.js';
import { COASTER_TRACKS, scatterScenery } from './world-scenery-data.js';
import { PARK_BANNERS, PARK_MAIN_COASTER, PARK_RIDES, PARK_WHEEL } from './park-scenery.js';

const BUSH_PALETTES = [
  ['#344a2c', '#5b8149', '#71985b', '#a0b97a', '#e6d9ac'],
  ['#4b5630', '#829455', '#9eaa69', '#c4c793', '#d2ad9d'],
  ['#304b3b', '#567e62', '#71967a', '#a4c29b', '#dcd6a9']
];

export const PARK_BUSH_SHAPES = Object.freeze([
  Object.freeze([
    Object.freeze({ x: -15, z: 0, y: 10, width: 0.27, height: 0.23 }),
    Object.freeze({ x: 14, z: 1, y: 9, width: 0.29, height: 0.22 }),
    Object.freeze({ x: 0, z: -3, y: 14, width: 0.34, height: 0.30 })
  ]),
  Object.freeze([
    Object.freeze({ x: -12, z: 1, y: 9, width: 0.26, height: 0.22 }),
    Object.freeze({ x: 12, z: 0, y: 10, width: 0.26, height: 0.24 }),
    Object.freeze({ x: 1, z: -2, y: 17, width: 0.29, height: 0.36 })
  ]),
  Object.freeze([
    Object.freeze({ x: -17, z: 1, y: 8, width: 0.23, height: 0.19 }),
    Object.freeze({ x: -4, z: -2, y: 13, width: 0.31, height: 0.27 }),
    Object.freeze({ x: 15, z: 1, y: 12, width: 0.29, height: 0.28 })
  ]),
  Object.freeze([
    Object.freeze({ x: 0, z: 0, y: 11, width: 0.46, height: 0.32 })
  ]),
  Object.freeze([
    Object.freeze({ x: -10, z: 0, y: 10, width: 0.34, height: 0.25 }),
    Object.freeze({ x: 11, z: -1, y: 13, width: 0.36, height: 0.31 })
  ]),
  Object.freeze([
    Object.freeze({ x: -18, z: 1, y: 8, width: 0.22, height: 0.19 }),
    Object.freeze({ x: 17, z: 2, y: 8, width: 0.22, height: 0.19 }),
    Object.freeze({ x: -8, z: -2, y: 12, width: 0.27, height: 0.25 }),
    Object.freeze({ x: 8, z: -3, y: 14, width: 0.28, height: 0.29 })
  ]),
  Object.freeze([
    Object.freeze({ x: -19, z: 1, y: 7, width: 0.20, height: 0.17 }),
    Object.freeze({ x: 19, z: 1, y: 7, width: 0.20, height: 0.17 }),
    Object.freeze({ x: -10, z: -1, y: 10, width: 0.24, height: 0.22 }),
    Object.freeze({ x: 10, z: -2, y: 11, width: 0.24, height: 0.23 }),
    Object.freeze({ x: 0, z: -3, y: 13, width: 0.27, height: 0.25 })
  ])
]);

const LEAF_PROFILES = [
  [26, 14, 13], [22, 14, 17], [27, 15, 13], [20, 15, 11],
  [24, 14, 13], [26, 14, 13], [27, 13, 11]
];

function random(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function leafPositions(shape) {
  const [width, depth, height] = LEAF_PROFILES[shape];
  return Array.from({ length: 38 }, (_, index) => {
    const angle = random(index + shape * 51, 1) * Math.PI * 2;
    const radius = Math.sqrt(random(index + shape * 51, 2));
    return {
      x: Math.cos(angle) * radius * width,
      z: Math.sin(angle) * radius * depth,
      y: 11 + height * Math.sqrt(1 - radius * radius),
      angle: angle + (random(index, 3) - 0.5) * 1.2,
      length: 4.5 + random(index, 4) * 3,
      shade: index % 4
    };
  });
}

export function createParkBushLeavesGeometry(variant, shape, flowering) {
  const palette = BUSH_PALETTES[variant];
  if (!palette || !PARK_BUSH_SHAPES[shape]) throw new RangeError('Unknown park bush style.');
  const positions = [], colors = [], leaves = leafPositions(shape);
  const triangle = (a, b, c, color) => {
    const tone = new Color(color);
    for (const point of [a, b, c]) {
      positions.push(...point); colors.push(tone.r, tone.g, tone.b);
    }
  };
  for (const leaf of leaves) {
    const dx = Math.cos(leaf.angle), dz = Math.sin(leaf.angle);
    const root = [leaf.x - dx * 2, leaf.y - 1, leaf.z - dz * 2];
    const tip = [leaf.x + dx * leaf.length, leaf.y + 2.5, leaf.z + dz * leaf.length];
    const left = [leaf.x - dz * 2.2, leaf.y, leaf.z + dx * 2.2];
    const right = [leaf.x + dz * 2.2, leaf.y, leaf.z - dx * 2.2];
    const ridge = [leaf.x + dx * 2, leaf.y + 1.2, leaf.z + dz * 2];
    triangle(root, left, ridge, palette[leaf.shade % 2 + 1]);
    triangle(left, tip, ridge, palette[leaf.shade % 2 + 1]);
    triangle(root, ridge, right, palette[leaf.shade % 3 + 1]);
    triangle(right, ridge, tip, palette[leaf.shade % 3 + 1]);
  }
  if (flowering) {
    for (const leaf of [leaves[2], leaves[13], leaves[24], leaves[31]]) {
      const center = [leaf.x, leaf.y + 2.5, leaf.z];
      for (let petal = 0; petal < 5; petal += 1) {
        const angle = petal * Math.PI * 2 / 5;
        const next = angle + Math.PI * 2 / 5;
        triangle(center, [leaf.x + Math.cos(angle) * 2.4, center[1] + 0.4, leaf.z + Math.sin(angle) * 2.4],
          [leaf.x + Math.cos(next) * 2.4, center[1] + 0.4, leaf.z + Math.sin(next) * 2.4], palette[4]);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function coasterPoints() {
  const rides = [
    { ...PARK_MAIN_COASTER, trackType: 'thirteen', rotation: 0 },
    ...PARK_RIDES.filter((ride) => ride.trackType)
  ];
  return rides.flatMap((ride) => {
    const curve = new CatmullRomCurve3(COASTER_TRACKS[ride.trackType].map((point) => new Vector3(...point)),
      true, 'centripetal');
    return Array.from({ length: 100 }, (_, index) => {
      const point = curve.getPointAt(index / 100);
      return {
        x: ride.x + ride.size * (point.x * Math.cos(ride.rotation) + point.z * Math.sin(ride.rotation)),
        y: ride.y + ride.size * (-point.x * Math.sin(ride.rotation) + point.z * Math.cos(ride.rotation))
      };
    });
  });
}

export function parkBushes() {
  const park = QUEST_LOCATIONS[2];
  const collision = createCollision(worldObstacles(), 45);
  const track = coasterPoints();
  const decorations = [
    ...PARK_BANNERS, ...scatteredParkBanners(),
    { x: park.x - 475, y: park.y + 350 }, { x: park.x - 155, y: park.y + 195 },
    { x: park.x + 260, y: park.y + 155 }, { x: park.x - 290, y: park.y + 110 }
  ];
  const candidates = scatterScenery({
    center: park, count: 100, radius: 1250, seed: 463,
    accept: (point) => regionBlendAt(point).region.id === 'park'
      && roadDistance(point) > 105
      && !collision.blocked(point)
      && Math.hypot(point.x - PARK_WHEEL.x, point.y - PARK_WHEEL.y) > 145
      && decorations.every((item) => Math.hypot(point.x - item.x, point.y - item.y) > 80)
      && track.every((item) => Math.hypot(point.x - item.x, point.y - item.y) > 75)
  });
  const bushes = [];
  for (const candidate of candidates) {
    if (bushes.every((bush) => Math.hypot(candidate.x - bush.x, candidate.y - bush.y) >= 75)) {
      const seed = candidate.x * 0.13 + candidate.y * 0.31;
      bushes.push({ ...candidate, shape: Math.floor(random(seed, 7) * PARK_BUSH_SHAPES.length),
        flowering: random(seed, 8) < 0.3 });
      if (bushes.length === 45) break;
    }
  }
  return bushes;
}

export function drawParkBush(ctx, variant, shape = 0, flowering = false) {
  const palette = BUSH_PALETTES[variant];
  if (!palette || !PARK_BUSH_SHAPES[shape]) throw new RangeError('Unknown park bush style.');
  const ellipse = (x, y, rx, ry, color) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  };
  ellipse(2, 1, 32, 8, 'rgba(24, 35, 22, .3)');
  const lobes = PARK_BUSH_SHAPES[shape];
  for (const [index, lobe] of lobes.entries()) {
    ellipse(lobe.x, -lobe.y, lobe.width * 52, lobe.height * 48, palette[index === lobes.length - 1 ? 1 : 0]);
  }
  const leaves = leafPositions(shape);
  for (const leaf of leaves) {
    const x = leaf.x, y = -leaf.y * 0.65 + leaf.z * 0.48 - 1;
    const dx = Math.cos(leaf.angle) * leaf.length * 0.8;
    const dy = Math.sin(leaf.angle) * leaf.length * 0.45 - 1;
    ctx.fillStyle = palette[leaf.shade % 3 + 1];
    ctx.beginPath(); ctx.moveTo(x - dx * 0.3, y - dy * 0.3);
    ctx.quadraticCurveTo(x - dy * 0.45, y + dx * 0.45, x + dx, y + dy);
    ctx.quadraticCurveTo(x + dy * 0.45, y - dx * 0.45, x - dx * 0.3, y - dy * 0.3);
    ctx.fill();
  }
  if (flowering) {
    for (const leaf of [leaves[2], leaves[13], leaves[24], leaves[31]]) {
      const x = leaf.x, y = -leaf.y * 0.65 + leaf.z * 0.48 - 1;
      for (const [dx, dy] of [[-1.6, 0], [1.6, 0], [0, -1.6], [0, 1.6]]) ellipse(x + dx, y + dy, 1.4, 1, palette[4]);
      ellipse(x, y, 0.7, 0.7, '#c7a969');
    }
  }
}
