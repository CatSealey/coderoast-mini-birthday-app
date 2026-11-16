import * as THREE from 'three';

const DEAD_LIMBS = [
  [[0, 0, 0, 14], [-1, 18, 0, 12], [2, 42, -1, 10], [-2, 69, 0, 8], [2, 91, -2, 6], [0, 113, -4, 3.5], [-8, 139, -5, 0.5]],
  [[-1, 42, 0, 8], [-15, 58, 0, 7], [-24, 78, 1, 5], [-28, 102, 3, 3], [-39, 125, 3, 0.5]],
  [[-24, 78, 1, 4], [-34, 88, -2, 3], [-40, 108, -3, 2], [-44, 119, -4, 0.4]],
  [[-28, 99, 3, 3], [-20, 114, 7, 2], [-19, 130, 9, 0.4]],
  [[0, 64, 0, 7], [15, 78, 0, 6], [28, 91, -3, 4.5], [38, 111, -4, 2.5], [43, 131, -5, 0.5]],
  [[27, 90, -3, 4], [42, 98, 3, 3], [52, 113, 6, 2], [57, 123, 8, 0.4]],
  [[39, 98, 2, 3], [48, 101, 10, 2], [59, 113, 14, 0.4]],
  [[0, 84, -2, 5], [12, 97, -14, 4], [14, 115, -20, 2.5], [11, 138, -23, 0.5]],
  [[-4, 27, 2, 7], [-18, 38, 8, 5], [-27, 54, 11, 3], [-30, 70, 13, 0.5]],
  [[-19, 0, 1, 2], [-12, 5, 1, 5], [-3, 23, 0, 6]],
  [[19, 0, -4, 2], [11, 5, -2, 5], [2, 24, 0, 6]],
  [[3, 0, 20, 2], [2, 5, 12, 5], [0, 24, 2, 6]],
  [[-4, 0, -19, 2], [-3, 5, -11, 5], [0, 23, -2, 6]]
];

export function createTreeBarkTexture() {
  const image = document.createElement('canvas');
  image.width = 256; image.height = 512;
  const ctx = image.getContext('2d');
  if (!ctx) throw new Error('Could not create the tree bark texture.');
  const random = (index, salt) => {
    const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  ctx.fillStyle = '#ede4d6'; ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 120; i += 1) {
    const x = random(i, 91) * 256;
    const phase = random(i, 92) * Math.PI * 2;
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(255, 250, 235, .38)' : 'rgba(67, 45, 32, .25)';
    ctx.lineWidth = 0.6 + random(i, 93) * 2.5;
    ctx.beginPath();
    for (let y = 0; y <= 512; y += 16) {
      const offset = Math.sin(y / 512 * Math.PI * 2 + phase) * (2 + random(i, 94) * 4);
      if (y === 0) ctx.moveTo(x + offset, y);
      else ctx.lineTo(x + offset, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createDeadTreeGeometry(variant) {
  return createTreeBranchGeometry(DEAD_LIMBS, variant);
}

export function createTreeBranchGeometry(limbs, variant, { sides = 8, segmentsPerSpan = 5, minimumSegments = 8 } = {}) {
  if (!Number.isInteger(variant) || variant < 0 || variant > 2) throw new RangeError('Unknown tree variant.');
  const positions = [], colors = [], uvs = [], indices = [];
  const bark = new THREE.Color('#725742');
  const angle = (variant - 1) * 0.22;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  limbs.forEach((limb, limbIndex) => {
    const points = limb.map(([x, y, z]) => new THREE.Vector3(
      x * cos - z * sin, y * (1 + (variant - 1) * 0.025), x * sin + z * cos
    ));
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const segments = Math.max(minimumSegments, (points.length - 1) * segmentsPerSpan);
    const frames = curve.computeFrenetFrames(segments, false);
    const first = positions.length / 3;
    for (let i = 0; i <= segments; i += 1) {
      const progress = i / segments;
      const center = curve.getPointAt(progress);
      const radiusPosition = progress * (limb.length - 1);
      const lower = Math.min(Math.floor(radiusPosition), limb.length - 2);
      const blend = radiusPosition - lower;
      const radius = THREE.MathUtils.lerp(limb[lower][3], limb[lower + 1][3], blend);
      for (let j = 0; j <= sides; j += 1) {
        const theta = j / sides * Math.PI * 2;
        const radial = j % sides;
        const ridge = 1 + 0.1 * Math.sin(radial * 3.1 + limbIndex * 1.7)
          + 0.045 * Math.sin(progress * 16 + radial * 2.2 + variant);
        const offset = frames.normals[i].clone().multiplyScalar(Math.cos(theta))
          .addScaledVector(frames.binormals[i], Math.sin(theta)).multiplyScalar(radius * ridge);
        positions.push(center.x + offset.x, center.y + offset.y, center.z + offset.z);
        const shade = 0.78 + 0.18 * Math.sin(radial * 2.5 + limbIndex * 0.9) ** 2
          + 0.06 * Math.sin(progress * 21 + radial + limbIndex);
        colors.push(bark.r * shade, bark.g * shade, bark.b * shade);
        uvs.push(j / sides, progress * (limbIndex === 0 ? 2 : 1));
      }
    }
    for (let i = 0; i < segments; i += 1) {
      for (let j = 0; j < sides; j += 1) {
        const a = first + i * (sides + 1) + j;
        const b = a + 1;
        indices.push(a, b, a + sides + 1, b, b + sides + 1, a + sides + 1);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}
