export function rockVariant(x, z) {
  const value = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return Math.floor((value - Math.floor(value)) * 3);
}
