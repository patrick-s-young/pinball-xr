import * as CANNON from 'cannon-es';
import { PLAYFIELD_CONFIG } from './config';

export const PlayfieldBody = (props) => {
  const { world } = props;
  const playFieldBody = new CANNON.Body({
    mass: 0, 
    material: PLAYFIELD_CONFIG.playFieldMaterial ,
    position: new CANNON.Vec3(0, 0, 0),
    collisionFilterGroup: PLAYFIELD_CONFIG.collisionGroup
    }
  );
  world.addBody(playFieldBody);

  PLAYFIELD_CONFIG.elements.forEach(item => {
    const { props, offset, computeShape } = item;
    const shape = computeShape(props);
    playFieldBody.addShape(shape, offset)
    }
  );

  playFieldBody.quaternion.copy(PLAYFIELD_CONFIG.quaternionPlayfieldSlope);
  return playFieldBody;
}