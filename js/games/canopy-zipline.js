import * as THREE from 'three';
import { CANOPY_PLATFORMS } from './adventure-logic.js';

const STRAP = '#3986c5';
const STRAP_DARK = '#1c4b77';
const METAL = '#d7dfdc';
export const ZIP_CABLE_SCREEN_OFFSET = 24;
export const CANOPY_SAFETY_WIRE = Object.freeze(CANOPY_PLATFORMS.flatMap((platform) => [
  Object.freeze({ x: platform.left, y: 350, height: platform.height + 160 }),
  Object.freeze({ x: platform.right, y: 350, height: platform.height + 160 })
]));

export function canopySafetyAnchor(x) {
  const first = CANOPY_SAFETY_WIRE[0], last = CANOPY_SAFETY_WIRE.at(-1);
  const clampedX = Math.max(first.x, Math.min(last.x, x));
  const index = CANOPY_SAFETY_WIRE.findIndex((point) => point.x >= clampedX);
  const to = CANOPY_SAFETY_WIRE[Math.max(1, index)], from = CANOPY_SAFETY_WIRE[Math.max(0, index - 1)];
  const progress = (clampedX - from.x) / (to.x - from.x);
  return { x: clampedX, height: from.height + (to.height - from.height) * progress, y: from.y };
}

export function addZipCable({ round, cylinder, parent }, start, end) {
  const from = new THREE.Vector3(...start), to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from), middle = from.clone().add(to).multiplyScalar(0.5);
  const cable = round(cylinder, middle.x, middle.y, middle.z, 3.5, direction.length(), 3.5, '#aeb8b6', parent);
  cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return cable;
}

export function createZipRide({ box, round, cylinder, sphere, player, scene, cableHeight, bodyRise = 0 }) {
  const harness = new THREE.Group();
  harness.position.y = bodyRise;
  player.add(harness);
  const strap = (start, end, width, color = STRAP) => {
    const from = new THREE.Vector3(...start), to = new THREE.Vector3(...end);
    const direction = to.clone().sub(from), middle = from.clone().add(to).multiplyScalar(0.5);
    const part = box(middle.x, middle.y, middle.z, width, direction.length(), width, color, harness);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    return part;
  };
  for (const z of [-9, 9]) {
    box(0, 28, z, 27, 5, 2, STRAP_DARK, harness);
    for (const side of [-1, 1]) {
      strap([side * 10, 29, z], [side * 6, 55, z], 2.5);
      box(side * 7, 17, z * 0.6, 10, 4, 3, STRAP, harness);
    }
  }
  box(0, 28, 10.5, 7, 6, 2, METAL, harness);
  box(0, 28, 12, 3, 3, 1, STRAP_DARK, harness);
  strap([0, 31, 12], [0, 98, 13], 2.5, '#e3b970');
  const tether = strap([0, 98, 13], [0, cableHeight, 0], 2.5, '#e3b970');
  round(sphere, 0, 99, 13, 6, 6, 6, METAL, harness);

  const trolley = new THREE.Group();
  scene.add(trolley);
  box(0, -4, 0, 23, 8, 10, '#657d80', trolley);
  box(0, -4, 5.2, 17, 4, 1, METAL, trolley);
  for (const x of [-7, 7]) {
    round(cylinder, x, 1, 0, 9, 4, 9, '#354b50', trolley).rotation.x = Math.PI / 2;
    round(sphere, x, 1, 3, 3, 3, 3, METAL, trolley);
  }
  box(0, -10, 0, 5, 7, 5, '#d7a958', trolley);
  const clip = new THREE.Group();
  scene.add(clip);
  round(sphere, 0, 0, 0, 6, 6, 6, METAL, clip);
  box(0, -4, 0, 3, 7, 3, '#d7a958', clip);
  trolley.visible = false;
  return { harness, tether, trolley, clip };
}

export function setZipRiderPose(player, ride, active, anchor, direction) {
  ride.harness.visible = true;
  ride.trolley.visible = active;
  ride.clip.visible = !active;
  for (const [index, arm] of player.userData.arms.entries()) {
    arm.rotation.z = active ? (index === 0 ? 1 : -1) * (Math.PI - 0.48) : arm.userData.restRotation ?? 0;
    if (active) {
      arm.rotation.x = 0.5;
      arm.userData.elbow.rotation.x = 0;
    }
  }
  const target = new THREE.Vector3(anchor.x, anchor.height, anchor.y);
  ride.clip.position.copy(target);
  player.updateWorldMatrix(true, false);
  const localTarget = ride.harness.worldToLocal(target.clone()), from = new THREE.Vector3(0, 98, 13);
  const tetherDirection = localTarget.clone().sub(from);
  ride.tether.position.copy(from).add(localTarget).multiplyScalar(0.5);
  ride.tether.scale.y = tetherDirection.length();
  ride.tether.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tetherDirection.normalize());
  if (active) {
    ride.trolley.position.copy(target);
    ride.trolley.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.clone().normalize());
  }
}

export function drawZipCable(ctx, points, sx, sy) {
  for (const [color, width] of [['#354b50', 6], ['#b2c2bf', 3], ['#e7e8d8', 1]]) {
    ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath();
    points.forEach((point, index) => {
      const x = sx(point.x), y = sy(point.y) - ZIP_CABLE_SCREEN_OFFSET;
      if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

export function drawZipTether(ctx, x, y, anchorX = x, anchorY = y - ZIP_CABLE_SCREEN_OFFSET) {
  ctx.strokeStyle = '#e3b970'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x + 9, y + 12); ctx.lineTo(x + 10, y - 16);
  ctx.lineTo(anchorX, anchorY); ctx.stroke();
  ctx.fillStyle = '#354b50'; ctx.fillRect(anchorX - 9, anchorY - 3, 18, 7);
  ctx.fillStyle = METAL; ctx.fillRect(anchorX - 6, anchorY - 1, 12, 2);
}

export function drawZipHarness(ctx, x, y) {
  ctx.fillStyle = STRAP_DARK; ctx.fillRect(x - 8, y + 13, 16, 3);
  ctx.fillStyle = STRAP;
  for (const side of [-1, 1]) {
    ctx.fillRect(x + (side < 0 ? -6 : 4), y + 6, 2, 10);
    ctx.fillRect(x + (side < 0 ? -7 : 2), y + 19, 5, 2);
  }
  ctx.fillStyle = METAL; ctx.fillRect(x - 2, y + 13, 4, 3);
}
