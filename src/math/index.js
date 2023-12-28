import * as CANNON from 'cannon-es';

export const getQuaternion = ({x, y, z}, radians) => {
  const quaternion = new CANNON.Quaternion();
  quaternion.setFromAxisAngle(new CANNON.Vec3(x, y, z), radians);
  return quaternion;
}
