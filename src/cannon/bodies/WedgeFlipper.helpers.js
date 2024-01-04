import * as CANNON from 'cannon-es';
import { PLAYFIELD } from '@src/App.config';

export const getContactFrame = ({
  ball,
  flipper,
  side,
  hitArea,
  maxVelocity
  }) => {
  const distance = {
    pivotToBallCenter: undefined,
    pivotToBallSurface: undefined,
    wedgeCenterToBallSurface: undefined
  }
  const angle = {
    pivotToBallCenter: undefined,
    ballCenterToPivotToBallSurface: undefined,
    ballSurfaceToPivotToWedgeCenter: undefined,
    flipperRotationAtPointOfContact: undefined,
    flipperAngleOfContact: undefined
  }

  // STEP 1: Distance between ball center and flipper pivot
  distance.pivotToBallCenter = Math.sqrt(Math.pow(ball.position.x - flipper.body.position.x, 2) + Math.pow(ball.position.z - flipper.body.position.z, 2));
  // STEP 2: Angle of ball center and flipper pivot
  angle.pivotToBallCenter = Math.atan((ball.position.z - flipper.body.position.z) / (ball.position.x - flipper.body.position.x));
  if (side === 'right') angle.pivotToBallCenter += Math.PI;
  // STEP 3: Angle between flipper pivot, ball center, and ball radius (extending perpendicular to angle.pivotToBallCenter)
  angle.ballCenterToPivotToBallSurface = Math.atan(ball.radius / distance.pivotToBallCenter);
  // STEP 4: Distance between pivot and ball radius (extending perpendicular to angle.pivotToBallCenter)
  distance.pivotToBallSurface = Math.abs(ball.radius / Math.sin(angle.ballCenterToPivotToBallSurface));

  // TEST: IS THE BALL CLOSE ENOUGH TO HIT?
  if (distance.pivotToBallSurface > flipper.length) {
    console.log('ball not close enough to hit', distance.pivotToBallSurface)
    return null;
  }

  // STEP 5: Distance between ball and center of flipper (along length axis)
  //distance.wedgeCenterToBallSurface = (flipper.length - distance.pivotToBallSurface) / flipper.length * flipper.wedgeBaseHeight;
  distance.wedgeCenterToBallSurface = flipper.length * flipper.wedgeBaseHeight * (flipper.length - distance.pivotToBallSurface);
  // STEP 6: Flipper rotation between ball and center of flipper
  angle.ballSurfaceToPivotToWedgeCenter = Math.asin(distance.wedgeCenterToBallSurface / distance.pivotToBallSurface);
  // STEP 7: Derive flipper rotation at point of contact with ball
    angle.flipperRotationAtPointOfContact = side === 'left' ?
      angle.pivotToBallCenter - angle.ballCenterToPivotToBallSurface - angle.ballSurfaceToPivotToWedgeCenter
    : angle.pivotToBallCenter + angle.ballCenterToPivotToBallSurface + angle.ballSurfaceToPivotToWedgeCenter;
    angle.flipperAngleOfContact = side === 'right' ?
      angle.flipperRotationAtPointOfContact - flipper.wedgeSlope
    : angle.flipperRotationAtPointOfContact + flipper.wedgeSlope;
  // STEP 9: Test if ball is within current hitArea
  const { min, max } = hitArea;
  let tangentVelocity = undefined;
  if (side === 'left' && angle.flipperRotationAtPointOfContact > min && angle.flipperRotationAtPointOfContact < max ) {
    tangentVelocity = {
      x: -Math.sin(angle.flipperAngleOfContact),
      z: -Math.cos(angle.flipperAngleOfContact)
    }
  }
  if (side === 'right' && angle.flipperRotationAtPointOfContact < min && angle.flipperRotationAtPointOfContact > max) {
    tangentVelocity = {
      x: Math.sin(angle.flipperAngleOfContact),
      z: Math.cos(angle.flipperAngleOfContact)
    }
  }
  if (tangentVelocity === undefined) return null;
  // STEP 10: Derive velocity vector and position for rebounded ball
  const flipperMagnitude = distance.pivotToBallSurface / flipper.length;
  const velocity = new CANNON.Vec3(
    tangentVelocity.x * maxVelocity * flipperMagnitude,
    0,
    tangentVelocity.z * maxVelocity * flipperMagnitude
  );
  // STEP 11: Position ball above flipper (in up position)
  const zFactor = -.15;
  const xFactor = ball.position.x * zFactor / ball.position.z;
  const ballContactPosition = {
    x: ball.position.x,// + xFactor,
    y: ball.position.y + .01, // - Math.sin(PLAYFIELD.slopeRadians) * xFactor,
    z: ball.position.z + zFactor
  }

    return {  ballVelocity: velocity, ballPosition: ballContactPosition };
  }

