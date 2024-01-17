import * as CANNON from 'cannon-es';
import { PLAYFIELD, HEIGHT_ABOVE_FLOOR } from '@src/App.config';
import { CannonWedge } from '@cannon/shapes';
import { getContactFrame, getFlipperQuaternion } from './WedgeFlipper.helpers';
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
const TIME_STEP = 1/120;
const FLIPPER_DURATION = 4/60;
const FLIPPER_RADIANS_TOTAL = {
  left: endRadian.left - startRadian.left,
  right:  endRadian.right - startRadian.right
}

const FLIPPER_RADIANS_SUB_STEP = {
  left: FLIPPER_RADIANS_TOTAL.left / (FLIPPER_DURATION / TIME_STEP),
  right: FLIPPER_RADIANS_TOTAL.right / (FLIPPER_DURATION / TIME_STEP)
}

const playfieldSlopeQuat = new CANNON.Quaternion();
playfieldSlopeQuat.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), PLAYFIELD.slopeRadians)


///////////////////////////////
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
// STATIC FLIPPER CANNON BODY  
  const staticFlipper = createStaticFlipper();

// CREATE FLIPPER CANNON BODY
  const flipper = new CANNON.Body({
    mass: 0,
    isTrigger: true,
    position: axis[side],
    material: MATERIALS.flipperMaterial,
    collisionFilterGroup: COLLISION_GROUPS.FLIPPER
  });
  flipper.addShape(shape, shapeOffset);
  flipper.quaternion.copy(getFlipperQuaternion(startRadian[side]))
  world.addBody(flipper);


  function step (delta) {
    if (flipperState.isAnimating === false) return; 

    if (flipperState.timeElapsed + delta > FLIPPER_DURATION) {
      flipperState.isAnimating = false;
      flipper.position.x = -100;
      flipperState.direction === 1 ? staticFlipper.showUp() : staticFlipper.showDown()
      return
    }

    let deltaSeconds = delta
    let collisionFlag = false
    while (deltaSeconds > TIME_STEP && !collisionFlag) {
      flipperState.currentRadian +=  FLIPPER_RADIANS_SUB_STEP[side] * flipperState.direction
      // check for collision
      deltaSeconds -= TIME_STEP;
    }

    if (deltaSeconds > 0 && !collisionFlag) {
      flipperState.currentRadian += FLIPPER_RADIANS_SUB_STEP[side] * deltaSeconds / TIME_STEP * flipperState.direction
      // check for collision
    }
    
    flipperState.timeElapsed += delta;
    // only update after final substep
    if (collisionFlag) {
      // staticFlipper.showUp() ?
    }

    flipper.quaternion.copy(getFlipperQuaternion(flipperState.currentRadian));
    flipper.position.x = axis[side].x
  }


  function onFlipperUp () {
    staticFlipper.hide();
    flipperState.isAnimating = true;
    flipperState.orientation = 'up';
    flipperState.direction = 1;
    flipperState.timeElapsed = 0;
    flipperState.startRadian = startRadian[side]
    flipperState.currentRadian = startRadian[side]
  }

  function onFlipperDown () {
     staticFlipper.hide();
     flipperState.isAnimating = true;
     flipperState.orientation = 'down';
     flipperState.direction = -1;
     flipperState.timeElapsed = 0;
     flipperState.startRadian = endRadian[side]
     flipperState.currentRadian = endRadian[side]
  }

  function createStaticFlipper () {
    const staticFlipperDownQuaternion = getFlipperQuaternion(startRadian[side]);
    const staticFlipperUpQuaternion = getFlipperQuaternion(endRadian[side]);
    const staticBody = new CANNON.Body({
      mass: 0,
      isTrigger: false,
      position: axis[side],
      material: MATERIALS.flipperMaterial,
      collisionFilterGroup: COLLISION_GROUPS.FLIPPER
    });
    staticBody.addShape(shape, shapeOffset);
    world.addBody(staticBody);
    staticBody.quaternion.copy(staticFlipperDownQuaternion);
  
    const staticFlipperPositionX = axis[side].x;
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
    return staticFlipper
  }



  return {
    onFlipperUp,
    onFlipperDown,
    step
  }
}

