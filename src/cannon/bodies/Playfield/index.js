import * as CANNON from 'cannon-es';
import { PLAYFIELD_CONFIG } from './config';
import { HEIGHT_ABOVE_FLOOR } from '../../../App.config';

export const Playfield = ({ 
  world,
  placement }) => {
  const body = new CANNON.Body({
    mass: 0, 
    material: PLAYFIELD_CONFIG.playFieldMaterial ,
    position: new CANNON.Vec3(...placement),
    collisionFilterGroup: PLAYFIELD_CONFIG.collisionGroup
    }
  );
  PLAYFIELD_CONFIG.elements.forEach(item => {
    const { props, offset, quaternion, computeShape } = item;
    const shape = computeShape(props);
    body.addShape(shape, offset, quaternion)
    }
  );

  PLAYFIELD_CONFIG.compositeElements.forEach(item => {
    const { props, computeCompositeShape } = item;
    const compositeShape = computeCompositeShape(props);
    compositeShape.forEach(({ shape, offset, orientation }) => {
      body.addShape(shape, offset, orientation);
    })
 
    }
  );
  
  body.quaternion.copy(PLAYFIELD_CONFIG.quaternionPlayfieldSlope);
  world.addBody(body);


  return {
    body
  }

}