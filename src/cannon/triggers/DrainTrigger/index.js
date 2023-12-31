import * as CANNON from 'cannon-es';
import { Body } from 'cannon-es';
import { DRAIN_TRIGGER_CONFIG } from './config';

export function DrainTrigger ({ world, placement }) {

  const {
    mass,
    isTrigger,
    collisionFilterGroup,
    collisionFilterMask,
    elements
  } = DRAIN_TRIGGER_CONFIG;

  this.body = new Body({
    mass, 
    isTrigger,
    collisionFilterGroup,
    collisionFilterMask
    }
  );
  const { x:offsetX, y:offsetY, z:offsetZ } = elements.drainTrigger.offset;
  const [placementX, placementY, placementZ ] = placement;
  const offset = new CANNON.Vec3(
    offsetX + placementX,
    offsetY + placementY,
    offsetZ + placementZ )

  this.body.addShape(elements.drainTrigger.shape, offset);
  world.addBody(this.body);
}

DrainTrigger.prototype.addCollideDispatch = function(callBack) {
  this.body.addEventListener('collide', callBack)
}
