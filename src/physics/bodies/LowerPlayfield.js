import { LOWER_PLAYFIELD_CONFIG } from './LowerPlayfield.config';
import { COLLISION_GROUPS } from '@physics/COLLISION_GROUPS';
import { MATERIALS, withMaterial } from '@physics/MATERIALS';
import { tableCuboid, polylineSegments } from '@physics/shapes';
import { kickBall } from '@physics/kickBall';
import { dot } from '@math';

// Inlane/outlane dividers and their top posts, outlane deflectors, and slingshots, on both sides.
export const LowerPlayfield = (physics) => {
  const { world, RAPIER, table, collisionEvents, power, ball } = physics;
  const {
    wallHeight,
    guideThickness,
    slingshotThickness,
    postRadius,
    slingshot: { kickSpeed, minTriggerSpeed, speedVariation, angleVariation } } = LOWER_PLAYFIELD_CONFIG;

  const addWall = (points, thickness, material) =>
    polylineSegments({ points, thickness, height: wallHeight })
      .map(segment => tableCuboid(physics, { ...segment, material }));

  const addPost = ([x, z]) => {
    const colliderDesc = RAPIER.ColliderDesc.cylinder(wallHeight / 2, postRadius)
      .setTranslation(x, wallHeight / 2, z)
      .setCollisionGroups(COLLISION_GROUPS.table);
    return world.createCollider(withMaterial(RAPIER, colliderDesc, MATERIALS.rubber), table.body);
  }

  const sides = ['left', 'right'].map(side => {
    const { divider, dividerPost, outlaneDeflector, slingshot } = LOWER_PLAYFIELD_CONFIG.layout(side);
    const { top, bottomOuter, bottomInner } = slingshot;

    const dividerColliders = addWall(divider, guideThickness, MATERIALS.guide);
    const post = addPost(dividerPost);
    const deflector = addWall(outlaneDeflector, guideThickness, MATERIALS.rubber);
    const slingshotBody = addWall([top, bottomOuter, bottomInner], slingshotThickness, MATERIALS.rubber);
    const [kicker] = addWall([top, bottomInner], slingshotThickness, MATERIALS.rubber);

    // Kicker face normal in the table plane, pointing away from the slingshot's inside.
    const faceX = bottomInner[0] - top[0];
    const faceZ = bottomInner[1] - top[1];
    const faceLength = Math.hypot(faceX, faceZ);
    let normal = { x: faceZ / faceLength, y: 0, z: -faceX / faceLength };
    const towardInside = (bottomOuter[0] - top[0]) * normal.x + (bottomOuter[1] - top[1]) * normal.z;
    if (towardInside > 0) normal = { x: -normal.x, y: 0, z: -normal.z };
    const faceNormal = table.directionToWorld(normal);

    collisionEvents.onCollisionStart(kicker, () => {
      if (power.isOn === false) return;
      const approachSpeed = -dot(ball.getVelocityBeforeStep(), faceNormal);
      if (approachSpeed < minTriggerSpeed) return;
      const angle = (Math.random() * 2 - 1) * angleVariation;
      const direction = table.directionToWorld({
        x: normal.x * Math.cos(angle) + normal.z * Math.sin(angle),
        y: 0,
        z: normal.z * Math.cos(angle) - normal.x * Math.sin(angle)
      });
      kickBall(ball, direction, kickSpeed * (1 + (Math.random() * 2 - 1) * speedVariation));
    });

    return { side, dividerColliders, post, deflector, slingshotBody, kicker };
  });

  return { sides };
}
