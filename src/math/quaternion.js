// Plain {x, y, z, w} quaternion helpers. Rapier accepts these objects directly.

export const quaternionFromAxisAngle = ({ x, y, z }, radians) => {
  const halfAngle = radians / 2;
  const sin = Math.sin(halfAngle);
  return { x: x * sin, y: y * sin, z: z * sin, w: Math.cos(halfAngle) };
}

// Returns a * b (apply b, then a).
export const multiplyQuaternions = (a, b) => ({
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z
});

export const rotateVector = ({ x, y, z }, q) => {
  const ix = q.w * x + q.y * z - q.z * y;
  const iy = q.w * y + q.z * x - q.x * z;
  const iz = q.w * z + q.x * y - q.y * x;
  const iw = -q.x * x - q.y * y - q.z * z;
  return {
    x: ix * q.w - iw * q.x - iy * q.z + iz * q.y,
    y: iy * q.w - iw * q.y - iz * q.x + ix * q.z,
    z: iz * q.w - iw * q.z - ix * q.y + iy * q.x
  };
}
