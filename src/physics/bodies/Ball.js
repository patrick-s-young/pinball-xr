import { BALL_CONFIG } from './Ball.config';
import { COLLISION_GROUPS } from '@physics/COLLISION_GROUPS';
import { MATERIALS, withMaterial } from '@physics/MATERIALS';

export const Ball = ({ world, RAPIER, table }) => {
  const { mass, radius } = BALL_CONFIG;
  const spawnPoint = table.toWorld(BALL_CONFIG.spawnPosition);
  const launchVelocity = table.directionToWorld(BALL_CONFIG.launchVelocity);

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnPoint.x, spawnPoint.y, spawnPoint.z)
      // Continuous collision detection: sweeps the ball between steps so it cannot tunnel.
      .setCcdEnabled(true)
  );
  const colliderDesc = RAPIER.ColliderDesc.ball(radius)
    .setMass(mass)
    .setCollisionGroups(COLLISION_GROUPS.ball)
    .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
  const collider = world.createCollider(withMaterial(RAPIER, colliderDesc, MATERIALS.ball), body);

  const spawn = () => {
    body.setEnabled(true);
    body.setTranslation(spawnPoint, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setLinvel(launchVelocity, true);
  }

  // Removes the ball from the simulation until the next spawn.
  const disable = () => body.setEnabled(false);

  return {
    body,
    collider,
    radius,
    spawn,
    disable
  }
}
