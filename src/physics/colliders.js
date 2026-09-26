import { COLLISION_GROUPS } from './COLLISION_GROUPS';

// The ball uses the Min combine rule with coefficients of 1, and Min outranks the default
// Average rule, so every ball contact takes the friction and restitution of the surface it hits.
export const BALL_MATERIAL = { friction: 1, restitution: 1, combineRule: 'Min' };

export const withMaterial = (RAPIER, colliderDesc, { friction, restitution, combineRule }) => {
  colliderDesc.setFriction(friction).setRestitution(restitution);
  if (combineRule) {
    const rule = RAPIER.CoefficientCombineRule[combineRule];
    colliderDesc.setFrictionCombineRule(rule).setRestitutionCombineRule(rule);
  }
  return colliderDesc;
}

// Attaches a box to the table body. size and center are in table space.
export const tableCuboid = ({ world, RAPIER, table }, {
  size,
  center,
  material,
  collisionGroups = COLLISION_GROUPS.table
  }) => {
  const [sizeX, sizeY, sizeZ] = size;
  const [centerX, centerY, centerZ] = center;
  const colliderDesc = RAPIER.ColliderDesc.cuboid(sizeX / 2, sizeY / 2, sizeZ / 2)
    .setTranslation(centerX, centerY, centerZ)
    .setCollisionGroups(collisionGroups);
  if (material) withMaterial(RAPIER, colliderDesc, material);
  return world.createCollider(colliderDesc, table.body);
}

// A box along a table-space segment [x1, z1, x2, z2], centred on it, attached to the table body.
export const segmentCuboid = (physics, [x1, z1, x2, z2], { thickness, height, collisionGroups }) => {
  const { world, RAPIER, table } = physics;
  const dx = x2 - x1, dz = z2 - z1;
  const angle = -Math.atan2(dz, dx);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(Math.hypot(dx, dz) / 2, height / 2, thickness / 2)
    .setTranslation((x1 + x2) / 2, height / 2, (z1 + z2) / 2)
    // Local x runs along the segment.
    .setRotation({ x: 0, y: Math.sin(angle / 2), z: 0, w: Math.cos(angle / 2) })
    .setCollisionGroups(collisionGroups);
  return world.createCollider(colliderDesc, table.body);
}
