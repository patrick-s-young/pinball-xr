import { PLAYFIELD, SCALER } from '@src/App.config';

// Centre line of the lower playfield: halfway between the left wall and the shooter lane divider.
export const LOWER_PLAYFIELD_CENTER_X =
  (-5 * SCALER + (4.3 * SCALER - 0.01168 / 2)) / 2 + PLAYFIELD.offsetX;

export const FLIPPER_CONFIG = {
  // A tapered bat between a pivot-end circle and a tip circle, about 3" (76 mm) long like a real flipper.
  baseRadius: 0.012,
  tipRadius: 0.0065,
  // Pivot centre to tip centre.
  length: 0.064,
  height: 0.024,
  // Effective mass of the bat, shaft and linkage that the ball has to push against.
  mass: 0.2,
  // Table space pivot, relative to LOWER_PLAYFIELD_CENTER_X. The left flipper mirrors x.
  // This leaves a gap of about 50 mm between the resting tips.
  pivot: { x: 0.087, z: 0.47 },
  // Resting angle below horizontal, pointing toward the centre line.
  restAngle: Math.PI / 6,
  // Angle between the rest stop and the up stop.
  swing: Math.PI / 6 + Math.PI / 7,
  // Solenoid model, in N·m about the pivot. Full coil power drives the up stroke, then the
  // end-of-stroke switch drops to hold power, which a hard shot can push down a little.
  // The return spring acts at all times.
  coilTorque: 0.52,
  holdTorque: 0.12,
  returnTorque: 0.05,
  // Hold power takes over within this angle of the up stop.
  endOfStrokeAngle: Math.PI / 36
}
