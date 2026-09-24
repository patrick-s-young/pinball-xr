import { BALL, PLAYFIELD, SCALER } from '@src/App.config';

const DIVIDER_CENTER_X = 4.3 * SCALER + PLAYFIELD.offsetX;
const DIVIDER_WIDTH = 0.01168;
const LANE_LENGTH = 0.876;
const LANE_CENTER_Z = 2.5 * SCALER;
const RIGHT_WALL_X = 5 * SCALER + PLAYFIELD.offsetX;
const LANE_TOP_Z = LANE_CENTER_Z - LANE_LENGTH / 2;
const GATE_THICKNESS = 0.008;
const GATE_OVERLAP = 0.004;
// How much further up the table the gate's right end sits than its left end. The slope rolls a
// ball that lands on the closed gate off its left end onto the playfield instead of parking it.
const GATE_RISE = 0.015;
const LANE_LEFT_X = DIVIDER_CENTER_X + DIVIDER_WIDTH / 2;

export const SHOOTER_LANE_CONFIG = {
  // Separates the shooter lane from the playfield.
  divider: {
    size: [DIVIDER_WIDTH, SCALER, LANE_LENGTH],
    center: [DIVIDER_CENTER_X, .5 * SCALER, LANE_CENTER_Z]
  },
  bottom: {
    size: [0.06424, SCALER, 0.0292],
    center: [4.95 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 10.25 * SCALER]
  },
  // One-way gate across the top of the lane, as table-space [x, z] end points. It closes once
  // the ball has gone through, so the ball cannot fall back into the lane from the playfield.
  gate: {
    points: [
      [LANE_LEFT_X - GATE_OVERLAP, LANE_TOP_Z - GATE_THICKNESS / 2],
      [RIGHT_WALL_X + GATE_OVERLAP, LANE_TOP_Z - GATE_THICKNESS / 2 - GATE_RISE]
    ],
    thickness: GATE_THICKNESS,
    height: SCALER
  },
  // The gate closes when the ball centre is past this table-space z, clear of the gate.
  gateCloseZ: LANE_TOP_Z - GATE_THICKNESS - GATE_RISE - BALL.radius - 0.002
}
