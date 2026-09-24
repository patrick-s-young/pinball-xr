import { PLAYFIELD, SCALER } from '@src/App.config';

const HEIGHT = 0.0584;

export const BUMPER_CONFIG = {
  radius: 0.0438,
  height: HEIGHT,
  // Minimum speed (m/s) the ball leaves a bumper with, measured away from the bumper centre.
  kickSpeed: 1.2,
  // Table space centres.
  locations: [
    {
      bumperName: 'upper_left_bumper',
      center: { x: -2 * SCALER + PLAYFIELD.offsetX, y: HEIGHT / 2, z: -6 * SCALER }
    },
    {
      bumperName: 'upper_right_bumper',
      center: { x: 2 * SCALER + PLAYFIELD.offsetX, y: HEIGHT / 2, z: -6 * SCALER }
    },
    {
      bumperName: 'lower_center_bumper',
      center: { x: PLAYFIELD.offsetX, y: HEIGHT / 2, z: -4 * SCALER }
    }
  ]
}
