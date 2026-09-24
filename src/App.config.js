
import { quaternionFromAxisAngle } from '@math';
const PLAYFIELD_SLOPE_DEG = 6.5;
const GRAVITY = -9.82;
export const HEIGHT_ABOVE_FLOOR = .6;
// One table unit in metres. Layout offsets are written as multiples of it.
export const SCALER = 0.0584;

export const BALL = {
  mass: 0.08,
  radius: 0.0146
}

export const PLAYFIELD = {
  slopeRadians: Math.PI/180 * PLAYFIELD_SLOPE_DEG,
  get slopeQuaternion () {  return quaternionFromAxisAngle({x: 1, y: 0, z: 0 }, this.slopeRadians) },
  offsetX: 0.02628,
}


export const WORLD = {
  gravity: { x: 0, y: GRAVITY, z: 0 }
}


export const CAMERA = {
  position: [0, 1.9, .7 ]
}

export const DEBUG = {
  // The physics wireframe is the only table visual until themed meshes exist.
  showPhysics: true
}
