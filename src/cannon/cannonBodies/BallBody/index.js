import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from '../../constants';
import { ballMaterial } from '../../cannonMaterials';

export const BallBody = (props) => {
  const { world } = props;
  const ballBody = new CANNON.Body({
    mass: 10, 
    material: ballMaterial,
    position: new CANNON.Vec3(4.75, 0.1, 9),
    collisionFilterGroup: COLLISION_GROUPS.BALL,
    collisionFilterMask: COLLISION_GROUPS.PLAYFIELD
    }
  );
  const ball = new CANNON.Sphere(0.25);
  ballBody.addShape(ball);
  world.addBody(ballBody);
  return ballBody;
}