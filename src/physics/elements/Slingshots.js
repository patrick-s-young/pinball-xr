import { TUNING } from '../TUNING';
import { COLLISION_GROUPS } from '../COLLISION_GROUPS';
import { segmentCuboid } from '../colliders';
import { kickBall } from '../kickBall';
import { dot } from '@math';

// Depth of the sensor in front of a kicking face that detects the ball.
const SENSOR_DEPTH = 0.008;

// A slingshot's kicking face: a thin sensor just in front of it. It fires only when the ball moves
// into the face faster than minTriggerSpeed, and each kick varies slightly in speed and
// direction, as on a real table.
export const Slingshots = (physics, slingshots) => {
  const { table, ball, power, collisionEvents } = physics;
  const { referenceForce, kickSpeed, minTriggerSpeed, speedVariation, angleVariation } = TUNING.slingshot;

  return slingshots.map(({ name, segment: [x1, z1, x2, z2], normal: [normalX, normalZ], force }) => {
    const shift = SENSOR_DEPTH / 2;
    const sensor = segmentCuboid(physics,
      [x1 + normalX * shift, z1 + normalZ * shift, x2 + normalX * shift, z2 + normalZ * shift],
      { thickness: SENSOR_DEPTH, height: 2 * ball.radius, collisionGroups: COLLISION_GROUPS.trigger });
    sensor.setSensor(true);

    const faceNormal = table.directionToWorld({ x: normalX, y: 0, z: normalZ });
    const speed = kickSpeed * force / referenceForce;
    collisionEvents.onCollisionStart(sensor, () => {
      if (power.isOn === false) return;
      if (-dot(ball.getVelocityBeforeStep(), faceNormal) < minTriggerSpeed) return;
      const angle = (Math.random() * 2 - 1) * angleVariation;
      const direction = table.directionToWorld({
        x: normalX * Math.cos(angle) + normalZ * Math.sin(angle),
        y: 0,
        z: normalZ * Math.cos(angle) - normalX * Math.sin(angle)
      });
      kickBall(ball, direction, speed * (1 + (Math.random() * 2 - 1) * speedVariation));
    });

    return { name, sensor };
  });
}
