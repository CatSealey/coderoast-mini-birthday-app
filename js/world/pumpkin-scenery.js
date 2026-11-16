import * as THREE from 'three';

const PUMPKIN_COLORS = [
  ['#a9522d', '#c66a30', '#d98236'],
  ['#ac692f', '#c98335', '#dfa04a'],
  ['#914e31', '#ae6434', '#ca8040']
];

export function pumpkinHasFace(variant) {
  return variant === 0;
}

export function createPumpkinGeometry(variant) {
  if (!Number.isInteger(variant) || variant < 0 || variant >= PUMPKIN_COLORS.length) {
    throw new RangeError('Unknown pumpkin variant.');
  }

  const positions = [];
  const colors = [];
  const indices = [];
  const segments = 48;
  const rings = 16;
  const palette = PUMPKIN_COLORS[variant].map((color) => new THREE.Color(color));

  for (let ring = 0; ring <= rings; ring += 1) {
    const phi = Math.PI * ring / rings;
    const vertical = Math.cos(phi);
    const radius = Math.sin(phi);
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = Math.PI * 2 * segment / segments;
      const lobe = Math.cos(angle * 8);
      const radial = radius * (1 + 0.13 * lobe);
      positions.push(
        Math.cos(angle) * radial * 15,
        vertical * 11,
        Math.sin(angle) * radial * 15
      );

      const color = palette[1].clone();
      color.lerp(palette[0], Math.max(0, lobe) * 0.32);
      color.lerp(palette[2], Math.max(0, -lobe) * 0.24);
      color.multiplyScalar(0.82 + radius * 0.18);
      colors.push(color.r, color.g, color.b);

      if (ring < rings && segment < segments) {
        const index = ring * (segments + 1) + segment;
        indices.push(index, index + 1, index + segments + 1);
        indices.push(index + 1, index + segments + 2, index + segments + 1);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
