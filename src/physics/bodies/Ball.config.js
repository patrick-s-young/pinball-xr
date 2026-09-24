import { BALL, PLAYFIELD, SCALER } from '@src/App.config';

export const BALL_CONFIG = {
  ...BALL,
  // Table space: resting on the floor at the bottom of the shooter lane.
  spawnPosition: { x: 4.75 * SCALER + PLAYFIELD.offsetX, y: BALL.radius, z: 9.75 * SCALER },
  // Rolling resistance coefficient of a steel ball on the playfield. Rapier does not model it,
  // and without it a ball rocks in a flipper cradle or rolls along flat stretches indefinitely.
  rollingResistance: 0.01
}
