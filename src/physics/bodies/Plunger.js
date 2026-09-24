import { PLUNGER_CONFIG } from './Plunger.config';
import { BALL_CONFIG } from './Ball.config';
import { COLLISION_GROUPS } from '@physics/COLLISION_GROUPS';

// Spring plunger at the bottom of the shooter lane. Holding it builds pull over fullPullTime;
// releasing launches a ball that is resting at the plunger, faster the further it was pulled.
export const Plunger = ({ world, RAPIER, table, ball, shooterLane }) => {
  const {
    minLaunchSpeed,
    maxLaunchSpeed,
    fullPullTime,
    readyDistance,
    readySpeed,
    rodSize,
    pullDistance } = PLUNGER_CONFIG;
  const { spawnPosition, radius } = BALL_CONFIG;
  const [rodX, rodY, rodZ] = rodSize;
  // Table space: the rod's tip touches the served ball.
  const rodRest = { x: spawnPosition.x, y: radius, z: spawnPosition.z + radius + rodZ / 2 };
  const rodPositionAt = (pullAmount) => table.toWorld({ ...rodRest, z: rodRest.z + pullAmount * pullDistance });

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

  const getLaunchSpeed = (amount) => minLaunchSpeed + (maxLaunchSpeed - minLaunchSpeed) * amount;

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

  // Opens the lane gate and puts a new ball at rest against the plunger.
  const serveBall = () => {
    shooterLane.openGate();
    ball.serve();
  }

  // Called once per physics step.
  const update = (dt) => {
    if (isPulling) pullAmount = Math.min(1, pullAmount + dt / fullPullTime);
    rod.setNextKinematicTranslation(rodPositionAt(pullAmount));
  }

  return {
    pull,
    release,
    serveBall,
    update,
    getLaunchSpeed,
    get pullAmount() { return pullAmount }
  }
}
