export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

export const normalize = (v) => {
  const length = Math.sqrt(dot(v, v)) || 1;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}
