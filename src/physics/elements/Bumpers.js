import { TUNING } from '../TUNING';
import { COLLISION_GROUPS } from '../COLLISION_GROUPS';
import { withMaterial } from '../colliders';
import { dot } from '@math';

// Pop bumpers: a solid cylinder each. As in Visual Pinball, a ball that hits one faster than its
// threshold bounces off and then gets the bumper's kick added to its speed, straight out from the
// centre (turned by up to the bumper's scatter).
export const Bumpers = (physics, bumpers) => {
  const { world, RAPIER, table, ball, power, collisionEvents, colliderInfo, emit } = physics;
  const { friction, restitution } = TUNING.bumper;

  return bumpers.map(({ name, center: [x, z], radius, height, kickSpeed, threshold, scatter }) => {
    const colliderDesc = RAPIER.ColliderDesc.cylinder(height / 2, radius)
      .setTranslation(x, height / 2, z)
      .setCollisionGroups(COLLISION_GROUPS.table);
    const collider = world.createCollider(withMaterial(RAPIER, colliderDesc, { friction, restitution }), table.body);
    colliderInfo.set(collider.handle, { kind: 'bumper', name });

    collisionEvents.onCollisionStart(collider, () => {
      if (power.isOn === false) return;
      // Out from the centre, in the playfield plane.
      const local = table.toLocal(ball.body.translation());
      const angle = Math.atan2(local.z - z, local.x - x) + (Math.random() * 2 - 1) * scatter;
      const out = table.directionToWorld({ x: Math.cos(angle), y: 0, z: Math.sin(angle) });
      if (-dot(ball.getVelocityBeforeStep(), out) < threshold) return;
      // Called after the step, so the ball has already bounced off.
      const velocity = ball.body.linvel();
      ball.body.setLinvel({
        x: velocity.x + out.x * kickSpeed,
        y: velocity.y + out.y * kickSpeed,
        z: velocity.z + out.z * kickSpeed
      }, true);
      emit('bumper', { name, position: ball.body.translation() });
    });

    return { name, collider };
  });
}
