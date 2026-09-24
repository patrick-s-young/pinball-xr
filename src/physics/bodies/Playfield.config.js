import { PLAYFIELD, SCALER } from '@src/App.config';
import { arcSegments } from '@physics/shapes';

const { offsetX } = PLAYFIELD;
const WALL_HEIGHT = SCALER;
// Outer walls are thicker than the ball so a fast ball cannot pass through between steps.
// Each wall grows outward, so the inner faces stay where the original layout had them.
const WALL_THICKNESS = 0.06;
const FLOOR_THICKNESS = 0.02;
const INNER_FACE = {
  left: -5 * SCALER + offsetX,
  right: 5 * SCALER + offsetX,
  top: -10 * SCALER
}
const TABLE_LENGTH = 1.168;

export const PLAYFIELD_CONFIG = {
  cuboids: [
    {
      description: 'Floor (top face at y = 0)',
      size: [0.584, FLOOR_THICKNESS, TABLE_LENGTH],
      center: [offsetX, -FLOOR_THICKNESS / 2, 0]
    },
    {
      description: 'Glass',
      size: [0.6424, 0.0292, TABLE_LENGTH],
      center: [offsetX, 1.25 * SCALER, 0]
    },
    {
      description: 'Top wall',
      size: [0.584 + 2 * WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS],
      center: [offsetX, WALL_HEIGHT / 2, INNER_FACE.top - WALL_THICKNESS / 2]
    },
    {
      description: 'Left wall',
      size: [WALL_THICKNESS, WALL_HEIGHT, TABLE_LENGTH],
      center: [INNER_FACE.left - WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0]
    },
    {
      description: 'Right wall',
      size: [WALL_THICKNESS, WALL_HEIGHT, TABLE_LENGTH],
      center: [INNER_FACE.right + WALL_THICKNESS / 2, WALL_HEIGHT / 2, 0]
    }
  ],
  arcs: [
    {
      description: 'Orbit',
      segments: arcSegments({
        center: [offsetX, 0, -5 * SCALER],
        radius: 0.292,
        thetaStart: 0,
        thetaLength: -Math.PI,
        segments: 32,
        height: WALL_HEIGHT,
        thickness: WALL_HEIGHT,
        side: 'outside'
      })
    }
  ]
}
