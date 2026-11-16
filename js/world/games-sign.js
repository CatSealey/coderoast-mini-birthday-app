import * as THREE from 'three';

export function drawSignFrame(ctx, background) {
  ctx.fillStyle = '#493425';
  ctx.fillRect(0, 0, 512, 80);
  ctx.fillStyle = '#b89a64';
  ctx.fillRect(5, 5, 502, 70);
  ctx.fillStyle = background;
  ctx.fillRect(9, 9, 494, 62);
  ctx.strokeStyle = '#d2bd86';
  ctx.lineWidth = 2;
  ctx.strokeRect(13, 13, 486, 54);
}

export function drawGamesSign(ctx) {
  drawSignFrame(ctx, '#28473b');
  ctx.fillStyle = '#1c2522';
  ctx.beginPath(); ctx.arc(43, 40, 20, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d2bd86'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#f1e4c2';
  ctx.beginPath(); ctx.arc(43, 40, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#29342d'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
  ctx.textBaseline = 'middle'; ctx.fillText('8', 43, 41);

  ctx.fillStyle = '#ded2ab';
  ctx.beginPath(); ctx.arc(469, 40, 20, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#33473a';
  ctx.beginPath(); ctx.arc(469, 40, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d6c7a2'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(453, 40); ctx.lineTo(485, 40);
  ctx.moveTo(469, 24); ctx.lineTo(469, 56); ctx.stroke();
  ctx.fillStyle = '#b55b4b';
  ctx.beginPath(); ctx.arc(469, 40, 5, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#f8e9be';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('POOL · DARTS · GAMES', 256, 41, 360);
}

export function createGamesSignTexture() {
  const image = document.createElement('canvas');
  image.width = 512;
  image.height = 80;
  const ctx = image.getContext('2d');
  if (!ctx) throw new Error('Could not create the games sign.');
  drawGamesSign(ctx);
  const texture = new THREE.CanvasTexture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
