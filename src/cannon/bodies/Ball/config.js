import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from '@cannon/collisions';
import { ballMaterial } from '@cannon/materials';
import { PLAYFIELD_CONSTANTS } from '@cannon/constants';
const offsetX = 0.45; // move to constants

export const BALL_CONFIG = {
  mass: 15,
  radius: 0.25,
  position: new CANNON.Vec3(4.75 + offsetX, -PLAYFIELD_CONSTANTS.slopeSin * 9.75 + 0.25, PLAYFIELD_CONSTANTS.slopeCos * 9.75), 
  material: ballMaterial,
  collisionFilterGroup: COLLISION_GROUPS.BALL,
  collisionFilterMask: COLLISION_GROUPS.PLAYFIELD | COLLISION_GROUPS.FLIPPER
}