import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from '@cannon/collisions';
import { ballMaterial } from '@cannon/materials';
import { PLAYFIELD } from '@src/App.config';
import { BALL } from '@src/App.config';

const SCALER = 0.0584;

export const BALL_CONFIG = {
  mass: BALL.mass,
  radius: BALL.radius,
  position: new CANNON.Vec3(
    4.75 * SCALER + PLAYFIELD.offsetX, 
    -PLAYFIELD.slopeSin * 9.75 * SCALER + 0.25 * SCALER, 
    PLAYFIELD.slopeCos * 9.75 * SCALER), 
  material: ballMaterial,
  collisionFilterGroup: COLLISION_GROUPS.BALL,
  collisionFilterMask: COLLISION_GROUPS.PLAYFIELD | COLLISION_GROUPS.FLIPPER
}