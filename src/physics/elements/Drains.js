import { COLLISION_GROUPS } from '../COLLISION_GROUPS';

// Sensors at the table's drain kickers. The ball drains once its centre is well inside one.
export const Drains = ({ world, RAPIER, table, ball, collisionEvents }, drains, onDrain) =>
  drains.map(({ name, center: [x, z], radius }) => {
    const colliderDesc = RAPIER.ColliderDesc.cylinder(ball.radius, radius / 2)
      .setTranslation(x, ball.radius, z)
      .setCollisionGroups(COLLISION_GROUPS.trigger)
      .setSensor(true);
    const sensor = world.createCollider(colliderDesc, table.body);
    collisionEvents.onCollisionStart(sensor, onDrain);
    return { name, sensor };
  });
