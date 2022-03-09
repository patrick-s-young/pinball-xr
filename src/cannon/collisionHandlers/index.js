import * as CANNON from 'cannon-es';


export const bumperCollisionHandler = (e) => {
  const { 
    x:xBall, 
    y:yBall, 
    z:zBall } = e.body.position;
  const { 
    x:xBumper, 
    y:yBumper, 
    z:zBumper } = e.target.shapeOffsets[0];
  const impulseScaler = 320;
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
  e.body.applyImpulse(impulse, worldPoint);
}
