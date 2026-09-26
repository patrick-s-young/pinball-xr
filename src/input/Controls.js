// The actions every input device drives: keyboard, gamepads, WebXR controllers, and touch.
// Devices call press(action, source) and release(action, source), where source identifies the
// key or button. An action starts on the first press and ends when its last source is released,
// so holding a flipper on two devices and letting go of one keeps it up.
export const ACTIONS = ['leftFlipper', 'rightFlipper', 'plunger', 'nudgeLeft', 'nudgeRight', 'nudgeFront'];

export const Controls = (physics) => {
  const { leftFlipper, rightFlipper, plunger, nudge } = physics;
  const handlers = {
    leftFlipper: [leftFlipper.onFlipperUp, leftFlipper.onFlipperDown],
    rightFlipper: [rightFlipper.onFlipperUp, rightFlipper.onFlipperDown],
    plunger: [plunger.pull, plunger.release],
    nudgeLeft: [() => nudge.nudge('left'), null],
    nudgeRight: [() => nudge.nudge('right'), null],
    nudgeFront: [() => nudge.nudge('front'), null]
  };
  const holders = new Map(ACTIONS.map(action => [action, new Set()]));

  const press = (action, source) => {
    const sources = holders.get(action);
    if (sources === undefined || sources.has(source)) return;
    sources.add(source);
    if (sources.size === 1) handlers[action][0]();
  }

  const release = (action, source) => {
    const sources = holders.get(action);
    if (sources === undefined || sources.delete(source) === false) return;
    if (sources.size === 0) handlers[action][1]?.();
  }

  // Releases everything held by sources matching the test, e.g. when the window loses focus.
  const releaseAll = (test = () => true) => {
    holders.forEach((sources, action) => [...sources].filter(test).forEach(source => release(action, source)));
  }

  return { press, release, releaseAll };
}
