import * as CANNON from 'cannon-es';

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
  this.flipperPos = new CANNON.Vec3(-4, 0.6, -1);
  if (name === 'rightFlipper') {
    this.flipperPos = new CANNON.Vec3(4, 0.6, -1);
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
  this.isAnimating = false;
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
// INIT FLIPPER
  this.createBody({ world });
  this.createAnimation();
}

Flipper.prototype.onFlipperUp = function () {
  this.getCollisionFrame();
  this.isAnimating = true;
  this.animationFrame = -1;
  this.animationDirection = 1;
  this.animationStopAfterFrame = this.animation.length - 1;
}

Flipper.prototype.onFlipperDown = function () {
  this.isAnimating = true;
  this.animationFrame = this.animation.length - 1;
  this.animationDirection = -1;
  this.animationStopAfterFrame = 0;
}

// REQUEST ANIM FRAME LOOP
Flipper.prototype.step = function () {
  const { position, previousPosition } = this.ballRef;
  if (this.isAnimating === false) return; 
// BEGIN FRAME
  this.animationFrame += this.animationDirection;
// UPDATE FLIPPER POSITION
  this.body.quaternion.copy(this.animation[this.animationFrame]);
// CHECK IF COLLISION FRAME
  if (this.animationFrame === this.collisionFrame.frame) {
    console.log('this.collisionFrame', this.collisionFrame)
    console.log('this.collisionFrame.velocity', this.collisionFrame.velocity);
    this.ballRef.velocity.set(...Object.values(this.collisionFrame.velocity));
    this.collisionFrame === -1;
  }
// CHECK IF LAST ANIMATION FRAME HAS BEEN RENDERED
  if (this.animationFrame === this.animationStopAfterFrame) {
    this.isAnimating = false;
  }
}


Flipper.prototype.createBody = function ({ world }) {length
  const shape = new CANNON.Box(new CANNON.Vec3(2, 0.4, 0.1));
  const body = new CANNON.Body({
    mass: 0,
    isTrigger: true,
    position: this.flipperPos
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
  const ballUnitVec = new CANNON.Vec3();
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
console.log(`angleFromCenter: ${radToDeg(angleFromCenter)}, angleBetweenCenterAndContactPoint: ${radToDeg(angleBetweenCenterAndContactPoint)}`)
    const targetAngleForHitAreaTest = this.name === 'leftFlipper' 
      ? angleFromCenter - angleBetweenCenterAndContactPoint
      : angleFromCenter + angleBetweenCenterAndContactPoint
console.log('targetAngleForHitAreaTest', radToDeg(targetAngleForHitAreaTest))
    const { min, max } = this.hitAreas[frame];
console.log('')
console.log(`frame ${frame}: test if ${radToDeg(targetAngleForHitAreaTest)} < ${min * 180/Math.PI} || ${targetAngleForHitAreaTest * 180/Math.PI} > ${max * 180/Math.PI}`)

  let velocity;
  if (this.name === 'leftFlipper') {
    if (targetAngleForHitAreaTest < min || targetAngleForHitAreaTest > max ) continue;
    const tangentVelocity = {
      x: -Math.sin(targetAngleForHitAreaTest),
      z: -Math.cos(targetAngleForHitAreaTest)
    }
    console.log('*****tangentVelocity', tangentVelocity)
    console.log('')
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
    console.log('*****tangentVelocity', tangentVelocity)
    console.log('')
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