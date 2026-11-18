import * as THREE from 'three';

export function createCanopyRopes(scene, maxAnisotropy) {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the canopy rope texture.');
  ctx.fillStyle = '#c6a674'; ctx.fillRect(0, 0, 128, 128);
  for (let offset = -256; offset <= 256; offset += 32) {
    ctx.strokeStyle = '#826343'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(0, offset); ctx.lineTo(128, offset + 128); ctx.stroke();
    ctx.strokeStyle = '#e5c998'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, offset + 7); ctx.lineTo(128, offset + 135); ctx.stroke();
    ctx.strokeStyle = '#b29061'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, offset + 14); ctx.lineTo(128, offset + 142); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(4, maxAnisotropy);
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 1 });
  const geometries = new Map();
  return {
    add(start, end, diameter) {
      const from = new THREE.Vector3(...start), to = new THREE.Vector3(...end);
      const direction = to.clone().sub(from), length = direction.length();
      const repeats = length / (diameter * 4);
      const key = repeats.toFixed(3);
      if (!geometries.has(key)) {
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
        const uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i += 1) uv.setY(i, uv.getY(i) * repeats);
        geometries.set(key, geometry);
      }
      const mesh = new THREE.Mesh(geometries.get(key), material);
      mesh.position.copy(from).add(to).multiplyScalar(0.5);
      mesh.scale.set(diameter, length, diameter);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      scene.add(mesh);
      return mesh;
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
      texture.dispose();
    }
  };
}

export function drawCanopyRope(ctx, x1, y1, x2, y2, diameter) {
  const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
  if (length === 0) return;
  const ux = dx / length, uy = dy / length, nx = -uy, ny = ux;
  for (const [color, width] of [['#76583c', diameter], ['#c5a474', diameter * 0.7]]) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.strokeStyle = '#ead0a0'; ctx.lineWidth = Math.max(0.5, diameter * 0.15);
  ctx.beginPath();
  for (let distance = diameter * 1.2; distance < length - diameter * 0.5; distance += diameter * 2.2) {
    const x = x1 + ux * distance, y = y1 + uy * distance;
    ctx.moveTo(x - ux * diameter * 0.2 - nx * diameter * 0.25, y - uy * diameter * 0.2 - ny * diameter * 0.25);
    ctx.lineTo(x + ux * diameter * 0.2 + nx * diameter * 0.25, y + uy * diameter * 0.2 + ny * diameter * 0.25);
  }
  ctx.stroke();
}

export function drawCanopyCrossing(ctx, crossing, sx, sy, scale) {
  const [startX, startY] = crossing.start, [endX, endY] = crossing.end;
  const rope = (x1, y1, x2, y2, width) => drawCanopyRope(ctx, sx(x1), sy(y1), sx(x2), sy(y2), width * scale);
  if (crossing.kind === 'net') {
    for (const offset of [-38, -20, 0, 20, 40]) rope(startX, startY + offset, endX, endY + offset, 4);
    const segments = Math.ceil((endX - startX) / 25);
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments, x = startX + (endX - startX) * t, y = startY + (endY - startY) * t;
      rope(x, y - 42.5, x, y + 42.5, 5);
    }
  } else {
    rope(startX, startY, endX, endY, 7);
    for (const offset of [-27, 27]) rope(startX, startY + offset, endX, endY + offset, 4);
    const segments = Math.ceil((endX - startX) / 30);
    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments, x = startX + (endX - startX) * t, y = startY + (endY - startY) * t;
      for (const side of [-1, 1]) rope(x, y + side * 6, x, y + side * 27, 3);
    }
  }
}
