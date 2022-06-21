import { Vec3, Box } from 'cannon-es';
import { COLLISION_GROUPS } from 'cannon/collisions';
import { PLAYFIELD_CONSTANTS } from 'cannon/constants';

export const DRAIN_TRIGGER_CONFIG = {
  mass: 0,
  isTrigger: true,
  collisionFilterGroup: COLLISION_GROUPS.TRIGGER,
  collisionFilterMask: COLLISION_GROUPS.BALL,
  elements: {
    drainTrigger: {
      xSize: 1,
      ySize: 1,
      zSize: 1,
      get halfExtents() { return new Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
      offset: new Vec3(0, -PLAYFIELD_CONSTANTS.slopeSin * 10.5 + .5, PLAYFIELD_CONSTANTS.slopeCos * 10.5),
      get shape() { return new Box(this.halfExtents) }
    }
  }
}