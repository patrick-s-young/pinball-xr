import * as CANNON from 'cannon-es';
import { PLAYFIELD_CONFIG } from './config';

export function Playfield ({ world }) {
  this.body = new CANNON.Body({
    mass: 0, 
    material: PLAYFIELD_CONFIG.playFieldMaterial ,
    position: new CANNON.Vec3(0, 0, 0),
    collisionFilterGroup: PLAYFIELD_CONFIG.collisionGroup
    }
  );
  PLAYFIELD_CONFIG.elements.forEach(item => {
    const { props, offset, quaternion, computeShape } = item;
    const shape = computeShape(props);
    this.body.addShape(shape, offset, quaternion)
    }
  );

  PLAYFIELD_CONFIG.compositeElements.forEach(item => {
    const { props, computeCompositeShape } = item;
    const compositeShape = computeCompositeShape(props);
    compositeShape.forEach(({ shape, offset, orientation }) => {
      this.body.addShape(shape, offset, orientation);
    })
 
    }
  );
  
  this.body.quaternion.copy(PLAYFIELD_CONFIG.quaternionPlayfieldSlope);
  world.addBody(this.body);

}