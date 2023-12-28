import { getQuaternion } from '@math';
const PLAYFIELD_SLOPE_DEG = 6.5;
const OUTLANE_CURVE_DEG = 16;
const GRAVITY = -9.82;

export const BALL = {
  mass: 0.08,
  radius: 0.0146,
  spawnVelocity: -5.1
}

export const PLAYFIELD = {
  slopeRadians: Math.PI/180 * PLAYFIELD_SLOPE_DEG,
  get slopeCos () { return Math.cos(this.slopeRadians) },
  get slopeSin () { return Math.sin(this.slopeRadians) },
  get slopeQuaternion () {  return getQuaternion({x: 1, y: 0, z: 0 }, this.slopeRadians) },
  offsetX: 0.02628,
  outLaneRadians: Math.PI/180 * OUTLANE_CURVE_DEG,
  get leftOutLaneQuaternion () { return getQuaternion({x: 0, y: 1, z: 0 }, -this.outLaneRadians) },
  get rightOutLaneQuaternion () { return getQuaternion({x: 0, y: 1, z: 0 }, this.outLaneRadians) },
}

export const WORLD = {
  gravity: [0 , GRAVITY, 0 ]
}


export const CONTACT_MATERIALS = {
  ballAndPlayfield: {
    friction: 0.1,
    restitution: 0.6
  },
  ballAndBumper: {
    friction: 0.0,
    restitution: 0.5
  },
  ballAndFlipper: {
    friction: 0.2,
    restitution: 0.7
  }
}

export const CAMERA = {
  position: { x: 0, y: .7, z: .8 }
}
