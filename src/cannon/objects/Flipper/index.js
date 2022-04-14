import * as CANNON from 'cannon-es';
import { COLLISION_GROUPS } from '../../collisions';
function Flipper ({
  world,
  ballRef,
  name,
  }) {
  this.name = name;
// PINBALL POSITION AND SIZE
  this.ballRef = ballRef;
  this.ballRadius= ballRef.shapes[0].radius;
// CREATE CANNON BODY  
  this.flipperLengthFromPivot = 3.5;
  this.shapeOffset = new CANNON.Vec3(1.5, 0, 0)
  this.flipperPos = new CANNON.Vec3(-4, 0.3, -1);
  if (name === 'rightFlipper') {
    this.flipperPos = new CANNON.Vec3(4, 0.3, -1);
  }
  this.body = null;
  this.createBody = this.createBody.bind(this);
// ANIMATION
  this.startRadian = -Math.PI/6;
  this.endRadian = Math.PI/4;
  if (name === 'rightFlipper') {
    this.startRadian = Math.PI + Math.PI/6;
    this.endRadian = Math.PI - Math.PI/4;
  }
  this.step = this.step.bind(this);
  this.animation = null;
  this.animationFrame = null;
  this.animationDirection = 1;
  this.animationStopAfterFrame = null;
  this.createAnimation = this.createAnimation.bind(this);
// INPUT EVENTS
  this.onFlipperUp = this.onFlipperUp.bind(this);
  this.onFlipperDown = this.onFlipperDown.bind(this);
// COLLISION PREDICTION
  this.maxVelocity = 50;
  this.rightFlipperAngleAdjust = 0;
  if (name === 'rightFlipper') {
    this.rightFlipperAngleAdjust = Math.PI;
  }
  this.hitAreas = {};
  this.collisionFrame = null;
  this.collisionFrame = { frameNumber: null, ballVelocity: {}};
  this.getCollisionFrame = this.getCollisionFrame.bind(this);
// COLLISION HANDLER
  this.collisionHandler = this.collisionHandler.bind(this);
// FLIPPER STATE
  this.flipperState = {};
  this.initFlipperState = this.initFlipperState.bind(this);
// INIT FLIPPER
  this.createBody({ world });
  this.createAnimation();
  this.initFlipperState();
  this.body.addEventListener('collide', this.collisionHandler(this.flipperState))


}

Flipper.prototype.initFlipperState = function () {
  const mirrorValue = this.name === 'leftFlipper' ? -1 : 1;
  this.flipperState = {
    isAnimating: false,
    orientation: 'down',
    tangentCollisionVector: { 
      up: { 
        x: Math.sin(this.endRadian) * mirrorValue,
        z: Math.cos(this.endRadian) * mirrorValue
      },
      down: {
        x: Math.sin(this.startRadian) * mirrorValue,
        z: Math.cos(this.startRadian) * mirrorValue
      }
    }
  }
}

Flipper.prototype.collisionHandler = (flipperStateRef) => {
  return (e) => {
    console.log('flipperStateRef:', flipperStateRef);
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
    console.log('ball.velocity', ball.velocity);
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


Flipper.prototype.onFlipperUp = function () {
  this.getCollisionFrame();
  this.flipperState.isAnimating = true;
  this.flipperState.orientation = 'up';
  this.animationFrame = -1;
  this.animationDirection = 1;
  this.animationStopAfterFrame = this.animation.length - 1;
}

Flipper.prototype.onFlipperDown = function () {
  this.flipperState.isAnimating = true;
  this.flipperState.orientation = 'down';
  this.animationFrame = this.animation.length - 1;
  this.animationDirection = -1;
  this.animationStopAfterFrame = 0;
}


// REQUEST ANIM FRAME LOOP
Flipper.prototype.step = function () {
  if (this.flipperState.isAnimating === false) return; 
  const { position, previousPosition } = this.ballRef;
// BEGIN FRAME
  this.animationFrame += this.animationDirection;
// UPDATE FLIPPER POSITION
  this.body.quaternion.copy(this.animation[this.animationFrame]);
// CHECK IF COLLISION FRAME
  if (this.animationFrame === this.collisionFrame.frame) {
    this.ballRef.velocity.set(...Object.values(this.collisionFrame.velocity));
    this.collisionFrame.frame = -1;
  }
// CHECK IF LAST ANIMATION FRAME HAS BEEN RENDERED
  if (this.animationFrame === this.animationStopAfterFrame) {
    this.flipperState.isAnimating = false;
  }
}


Flipper.prototype.createBody = function ({ world }) {length
  const shape = new CANNON.Box(new CANNON.Vec3(2, 0.4, 0.2));
  const body = new CANNON.Body({
    mass: 0,
    isTrigger: true,
    position: this.flipperPos,
    collisionFilterGroup: COLLISION_GROUPS.FLIPPER
  });
  body.addShape(shape, this.shapeOffset);
  world.addBody(body);
  this.body = body;
}

Flipper.prototype.createAnimation = function () {
  const quat = new CANNON.Quaternion();
  quat.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), this.startRadian);
  this.body.quaternion.copy(quat);
  const animSteps = 4;
  const increment = (this.endRadian - this.startRadian) / animSteps;
  const rotationAnim = [];
  const flipperAngles = []
  for (let frame = 0; frame <= animSteps; frame++) {
    const flipperAngle = this.startRadian + frame * increment;
    flipperAngles.push(flipperAngle);
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), flipperAngle);
    rotationAnim.push(quat);
  }

  this.hitAreas = flipperAngles.map((angle, idx) => {
    const hitArea = { min: null, max: null, minDegrees: null, maxDegrees: null };
    if (idx > 0) {
      hitArea.min = flipperAngles[idx-1];
      hitArea.max = flipperAngles[idx];
      hitArea.minDegrees = flipperAngles[idx-1] * 180/Math.PI;
      hitArea.maxDegrees = flipperAngles[idx] * 180/Math.PI;
    }
    return hitArea;
  })
  this.animation = rotationAnim;
  if (this.name === 'rightFlipper') console.log('rightFlipper hitAreas', this.hitAreas)
}

Flipper.prototype.getCollisionFrame = function () {
  this.collisionFrame = { frame: -1 };
  const { position, previousPosition } = this.ballRef;
  const ballPrevPos = new CANNON.Vec3(...Object.values(previousPosition));
  const ballPos = new CANNON.Vec3(...Object.values(position));
  const ballPosDiff = new CANNON.Vec3();
  ballPos.vsub(ballPrevPos, ballPosDiff);
  const ballUnitVec = new CANNON.Vec3(); // ballUnitVec not used
  ballPosDiff.unit(ballUnitVec);

  for (let frame = 1; frame < this.hitAreas.length; frame++) {
    const ballx = ballPos.x - frame * ballPosDiff.x;
    const ballz = ballPos.z - frame * ballPosDiff.z;
// HYPOTENUSE OF BALL CENTER TO FLIPPER PIVOT
    const distanceFromCenter = Math.sqrt(Math.pow(ballx - this.flipperPos.x, 2) + Math.pow(ballz - this.flipperPos.z, 2));
    if (distanceFromCenter > this.flipperLengthFromPivot) continue;
// ANGLE BETWEEN BALL CENTER AND FLIPPER PIVOT
    const angleFromCenter = this.name === 'leftFlipper' ? 
      -Math.atan((ballz - this.flipperPos.z)/(ballx - this.flipperPos.x))
      : Math.PI - Math.atan((ballz - this.flipperPos.z)/(ballx - this.flipperPos.x)) 
// ANGLE BETWEEN BALL CENTER, FLIPPER PIVOT, AND BALL CONTACT POINT
    const angleBetweenCenterAndContactPoint = Math.asin(this.ballRadius/distanceFromCenter);
// TARGET FLIPPER ANGLE FOR HIT AREA TEST
    const targetAngleForHitAreaTest = this.name === 'leftFlipper' 
      ? angleFromCenter - angleBetweenCenterAndContactPoint
      : angleFromCenter + angleBetweenCenterAndContactPoint
    const { min, max } = this.hitAreas[frame];

    let velocity;
    if (this.name === 'leftFlipper') {
      if (targetAngleForHitAreaTest < min || targetAngleForHitAreaTest > max ) continue;
      const tangentVelocity = {
        x: -Math.sin(targetAngleForHitAreaTest),
        z: -Math.cos(targetAngleForHitAreaTest)
      }
      const flipperMagnitude = distanceFromCenter / this.flipperLengthFromPivot;
      velocity = new CANNON.Vec3(
        tangentVelocity.x * this.maxVelocity * flipperMagnitude,
        -ballPosDiff.y,
        tangentVelocity.z * this.maxVelocity * flipperMagnitude
      );
    }

    if (this.name === 'rightFlipper') {
      if (targetAngleForHitAreaTest > min || targetAngleForHitAreaTest < max ) continue;
      const tangentVelocity = {
        x: Math.sin(targetAngleForHitAreaTest),
        z: Math.cos(targetAngleForHitAreaTest)
      }
      const flipperMagnitude = distanceFromCenter / this.flipperLengthFromPivot;
      velocity = new CANNON.Vec3(
        tangentVelocity.x * this.maxVelocity * flipperMagnitude,
        -ballPosDiff.y,
        tangentVelocity.z * this.maxVelocity * flipperMagnitude
      );
    }

    this.collisionFrame = {
      frame,
      velocity
    }
    break;
  }
}

export default Flipper;

const radToDeg = (rad) => rad * 180/Math.PI;