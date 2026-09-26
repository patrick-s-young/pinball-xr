import { TUNING } from '../TUNING';
import { COLLISION_GROUPS } from '../COLLISION_GROUPS';
import { tableCuboid } from '../colliders';

const STOP_DEPTH = 0.004;

// Spring plunger at the bottom of the shooter lane. The ball rests against a stop at the plunger
// tip. Holding the plunger builds pull over fullPullTime; releasing launches a ball that is
// resting at the plunger, faster the further it was pulled.
export const Plunger = (physics, { tip: [tipX, tipZ], width, strength }, playfieldMaterial) => {
  const { world, RAPIER, table, ball } = physics;
  const {
    minLaunchSpeed,
    maxLaunchSpeed,
    referenceStrength,
    fullPullTime,
    readyDistance,
    readySpeed,
    rodSize: [rodX, rodY, rodZ],
    pullDistance } = TUNING.plunger;
  const strengthScale = strength / referenceStrength;

  tableCuboid(physics, {
    size: [width, 2 * ball.radius, STOP_DEPTH],
    center: [tipX, ball.radius, tipZ + STOP_DEPTH / 2],
    material: playfieldMaterial
  });

  // Visual-only rod behind the tip, drawn by the physics debug renderer.
  const rodRest = { x: tipX, y: ball.radius, z: tipZ + rodZ / 2 };
  const rodPositionAt = (amount) => table.toWorld({ ...rodRest, z: rodRest.z + amount * pullDistance });
  const rodStart = rodPositionAt(0);
  const rod = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(rodStart.x, rodStart.y, rodStart.z)
      .setRotation(table.rotationToWorld({ x: 0, y: 0, z: 0, w: 1 }))
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(rodX / 2, rodY / 2, rodZ / 2).setCollisionGroups(COLLISION_GROUPS.visualOnly),
    rod
  );

  let isPulling = false;
  // 0 at rest, 1 at full pull.
  let pullAmount = 0;
  const launchDirection = table.directionToWorld({ x: 0, y: 0, z: -1 });

  const getLaunchSpeed = (amount) => (minLaunchSpeed + (maxLaunchSpeed - minLaunchSpeed) * amount) * strengthScale;

  const isBallReady = () => {
    if (ball.body.isEnabled() === false) return false;
    const position = ball.body.translation();
    const velocity = ball.body.linvel();
    const distance = Math.hypot(
      position.x - ball.spawnPoint.x,
      position.y - ball.spawnPoint.y,
      position.z - ball.spawnPoint.z);
    return distance < readyDistance && Math.hypot(velocity.x, velocity.y, velocity.z) < readySpeed;
  }

  const pull = () => { isPulling = true; }

  const release = () => {
    if (isPulling === false) return;
    isPulling = false;
    if (isBallReady()) {
      const speed = getLaunchSpeed(pullAmount);
      ball.body.setLinvel({
        x: launchDirection.x * speed,
        y: launchDirection.y * speed,
        z: launchDirection.z * speed
      }, true);
    }
    pullAmount = 0;
  }

  // Called once per physics step.
  const update = (dt) => {
    if (isPulling) pullAmount = Math.min(1, pullAmount + dt / fullPullTime);
    rod.setNextKinematicTranslation(rodPositionAt(pullAmount));
  }

  return {
    pull,
    release,
    update,
    getLaunchSpeed,
    get pullAmount() { return pullAmount }
  }
}
