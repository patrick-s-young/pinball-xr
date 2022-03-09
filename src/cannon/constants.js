import * as CANNON from 'cannon-es';

export const quaternionPlayfieldSlope = new CANNON.Quaternion();
quaternionPlayfieldSlope.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), Math.PI/180 * 6);

export const COLLISION_GROUPS = {
  BALL: 1,
  PLAYFIELD: 2,
  TRIGGERS: 4
}