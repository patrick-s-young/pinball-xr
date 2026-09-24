import { PLAYFIELD, SCALER } from '@src/App.config';
import { COLLISION_GROUPS } from '@physics/COLLISION_GROUPS';
import { tableCuboid } from '@physics/shapes';

const LEFT_EDGE = -5 * SCALER + PLAYFIELD.offsetX;
// Stops at the shooter lane divider so a ball waiting in the lane never touches the sensor.
const RIGHT_EDGE = 4.3 * SCALER + PLAYFIELD.offsetX;
const FLOOR_END = 10 * SCALER;

// A sensor across the whole bottom of the table, just past the end of the floor.
// It catches the ball wherever it drops off, not only between the flippers.
const DRAIN_CONFIG = {
  size: [RIGHT_EDGE - LEFT_EDGE, 0.16, 0.08],
  center: [(LEFT_EDGE + RIGHT_EDGE) / 2, -0.03, FLOOR_END + 0.06]
}

export const DrainTrigger = (physics, { onDrain }) => {
  const collider = tableCuboid(physics, {
    ...DRAIN_CONFIG,
    collisionGroups: COLLISION_GROUPS.trigger
  });
  collider.setSensor(true);
  physics.collisionEvents.onCollisionStart(collider, onDrain);

  return { collider };
}
