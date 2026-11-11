export function drawCoasterItem(ctx, kind) {
  ctx.clearRect(0, 0, 96, 96);
  ctx.fillStyle = '#263d3d';
  ctx.strokeStyle = '#f1dfae';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(48, 48, 44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  if (kind === 'pizza') {
    ctx.fillStyle = '#f4c767'; ctx.strokeStyle = '#9b5b36'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(20, 25); ctx.lineTo(76, 25); ctx.lineTo(48, 78); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c77a40'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(21, 25); ctx.lineTo(75, 25); ctx.stroke();
    ctx.fillStyle = '#c84c43';
    for (const [x, y] of [[37, 39], [56, 38], [48, 55]]) { ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill(); }
  } else if (kind === 'cup') {
    ctx.fillStyle = '#74c8d3'; ctx.strokeStyle = '#eff7e4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(29, 28); ctx.lineTo(67, 28); ctx.lineTo(62, 76); ctx.lineTo(34, 76); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f4b65d'; ctx.fillRect(32, 46, 32, 11);
    ctx.fillStyle = '#f3e5bf'; ctx.fillRect(26, 22, 44, 8);
    ctx.strokeStyle = '#ed8b88'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(51, 24); ctx.lineTo(55, 13); ctx.lineTo(62, 13); ctx.stroke();
  } else if (kind === 'map') {
    ctx.fillStyle = '#e9dfba'; ctx.strokeStyle = '#a08d61'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(18, 30); ctx.lineTo(37, 23); ctx.lineTo(57, 30); ctx.lineTo(78, 23);
    ctx.lineTo(78, 66); ctx.lineTo(58, 73); ctx.lineTo(38, 66); ctx.lineTo(18, 73); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(38, 24); ctx.lineTo(38, 66); ctx.moveTo(58, 30); ctx.lineTo(58, 72); ctx.stroke();
    ctx.strokeStyle = '#679b6c'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(24, 58); ctx.lineTo(44, 42); ctx.lineTo(64, 54); ctx.lineTo(71, 40); ctx.stroke();
    ctx.fillStyle = '#cd6460'; ctx.beginPath(); ctx.arc(44, 42, 4, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'ticket') {
    ctx.fillStyle = '#f2c56b'; ctx.strokeStyle = '#9b6739'; ctx.lineWidth = 3;
    ctx.fillRect(16, 29, 64, 38); ctx.strokeRect(16, 29, 64, 38);
    ctx.fillStyle = '#9b6739'; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FT', 48, 49);
    ctx.fillRect(23, 35, 3, 5); ctx.fillRect(23, 45, 3, 5); ctx.fillRect(23, 55, 3, 5);
  } else if (kind === 'umbrella') {
    ctx.fillStyle = '#779ed1'; ctx.strokeStyle = '#e7e7db'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(48, 47, 29, Math.PI, 0); ctx.lineTo(77, 47); ctx.lineTo(19, 47); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(48, 17); ctx.lineTo(48, 68); ctx.quadraticCurveTo(48, 80, 59, 76); ctx.quadraticCurveTo(63, 74, 63, 69); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(48, 18); ctx.quadraticCurveTo(33, 28, 33, 47); ctx.moveTo(48, 18); ctx.quadraticCurveTo(63, 28, 63, 47); ctx.stroke();
  }
}
