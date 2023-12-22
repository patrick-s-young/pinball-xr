import * as CANNON from 'cannon-es';

export const createFlipperBody = ({
  world,
  mass,
  isTrigger,
  position,
  material,
  collisionFilterGroup,
  shape,
  shapeOffset   
  }) => {
  const body = new CANNON.Body({
    mass,
    isTrigger,
    position,
    material,
    collisionFilterGroup
  });
  body.addShape(shape, shapeOffset);
  world.addBody(body);
  return body;
}


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

    // STEP 1
      distance.pivotToBallCenter = Math.sqrt(Math.pow(ball.position.x - flipper.axis.x, 2) + Math.pow(ball.position.z - flipper.axis.z, 2));
//console.log('STEP 1: distance.pivotToBallCenter', distance.pivotToBallCenter)
    // STEP 2
      angle.pivotToBallCenter = Math.atan((ball.position.z - flipper.axis.z) / (ball.position.x - flipper.axis.x));
      if (side === 'right') angle.pivotToBallCenter += Math.PI;
//console.log('STEP 2: angle.pivotToBallCenter', angle.pivotToBallCenter)
    // STEP 3
      angle.ballCenterToPivotToBallSurface = Math.atan(ball.radius / distance.pivotToBallCenter);
//console.log('STEP 3: angle.ballCenterToPivotToBallSurface', angle.ballCenterToPivotToBallSurface)
    // STEP 4
      distance.pivotToBallSurface = Math.abs(ball.radius / Math.sin(angle.ballCenterToPivotToBallSurface));
///////////////////////////////////////////////////////
/////// STOP CHECK 1: IS THE BALL CLOSE ENOUGH TO HIT?
      if (distance.pivotToBallSurface > flipper.length) {
        return null;
      }
//console.log('STEP 4: distance.pivotToBallSurface', distance.pivotToBallSurface )
    // STEP 5
      distance.wedgeCenterToBallSurface = (flipper.length - distance.pivotToBallSurface) / flipper.length * flipper.wedgeBaseHeight;
//console.log('STEP 5: distance.wedgeCenterToBallSurface', distance.wedgeCenterToBallSurface)
    // STEP 6
      angle.ballSurfaceToPivotToWedgeCenter = Math.asin(distance.wedgeCenterToBallSurface / distance.pivotToBallSurface);
//console.log('STEP 6: angle.ballSurfaceToPivotToWedgeCenter', angle.ballSurfaceToPivotToWedgeCenter )
    // STEP 7
      angle.flipperRotationAtPointOfContact = side === 'left' ?
        angle.pivotToBallCenter - angle.ballCenterToPivotToBallSurface - angle.ballSurfaceToPivotToWedgeCenter
      : angle.pivotToBallCenter + angle.ballCenterToPivotToBallSurface + angle.ballSurfaceToPivotToWedgeCenter;
//console.log('STEP 7: angle.flipperRotationAtPointOfContact', angle.flipperRotationAtPointOfContact)
    // STEP 8
      angle.flipperAngleOfContact = side === 'right' ?
        angle.flipperRotationAtPointOfContact - flipper.wedgeSlope
      : angle.flipperRotationAtPointOfContact + flipper.wedgeSlope;
//console.log('STEP 8: angle.flipperAngleOfContact', angle.flipperAngleOfContact);
    // STEP 9
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
////////////////////////////////////////////////////////////////////////////
/////// STOP CHECK 2: IS ANGLE OF ROTATION WITHIN CURRENT FLIPPER HIT AREA?
      if (tangentVelocity === undefined) return null;

    // STEP 10
      const flipperMagnitude = distance.pivotToBallSurface / flipper.length;
      const velocity = new CANNON.Vec3(
        tangentVelocity.x * maxVelocity * flipperMagnitude,
        0,
        tangentVelocity.z * maxVelocity * flipperMagnitude
      );
      const zFactor = -2;
      const xFactor = ball.position.x * zFactor / ball.position.z;
      const ballContactPosition = {
        x: ball.position.x + xFactor,
        y: ball.position.y,
        z: ball.position.z + zFactor
      }

    return {  ballVelocity: velocity, ballPosition: ballContactPosition };
  }


export const getContactFrame2 = ({
  ball,
  flipper,
  side
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

    // STEP 1
      distance.pivotToBallCenter = Math.sqrt(Math.pow(ball.position.x - flipper.axis.x, 2) + Math.pow(ball.position.z - flipper.axis.z, 2));
//console.log('STEP 1: distance.pivotToBallCenter', distance.pivotToBallCenter)
    // STEP 2
      angle.pivotToBallCenter = Math.atan((ball.position.z - flipper.axis.z) / (ball.position.x - flipper.axis.x));
      if (side === 'right') angle.pivotToBallCenter += Math.PI;
//console.log('STEP 2: angle.pivotToBallCenter', angle.pivotToBallCenter)
    // STEP 3
      angle.ballCenterToPivotToBallSurface = Math.atan(ball.radius / distance.pivotToBallCenter);
//console.log('STEP 3: angle.ballCenterToPivotToBallSurface', angle.ballCenterToPivotToBallSurface)
    // STEP 4
      distance.pivotToBallSurface = Math.abs(ball.radius / Math.sin(angle.ballCenterToPivotToBallSurface));
//console.log('STEP 4: distance.pivotToBallSurface', distance.pivotToBallSurface )
    // STEP 5
      distance.wedgeCenterToBallSurface = (flipper.length - distance.pivotToBallSurface) / flipper.length * flipper.wedgeBaseHeight;
//console.log('STEP 5: distance.wedgeCenterToBallSurface', distance.wedgeCenterToBallSurface)
    // STEP 6
      angle.ballSurfaceToPivotToWedgeCenter = Math.asin(distance.wedgeCenterToBallSurface / distance.pivotToBallSurface);
//console.log('STEP 6: angle.ballSurfaceToPivotToWedgeCenter', angle.ballSurfaceToPivotToWedgeCenter )
    // STEP 7
      angle.flipperRotationAtPointOfContact = side === 'left' ?
        angle.pivotToBallCenter - angle.ballCenterToPivotToBallSurface - angle.ballSurfaceToPivotToWedgeCenter
      : angle.pivotToBallCenter + angle.ballCenterToPivotToBallSurface + angle.ballSurfaceToPivotToWedgeCenter;
//console.log('STEP 7: angle.flipperRotationAtPointOfContact', angle.flipperRotationAtPointOfContact)
    // STEP 8
      angle.flipperAngleOfContact = side === 'right' ?
        angle.flipperRotationAtPointOfContact - flipper.wedgeSlope
      : angle.flipperRotationAtPointOfContact + flipper.wedgeSlope;
//console.log('STEP 8: angle.flipperAngleOfContact', angle.flipperAngleOfContact);

    const { flipperRotationAtPointOfContact, flipperAngleOfContact } = angle;
    const { pivotToBallCenter:distanceFromCenter } = distance;
    return {  flipperRotationAtPointOfContact, flipperAngleOfContact, distanceFromCenter, ballPosition: ball.position }
}