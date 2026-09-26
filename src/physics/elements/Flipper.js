import { TUNING } from '../TUNING';
import { COLLISION_GROUPS } from '../COLLISION_GROUPS';
import { withMaterial } from '../colliders';
import { multiplyQuaternions } from '@math';

const HULL_POINTS_PER_CIRCLE = 16;

// Tapered bat hull in body space: pivot at the origin, pointing along the rest direction.
const batPoints = ({ baseRadius, tipRadius, length, height, restDirection: [directionX, directionZ] }) => {
  const circles = [
    { x: 0, z: 0, radius: baseRadius },
    { x: directionX * length, z: directionZ * length, radius: tipRadius }
  ];
  const points = [];
  [-height / 2, height / 2].forEach(y => {
    circles.forEach(({ x, z, radius }) => {
      for (let idx = 0; idx < HULL_POINTS_PER_CIRCLE; idx++) {
        const angle = (idx / HULL_POINTS_PER_CIRCLE) * Math.PI * 2;
        points.push(x + Math.cos(angle) * radius, y, z + Math.sin(angle) * radius);
      }
    });
  });
  return new Float32Array(points);
}

// A dynamic flipper on a revolute joint whose limits act as the rest and up stops. Each physics
// step applies solenoid-style torque: full coil power on the up stroke, end-of-stroke (hold)
// power near the up stop, and a return spring. Because the flipper has mass and finite torque,
// the ball can push it back, which makes catches and dead-flipper bounces possible.
// definition is an imported flipper; Visual Pinball's strength and mass scale TUNING.flipper.
export const Flipper = ({ world, RAPIER, table, power }, definition) => {
  const { referenceStrength, referenceMass } = TUNING.flipper;
  const {
    name,
    side,
    pivot: [pivotX, pivotZ],
    height,
    swing,
    upSign,
    endOfStrokeAngle } = definition;
  const coilTorque = TUNING.flipper.coilTorque * definition.strength / referenceStrength;
  const holdTorque = coilTorque * definition.endOfStrokeTorque;
  const returnTorque = coilTorque * definition.returnStrength;
  const mass = TUNING.flipper.mass * definition.mass / referenceMass;

  const pivotLocal = { x: pivotX, y: height / 2, z: pivotZ };
  const pivotWorld = table.toWorld(pivotLocal);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pivotWorld.x, pivotWorld.y, pivotWorld.z)
      .setRotation(table.rotationToWorld({ x: 0, y: 0, z: 0, w: 1 }))
      .setGravityScale(0)
      .setCanSleep(false)
  );
  const colliderDesc = RAPIER.ColliderDesc.convexHull(batPoints(definition));
  if (colliderDesc === null) throw new Error(`Flipper ${name}: could not build the bat hull`);
  colliderDesc.setMass(mass).setCollisionGroups(COLLISION_GROUPS.flipper);
  const collider = world.createCollider(withMaterial(RAPIER, colliderDesc, { friction: definition.friction, restitution: definition.restitution }), body);

  const joint = world.createImpulseJoint(
    RAPIER.JointData.revolute(pivotLocal, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }),
    table.body,
    body,
    true
  );
  joint.setLimits(...(upSign > 0 ? [0, swing] : [-swing, 0]));

  let isEnergized = false;

  const onFlipperUp = () => { isEnergized = true; }
  const onFlipperDown = () => { isEnergized = false; }

  // Angle travelled from the rest stop toward the up stop, in radians.
  const getStroke = () => {
    const { x, y, z, w } = table.body.rotation();
    // The flipper's rotation relative to the table is purely about the table's up (y) axis.
    const relative = multiplyQuaternions({ x: -x, y: -y, z: -z, w }, body.rotation());
    return 2 * Math.atan2(relative.y, relative.w) * upSign;
  }

  // Called once per physics step, before world.step.
  const update = (dt) => {
    // A tilted machine cuts flipper power; the return spring still acts.
    const coil = isEnergized && power.isOn
      ? (getStroke() >= swing - endOfStrokeAngle ? holdTorque : coilTorque)
      : 0;
    const impulse = (coil - returnTorque) * upSign * dt;
    body.applyTorqueImpulse({
      x: table.normal.x * impulse,
      y: table.normal.y * impulse,
      z: table.normal.z * impulse
    }, true);
  }

  return {
    name,
    side,
    body,
    collider,
    joint,
    getStroke,
    onFlipperUp,
    onFlipperDown,
    update
  }
}
