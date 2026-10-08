import { TUNING } from '../TUNING';
import { COLLISION_GROUPS } from '../COLLISION_GROUPS';
import { segmentCuboid } from '../colliders';

const TWO_PI = Math.PI * 2;
// Visual Pinball's damping is per 10 ms.
const DAMPING_PERIOD = 0.01;

// Spinners: the ball passes through the plate, as in Visual Pinball, and sets it spinning as if
// it pushed the plate at half the axle height. The spin slows by the spinner's damping, and a
// little gravity brings the plate to rest hanging down. Each full turn fires a `spinner` event.
// A sensor across the plate detects the ball.
export const Spinners = (physics, spinners) => {
  const { table, ball, collisionEvents, emit } = physics;
  const { sensorThickness, gravity } = TUNING.spinner;

  const built = spinners.map(({ name, center: [x, z], length, height, tangent: [tangentX, tangentZ], normal: [normalX, normalZ], damping, angleMin, angleMax, elasticity }) => {
    const half = length / 2;
    const sensor = segmentCuboid(physics,
      [x - tangentX * half, z - tangentZ * half, x + tangentX * half, z + tangentZ * half],
      { thickness: sensorThickness, height: 2 * ball.radius, collisionGroups: COLLISION_GROUPS.trigger });
    sensor.setSensor(true);
    const normal = table.directionToWorld({ x: normalX, y: 0, z: normalZ });
    const lever = height / 2;
    const hasStops = angleMin !== angleMax;
    // Angle 0 is hanging straight down; positive turns the bottom of the plate along `normal`.
    const state = { angle: 0, speed: 0, turns: 0 };

    collisionEvents.onCollisionStart(sensor, () => {
      const velocity = ball.getVelocityBeforeStep();
      const along = velocity.x * normal.x + velocity.y * normal.y + velocity.z * normal.z;
      state.speed = along / lever;
    });

    const update = (dt) => {
      state.speed -= Math.sin(state.angle) * gravity * dt;
      state.speed *= Math.pow(damping, dt / DAMPING_PERIOD);
      state.angle += state.speed * dt;
      if (hasStops && (state.angle < angleMin || state.angle > angleMax)) {
        state.angle = Math.min(angleMax, Math.max(angleMin, state.angle));
        state.speed = -state.speed * elasticity;
      }
      // A full turn either way.
      const turns = Math.floor(state.angle / TWO_PI + 0.5);
      if (turns !== state.turns) {
        state.turns = turns;
        emit('spinner', { name, position: table.toWorld({ x, y: height, z }) });
      }
    }

    return { name, sensor, update, getAngle: () => state.angle };
  });

  return {
    spinners: built,
    // Call once per physics step.
    update: (dt) => built.forEach(spinner => spinner.update(dt))
  };
}
