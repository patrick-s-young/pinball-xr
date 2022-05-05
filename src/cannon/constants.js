import * as CANNON from 'cannon-es';

// SLOPE OF PINBALL PLAYFIELD
export const PLAYFIELD_SLOPE_RADIANS = Math.PI/180 * 6;
export const quaternionPlayfieldSlope = new CANNON.Quaternion();
quaternionPlayfieldSlope.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), PLAYFIELD_SLOPE_RADIANS);

