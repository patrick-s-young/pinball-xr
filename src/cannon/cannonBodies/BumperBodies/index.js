import * as CANNON from 'cannon-es'
import { BUMPER_CONFIG } from './configs';
import { bumperCollisionHandler } from '../../collisionHandlers';
import { COLLISION_GROUPS } from '../../constants';

export const BumperBodies = (props) => {
  const { world } = props;
  const {
    shapeProps,
    material,
    locations,
    collisionHandlers,
    computeShape } = BUMPER_CONFIG;
  locations.forEach(location => {
    const {
      collisonHandler,
      offset,
      quaternion } = location;
    const bumperShape = computeShape(shapeProps);
    const bumperBody = new CANNON.Body({
      mass: 0, 
      material: material,
      collisionFilterGroup: COLLISION_GROUPS.PLAYFIELD
      }
    );
    bumperBody.addShape(bumperShape, offset);
    bumperBody.quaternion.copy(quaternion);
    bumperBody.addEventListener('collide', bumperCollisionHandler);
    world.addBody(bumperBody);
  })

  return 1;
}