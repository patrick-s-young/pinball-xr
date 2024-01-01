import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from '@cannon/collisions/COLLISION_GROUPS';
import { CannonWedge } from '@cannon/shapes';
import { createFlipperBody, getContactFrame } from './WedgeFlipper.helpers';
import { PLAYFIELD, HEIGHT_ABOVE_FLOOR } from '@src/App.config';
import { MATERIALS } from '@cannon/materials/MATERIALS';

const SCALER = 0.0584;

export const initFlipper = {
  flipperLengthFromPivot: 0.2336,
  flipperHeight: 0.04672,
  wedgeBaseHeight: 0.0292,
  flipperOffsetZ: 0.4088,
  get playFieldSlopeOffsetY() { return  PLAYFIELD.slopeSin * this.flipperOffsetZ},
  get playFieldSlipeOffsetZ() { return  PLAYFIELD.slopeCos * this.flipperOffsetZ},
  get wedgeSlope() { return Math.atan(this.wedgeBaseHeight / this.flipperLengthFromPivot)},
  maxVelocity: 4,
  get axis() { return {
    left: new CANNON.Vec3(
      -4 * SCALER, 
      HEIGHT_ABOVE_FLOOR + this.flipperHeight * 0.75 * SCALER - this.playFieldSlopeOffsetY, 
      this.flipperOffsetZ
      ),
    right: new CANNON.Vec3(
      4 * SCALER,  
      HEIGHT_ABOVE_FLOOR + this.flipperHeight * 0.75 * SCALER - this.playFieldSlopeOffsetY, 
      this.flipperOffsetZ
      )
    }
  },
  get shape() { return CannonWedge({ widthX: this.flipperLengthFromPivot / 2, heightY: this.flipperHeight / 2, depthZ: this.wedgeBaseHeight / 2 }) },
  get shapeOffset() { return new CANNON.Vec3(this.flipperLengthFromPivot / 2, 0, 0)},
  getAxis ({ side, placement }) { 
    const [ x, y, z ] = placement;
    return side === 'left'
      ? new CANNON.Vec3(
        -4 * SCALER + x, 
        this.flipperHeight * 0.75 * SCALER - this.playFieldSlopeOffsetY + y, 
        this.flipperOffsetZ + z
        )
      : new CANNON.Vec3(
        4 * SCALER + x,  
        this.flipperHeight * 0.75 * SCALER - this.playFieldSlopeOffsetY + y, 
        this.flipperOffsetZ + z
        )
  },
  startRadian: {
    left: -Math.PI/6,
    right: Math.PI + Math.PI/6
  },
  endRadian : {
    left: Math.PI/7,
    right: Math.PI - Math.PI/7
  },
  animSteps: 4,
  CREATE_BODY ({ world, side, placement }) {
    return createFlipperBody({
      world,
      mass: 0,
      isTrigger: true,
      position: this.getAxis({ side, placement }),
      material: MATERIALS.flipperMaterial,
      collisionFilterGroup: COLLISION_GROUPS.FLIPPER,
      shape: this.shape,
      shapeOffset: this.shapeOffset,
    })
  },
  CREATE_ANIMATION ({ side }) {
    const playfieldSlope = new CANNON.Quaternion();
    playfieldSlope.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), PLAYFIELD.slopeRadians);

    const startRadian = this.startRadian[side];
    const endRadian = this.endRadian[side];
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), startRadian);
    const increment = (endRadian - startRadian) / this.animSteps;
    const animation = [];
    const flipperAngles = []
    for (let frame = 0; frame <= this.animSteps; frame++) {
      const flipperAngle = startRadian + frame * increment;
      flipperAngles.push(flipperAngle);
      const quatAnimStep = new CANNON.Quaternion();
      quatAnimStep.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), flipperAngle);
      const quatMult = new CANNON.Quaternion();
      playfieldSlope.mult(quatAnimStep, quatMult);
      animation.push(quatMult);
    }
    const hitAreas = flipperAngles.map((angle, idx) => {
      const hitArea = { min: null, max: null, minDegrees: null, maxDegrees: null };
      if (idx > 0) {
        hitArea.min = flipperAngles[idx-1];
        hitArea.max = flipperAngles[idx];
        hitArea.minDegrees = flipperAngles[idx-1] * 180/Math.PI;
        hitArea.maxDegrees = flipperAngles[idx] * 180/Math.PI;
      }
      return hitArea;
    })
    return { animation, hitAreas };
  },
  SET_FLIPPER_STATE ({ side }) {
    const startRadian = this.startRadian[side];
    const endRadian = this.endRadian[side];
    const mirrorValue = side === 'left' ? -1 : 1;
    return {
      isAnimating: false,
      orientation: 'down',
      tangentCollisionVector: { 
        up: { 
          x: Math.sin(endRadian) * mirrorValue,
          z: Math.cos(endRadian) * mirrorValue
        },
        down: {
          x: Math.sin(startRadian) * mirrorValue,
          z: Math.cos(startRadian) * mirrorValue
        }
      }
    }
  },
  SET_STEP_STATE () {
    return {
      frame: null,
      direction: 1,
      endFrame: null
    }
  },
  SET_COLLISION_STATE ({ side }) {
    return {
      side,
      axis: this.axis[side],
      flipperLengthFromPivot: this.flipperLengthFromPivot,
      maxVelocity: this.maxVelocity,
      impact: { frame: null, velocity: {}}
    }
  },
  SET_BALL_STATE ({ ballRef }) {
    return {
      ref: ballRef,
      radius: ballRef.shapes[0].radius
    }
  },
  GET_FLIPPER_ANGLE_OF_CONTACT ({
    ball,
    flipperBody,
    side,
    hitArea
    }) {
      return getContactFrame({
        ball,
        flipper: {
          wedgeSlope: this.wedgeSlope,
          wedgeBaseHeight: this.wedgeBaseHeight,
          length: this.flipperLengthFromPivot,
          axis: this.axis[side],
          body: flipperBody
        },
        side,
        hitArea,
        maxVelocity: this.maxVelocity
      })
  }
}
