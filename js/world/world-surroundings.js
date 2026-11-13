import { WORLD_SIZE } from './world-data.js';
import { regionBlendAt } from './world-regions.js';

export const SURROUNDINGS_MARGIN = 3000;
export const SURROUNDINGS_BOUNDS = Object.freeze({
  left: -SURROUNDINGS_MARGIN,
  top: -SURROUNDINGS_MARGIN,
  right: WORLD_SIZE.width + SURROUNDINGS_MARGIN,
  bottom: WORLD_SIZE.height + SURROUNDINGS_MARGIN
});

function random(index, salt) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export function surroundingTrees() {
  const trees = [];
  const width = SURROUNDINGS_BOUNDS.right - SURROUNDINGS_BOUNDS.left;
  const height = SURROUNDINGS_BOUNDS.bottom - SURROUNDINGS_BOUNDS.top;
  for (let i = 0; i < 1800; i += 1) {
    const x = SURROUNDINGS_BOUNDS.left + random(i, 101) * width;
    const z = SURROUNDINGS_BOUNDS.top + random(i, 102) * height;
    if (x >= -100 && x <= WORLD_SIZE.width + 100 && z >= -100 && z <= WORLD_SIZE.height + 100) continue;
    trees.push({
      x, z,
      region: regionBlendAt({ x, y: z }).region.id,
      size: 0.65 + random(i, 103) * 0.9,
      variant: i % 3,
      angle: random(i, 104) * Math.PI * 2
    });
  }
  return trees;
}

export function createSurroundingTerrain() {
  const width = SURROUNDINGS_BOUNDS.right - SURROUNDINGS_BOUNDS.left;
  const height = SURROUNDINGS_BOUNDS.bottom - SURROUNDINGS_BOUNDS.top;
  const colors = document.createElement('canvas');
  colors.width = Math.ceil(width / 20);
  colors.height = Math.ceil(height / 20);
  const colorContext = colors.getContext('2d');
  if (!colorContext) throw new Error('The browser could not initialize the surrounding landscape colors.');
  const pixels = colorContext.createImageData(colors.width, colors.height);
  for (let y = 0; y < colors.height; y += 1) {
    for (let x = 0; x < colors.width; x += 1) {
      const { region, neighbor, blend } = regionBlendAt({
        x: SURROUNDINGS_BOUNDS.left + (x + 0.5) * width / colors.width,
        y: SURROUNDINGS_BOUNDS.top + (y + 0.5) * height / colors.height
      });
      const offset = (y * colors.width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        pixels.data[offset + channel] = region.color[channel] * (1 - blend) + neighbor.color[channel] * blend;
      }
      pixels.data[offset + 3] = 255;
    }
  }
  colorContext.putImageData(pixels, 0, 0);
  const canvas = document.createElement('canvas');
  canvas.width = colors.width * 2;
  canvas.height = colors.height * 2;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The browser could not initialize the surrounding landscape.');
  context.drawImage(colors, 0, 0, canvas.width, canvas.height);
  context.scale(canvas.width / width, canvas.height / height);
  const detailMargin = 1600;
  for (let i = 0; i < 42000; i += 1) {
    const x = SURROUNDINGS_MARGIN - detailMargin + random(i, 105) * (WORLD_SIZE.width + 2 * detailMargin);
    const y = SURROUNDINGS_MARGIN - detailMargin + random(i, 106) * (WORLD_SIZE.height + 2 * detailMargin);
    const size = 2 + random(i, 107) * 11;
    context.fillStyle = i % 4 === 0 ? 'rgba(207, 204, 132, 0.12)' : 'rgba(29, 65, 36, 0.10)';
    context.beginPath();
    context.ellipse(x, y, size * 2.2, size * 0.7, 0, 0, Math.PI * 2);
    context.fill();
  }
  return canvas;
}
