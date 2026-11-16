import * as THREE from 'three';

export const FRIGHT_MARQUEE = Object.freeze({
  postOffset: 65,
  clearance: Object.freeze({ halfWidth: 105, back: 115, front: 90 })
});

export function drawFrightMarqueeSign(ctx) {
  ctx.fillStyle = '#33251f'; ctx.fillRect(0, 0, 512, 160);
  ctx.fillStyle = '#b88a4e'; ctx.fillRect(6, 6, 500, 148);
  ctx.fillStyle = '#4d2927'; ctx.fillRect(14, 14, 484, 132);
  ctx.strokeStyle = '#dbb66d'; ctx.lineWidth = 3;
  ctx.strokeRect(25, 25, 462, 110);
  ctx.fillStyle = '#f2ce80';
  for (let x = 36; x <= 476; x += 40) {
    for (const y of [16, 144]) {
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const x of [16, 496]) for (const y of [43, 80, 117]) {
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#f6dfaa'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 47px serif'; ctx.fillText('FRIGHT NIGHTS', 256, 68, 420);
  ctx.fillStyle = '#d9af72'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('THE CORN MAZE', 256, 109, 320);
}

export function createFrightMarqueeTexture() {
  const image = document.createElement('canvas');
  image.width = 512; image.height = 160;
  const ctx = image.getContext('2d');
  if (!ctx) throw new Error('Could not create the Fright Nights marquee.');
  drawFrightMarqueeSign(ctx);
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
