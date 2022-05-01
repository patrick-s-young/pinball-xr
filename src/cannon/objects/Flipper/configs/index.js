import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from '../../../collisions';


export const initFlipper = {
  flipperLengthFromPivot: 3.5,
  maxVelocity: 90,
// CREATE BODY 
  position: {
    left: new CANNON.Vec3(-4, 0.3, -1),
    right: new CANNON.Vec3(4, 0.3, -1)
  },
  shape: new CANNON.Box(new CANNON.Vec3(2, 0.4, 0.2)),
  shapeOffset: new CANNON.Vec3(1.5, 0, 0),
  CREATE_BODY ({ world, side }) {
    const body = new CANNON.Body({
      mass: 0,
      isTrigger: true,
      position: this.position[side],
      collisionFilterGroup: COLLISION_GROUPS.FLIPPER
    });
    body.addShape(this.shape, this.shapeOffset);
    world.addBody(body);
    return body;
  },
// CREATE ANIMATION
  startRadian: {
    left: -Math.PI/6,
    right: Math.PI + Math.PI/6
  },
  endRadian : {
    left: Math.PI/4,
    right: Math.PI - Math.PI/4
  },
  animSteps: 4,
  CREATE_ANIMATION ({ side }) {
    const startRadian = this.startRadian[side];
    const endRadian = this.endRadian[side];
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), startRadian);
    //this.body.quaternion.copy(quat);
    const increment = (endRadian - startRadian) / this.animSteps;
    const animation = [];
    const flipperAngles = []
    for (let frame = 0; frame <= this.animSteps; frame++) {
      const flipperAngle = startRadian + frame * increment;
      flipperAngles.push(flipperAngle);
      const quat = new CANNON.Quaternion();
      quat.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), flipperAngle);
      animation.push(quat);
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
      position: this.position[side],
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
  }
}
