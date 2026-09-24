export const PLUNGER_CONFIG = {
  // Launch speed (m/s) at no pull and at full pull. The strength scales linearly between them.
  minLaunchSpeed: 0.5,
  maxLaunchSpeed: 5.5,
  // Seconds of holding to reach full pull.
  fullPullTime: 1.0,
  // The ball only launches if it is resting at the plunger: within this distance (m) of its
  // served position and slower than this speed (m/s).
  readyDistance: 0.01,
  readySpeed: 0.2,
  // Visual-only rod behind the ball, drawn by the physics debug renderer.
  rodSize: [0.012, 0.012, 0.06],
  // How far the rod retracts at full pull.
  pullDistance: 0.04
}
