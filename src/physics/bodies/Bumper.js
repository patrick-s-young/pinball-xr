import { BUMPER_CONFIG } from './Bumper.config';
import { COLLISION_GROUPS } from '@physics/COLLISION_GROUPS';
import { MATERIALS, withMaterial } from '@physics/MATERIALS';
import { dot, normalize } from '@math';
import { kickBall } from '@physics/kickBall';

export const Bumper = ({ world, RAPIER, table, collisionEvents, power, ball }) => {
  const { radius, height, kickSpeed, locations } = BUMPER_CONFIG;
  const bumpers = {};

  locations.forEach(({ bumperName, center }) => {
    const colliderDesc = RAPIER.ColliderDesc.cylinder(height / 2, radius)
      .setTranslation(center.x, center.y, center.z)
      .setCollisionGroups(COLLISION_GROUPS.table);
    const collider = world.createCollider(withMaterial(RAPIER, colliderDesc, MATERIALS.bumper), table.body);
    const worldCenter = table.toWorld(center);

    collisionEvents.onCollisionStart(collider, () => { if (power.isOn) kick(worldCenter); });
    bumpers[bumperName] = collider;
  });

  // Pushes the ball away from the bumper centre, within the playfield plane, so it leaves at
  // kickSpeed or faster. Its speed along the bumper edge is kept.
  function kick (bumperCenter) {
    const position = ball.body.translation();
    const offset = {
      x: position.x - bumperCenter.x,
      y: position.y - bumperCenter.y,
      z: position.z - bumperCenter.z
    };
    const normalOffset = dot(offset, table.normal);
    const direction = normalize({
      x: offset.x - table.normal.x * normalOffset,
      y: offset.y - table.normal.y * normalOffset,
      z: offset.z - table.normal.z * normalOffset
    });
    kickBall(ball, direction, kickSpeed);
  }

  return bumpers;
}
