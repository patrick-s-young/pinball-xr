
import './styles.css';

export const DirectionControls = ({ 
  uiParent,
  leftFlipper,
  rightFlipper,
  plunger,
  nudge }) => {
  const flipperActions = {
    LEFT: {
      up: () => leftFlipper.onFlipperUp(),
      down: () => leftFlipper.onFlipperDown()
    },
    RIGHT: {
      up: () => rightFlipper.onFlipperUp(),
      down: () => rightFlipper.onFlipperDown()
    },
    PLUNGER: {
      up: () => plunger.pull(),
      down: () => plunger.release()
    }
  }
// Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'buttonContainer';
  uiParent.appendChild(buttonContainer);
  const leftFlipperButton = document.createElement('div');
  leftFlipperButton.className = 'flipperButton'
  leftFlipperButton.id = 'LEFT'
  leftFlipperButton.onpointerdown = (ev) => onTouchStart(ev)
  const rightFlipperButton = document.createElement('div');
  rightFlipperButton.className = 'flipperButton';
  rightFlipperButton.id = 'RIGHT'
  rightFlipperButton.onpointerdown = (ev) => onTouchStart(ev)
  const plungerButton = document.createElement('div');
  plungerButton.className = 'plungerButton';
  plungerButton.id = 'PLUNGER'
  plungerButton.onpointerdown = (ev) => onTouchStart(ev)
  buttonContainer.appendChild(leftFlipperButton);
  buttonContainer.appendChild(plungerButton);
  buttonContainer.appendChild(rightFlipperButton)
  preventLongPressMenu(leftFlipperButton);
  preventLongPressMenu(plungerButton);
  preventLongPressMenu(rightFlipperButton);


// Nudge buttons across the top: shove the cabinet from the left, the front, or the right.
  const nudgeContainer = document.createElement('div');
  nudgeContainer.className = 'nudgeContainer';
  uiParent.appendChild(nudgeContainer);
  [['left', 'NUDGE L'], ['front', 'NUDGE'], ['right', 'NUDGE R']].forEach(([side, label]) => {
    const nudgeButton = document.createElement('div');
    nudgeButton.className = 'nudgeButton';
    nudgeButton.textContent = label;
    nudgeButton.onpointerdown = () => nudge.nudge(side);
    preventLongPressMenu(nudgeButton);
    nudgeContainer.appendChild(nudgeButton);
  });

  const enableTouch = () => buttonContainer.addEventListener('touchend', onTouchEnd);

  const onTouchStart = (ev) => {
    const { id:flipperName } = ev.target;
    if (['RIGHT', 'LEFT', 'PLUNGER'].includes(flipperName) === false) return;
    flipperActions[flipperName].up();
  }

  const onTouchEnd = (ev) => {
    const { id:flipperName } = ev.target;
    if (['RIGHT', 'LEFT', 'PLUNGER'].includes(flipperName) === false) return;
    flipperActions[flipperName].down();
  }

  function absorbEvent_(event) {
    var e = event || window.event;
    e.preventDefault && e.preventDefault();
    e.stopPropagation && e.stopPropagation();
    e.cancelBubble = true;
    e.returnValue = false;
    return false;
  }

  function preventLongPressMenu(node) {
    node.ontouchstart = absorbEvent_;
    node.ontouchmove = absorbEvent_;
    node.ontouchcancel = absorbEvent_;
  }

  return {
    enableTouch,
    get domElement() { return buttonContainer }
  }
}