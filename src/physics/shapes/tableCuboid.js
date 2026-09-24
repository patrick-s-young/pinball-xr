import { COLLISION_GROUPS } from '../COLLISION_GROUPS';
import { withMaterial } from '../MATERIALS';

// Attaches a box collider to the table body. size and center are in table space.
export const tableCuboid = ({ world, RAPIER, table }, {
  size,
  center,
  rotation,
  material,
  collisionGroups = COLLISION_GROUPS.table
  }) => {
  const [sizeX, sizeY, sizeZ] = size;
  const [centerX, centerY, centerZ] = center;
  const colliderDesc = RAPIER.ColliderDesc.cuboid(sizeX / 2, sizeY / 2, sizeZ / 2)
    .setTranslation(centerX, centerY, centerZ)
    .setCollisionGroups(collisionGroups);
  if (rotation) colliderDesc.setRotation(rotation);
  if (material) withMaterial(RAPIER, colliderDesc, material);
  return world.createCollider(colliderDesc, table.body);
}
