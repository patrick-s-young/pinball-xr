// Advances the simulation in fixed steps regardless of the display refresh rate,
// so desktop emulation (60 Hz) and headsets (72-120 Hz) behave identically.
export const FixedStepLoop = ({ timeStep, maxFrameTime, step }) => {
  let accumulator = 0;

  const update = (frameTime) => {
    accumulator += Math.min(frameTime, maxFrameTime);
    while (accumulator >= timeStep) {
      step(timeStep);
      accumulator -= timeStep;
    }
  }

  return { update };
}
