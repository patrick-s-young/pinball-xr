export const PHYSICS = {
  // Fixed simulation step. At 1/60 a 4 m/s ball moves more than twice its diameter per step.
  timeStep: 1 / 240,
  // Longest frame the loop will catch up on. Slower frames run in slow motion instead of
  // spiralling into ever more physics steps.
  maxFrameTime: 1 / 15,
  solverIterations: 8,
  // Typical object size in metres. Rapier scales its contact tolerances by this; the default
  // of 1 m is far too loose for a 3 cm ball.
  lengthUnit: 0.05
}
