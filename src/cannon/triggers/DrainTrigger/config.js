import { Vec3, Box } from 'cannon-es';
import { COLLISION_GROUPS } from '@cannon/collisions';
import { PLAYFIELD } from '@src/App.config';

const SCALER = 0.0584;

export const DRAIN_TRIGGER_CONFIG = {
  mass: 0,
  isTrigger: true,
  collisionFilterGroup: COLLISION_GROUPS.TRIGGER,
  collisionFilterMask: COLLISION_GROUPS.BALL,
  elements: {
    drainTrigger: {
      xSize: 0.0584,
      ySize: 0.0584,
      zSize: 0.0584,
      get halfExtents() { return new Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
      offset: new Vec3(0, -PLAYFIELD.slopeSin * 10.5 * SCALER + .5 * SCALER, PLAYFIELD.slopeCos * 10.5 * SCALER),
      get shape() { return new Box(this.halfExtents) }
    }
  }
}