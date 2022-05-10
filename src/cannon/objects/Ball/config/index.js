import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from 'cannon/collisions';
import { ballMaterial } from 'cannon/materials';

export const BALL_CONFIG = {
  mass: 15,
  radius: 0.25,
  position: new CANNON.Vec3(0, 0, 0), 
  material: ballMaterial,
  collisionFilterGroup: COLLISION_GROUPS.BALL,
  collisionFilterMask: COLLISION_GROUPS.PLAYFIELD | COLLISION_GROUPS.FLIPPER
}