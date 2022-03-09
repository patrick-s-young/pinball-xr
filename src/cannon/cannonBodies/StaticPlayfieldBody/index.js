import { STATIC_PLAYFIELD_SHAPES } from './configs';
import * as CANNON from 'cannon-es'
import { quaternionPlayfieldSlope } from '../../constants';
import { COLLISION_GROUPS } from '../../constants';
import { playFieldMaterial } from '../../cannonMaterials';

export const StaticPlayfieldBody = (props) => {
  const { world } = props;
  const staticPlayFieldBody = new CANNON.Body({
    mass: 0, 
    material: playFieldMaterial ,
    position: new CANNON.Vec3(0, 0, 0),
    collisionFilterGroup: COLLISION_GROUPS.PLAYFIELD
    }
  );
  world.addBody(staticPlayFieldBody);
  // CREATE STATE PLAYFIELD BODY SHAPES
  STATIC_PLAYFIELD_SHAPES.forEach(item => {
    const { props, offset, quaternion, computeShape } = item;
    const shape = computeShape(props);
    staticPlayFieldBody.addShape(shape, offset, quaternion)
    }
  );

  const quaternion = new CANNON.Quaternion();
  quaternion.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), Math.PI/180 * 6);
  staticPlayFieldBody.quaternion.copy(quaternionPlayfieldSlope);
  
  return 1;
}