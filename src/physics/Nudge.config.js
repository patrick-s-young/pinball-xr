export const NUDGE_CONFIG = {
  // A shove moves the cabinet this far (m) and springs back over this many seconds.
  distance: 0.015,
  duration: 0.1,
  // Plumb-bob tilt mechanism. Each nudge adds to the bob's swing, which dies away over time.
  // While the swing is at or above the contact threshold, the bob strikes the tilt ring once per
  // half swing. The first warningsAllowed contacts are warnings, and the next one tilts the machine.
  // A single nudge stays under the threshold; two in quick succession reach it.
  swingPerNudge: 1,
  swingHalfLife: 1.0,
  contactThreshold: 1.8,
  // Seconds for one full swing of the bob.
  swingPeriod: 0.7,
  warningsAllowed: 2
}
