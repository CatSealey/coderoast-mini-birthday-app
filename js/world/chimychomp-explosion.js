import * as THREE from 'three';

export const CHOMPY_EXPLOSION_DURATION = 800;

const clamp = (value) => Math.max(0, Math.min(1, value));
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

export function explosionFrame(started, time, reducedMotion = false) {
  const progress = clamp((time - started) / CHOMPY_EXPLOSION_DURATION);
  if (reducedMotion) return { progress, radius: 25, fire: 0.5, glow: 0.22, smoke: 0.24, ring: 0, sparks: 0 };
  return {
    progress,
    radius: 8 + 30 * (1 - (1 - clamp(progress / 0.38)) ** 3),
    fire: 1 - smooth(0.42, 0.9, progress),
    glow: 0.6 * (1 - smooth(0.12, 0.7, progress)),
    smoke: 0.56 * smooth(0.08, 0.35, progress) * (1 - smooth(0.68, 1, progress)),
    ring: 0.75 * (1 - smooth(0.12, 0.65, progress)),
    sparks: (1 - smooth(0.45, 0.95, progress))
  };
}

function glowTexture() {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const offset = (y * size + x) * 4;
      pixels[offset] = 255; pixels[offset + 1] = 154; pixels[offset + 2] = 45;
      pixels[offset + 3] = Math.round(255 * Math.max(0, 1 - distance) ** 2);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export function createChimychompExplosion(scene) {
  const group = new THREE.Group();
  group.name = 'chimychomp-explosion';
  group.visible = false;
  scene.add(group);
  const puffGeometry = new THREE.IcosahedronGeometry(1, 2);
  const flameGeometry = new THREE.ConeGeometry(1, 1, 9);
  const ringGeometry = new THREE.RingGeometry(0.91, 1, 48);
  const texture = glowTexture();
  const fireMaterial = new THREE.MeshStandardMaterial({
    color: '#f06520', emissive: '#e9490a', emissiveIntensity: 0.65,
    transparent: true, depthWrite: false, roughness: 1
  });
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: '#ffcb48', emissive: '#ff9615', emissiveIntensity: 0.8,
    transparent: true, depthWrite: false, roughness: 1
  });
  const smokeMaterial = new THREE.MeshBasicMaterial({ color: '#514943', transparent: true, depthWrite: false });
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: '#ffdc72', transparent: true, depthWrite: false });
  const ringMaterial = new THREE.MeshBasicMaterial({ color: '#ffb24c', transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const haloMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });

  const halo = new THREE.Sprite(haloMaterial);
  halo.name = 'fire-glow'; group.add(halo);
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.name = 'shockwave'; ring.rotation.x = -Math.PI / 2; ring.position.y = 1.5; group.add(ring);
  const fire = new THREE.Group(); fire.name = 'fireball'; group.add(fire);
  const central = new THREE.Mesh(puffGeometry, fireMaterial);
  central.scale.set(0.75, 0.8, 0.75); fire.add(central);
  const core = new THREE.Mesh(puffGeometry, coreMaterial);
  core.position.set(0, 0.12, 0.5); core.scale.set(0.49, 0.56, 0.49); fire.add(core);
  for (let i = 0; i < 7; i += 1) {
    const angle = i * Math.PI * 2 / 7;
    const lobe = new THREE.Mesh(puffGeometry, fireMaterial);
    lobe.position.set(Math.cos(angle) * 0.56, 0.15 + (i % 3) * 0.1, Math.sin(angle) * 0.56);
    lobe.scale.set(0.43, 0.48 + (i % 2) * 0.12, 0.43); fire.add(lobe);
    const tip = new THREE.Mesh(flameGeometry, i % 2 ? coreMaterial : fireMaterial);
    tip.position.set(Math.cos(angle) * 0.48, 0.73, Math.sin(angle) * 0.48);
    tip.scale.set(0.22, 0.7 + (i % 3) * 0.12, 0.22); tip.rotation.z = -Math.cos(angle) * 0.3;
    tip.rotation.x = Math.sin(angle) * 0.3; fire.add(tip);
  }
  const smoke = new THREE.Group(); smoke.name = 'smoke'; group.add(smoke);
  const embers = new THREE.Group(); embers.name = 'embers'; group.add(embers);
  for (let i = 0; i < 9; i += 1) {
    const cloud = new THREE.Mesh(puffGeometry, smokeMaterial);
    cloud.userData.angle = i * Math.PI * 2 / 9;
    smoke.add(cloud);
  }
  for (let i = 0; i < 16; i += 1) {
    const spark = new THREE.Mesh(flameGeometry, sparkMaterial);
    spark.userData.angle = i * Math.PI * 2 / 16;
    embers.add(spark);
  }

  return {
    update(explosion, time, reducedMotion = false) {
      group.visible = Boolean(explosion);
      if (!explosion) return;
      const frame = explosionFrame(explosion.started, time, reducedMotion);
      const { radius } = frame;
      const progress = reducedMotion ? 0.3 : frame.progress;
      group.position.set(explosion.x, 0, explosion.y);
      fire.position.y = 16 + radius * 0.3;
      fire.scale.setScalar(radius);
      fire.visible = frame.fire > 0.005;
      fireMaterial.opacity = frame.fire * 0.94; coreMaterial.opacity = frame.fire;
      halo.position.y = 20 + radius * 0.3;
      halo.scale.setScalar(radius * 4.2);
      haloMaterial.opacity = frame.glow;
      ring.visible = frame.ring > 0.005;
      ring.scale.setScalar(8 + progress * 70);
      ringMaterial.opacity = frame.ring;
      smoke.visible = frame.smoke > 0.005;
      smokeMaterial.opacity = frame.smoke;
      smoke.children.forEach((cloud, index) => {
        const angle = cloud.userData.angle;
        const distance = 10 + progress * (22 + (index % 3) * 4);
        cloud.position.set(Math.cos(angle) * distance, 20 + progress * 50 + (index % 3) * 7, Math.sin(angle) * distance);
        cloud.scale.setScalar(7 + progress * (12 + index % 4));
      });
      embers.visible = frame.sparks > 0.005;
      sparkMaterial.opacity = frame.sparks;
      embers.children.forEach((spark, index) => {
        const angle = spark.userData.angle;
        const distance = 8 + progress * (55 + (index % 4) * 10);
        spark.position.set(Math.cos(angle) * distance, 12 + progress * (25 + (index % 5) * 12), Math.sin(angle) * distance);
        spark.scale.set(1.7, 7 * (1 - progress) + 1, 1.7);
        spark.rotation.z = -Math.cos(angle) * 0.6;
        spark.rotation.x = Math.sin(angle) * 0.6;
      });
    },
    dispose() {
      scene.remove(group);
      puffGeometry.dispose(); flameGeometry.dispose(); ringGeometry.dispose(); texture.dispose();
      fireMaterial.dispose(); coreMaterial.dispose(); smokeMaterial.dispose(); sparkMaterial.dispose();
      ringMaterial.dispose(); haloMaterial.dispose();
    }
  };
}

export function drawChimychompExplosion(ctx, started, time, reducedMotion = false) {
  const frame = explosionFrame(started, time, reducedMotion);
  const { radius } = frame;
  const progress = reducedMotion ? 0.3 : frame.progress;
  ctx.save();
  if (frame.glow > 0.005) {
    const glow = ctx.createRadialGradient(0, -22, 0, 0, -22, radius * 2.4);
    glow.addColorStop(0, `rgba(255, 197, 82, ${frame.glow})`);
    glow.addColorStop(1, 'rgba(255, 103, 26, 0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -22, radius * 2.4, 0, Math.PI * 2); ctx.fill();
  }
  if (frame.ring > 0.005) {
    ctx.strokeStyle = `rgba(255, 178, 76, ${frame.ring})`; ctx.lineWidth = 3 * (1 - progress) + 0.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 8 + progress * 70, 4 + progress * 24, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (frame.smoke > 0.005) {
    ctx.fillStyle = `rgba(81, 73, 67, ${frame.smoke})`;
    for (let i = 0; i < 9; i += 1) {
      const angle = i * Math.PI * 2 / 9;
      const distance = 10 + progress * (22 + (i % 3) * 4);
      ctx.beginPath(); ctx.arc(Math.cos(angle) * distance, -20 - progress * 50 + Math.sin(angle) * distance * 0.45,
        7 + progress * (12 + i % 4), 0, Math.PI * 2); ctx.fill();
    }
  }
  if (frame.fire > 0.005) {
    ctx.save();
    ctx.globalAlpha *= frame.fire;
    ctx.fillStyle = '#e85b1f';
    for (let i = 0; i < 7; i += 1) {
      const angle = i * Math.PI * 2 / 7;
      const x = Math.cos(angle) * radius * 0.6, y = -20 + Math.sin(angle) * radius * 0.38;
      ctx.beginPath(); ctx.arc(x, y, radius * 0.52, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - radius * 0.24, y); ctx.lineTo(x, y - radius * (1 + (i % 3) * 0.2));
      ctx.lineTo(x + radius * 0.24, y); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ffb738'; ctx.beginPath(); ctx.arc(0, -20, radius * 0.63, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe997'; ctx.beginPath(); ctx.arc(0, -20, radius * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  if (frame.sparks > 0.005) {
    ctx.strokeStyle = `rgba(255, 220, 114, ${frame.sparks})`; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = 0; i < 16; i += 1) {
      const angle = i * Math.PI * 2 / 16;
      const distance = 8 + progress * (55 + (i % 4) * 10);
      const x = Math.cos(angle) * distance, y = -15 - progress * (25 + (i % 5) * 7) + Math.sin(angle) * distance * 0.4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(angle) * 5, y + 4); ctx.stroke();
    }
  }
  ctx.restore();
}
