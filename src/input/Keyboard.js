// Visual Pinball's default keys, by KeyboardEvent.code.
export const VP_KEYS = {
  ShiftLeft: 'leftFlipper',
  ShiftRight: 'rightFlipper',
  Enter: 'plunger',
  NumpadEnter: 'plunger',
  KeyZ: 'nudgeLeft',
  Slash: 'nudgeRight',
  Space: 'nudgeFront'
};

export const Keyboard = (controls, keys = VP_KEYS) => {
  const onKeyDown = (event) => {
    const action = keys[event.code];
    if (action === undefined) return;
    // Stops Space scrolling the page and / opening quick find.
    event.preventDefault();
    if (event.repeat === false) controls.press(action, event.code);
  }

  const onKeyUp = (event) => {
    const action = keys[event.code];
    if (action !== undefined) controls.release(action, event.code);
    // Windows can drop the key-up of the first Shift released while both are held; once no
    // Shift is down, release both.
    if (event.key === 'Shift' && event.shiftKey === false) {
      controls.releaseAll(source => source === 'ShiftLeft' || source === 'ShiftRight');
    }
  }

  // A key released while the page is not focused never reports it, so release everything.
  const onBlur = () => controls.releaseAll(source => source in keys);

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  return {
    dispose: () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    }
  }
}
