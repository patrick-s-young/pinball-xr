import { PLAYFIELD, SCALER } from '@src/App.config';

export const SHOOTER_LANE_CONFIG = {
  // Thin divider between the shooter lane and the playfield while a ball is being launched.
  open: {
    size: [0.01168, SCALER, 0.876],
    center: [4.3 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 2.5 * SCALER]
  },
  // Fills the lane once the ball is in play so it cannot roll back in.
  closed: {
    size: [0.03504, SCALER, 0.876],
    center: [4.7 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 2.5 * SCALER]
  },
  bottom: {
    size: [0.06424, SCALER, 0.0292],
    center: [4.95 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 10.25 * SCALER]
  }
}
