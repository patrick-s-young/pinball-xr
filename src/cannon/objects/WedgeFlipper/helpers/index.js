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

//export const createFlipperAnimation = ({})

export const getContactFrame = ({
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
console.log('STEP 1: distance.pivotToBallCenter', distance.pivotToBallCenter)
    // STEP 2
      angle.pivotToBallCenter = Math.atan((ball.position.z - flipper.axis.z) / (ball.position.x - flipper.axis.x));
      if (side === 'right') angle.pivotToBallCenter += Math.PI;
console.log('STEP 2: angle.pivotToBallCenter', angle.pivotToBallCenter)
    // STEP 3
      angle.ballCenterToPivotToBallSurface = Math.atan(ball.radius / distance.pivotToBallCenter);
console.log('STEP 3: angle.ballCenterToPivotToBallSurface', angle.ballCenterToPivotToBallSurface)
    // STEP 4
      distance.pivotToBallSurface = Math.abs(ball.radius / Math.sin(angle.ballCenterToPivotToBallSurface));
console.log('STEP 4: distance.pivotToBallSurface', distance.pivotToBallSurface )
    // STEP 5
      distance.wedgeCenterToBallSurface = (flipper.length - distance.pivotToBallSurface) / flipper.length * flipper.wedgeBaseHeight;
console.log('STEP 5: distance.wedgeCenterToBallSurface', distance.wedgeCenterToBallSurface)
    // STEP 6
      angle.ballSurfaceToPivotToWedgeCenter = Math.asin(distance.wedgeCenterToBallSurface / distance.pivotToBallSurface);
console.log('STEP 6: angle.ballSurfaceToPivotToWedgeCenter', angle.ballSurfaceToPivotToWedgeCenter )
    // STEP 7
      angle.flipperRotationAtPointOfContact = side === 'left' ?
        angle.pivotToBallCenter - angle.ballCenterToPivotToBallSurface - angle.ballSurfaceToPivotToWedgeCenter
      : angle.pivotToBallCenter + angle.ballCenterToPivotToBallSurface + angle.ballSurfaceToPivotToWedgeCenter;
console.log('STEP 7: angle.flipperRotationAtPointOfContact', angle.flipperRotationAtPointOfContact)
    // STEP 8
      angle.flipperAngleOfContact = side === 'right' ?
        angle.flipperRotationAtPointOfContact - flipper.wedgeSlope
      : angle.flipperRotationAtPointOfContact + flipper.wedgeSlope;
console.log('STEP 8: angle.flipperAngleOfContact', angle.flipperAngleOfContact);

    const { flipperRotationAtPointOfContact, flipperAngleOfContact } = angle;
    const { pivotToBallCenter:distanceFromCenter } = distance;
    return {  flipperRotationAtPointOfContact, flipperAngleOfContact, distanceFromCenter, ballPosition: ball.position }
}