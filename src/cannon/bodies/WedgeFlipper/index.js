import * as CANNON from 'cannon-es';
import { initFlipper } from './config';
// TODO refactor WedgeFlipper into smaller modules that separate concerns
export function WedgeFlipper ({
  world,
  ballRef,
  side,
  placement
  }) {

// BALL STATE
  const ballState = initFlipper.SET_BALL_STATE({ ballRef });
// FLIPPER STATE
  const flipperState = initFlipper.SET_FLIPPER_STATE({ side });
// STEP STATE
  const stepState = initFlipper.SET_STEP_STATE();
  // GET COLLISION FRAME HELPERS
  // const getFlipperAngleOfContact = initFlipper.GET_FLIPPER_ANGLE_OF_CONTACT;
// COLLISION STATE
  const collisionState = initFlipper.SET_COLLISION_STATE({ side });
// CREATE ANIMATION & DEFINE HIT AREAS
  const { animation, hitAreas } = initFlipper.CREATE_ANIMATION({ side });

// CREATE FLIPPER CANNON BODY
  const body = initFlipper.CREATE_BODY({ world, side, placement });
// ANGLE OF FLIPPER AT REST
  body.quaternion.copy(animation[0]);
// CREATE STATIC FLIPPER CANNON BODY
  const staticBody = initFlipper.CREATE_BODY({ world, side, placement });
  staticBody.isTrigger = false;
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
      console.log('hide')
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


  // REQUEST ANIM FRAME LOOP
  function step () {
    if (flipperState.isAnimating === false) return; 
    const { position, previousPosition } = ballState.ref;
  // BEGIN FRAME
    stepState.frame += stepState.direction;
  // UPDATE FLIPPER POSITION
    body.quaternion.copy(animation[stepState.frame]);
  // CHECK IF COLLISION FRAME
    const flipperCollisionResults = 
      flipperState.orientation === 'down' 
      ? null 
      : initFlipper.GET_FLIPPER_ANGLE_OF_CONTACT({
      ball: {
        radius: ballState.radius,
        position
      },
      flipperBody: body,
      side: collisionState.side,
      hitArea: hitAreas[stepState.frame]
      }
    );
  // CHECK IF COLLISION FRAME
    if (flipperCollisionResults !== null) {
      const { ballVelocity, ballPosition } = flipperCollisionResults; 
      ballState.ref.velocity.set(...Object.values(ballVelocity));
      //console.log('Object.values( collisionState.impact.position )', Object.values( collisionState.impact.position ))
      ballState.ref.position.set(...Object.values(ballPosition));
    }
  // CHECK IF LAST ANIMATION FRAME HAS BEEN RENDERED
    if (stepState.frame === stepState.endFrame) {
      flipperState.isAnimating = false;
      stepState.endFrame === 0 ? staticFlipper.showDown() : staticFlipper.showUp();
    }
  }


  const setPosition = (placeX, placeY, placeZ) => {
    // const { x, y, z } = initFlipper.axis[side];

    // initFlipper.axisPlacementOffset.x = x;
    // initFlipper.axisPlacementOffset.z = z;

    // console.log('initFlipper.axisPlacementOffset', initFlipper.axisPlacementOffset)
    // body.x = x + placeX;
    // body.y = y;
    // body.z = z + placeZ;

    // staticBody.x = x + placeX;
    // staticBody.y = y;
    // staticBody.z = z + placeZ;
  }

  return {
    onFlipperUp,
    onFlipperDown,
    step,
    setPosition
  }
}

