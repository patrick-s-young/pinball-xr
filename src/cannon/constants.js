import * as CANNON from 'cannon-es';

// SLOPE OF PINBALL PLAYFIELD
export const quaternionPlayfieldSlope = new CANNON.Quaternion();
quaternionPlayfieldSlope.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), Math.PI/180 * 6);

