import { SCALER } from '@src/App.config';

export const FLIPPER_CONFIG = {
  length: 4 * SCALER,
  height: 0.04672,
  baseDepth: 0.0292,
  // Tip depth as a fraction of baseDepth.
  tipDepthRatio: 0.1,
  // Table space pivot. The left flipper mirrors x.
  pivot: { x: 4 * SCALER, z: 7 * SCALER },
  // Rotation about the table's up axis. 0 points the flipper along +x.
  angles: {
    left: { down: -Math.PI / 6, up: Math.PI / 7 },
    right: { down: Math.PI + Math.PI / 6, up: Math.PI - Math.PI / 7 }
  },
  // rad/s. 18 rad/s gives a tip speed of about 4.2 m/s, close to the previous 4 m/s maxVelocity.
  upSpeed: 18,
  downSpeed: 10
}
