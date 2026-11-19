import * as THREE from 'three';
import { FRIGHT_OBJECTS, FRIGHT_THEMES } from './fright-logic.js';
import { createFrightMarker, createFrightMarkerGeometries, createFrightMaterial } from './fright-markers.js';

export function createFrightInventoryIcons() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, preserveDrawingBuffer: true });
  if (!context) {
    console.warn('WebGL is unavailable; using illustrated Fright Nights inventory icons.');
    return null;
  }
  const geometries = createFrightMarkerGeometries();
  const materials = new Map();
  const material = (color, glow = false, opacity = 1) => {
    const key = `${color}:${glow}:${opacity}`;
    if (!materials.has(key)) materials.set(key, createFrightMaterial(color, glow, opacity));
    return materials.get(key);
  };
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
    renderer.setSize(128, 128, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#adb5cc', '#302621', 1.4));
    const light = new THREE.DirectionalLight('#c3c4d2', 1.5);
    light.position.set(-500, 1000, 500); scene.add(light);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    const icons = new Map();
    for (const theme of FRIGHT_THEMES) {
      for (const kind of ['clue', 'tool', 'cache']) {
        const object = FRIGHT_OBJECTS.find((entry) => entry.theme === theme.id && entry.kind === kind);
        const marker = createFrightMarker(object, theme.color, geometries, material);
        marker.remove(marker.userData.hitbox);
        scene.add(marker);
        marker.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(marker);
        const center = bounds.getCenter(new THREE.Vector3());
        camera.position.copy(center).add(new THREE.Vector3(40, 35, 120));
        camera.lookAt(center);
        camera.updateMatrixWorld();
        let halfSize = 0;
        for (const x of [bounds.min.x, bounds.max.x]) {
          for (const y of [bounds.min.y, bounds.max.y]) {
            for (const z of [bounds.min.z, bounds.max.z]) {
              const point = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
              halfSize = Math.max(halfSize, Math.abs(point.x), Math.abs(point.y));
            }
          }
        }
        halfSize *= 1.25;
        camera.left = camera.bottom = -halfSize;
        camera.right = camera.top = halfSize;
        camera.updateProjectionMatrix();
        renderer.render(scene, camera);
        icons.set(`${kind}:${theme.id}`, canvas.toDataURL('image/png'));
        scene.remove(marker);
      }
    }
    return icons;
  } finally {
    Object.values(geometries).forEach((geometry) => geometry.dispose());
    materials.forEach((entry) => entry.dispose());
    renderer?.dispose();
    context.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
