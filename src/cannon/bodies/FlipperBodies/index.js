import * as CANNON from 'cannon-es'
import { FLIPPER_CONFIG } from './config';

export const FlipperBodies = (props) => {
  const { world } = props;
  const flipperBodies = {};
  const flipperConstraints = [];
  const {
    quaternionPlayfieldSlope,
    flipperNames,
    _hingedBody,
    _staticBody,
    _triggerBody } = FLIPPER_CONFIG;

// INIT LEFT AND RIGHT FLIPPERS
  flipperNames.forEach(name => {
// FLIPPER AXIS  
    const hingedBodyShape = new CANNON.Box(_hingedBody.shape)
    const hingedBody = new CANNON.Body(_hingedBody.options);
    hingedBody.position.set(...FLIPPER_CONFIG[name].hingedBody.position);
    hingedBody.addShape(hingedBodyShape);
    hingedBody.description = `${name} hingedBody`;
    world.addBody(hingedBody)
// FLIPPER PADDLE
    const staticBodyShape = new CANNON.Cylinder(..._staticBody.shape);
    const staticBody = new CANNON.Body(_staticBody.options)
    staticBody.addShape(staticBodyShape);
    staticBody.position.set(...FLIPPER_CONFIG[name].staticBody.position);
    world.addBody(staticBody);
// HING CONSTRAINT BETWEEN AXIS AND PADDLE
    const constraint = new CANNON.HingeConstraint(
      staticBody, 
      hingedBody, 
      FLIPPER_CONFIG[name].hingeConstraint.options
    );
    flipperConstraints.push(constraint);
    world.addConstraint(constraint);
// FOR EACH FLIPPER, CREATE UPPER AND LOWER BODIES TO LIMIT FLIPPER ROTATION
    const upperLimitShape = new CANNON.Box(_triggerBody.shape);
    const upperLimitBody = new CANNON.Body(_triggerBody.options);
    upperLimitBody.addShape(upperLimitShape);
    upperLimitBody.position.set(...FLIPPER_CONFIG[name].upperLimit.position);
    upperLimitBody.description = `${name} upperLimit`;
    upperLimitBody.constraintTarget = constraint;
    world.addBody(upperLimitBody);

    const lowerLimitShape = new CANNON.Box(_triggerBody.shape);
    const lowerLimitBody = new CANNON.Body(_triggerBody.options);
    lowerLimitBody.addShape(lowerLimitShape);
    lowerLimitBody.position.set(...FLIPPER_CONFIG[name].lowerLimit.position);
    lowerLimitBody.description = `${name} lowerLimit`;
    lowerLimitBody.constraintTarget = constraint;
    lowerLimitBody.addEventListener('collide', _triggerBody.lowerLimitFlipperCollisionHandler);
    world.addBody(lowerLimitBody);
    flipperBodies[name] = { staticBody, hingedBody, constraint };
  });

  return flipperBodies;
}










