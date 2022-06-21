import * as CANNON from 'cannon-es';


export const PLAYFIELD_CONSTANTS = {
  slopeRadians: Math.PI/180 * 6,
  get slopeCos () { return Math.cos(this.slopeRadians) },
  get slopeSin () { return Math.sin(this.slopeRadians) },
  get slopeQuaternion () {  return getQuaternion({x: 1, y: 0, z: 0 }, this.slopeRadians) },
  offsetX: 0.45,
  outLaneRadians: Math.PI/180 * 16,
  get leftOutLaneQuaternion () { return getQuaternion({x: 0, y: 1, z: 0 }, -this.outLaneRadians) },
  get rightOutLaneQuaternion () { return getQuaternion({x: 0, y: 1, z: 0 }, this.outLaneRadians) },
}



function getQuaternion ({x, y, z}, radians) {
  const quaternion = new CANNON.Quaternion();
  quaternion.setFromAxisAngle(new CANNON.Vec3(x, y, z), radians);
  return quaternion;
}



export const PXREvent = new EventTarget();
export const DRAIN_EVENT = new Event('DRAIN_EVENT'); // organize event definitions in dedicated config