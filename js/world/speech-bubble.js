export function speechBubblePosition(anchor, viewport, bubble) {
  const margin = 8;
  const x = Math.max(margin, Math.min(viewport.width - bubble.width - margin, anchor.x - bubble.width / 2));
  const y = Math.max(margin, Math.min(viewport.height - bubble.height - margin, anchor.y - bubble.height - 10));
  const tailX = Math.max(12, Math.min(bubble.width - 12, anchor.x - x));
  return { x, y, tailX };
}
