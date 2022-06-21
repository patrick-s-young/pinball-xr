import * as CANNON from 'cannon-es';
import { initFlipper } from './configs';

export function WedgeFlipper ({
  world,
  ballRef,
  side
  }) {
// BIND OBJECT FUNCTIONS
  this.onFlipperUp = this.onFlipperUp.bind(this);
  this.onFlipperDown = this.onFlipperDown.bind(this);
  //this.getCollisionFrame = this.getCollisionFrame.bind(this);
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
// ANGLE OF FLIPPER AT REST
  this.body.quaternion.copy(this.animation[0]);
// CREATE STATIC FLIPPER CANNON BODY
  const staticBody = initFlipper.CREATE_BODY({ world, side });
  staticBody.isTrigger = false;
  staticBody.quaternion.copy(this.animation[0]);
  this.staticFlipper = {
    body: staticBody,
    downQuaternion: this.animation[0],
    upQuaternion: this.animation[this.animation.length - 1],
    positionX: this.body.position.x,
    showDown () {
      this.body.position.x = this.positionX,
      this.body.quaternion.copy(this.downQuaternion);
    },
    showUp () {
      this.body.position.x = this.positionX,
      this.body.quaternion.copy(this.upQuaternion);
    },
    hide () {
      this.body.position.x = -100
    }
  }
}





WedgeFlipper.prototype.onFlipperUp = function () {
  this.staticFlipper.hide();
 // this.getCollisionFrame();
  this.flipperState.isAnimating = true;
  this.flipperState.orientation = 'up';
  this.stepState.frame = -1;
  this.stepState.direction = 1;
  this.stepState.endFrame = this.animation.length - 1;
}

WedgeFlipper.prototype.onFlipperDown = function () {
  this.staticFlipper.hide();
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
  const flipperCollisionResults = this.flipperState.orientation === 'down' ? null : initFlipper.GET_FLIPPER_ANGLE_OF_CONTACT({
    ball: {
      radius: this.ballState.radius,
      position
    },
    side: this.collisionState.side,
    hitArea: this.hitAreas[this.stepState.frame]
    }
  );
// CHECK IF COLLISION FRAME
  if (flipperCollisionResults !== null) {
    const { ballVelocity, ballPosition } = flipperCollisionResults; 
    this.ballState.ref.velocity.set(...Object.values(ballVelocity));
    //console.log('Object.values( this.collisionState.impact.position )', Object.values( this.collisionState.impact.position ))
    this.ballState.ref.position.set(...Object.values(ballPosition));
  }
// CHECK IF LAST ANIMATION FRAME HAS BEEN RENDERED
  if (this.stepState.frame === this.stepState.endFrame) {
    this.flipperState.isAnimating = false;
    this.stepState.endFrame === 0 ? this.staticFlipper.showDown() : this.staticFlipper.showUp();
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
          y: ballPos.y - frame * ballPosDiff.y,
          z: ballPos.z - frame * ballPosDiff.z
        }
      },
      side: this.collisionState.side
    }
    );

    const { flipperRotationAtPointOfContact, flipperAngleOfContact, distanceFromCenter, ballPosition } = flipperCollisionResults; 
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
    const zFactor = -2;
    const xFactor = ballPosition.x * zFactor / ballPosition.z;
    const ballContactPosition = {
      x: ballPosition.x + xFactor,
      y: ballPosition.y,
      z: ballPosition.z + zFactor
    }
    console.log('velocity', velocity)
    console.log('ballContactPosition', ballContactPosition)
    console.log('')
    this.collisionState.impact = {
      frame: frame - 1,
      velocity,
      position: ballContactPosition
    }
    break;
  }
  console.log('collisionFrame', this.collisionState.impact)
}

// REQUEST ANIM FRAME LOOP
WedgeFlipper.prototype.step2 = function () {
  if (this.flipperState.isAnimating === false) return; 
  const { position, previousPosition } = this.ballState.ref;
// BEGIN FRAME
  this.stepState.frame += this.stepState.direction;
// UPDATE FLIPPER POSITION
  this.body.quaternion.copy(this.animation[this.stepState.frame]);
// CHECK IF COLLISION FRAME
  if (this.stepState.frame ===  this.collisionState.impact.frame) {
    this.ballState.ref.velocity.set(...Object.values( this.collisionState.impact.velocity ));
    //console.log('Object.values( this.collisionState.impact.position )', Object.values( this.collisionState.impact.position ))
    this.ballState.ref.position.set(...Object.values( this.collisionState.impact.position ))
    this.collisionState.impact.frame = -1;
  }
// CHECK IF LAST ANIMATION FRAME HAS BEEN RENDERED
  if (this.stepState.frame === this.stepState.endFrame) {
    this.flipperState.isAnimating = false;
    this.stepState.endFrame === 0 ? this.staticFlipper.showDown() : this.staticFlipper.showUp();
  }
}

const radToDeg = (rad) => rad * 180/Math.PI;