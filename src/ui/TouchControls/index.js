import './styles.css';

// On-screen buttons for the WebXR session: flippers and plunger along the bottom, nudges along
// the top. Each button drives a Controls action for as long as a finger is on it.
const BUTTONS = [
  { container: 'buttonContainer', className: 'flipperButton', action: 'leftFlipper' },
  { container: 'buttonContainer', className: 'plungerButton', action: 'plunger' },
  { container: 'buttonContainer', className: 'flipperButton', action: 'rightFlipper' },
  { container: 'nudgeContainer', className: 'nudgeButton', action: 'nudgeLeft', label: 'NUDGE L' },
  { container: 'nudgeContainer', className: 'nudgeButton', action: 'nudgeFront', label: 'NUDGE' },
  { container: 'nudgeContainer', className: 'nudgeButton', action: 'nudgeRight', label: 'NUDGE R' }
];

export const TouchControls = ({ uiParent, controls }) => {
  const containers = {};
  ['buttonContainer', 'nudgeContainer'].forEach(className => {
    containers[className] = document.createElement('div');
    containers[className].className = className;
    uiParent.appendChild(containers[className]);
  });

  BUTTONS.forEach(({ container, className, action, label }) => {
    const button = document.createElement('div');
    button.className = className;
    if (label) button.textContent = label;
    const source = (event) => `touch${event.pointerId}`;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      // Keeps receiving this finger's events even if it slides off the button.
      button.setPointerCapture(event.pointerId);
      controls.press(action, source(event));
    });
    const end = (event) => controls.release(action, source(event));
    button.addEventListener('pointerup', end);
    button.addEventListener('pointercancel', end);
    // Stops a long press opening the context menu or selecting text.
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.style.touchAction = 'none';
    containers[container].appendChild(button);
  });

  return { domElements: Object.values(containers) };
}
