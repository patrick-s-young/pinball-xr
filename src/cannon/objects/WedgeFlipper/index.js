import * as CANNON from 'cannon-es';
import { initFlipper } from './configs';

export function WedgeFlipper ({
  world,
  ballRef,
  side
  }) {
// BIND OBJECT FUNCTIONS
  this.collisionHandler = this.collisionHandler.bind(this);
  this.onFlipperUp = this.onFlipperUp.bind(this);
  this.onFlipperDown = this.onFlipperDown.bind(this);
  this.getCollisionFrame = this.getCollisionFrame.bind(this);
  this.step = this.step.bind(this);
// BALL STATE
  this.ballState = initFlipper.SET_BALL_STATE({ ballRef });
// FLIPPER STATE
  this.flipperState = initFlipper.SET_FLIPPER_STATE({ side });
// STEP STATE
  this.stepState = initFlipper.SET_STEP_STATE();
// GET COLLISION FRAME HELPERS
  this.getFlipperAngleOfContact = initFlipper.GET_FLIPPER_ANGLE_OF_CONTACT;
// COLLISION STATE
  this.collisionState = initFlipper.SET_COLLISION_STATE({ side });
// CREATE ANIMATION & DEFINE HIT AREAS
  const { animation, hitAreas } = initFlipper.CREATE_ANIMATION({ side });
  this.animation = animation;
  this.hitAreas = hitAreas;
// CREATE FLIPPER CANNON BODY
  this.body = initFlipper.CREATE_BODY({ world, side });
// STATIC FLIPPER COLLISION HANDLER
  this.body.addEventListener('collide', this.collisionHandler(this.flipperState));
// ANGLE OF FLIPPER AT REST
  this.body.quaternion.copy(this.animation[0]);
}


WedgeFlipper.prototype.collisionHandler = (flipperStateRef) => {
  return (e) => {
// IF FLIPPER IS ANIMATING, DO NOTHING
    if (flipperStateRef.isAnimating === true) return;
// IF FLIPPER IS NOT ANIMATING, DETERMINE DIRECTION OF BALL
    const { body:ball, target:flipper } = e;
    const { position, previousPosition } = ball;
    const ballPrevPos = new CANNON.Vec3(...Object.values(previousPosition));
    const ballPos = new CANNON.Vec3(...Object.values(position));
    const ballPosDiff = new CANNON.Vec3();
    ballPos.vsub(ballPrevPos, ballPosDiff);
    const ballUnitVec = new CANNON.Vec3(); // ballUnitVec not used
    ballPosDiff.unit(ballUnitVec);
// IF BALL IS MOVING AWAY FROM FLIPPER, DO NOTHING
    if (ball.velocity.z < 0) return;
// GET THE TANGENT VECTOR OF THE CURRENT FLIPPER ORIENTATION - 'UP' OR 'DOWN'
    const tangentCollisionVector = flipperStateRef.tangentCollisionVector[flipperStateRef.orientation];
    const maxVelocity = 5;
    const magnitude = {
      x: Math.abs(ballUnitVec.x),
      z: Math.abs(ballUnitVec.z)
    }
    const velocity = new CANNON.Vec3(
      tangentCollisionVector.x * maxVelocity, //* magnitude.x,
      -ballPosDiff.y,
      tangentCollisionVector.z * maxVelocity //+ magnitude.z
    );
    ball.velocity.set(...Object.values(velocity));
  }
}


WedgeFlipper.prototype.onFlipperUp = function () {
  this.getCollisionFrame();
  this.flipperState.isAnimating = true;
  this.flipperState.orientation = 'up';
  this.stepState.frame = -1;
  this.stepState.direction = 1;
  this.stepState.endFrame = this.animation.length - 1;
}

WedgeFlipper.prototype.onFlipperDown = function () {
  this.flipperState.isAnimating = true;
  this.flipperState.orientation = 'down';
  this.stepState.frame = this.animation.length - 1;
  this.stepState.direction = -1;
  this.stepState.endFrame = 0;
}


// REQUEST ANIM FRAME LOOP
WedgeFlipper.prototype.step = function () {
  if (this.flipperState.isAnimating === false) return; 
  const { position, previousPosition } = this.ballState.ref;
// BEGIN FRAME
  this.stepState.frame += this.stepState.direction;
// UPDATE FLIPPER POSITION
  this.body.quaternion.copy(this.animation[this.stepState.frame]);
// CHECK IF COLLISION FRAME
  if (this.stepState.frame ===  this.collisionState.impact.frame) {
    this.ballState.ref.velocity.set(...Object.values( this.collisionState.impact.velocity));
    this.collisionState.impact.frame = -1;
  }
// CHECK IF LAST ANIMATION FRAME HAS BEEN RENDERED
  if (this.stepState.frame === this.stepState.endFrame) {
    this.flipperState.isAnimating = false;
  }
}


WedgeFlipper.prototype.getCollisionFrame = function () {
  this.collisionState.impact = { frame: -1 };
  const { position, previousPosition } = this.ballState.ref;
  const ballPrevPos = new CANNON.Vec3(...Object.values(previousPosition));
  const ballPos = new CANNON.Vec3(...Object.values(position));
  const ballPosDiff = new CANNON.Vec3();
  ballPos.vsub(ballPrevPos, ballPosDiff);
  const ballUnitVec = new CANNON.Vec3(); // ballUnitVec not used
  ballPosDiff.unit(ballUnitVec);

  for (let frame = 1; frame < this.hitAreas.length; frame++) {
    const flipperCollisionResults = initFlipper.GET_FLIPPER_ANGLE_OF_CONTACT({
      ball: {
        radius: this.ballState.radius,
        position: {
          x: ballPos.x - frame * ballPosDiff.x,
          z: ballPos.z - frame * ballPosDiff.z
        }
      },
      side: this.collisionState.side
    }
    );

    const { flipperRotationAtPointOfContact, flipperAngleOfContact, distanceFromCenter } = flipperCollisionResults; 
    if (distanceFromCenter > this.collisionState.flipperLengthFromPivot) continue;

    const { min, max } = this.hitAreas[frame];
    let tangentVelocity = undefined;
    if (this.collisionState.side === 'left' && flipperRotationAtPointOfContact > min && flipperRotationAtPointOfContact < max ) {
      tangentVelocity = {
        x: -Math.sin(flipperAngleOfContact),
        z: -Math.cos(flipperAngleOfContact)
      }
    }
    if (this.collisionState.side === 'right' && flipperRotationAtPointOfContact < min && flipperRotationAtPointOfContact > max) {
      tangentVelocity = {
        x: Math.sin(flipperAngleOfContact),
        z: Math.cos(flipperAngleOfContact)
      }
    }
    if (tangentVelocity === undefined) continue;

    const flipperMagnitude = distanceFromCenter / this.collisionState.flipperLengthFromPivot;
    const velocity = new CANNON.Vec3(
      tangentVelocity.x *  this.collisionState.maxVelocity * flipperMagnitude,
      -ballPosDiff.y,
      tangentVelocity.z *  this.collisionState.maxVelocity * flipperMagnitude
    );
    this.collisionState.impact = {
      frame,
      velocity
    }
    break;
  }
  console.log('collisionFrame', this.collisionState.impact)
}


const radToDeg = (rad) => rad * 180/Math.PI;