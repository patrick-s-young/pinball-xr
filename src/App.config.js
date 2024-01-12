
import { getQuaternionFromAxisAngle } from '@math';
const PLAYFIELD_SLOPE_DEG = 6.5;
const OUTLANE_CURVE_DEG = 16;
const GRAVITY = -9.82;
export const HEIGHT_ABOVE_FLOOR = .6;

export const BALL = {
  mass: 0.08,
  radius: 0.0146,
  spawnVelocity: -4.7
}

export const PLAYFIELD = {
  slopeRadians: Math.PI/180 * PLAYFIELD_SLOPE_DEG,
  get slopeCos () { return Math.cos(this.slopeRadians) },
  get slopeSin () { return Math.sin(this.slopeRadians) },
  get slopeQuaternion () {  return getQuaternionFromAxisAngle({x: 1, y: 0, z: 0 }, this.slopeRadians) },
  offsetX: 0.02628,
  outLaneRadians: Math.PI/180 * OUTLANE_CURVE_DEG,
  get leftOutLaneQuaternion () { return getQuaternionFromAxisAngle({x: 0, y: 1, z: 0 }, -this.outLaneRadians) },
  get rightOutLaneQuaternion () { return getQuaternionFromAxisAngle({x: 0, y: 1, z: 0 }, this.outLaneRadians) },
}


export const WORLD = {
  gravity: [0 , GRAVITY, 0 ]
}


export const CAMERA = {
  position: [0, 1.9, .7 ]
}
