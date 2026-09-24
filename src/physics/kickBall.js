import { dot } from '@math';

// Raises the ball's speed along a world-space unit direction to at least minSpeed,
// keeping the rest of its motion. Used by bumpers and slingshots.
export const kickBall = (ball, direction, minSpeed) => {
  const velocity = ball.body.linvel();
  const outwardSpeed = dot(velocity, direction);
  if (outwardSpeed >= minSpeed) return;
  const boost = minSpeed - outwardSpeed;
  ball.body.setLinvel({
    x: velocity.x + direction.x * boost,
    y: velocity.y + direction.y * boost,
    z: velocity.z + direction.z * boost
  }, true);
}
