import * as CANNON from 'cannon-es';
import { BALL_CONFIG } from './Ball.config';
import { BALL } from '@src/App.config';

export const Ball = ({ world, placement }) => {
  const {
    mass,
    radius,
    position,
    material,
    collisionFilterGroup,
    collisionFilterMask
  } = BALL_CONFIG;
  const [placementX, placementY, placementZ ] = placement;
  const {x:positionX, y:positionY, z:positionZ } = position;
  const spawnPoint = new CANNON.Vec3(
    positionX + placementX,
    positionY + placementY,
    positionZ + placementZ )
  const body = new CANNON.Body({
    mass, 
    material,
    position: spawnPoint,
    collisionFilterGroup,
    collisionFilterMask
    }
  );
  const shape = new CANNON.Sphere(radius);
  body.addShape(shape);
  world.addBody(body);

  const spawn = () => {
    const { x, y, z } = spawnPoint;
    body.position.x = x;
    body.position.y = y + 0.01;
    body.position.z = z;

    body.velocity.x = 0;
    body.velocity.y = 0;
    body.velocity.z = BALL.spawnVelocity; // TODO assign vector
  }

  return {
    body,
    bodyRef: () => body, // TODO change references to 'bodyRef' to 'body'
    spawn
  }
}