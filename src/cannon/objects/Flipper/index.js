import * as CANNON from 'cannon-es';
import { flipperMaterial } from '../../materials/index';

function Flipper ({
  world
  }) {
  this.body = this.createBody({ world });
// ANIMATION
  this.step = this.step.bind(this);
  this.animation = this.createAnimation();
  this.isAnimating = false;
  this.animationFrame = null;
  this.animationDirection = 1;
  this.animationStopAfterFrame = null;
// INPUT EVENTS
  this.onFlipperUp = this.onFlipperUp.bind(this);
  this.onFlipperDown = this.onFlipperDown.bind(this);
// COLLISION
  this.maxVelocity = 50;
  this.collisionHandler = this.collisionHandler.bind(this);
  this.body.addEventListener('collide', this.collisionHandler);
}

Flipper.prototype.collisionHandler = function (e) {
 // if (this.isAnimating === false) return;
// to do: throttle collision events for 100 milliseconds after contact
// to do: switch over to physics when ball is on unmoving flipper 'isTrigger true/false'
  const { body, target } = {...e};
// ANGLE OF BALL VECTOR (direction of ball)
  const ballUnitVec = getBallUnitVec(body);
// ANGLE OF FLIPPER VECTOR (orientation of flipper)
  const flipperUnitVec = getFlipperUnitVec(ballUnitVec);
// MAGNITUDE OF FLIPPER VECTOR (contact distance from flipper pivot point)
  const flipperMagnitude = getFlipperMagnitude();
// MAGNITUDE OF BALL VECTOR (velocity of ball along x and z axis)
  const ballMagnitude = getBallMagnitude(body); 

  const angleBetween = Math.acos(flipperUnitVec.dot(ballUnitVec));
  const xDirection = flipperUnitVec.z < 0 ? 1 : -1;
  e.body.velocity.x = Math.cos(angleBetween / 2) * this.maxVelocity * xDirection * flipperMagnitude;
  e.body.velocity.z = Math.sin(angleBetween / 2) * this.maxVelocity * -(flipperMagnitude + ballMagnitude.z);
  
// ANGLE OF FLIPPER VECTOR 
  function getFlipperUnitVec (ballUnitVec) {
    const flipperAxis = new CANNON.Vec3(...Object.values(e.target.quaternion.toAxisAngle()[0]));
    const flipperAngle = e.target.quaternion.toAxisAngle()[1] * flipperAxis.y;
    return new CANNON.Vec3(Math.cos(flipperAngle), -ballUnitVec.y , Math.sin(flipperAngle));
  }

// ANGLE OF BALL VECTOR 
  function getBallUnitVec ({ position, previousPosition }) {
    const ballUnitVec = new CANNON.Vec3();
    const ballPrevPos = new CANNON.Vec3();
    const ballPos = new CANNON.Vec3();
    const ballPosDiff = new CANNON.Vec3();
    ballPrevPos.set(...Object.values(previousPosition));
    ballPos.set(...Object.values(position));
    ballPos.vsub(ballPrevPos, ballPosDiff);
    ballPosDiff.unit(ballUnitVec);
    return ballUnitVec;
  }
    
// GET DISTANCE BETWEEN CURRENT X, Z POSTION AND PREVIOUS POSITION 
  function getBallMagnitude ({ position, previousPosition }) {
    return new CANNON.Vec3(position.x - previousPosition.x, position.y - previousPosition.y, position.z - previousPosition.z);
  }
// GET DISTANCE BETWEEN BALL CONTACT AND FLIPPER PIVOT POINT
  function getFlipperMagnitude () {
    const { quaternion, previousQuaternion } = target;
    if (quaternion.y === previousQuaternion.y) return 0.1;
    const flipperContactDistanceFromPivot = Math.sqrt(Math.pow(e.body.position.x - e.target.position.x, 2) +
                                                      Math.pow(e.body.position.y - e.target.position.y, 2));
    const flipperLength = 3.5;
    return flipperContactDistanceFromPivot / flipperLength;
  }
}

Flipper.prototype.onFlipperUp = function () {
  this.isAnimating = true;
  this.animationFrame = 0;
  this.animationDirection = 1;
  this.animationStopAfterFrame = this.animation.length - 1;
  
}

Flipper.prototype.onFlipperDown = function () {
  this.isAnimating = true;
  this.animationFrame = this.animation.length - 1;
  this.animationDirection = -1;
  this.animationStopAfterFrame = 0;
}

Flipper.prototype.step = function () {
  if (this.isAnimating === false) return; 
  this.body.quaternion.copy(this.animation[this.animationFrame]);
  if (this.animationFrame === this.animationStopAfterFrame) {
    this.isAnimating = false;
  } else {
    this.animationFrame += this.animationDirection;
  }
}

Flipper.prototype.createBody = function ({ world }) {
  const shape = new CANNON.Box(new CANNON.Vec3(2, 0.4, 0.4));
  const body = new CANNON.Body({
    mass: 0,
    isTrigger: true,
    position: new CANNON.Vec3(0, 0.6, 0)
  });
  body.addShape(shape, new CANNON.Vec3(1.5, 0, 0));
  world.addBody(body);
  return body;
}

Flipper.prototype.createAnimation = function () {
  const quat = new CANNON.Quaternion();
  quat.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), -Math.PI/6);
  this.body.quaternion.copy(quat);
  const startRadian = -Math.PI/6;
  const endRadian = Math.PI/5;
  const animSteps = 4;
  const increment = (Math.abs(startRadian) + endRadian) / animSteps;
  const rotationAnim = [];
  for (let r = startRadian; r < endRadian; r += increment) {
    const quat = new CANNON.Quaternion();
    quat.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), r);
    rotationAnim.push(quat);
  }
  return rotationAnim;
}

export default Flipper;


