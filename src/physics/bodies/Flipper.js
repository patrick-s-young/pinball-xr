import { FLIPPER_CONFIG, LOWER_PLAYFIELD_CENTER_X } from './Flipper.config';
import { COLLISION_GROUPS } from '@physics/COLLISION_GROUPS';
import { MATERIALS, withMaterial } from '@physics/MATERIALS';
import { multiplyQuaternions } from '@math';

const HULL_POINTS_PER_CIRCLE = 16;

// Table-space direction from the pivot to the tip while the flipper rests on its lower stop.
export const flipperRestDirection = (side) => {
  const { restAngle } = FLIPPER_CONFIG;
  return { x: (side === 'left' ? 1 : -1) * Math.cos(restAngle), z: Math.sin(restAngle) };
}

export const flipperPivot = (side) => ({
  x: LOWER_PLAYFIELD_CENTER_X + (side === 'left' ? -1 : 1) * FLIPPER_CONFIG.pivot.x,
  z: FLIPPER_CONFIG.pivot.z
});

// Tapered bat hull in body space: pivot at the origin, pointing along the rest direction.
const batPoints = (side) => {
  const { baseRadius, tipRadius, length, height } = FLIPPER_CONFIG;
  const direction = flipperRestDirection(side);
  const circles = [
    { x: 0, z: 0, radius: baseRadius },
    { x: direction.x * length, z: direction.z * length, radius: tipRadius }
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

// A dynamic flipper on a revolute joint whose limits act as the rest and up stops.
// Each physics step applies solenoid-style torque: full coil power on the up stroke, hold power
// near the up stop, and a return spring. Because the flipper has real mass and finite torque,
// the ball can push it back, which is what makes catches and dead-flipper bounces possible.
export const Flipper = ({ world, RAPIER, table, power, side }) => {
  const {
    height,
    mass,
    swing,
    coilTorque,
    holdTorque,
    returnTorque,
    endOfStrokeAngle } = FLIPPER_CONFIG;
  // Rotation about the table's up axis that raises this flipper.
  const upSign = side === 'left' ? 1 : -1;
  const pivot = flipperPivot(side);
  const pivotLocal = { x: pivot.x, y: height / 2, z: pivot.z };
  const pivotWorld = table.toWorld(pivotLocal);

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(pivotWorld.x, pivotWorld.y, pivotWorld.z)
      .setRotation(table.rotationToWorld({ x: 0, y: 0, z: 0, w: 1 }))
      .setGravityScale(0)
      .setCanSleep(false)
  );
  const colliderDesc = RAPIER.ColliderDesc.convexHull(batPoints(side));
  if (colliderDesc === null) throw new Error('Flipper: could not build the bat hull');
  colliderDesc.setMass(mass).setCollisionGroups(COLLISION_GROUPS.flipper);
  const collider = world.createCollider(withMaterial(RAPIER, colliderDesc, MATERIALS.flipper), body);

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
    body,
    collider,
    joint,
    getStroke,
    onFlipperUp,
    onFlipperDown,
    update
  }
}
