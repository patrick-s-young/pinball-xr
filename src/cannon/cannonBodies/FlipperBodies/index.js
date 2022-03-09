import * as CANNON from 'cannon-es'
import { FLIPPER_CONFIG } from './configs';
import { quaternionPlayfieldSlope } from '../../constants';
import { flipperMaterial } from '../../cannonMaterials';
import { COLLISION_GROUPS } from '../../constants';



export const FlipperBodies = (props) => {
  const { world } = props;
  const flipperConstraints = [];
  const {
    flipperNames,
    _hingedBody,
    _staticBody,
    _triggerBody } = FLIPPER_CONFIG;

  flipperNames.forEach(name => {
    const hingedBodyShape = new CANNON.Box(_hingedBody.shape)
    const hingedBody = new CANNON.Body(_hingedBody.options);
    hingedBody.position.set(...FLIPPER_CONFIG[name].hingedBody.position);
    hingedBody.addShape(hingedBodyShape);
    world.addBody(hingedBody)

    const staticBodyShape = new CANNON.Cylinder(..._staticBody.shape);
    const staticBody = new CANNON.Body(_staticBody.options)
    staticBody.addShape(staticBodyShape);
    staticBody.position.set(...FLIPPER_CONFIG[name].staticBody.position);
    world.addBody(staticBody);

    const constraint = new CANNON.HingeConstraint(
      staticBody, 
      hingedBody, 
      FLIPPER_CONFIG[name].hingeConstraint.options
    );
    flipperConstraints.push(constraint);
    world.addConstraint(constraint);

    console.log('constraint.bodyB.quaternion', constraint.bodyB.quaternion);
    const forwardTriggerShape = new CANNON.Box(_triggerBody.shape);
    const forwardTriggerBody = new CANNON.Body(_triggerBody.options);
    forwardTriggerBody.addShape(forwardTriggerShape);
    forwardTriggerBody.position.set(...FLIPPER_CONFIG[name].forwardTrigger.position)
    forwardTriggerBody.addEventListener('collide', (e) => {
      console.log('collide > constraint.bodyB.quaternion:', constraint.bodyB.quaternion);
      console.log(' ')
    });
    world.addBody(forwardTriggerBody);

    const backwardTriggerShape = new CANNON.Box(_triggerBody.shape);
    const backwardTriggerBody = new CANNON.Body(_triggerBody.options);
    backwardTriggerBody.addShape(backwardTriggerShape);
    backwardTriggerBody.position.set(...FLIPPER_CONFIG[name].backwardTrigger.position)
    backwardTriggerBody.addEventListener('collide', (e) => (e, constraint) => {
      constraintLeft.motorEquation.enabled = false;
    });
    world.addBody(backwardTriggerBody);
    
  });





  return flipperConstraints;
}













///////////
//////////
/////////
export const FlipperBodies2 = (props) => {
  const { world } = props;
 
  const mass = 1
  const size = 2
  const distance = 0.2 

////////////////
// LEFT FLIPPER  
//
// LEFT HINGED BODY
  const hingedBodyShape = new CANNON.Box(new CANNON.Vec3(1.5, 0.4, 0.5))
  const hingedBody = new CANNON.Body({ mass: 10  , material: flipperMaterial })
  hingedBody.addShape(hingedBodyShape)
  hingedBody.position.set(-1.5, -0.25, 8);
  hingedBody.quaternion.copy(quaternionPlayfieldSlope);
  hingedBody.angularDamping = 0.9;
  hingedBody.linearDamping = 0.9;
  world.addBody(hingedBody)
// LEFT STATIC BODY
  const staticBodyShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.4, 0.4))
  const staticBody = new CANNON.Body({ mass: 0 })
  staticBody.addShape(staticBodyShape);
  staticBody.position.set(-4, -0.25, 8);
  staticBody.quaternion.copy(quaternionPlayfieldSlope);
  world.addBody(staticBody)
// HINGE LEFT FLIPPER
  const constraint = new CANNON.HingeConstraint(staticBody, hingedBody, {
    pivotA: new CANNON.Vec3(0.25 + distance, 0, 0),
    axisA: new CANNON.Vec3(0, 1, 0),
    pivotB: new CANNON.Vec3(-1.25 - distance, 0, 0),
    axisB: new CANNON.Vec3(0, 1, 0),
    collideConnected: true, maxForce: 50
  })
  world.addConstraint(constraint);


////////////////
// RIGHT FLIPPER  
//
// RIGHT HINGED BODY
const hingedBodyShapeRight = new CANNON.Box(new CANNON.Vec3(1.5, 0.4, 0.5))
const hingedBodyRight = new CANNON.Body({ mass: 10  , material: flipperMaterial })
hingedBodyRight.addShape(hingedBodyShapeRight)
hingedBodyRight.position.set(1.5, -0.25, 8);
hingedBodyRight.quaternion.copy(quaternionPlayfieldSlope);
hingedBody.angularDamping = 0.9;
hingedBody.linearDamping = 0.9;
world.addBody(hingedBodyRight)
// RIGHT STATIC BODY
const staticBodyShapeRight = new CANNON.Box(new CANNON.Vec3(0.25, 0.4, 0.4))
const staticBodyRight = new CANNON.Body({ mass: 0 })
staticBodyRight.addShape(staticBodyShapeRight);
staticBodyRight.position.set(4, -0.25, 8);
staticBodyRight.quaternion.copy(quaternionPlayfieldSlope);
world.addBody(staticBodyRight)
// RIGHT LEFT FLIPPER
const constraintRight = new CANNON.HingeConstraint(staticBodyRight, hingedBodyRight, {
  pivotA: new CANNON.Vec3(-0.25 - distance, 0, 0),
  axisA: new CANNON.Vec3(0, 1, 0),
  pivotB: new CANNON.Vec3(1.25 + distance, 0, 0),
  axisB: new CANNON.Vec3(0, 1, 0),
  collideConnected: true, maxForce: 50  
})
world.addConstraint(constraintRight);

  return [hingedBody, hingedBodyRight];

}



