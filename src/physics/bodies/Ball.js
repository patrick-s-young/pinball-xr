import { BALL_CONFIG } from './Ball.config';
import { COLLISION_GROUPS } from '@physics/COLLISION_GROUPS';
import { MATERIALS, withMaterial } from '@physics/MATERIALS';
import { WORLD } from '@src/App.config';

// Contact tolerance for treating the ball as rolling on the playfield.
const ON_PLAYFIELD_TOLERANCE = 0.001;

export const Ball = ({ world, RAPIER, table }) => {
  const { mass, radius, rollingResistance } = BALL_CONFIG;
  const spawnPoint = table.toWorld(BALL_CONFIG.spawnPosition);
  const launchVelocity = table.directionToWorld(BALL_CONFIG.launchVelocity);
  const rollingDeceleration = rollingResistance * Math.abs(WORLD.gravity.y) * Math.abs(table.normal.y);

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

  let velocityBeforeStep = { x: 0, y: 0, z: 0 };

  // Called once per physics step, before world.step. Records the incoming velocity for
  // collision handlers and applies rolling resistance while the ball is on the playfield.
  const beforeStep = (dt) => {
    if (body.isEnabled() === false) return;
    const velocity = body.linvel();
    velocityBeforeStep = velocity;
    if (table.heightAbovePlayfield(body.translation()) > radius + ON_PLAYFIELD_TOLERANCE) return;
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    if (speed === 0) return;
    // Scale linear and angular velocity together so the ball keeps rolling without slipping.
    const scale = Math.max(0, 1 - rollingDeceleration * dt / speed);
    const spin = body.angvel();
    body.setLinvel({ x: velocity.x * scale, y: velocity.y * scale, z: velocity.z * scale }, true);
    body.setAngvel({ x: spin.x * scale, y: spin.y * scale, z: spin.z * scale }, true);
  }

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
    beforeStep,
    // The ball's velocity at the start of the current step, before any collision response.
    getVelocityBeforeStep: () => velocityBeforeStep,
    spawn,
    disable
  }
}
