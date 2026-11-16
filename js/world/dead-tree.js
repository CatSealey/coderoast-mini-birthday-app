import * as THREE from 'three';

const LIMBS = [
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

export function createDeadTreeGeometry(variant) {
  if (!Number.isInteger(variant) || variant < 0 || variant > 2) throw new RangeError('Unknown dead tree variant.');
  const positions = [], colors = [], uvs = [], indices = [];
  const bark = new THREE.Color('#725742');
  const angle = (variant - 1) * 0.22;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  LIMBS.forEach((limb, limbIndex) => {
    const points = limb.map(([x, y, z]) => new THREE.Vector3(
      x * cos - z * sin, y * (1 + (variant - 1) * 0.025), x * sin + z * cos
    ));
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const segments = Math.max(8, (points.length - 1) * 5);
    const sides = 8;
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
