import * as THREE from 'three';
import { drawSignFrame } from './games-sign.js';

const PANELS = Object.freeze({
  billiards: '#28473b',
  kettle: '#573a30',
  leaf: '#304b39',
  lantern: '#443b4a',
  cutlery: '#58452e'
});

export function drawVenueSign(ctx, name, motif) {
  if (!Object.hasOwn(PANELS, motif)) throw new RangeError('Unknown venue sign motif.');
  drawSignFrame(ctx, PANELS[motif]);
  ctx.strokeStyle = '#e0c591';
  ctx.fillStyle = '#e0c591';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const x of [44, 468]) {
    ctx.save();
    ctx.translate(x, 40);
    ctx.beginPath();
    if (motif === 'billiards') {
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f8e9be'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
      ctx.textBaseline = 'middle'; ctx.fillText('8', 0, 1);
    } else if (motif === 'kettle') {
      ctx.moveTo(-12, -3); ctx.lineTo(-10, 10); ctx.lineTo(10, 10); ctx.lineTo(12, -3);
      ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, -4); ctx.quadraticCurveTo(0, -19, 9, -4);
      ctx.moveTo(12, 0); ctx.lineTo(18, -5); ctx.stroke();
    } else if (motif === 'leaf') {
      ctx.moveTo(-13, 11); ctx.quadraticCurveTo(-16, -12, 13, -15);
      ctx.quadraticCurveTo(13, 9, -13, 11); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, 9); ctx.lineTo(8, -9); ctx.stroke();
    } else if (motif === 'lantern') {
      ctx.moveTo(-10, -9); ctx.lineTo(10, -9); ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, -10); ctx.lineTo(0, -17); ctx.lineTo(12, -10);
      ctx.moveTo(0, -8); ctx.lineTo(0, 11); ctx.moveTo(-9, 1); ctx.lineTo(9, 1); ctx.stroke();
    } else {
      ctx.moveTo(-8, -15); ctx.lineTo(-8, 15); ctx.moveTo(-14, -15); ctx.lineTo(-14, -5);
      ctx.lineTo(-2, -5); ctx.lineTo(-2, -15); ctx.moveTo(8, -15); ctx.lineTo(8, 15);
      ctx.moveTo(8, -15); ctx.quadraticCurveTo(16, -8, 8, 0); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = '#f8e9be';
  ctx.font = 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 256, 41, 360);
}

export function createVenueSignTexture(name, motif) {
  const image = document.createElement('canvas');
  image.width = 512;
  image.height = 80;
  const ctx = image.getContext('2d');
  if (!ctx) throw new Error('Could not create the venue sign.');
  drawVenueSign(ctx, name, motif);
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
