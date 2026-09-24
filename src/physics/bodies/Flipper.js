import { FLIPPER_CONFIG } from './Flipper.config';
import { COLLISION_GROUPS } from '@physics/COLLISION_GROUPS';
import { MATERIALS, withMaterial } from '@physics/MATERIALS';
import { quaternionFromAxisAngle } from '@math';

const UP_AXIS = { x: 0, y: 1, z: 0 };

// Wedge hull in body space: the pivot is the origin and the flipper extends along +x.
const wedgePoints = ({ length, height, baseDepth, tipDepthRatio }) => {
  const halfHeight = height / 2;
  const halfBase = baseDepth / 2;
  const halfTip = halfBase * tipDepthRatio;
  const points = [];
  [-halfHeight, halfHeight].forEach(y => {
    points.push(0, y, -halfBase, 0, y, halfBase, length, y, -halfTip, length, y, halfTip);
  });
  return new Float32Array(points);
}

// A kinematic flipper. Rapier derives its velocity from the rotation set each step, so the
// contact solver handles the hit, including where along the flipper the ball is struck.
export const Flipper = ({ world, RAPIER, table, side }) => {
  const { height, pivot, angles, upSpeed, downSpeed } = FLIPPER_CONFIG;
  const { down, up } = angles[side];
  const pivotLocal = { x: side === 'left' ? -pivot.x : pivot.x, y: height / 2, z: pivot.z };
  const pivotWorld = table.toWorld(pivotLocal);
  const rotationAt = (angle) => table.rotationToWorld(quaternionFromAxisAngle(UP_AXIS, angle));

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(pivotWorld.x, pivotWorld.y, pivotWorld.z)
      .setRotation(rotationAt(down))
  );
  const colliderDesc = RAPIER.ColliderDesc.convexHull(wedgePoints(FLIPPER_CONFIG));
  if (colliderDesc === null) throw new Error('Flipper: could not build the wedge hull');
  colliderDesc.setCollisionGroups(COLLISION_GROUPS.flipper);
  const collider = world.createCollider(withMaterial(RAPIER, colliderDesc, MATERIALS.flipper), body);

  let angle = down;
  let targetAngle = down;

  const onFlipperUp = () => { targetAngle = up; }
  const onFlipperDown = () => { targetAngle = down; }

  // Called once per physics step, before world.step.
  const update = (dt) => {
    if (angle === targetAngle) return;
    const maxDelta = (targetAngle === up ? upSpeed : downSpeed) * dt;
    const remaining = targetAngle - angle;
    angle = Math.abs(remaining) <= maxDelta
      ? targetAngle
      : angle + Math.sign(remaining) * maxDelta;
    body.setNextKinematicRotation(rotationAt(angle));
  }

  return {
    body,
    collider,
    onFlipperUp,
    onFlipperDown,
    update
  }
}
