import * as CANNON from 'cannon-es';
import { BALL_CONFIG } from './config';

export const BallBody = (props) => {
  const { world } = props;
  const {
    mass,
    radius,
    position,
    material,
    collisionFilterGroup,
    collisionFilterMask
  } = BALL_CONFIG;

  const ballBody = new CANNON.Body({
    mass, 
    material,
    position,
    collisionFilterGroup,
    collisionFilterMask
    }
  );
  const ball = new CANNON.Sphere(radius);
  ballBody.addShape(ball);
  world.addBody(ballBody);
  return ballBody;
}