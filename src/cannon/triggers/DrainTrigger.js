import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from '@cannon/collisions/COLLISION_GROUPS';
import { PLAYFIELD } from '@src/App.config';

const SCALER = 0.0584;

export function DrainTrigger ({ world, placement }) {
  const drainTrigger = {
    xSize: 0.0584,
    ySize: 0.0584,
    zSize: 0.0584,
    offset: new CANNON.Vec3(
      0, 
      -PLAYFIELD.slopeSin * 10.5 * SCALER + .5 * SCALER, 
      PLAYFIELD.slopeCos * 10.5 * SCALER
    ),
    get halfExtents() { return new CANNON.Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
    get shape() { return new CANNON.Box(this.halfExtents) }
  }

  this.body = new CANNON.Body({
    mass: 0, 
    isTrigger: true,
    collisionFilterGroup: COLLISION_GROUPS.TRIGGER,
    collisionFilterMask: COLLISION_GROUPS.BALL,
    }
  );
  const { x:offsetX, y:offsetY, z:offsetZ } = drainTrigger.offset;
  const [placementX, placementY, placementZ ] = placement;
  const offset = new CANNON.Vec3(
    offsetX + placementX,
    offsetY + placementY,
    offsetZ + placementZ )

  this.body.addShape(drainTrigger.shape, offset);
  world.addBody(this.body);
}

DrainTrigger.prototype.addCollideDispatch = function(callBack) {
  this.body.addEventListener('collide', callBack)
}
