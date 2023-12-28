import * as CANNON from 'cannon-es';
import { playFieldMaterial } from '@cannon/materials';
import { PLAYFIELD } from '@src/App.config';
import { COLLISION_GROUPS } from '@cannon/collisions';

const SCALER = 0.0584;
export const SHOOTER_LANE_CONFIGS = {
  quaternionPlayfieldSlope: PLAYFIELD.slopeQuaternion,
  playFieldMaterial,
  collisionGroup: COLLISION_GROUPS.PLAYFIELD,
  shapes: {
    shooterLaneOpen: {
      xSize: 0.01168,
      ySize: 0.0584,
      zSize: 0.876,
      get halfExtents() { return new CANNON.Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
      offset: new CANNON.Vec3(4.3 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 2.5 * SCALER),
      get shape() { return new CANNON.Box(this.halfExtents) }
    },
    shooterLaneClosed: {
      xSize: 0.03504,
      ySize: 0.0584,
      zSize: 0.876,
      get halfExtents() { return new CANNON.Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
      offset: new CANNON.Vec3(4.7 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 2.5 * SCALER),
      get shape() { return new CANNON.Box(this.halfExtents) }
    },
    shooterLaneBottom: {
      xSize: 0.06424,
      ySize: 0.0584,
      zSize: 0.0292,
      get halfExtents() { return new CANNON.Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
      offset: new CANNON.Vec3(4.95 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 10.25 * SCALER),
      get shape() { return new CANNON.Box(this.halfExtents) }
    }
  }
}