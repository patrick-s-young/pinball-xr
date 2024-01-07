import * as CANNON from 'cannon-es';
import { PLAYFIELD, HEIGHT_ABOVE_FLOOR } from '@src/App.config';
import { CannonWedge } from '@cannon/shapes';
import { getContactFrame } from './WedgeFlipper.helpers';
import { MATERIALS } from '@cannon/materials/MATERIALS';
import { COLLISION_GROUPS } from '@cannon/collisions/COLLISION_GROUPS';
// TODO refactor WedgeFlipper into smaller modules that separate concerns
const SCALER = 0.0584;
const flipperLengthFromPivot = 0.2336;
const flipperHeight = 0.04672;
const wedgeBaseHeight = 0.0292;
const flipperOffsetZ = 0.4088;
const playFieldSlopeOffsetY = PLAYFIELD.slopeSin * flipperOffsetZ;
const playFieldSlipeOffsetZ = PLAYFIELD.slopeCos * flipperOffsetZ;
const wedgeSlope = Math.atan(wedgeBaseHeight / flipperLengthFromPivot);
const maxVelocity = 4;
const shape = CannonWedge({ 
  widthX: flipperLengthFromPivot / 2, 
  heightY: flipperHeight / 2, 
  depthZ: wedgeBaseHeight / 2 
});
const shapeOffset = new CANNON.Vec3(flipperLengthFromPivot / 2, 0, 0);
const startRadian = {
  left: -Math.PI/6,
  right: Math.PI + Math.PI/6
}
const endRadian = {
  left: Math.PI/7,
  right: Math.PI - Math.PI/7
}
const animSteps = 4;



export function WedgeFlipper ({
  world,
  ballRef,
  side,
  placement
  }) {
  const [ placeX, placeY, placeZ ] = placement;
  const axis = {
    left: new CANNON.Vec3(
      -4 * SCALER + placeX, 
      flipperHeight * 0.75 * SCALER - playFieldSlopeOffsetY + placeY, 
      flipperOffsetZ + placeZ
    ),
    right: new CANNON.Vec3(
      4 * SCALER + placeX,  
      flipperHeight * 0.75 * SCALER - playFieldSlopeOffsetY + placeY, 
      flipperOffsetZ + placeZ
    )
  }
// BALL STATE
  const ballState = {
    ref: ballRef,
    radius: ballRef.shapes[0].radius
  }
// FLIPPER STATE
  const mirrorValue = side === 'left' ? -1 : 1
  const flipperState = {
    isAnimating: false,
    orientation: 'down',
    tangentCollisionVector: { 
      up: { 
        x: Math.sin(endRadian[side]) * mirrorValue,
        z: Math.cos(endRadian[side]) * mirrorValue
      },
      down: {
        x: Math.sin(startRadian[side]) * mirrorValue,
        z: Math.cos(startRadian[side]) * mirrorValue
      }
    }
  };
// STEP STATE
  const stepState = {
    frame: null,
    direction: 1,
    endFrame: null
  };

// CREATE ANIMATION & DEFINE HIT AREAS
  const { animation, hitAreas } = createAnimation({ side }); //TODO move to helpers
// CREATE FLIPPER CANNON BODY
  const body = new CANNON.Body({
    mass: 0,
    isTrigger: true,
    position: axis[side],
    material: MATERIALS.flipperMaterial,
    collisionFilterGroup: COLLISION_GROUPS.FLIPPER
  });
  body.addShape(shape, shapeOffset);
  world.addBody(body);
  body.quaternion.copy(animation[0]);
// CREATE STATIC FLIPPER CANNON BODY
  const staticBody = new CANNON.Body({
    mass: 0,
    isTrigger: false,
    position: axis[side],
    material: MATERIALS.flipperMaterial,
    collisionFilterGroup: COLLISION_GROUPS.FLIPPER
  });
  staticBody.addShape(shape, shapeOffset);
  world.addBody(staticBody);
  staticBody.quaternion.copy(animation[0]);
  const staticFlipperDownQuaternion = animation[0];
  const staticFlipperUpQuaternion = animation[animation.length - 1];
  const staticFlipperPositionX = body.position.x;
  const staticFlipper = {
    showDown () {
      staticBody.position.x = staticFlipperPositionX,
      staticBody.quaternion.copy(staticFlipperDownQuaternion);
    },
    showUp () {
      staticBody.position.x = staticFlipperPositionX,
      staticBody.quaternion.copy(staticFlipperUpQuaternion);
    },
    hide () {
      staticBody.position.x = -100
    }
  }


  function onFlipperUp () {
    staticFlipper.hide();
    flipperState.isAnimating = true;
    flipperState.orientation = 'up';
    stepState.frame = -1;
    stepState.direction = 1;
    stepState.endFrame = animation.length - 1;
  }

  function onFlipperDown () {
    staticFlipper.hide();
    flipperState.isAnimating = true;
    flipperState.orientation = 'down';
    stepState.frame = animation.length - 1;
    stepState.direction = -1;
    stepState.endFrame = 0;
  }

  function step () {
    if (flipperState.isAnimating === false) return; 
    const { position, previousPosition } = ballState.ref;
  // BEGIN FRAME
    stepState.frame += stepState.direction;
  // UPDATE FLIPPER POSITION
    body.quaternion.copy(animation[stepState.frame]);
  // CHECK IF COLLISION FRAME
    const flipperCollisionResults = flipperState.orientation === 'down' 
      ? null 
      : getContactFrame({
          ball: {
            radius: ballState.radius,
            position
          },
          flipper: {
            wedgeSlope,
            wedgeBaseHeight,
            length: flipperLengthFromPivot,
            axis: axis[side],
            endRadian: endRadian[side],
            body
          },
          side,
          hitArea: hitAreas[stepState.frame],
          maxVelocity
      });
      
  // CHECK IF COLLISION FRAME
    if (flipperCollisionResults !== null) {
      const { ballVelocity, ballPosition } = flipperCollisionResults; 
      ballState.ref.velocity.set(...Object.values(ballVelocity));
      ballState.ref.position.set(...Object.values(ballPosition));
    }
  // CHECK IF LAST ANIMATION FRAME HAS BEEN RENDERED
    if (stepState.frame === stepState.endFrame) {
      flipperState.isAnimating = false;
      stepState.endFrame === 0 ? staticFlipper.showDown() : staticFlipper.showUp();
    }
  }

  function createAnimation ({ side }) {
    const playfieldSlope = new CANNON.Quaternion();
    playfieldSlope.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), PLAYFIELD.slopeRadians);

    const _startRadian = startRadian[side];
    const _endRadian = endRadian[side];
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), _startRadian);
    const increment = (_endRadian - _startRadian) / animSteps;
    const animation = [];
    const flipperAngles = []
    for (let frame = 0; frame <= animSteps; frame++) {
      const flipperAngle = _startRadian + frame * increment;
      flipperAngles.push(flipperAngle);
      const quatAnimStep = new CANNON.Quaternion();
      quatAnimStep.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), flipperAngle);
      const quatMult = new CANNON.Quaternion();
      playfieldSlope.mult(quatAnimStep, quatMult);
      animation.push(quatMult);
    }
    console.log('flipperAngles', flipperAngles)
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
  };

  return {
    onFlipperUp,
    onFlipperDown,
    step
  }
}

