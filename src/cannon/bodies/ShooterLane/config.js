import * as CANNON from 'cannon-es';
import { playFieldMaterial } from '@cannon/materials';
import { PLAYFIELD_CONSTANTS } from '@cannon/constants';
import { COLLISION_GROUPS } from '@cannon/collisions';


export const SHOOTER_LANE_CONFIGS = {
  quaternionPlayfieldSlope: PLAYFIELD_CONSTANTS.slopeQuaternion,
  playFieldMaterial,
  collisionGroup: COLLISION_GROUPS.PLAYFIELD,
  shapes: {
    shooterLaneOpen: {
      xSize: 0.2,
      ySize: 1,
      zSize: 15,
      get halfExtents() { return new CANNON.Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
      offset: new CANNON.Vec3(4.3 + PLAYFIELD_CONSTANTS.offsetX, .5, 2.5),
      get shape() { return new CANNON.Box(this.halfExtents) }
    },
    shooterLaneClosed: {
      xSize: 0.6,
      ySize: 1,
      zSize: 15,
      get halfExtents() { return new CANNON.Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
      offset: new CANNON.Vec3(4.7 + PLAYFIELD_CONSTANTS.offsetX, .5, 2.5),
      get shape() { return new CANNON.Box(this.halfExtents) }
    },
    shooterLaneBottom: {
      xSize: 1.1,
      ySize: 1,
      zSize: .5,
      get halfExtents() { return new CANNON.Vec3(this.xSize/2, this.ySize/2, this.zSize/2) },
      offset: new CANNON.Vec3(4.95 + PLAYFIELD_CONSTANTS.offsetX, .5, 10.25),
      get shape() { return new CANNON.Box(this.halfExtents) }
    }
  }
}