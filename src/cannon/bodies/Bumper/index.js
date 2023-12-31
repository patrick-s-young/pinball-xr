import * as CANNON from 'cannon-es'
import { BUMPER_CONFIG } from './config';

export const Bumper = ({ 
  world,
  placement }) => {
  const bumperBodies = {};
  const {
    shapeProps,
    material,
    locations,
    mass,
    collisionFilterGroup,
    bumperCollisionHandler,
    computeShape } = BUMPER_CONFIG;
 
  locations.forEach(location => {
    const {
      bumperName,
      offset,
      quaternion } = location;
    const bumperShape = computeShape(shapeProps);
    const bumperBody = new CANNON.Body({
      mass, 
      material,
      collisionFilterGroup
      }
    );
    bumperBody.addShape(bumperShape, offset);
    bumperBody.quaternion.copy(quaternion);
    bumperBody.position.set(...placement)
    bumperBody.addEventListener('collide', bumperCollisionHandler);
    world.addBody(bumperBody);
    bumperBodies[bumperName] = bumperBody;
  })

  return bumperBodies;
}