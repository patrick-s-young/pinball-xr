// Buttons of a standard-mapping gamepad (Xbox / PlayStation layout): bumpers or triggers for the
// flippers, A (cross) for the plunger, and the d-pad to nudge.
const STANDARD_BUTTONS = [
  [4, 'leftFlipper'], [6, 'leftFlipper'],
  [5, 'rightFlipper'], [7, 'rightFlipper'],
  [0, 'plunger'],
  [14, 'nudgeLeft'], [15, 'nudgeRight'], [12, 'nudgeFront']
];

// Buttons of WebXR controllers (xr-standard mapping), by hand: triggers for the flippers, the
// right grip for the plunger, and the left grip to nudge.
const XR_BUTTONS = {
  left: [[0, 'leftFlipper'], [1, 'nudgeFront']],
  right: [[0, 'rightFlipper'], [1, 'plunger']]
};

// Gamepads have no events for buttons, so poll once per frame, before the physics update.
export const Gamepads = (controls) => {
  const read = (source, action, isPressed) => {
    if (isPressed) controls.press(action, source);
    else controls.release(action, source);
  }

  // xrInputSources: the WebXR session's input sources, when in a session.
  const poll = (xrInputSources = []) => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gamepad of gamepads) {
      if (!gamepad || gamepad.mapping !== 'standard') continue;
      STANDARD_BUTTONS.forEach(([button, action]) =>
        read(`gamepad${gamepad.index}:${button}`, action, Boolean(gamepad.buttons[button]?.pressed)));
    }
    for (const inputSource of xrInputSources) {
      const buttons = XR_BUTTONS[inputSource.handedness];
      if (!inputSource.gamepad || !buttons) continue;
      buttons.forEach(([button, action]) =>
        read(`xr-${inputSource.handedness}:${button}`, action, Boolean(inputSource.gamepad.buttons[button]?.pressed)));
    }
  }

  return { poll };
}
