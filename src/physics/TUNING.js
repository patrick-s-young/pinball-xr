// Every runtime tuning value in one place. Table geometry and Visual Pinball's own settings come
// from the table definition (tools/vpx-import.js); these decide how the runtime behaves and how
// Visual Pinball's settings map onto it.
export const TUNING = {
  simulation: {
    // Fixed step. At 1/60 a 4 m/s ball moves more than twice its diameter per step.
    timeStep: 1 / 240,
    // Longest frame the loop catches up on; slower frames run in slow motion instead.
    maxFrameTime: 1 / 15,
    solverIterations: 8,
    // Typical object size in metres. Rapier scales its contact tolerances by this.
    lengthUnit: 0.05
  },

  ball: {
    mass: 0.08,
    // Rolling resistance of a steel ball on the playfield. Rapier does not model it, and without
    // it a ball rocks in a flipper cradle or rolls along flat stretches indefinitely.
    rollingResistance: 0.01
  },

  flipper: {
    // A Visual Pinball flipper of this strength and mass gets the mass and coil torque below;
    // other flippers scale from it. Return strength and end-of-stroke torque are fractions of
    // the coil torque, as in Visual Pinball.
    referenceStrength: 2600,
    referenceMass: 0.7,
    // Effective mass (kg) of the bat, shaft and linkage the ball pushes against.
    mass: 0.2,
    // N·m about the pivot.
    coilTorque: 0.52
  },

  plunger: {
    // Launch speed (m/s) at no pull and full pull, for a Visual Pinball plunger of strength 100.
    minLaunchSpeed: 0.5,
    maxLaunchSpeed: 5.5,
    referenceStrength: 100,
    // Seconds of holding to reach full pull.
    fullPullTime: 1.0,
    // The ball only launches when resting at the plunger: this close (m) to where it was served
    // and slower than this (m/s).
    readyDistance: 0.01,
    readySpeed: 0.2,
    // Visual-only rod behind the ball, and how far it retracts at full pull.
    rodSize: [0.012, 0.012, 0.06],
    pullDistance: 0.04
  },

  slingshot: {
    // A Visual Pinball slingshot of this force kicks at kickSpeed (m/s); others scale from it.
    referenceForce: 40,
    kickSpeed: 1.6,
    // The kicker fires only when the ball moves into its face faster than this (m/s).
    minTriggerSpeed: 0.15,
    // Random variation in each kick, from coil strength and where the rubber is struck. Without
    // it the kick is perfectly repeatable and the ball can settle into an endless bounce loop.
    speedVariation: 0.1,
    angleVariation: Math.PI / 36
  },

  nudge: {
    // A shove moves the cabinet this far (m) and springs back over this many seconds.
    distance: 0.015,
    duration: 0.1,
    // Plumb-bob tilt: each nudge adds to the bob's swing, which halves every swingHalfLife
    // seconds. While the swing is at or above contactThreshold the bob strikes the tilt ring once
    // per half swing. The first warningsAllowed strikes are warnings; the next tilts the machine.
    swingPerNudge: 1,
    swingHalfLife: 1.0,
    contactThreshold: 1.8,
    swingPeriod: 0.7,
    warningsAllowed: 2
  }
}
