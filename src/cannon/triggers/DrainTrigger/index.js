import { Body } from 'cannon-es';
import { DRAIN_TRIGGER_CONFIG } from './config';

export function DrainTrigger ({ world }) {

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

  this.body.addShape(elements.drainTrigger.shape, elements.drainTrigger.offset);
  world.addBody(this.body);
}

DrainTrigger.prototype.addCollideDispatch = function(callBack) {
  this.body.addEventListener('collide', callBack)
}
