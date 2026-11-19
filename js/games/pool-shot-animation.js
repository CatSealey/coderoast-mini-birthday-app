export function poolMissOffset(aim, power, elapsed) {
  if (elapsed >= 1.7) return { x: 0, y: 0 };
  const angle = aim * Math.PI / 180;
  const intendedDistance = Math.abs(aim) > 7 ? 35 + power * 1.15 : 25 + Math.min(power, 75) * 0.55;
  const blackDistance = 77, clearance = 12;
  const offset = blackDistance * Math.sin(angle);
  const beforeBlack = Math.abs(offset) < clearance
    ? blackDistance * Math.cos(angle) - Math.sqrt(clearance ** 2 - offset ** 2) : Infinity;
  const distance = Math.min(intendedDistance, beforeBlack);
  const progress = Math.min(1, elapsed / 1.2);
  const travel = distance * (1 - (1 - progress) ** 2);
  return {
    x: Math.min(163, travel * Math.cos(angle)),
    y: Math.max(-45, Math.min(45, travel * Math.sin(angle)))
  };
}
