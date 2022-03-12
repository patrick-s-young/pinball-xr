import * as CANNON from 'cannon-es';

export const COLLISION_GROUPS = {
  BALL: 1,
  PLAYFIELD: 2,
  TRIGGERS: 4
}


export const bumperCollisionHandler = (e) => {

  const { 
    x:xBall, 
    y:yBall, 
    z:zBall } = e.body.position;
  const { 
    x:xBumper, 
    y:yBumper, 
    z:zBumper } = e.target.shapeOffsets[0];
  const impulseScaler = 30;
  const impulse = new CANNON.Vec3(
     (xBall - xBumper) * impulseScaler, 
      yBall, 
     (zBall - zBumper) * impulseScaler
  );
  const worldPoint = new CANNON.Vec3( 
    xBall, 
    yBall, 
    zBall
  );
  e.body.velocity.x = impulse.x;
  e.body.velocity.y = impulse.y;
  e.body.velocity.z = impulse.z;
}

export const lowerLimitFlipperCollisionHandler = (e) => {
  e.target.constraintTarget.motorEquation.enabled = false;
}