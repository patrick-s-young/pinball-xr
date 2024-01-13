
import './styles.css';

export const DirectionControls = ({ 
  uiParent,
  leftFlipper,
  rightFlipper }) => {
  const flipperActions = {
    LEFT: {
      up: () => leftFlipper.onFlipperUp(),
      down: () => leftFlipper.onFlipperDown()
    },
    RIGHT: {
      up: () => rightFlipper.onFlipperUp(),
      down: () => rightFlipper.onFlipperDown()
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
  buttonContainer.appendChild(leftFlipperButton);
  buttonContainer.appendChild(rightFlipperButton)
  preventLongPressMenu(leftFlipperButton);
  preventLongPressMenu(rightFlipperButton);


  const enableTouch = () => buttonContainer.addEventListener('touchend', onTouchEnd);

  const onTouchStart = (ev) => {
    const { id:flipperName } = ev.target;
    if (['RIGHT', 'LEFT'].includes(flipperName) === false) return;
    flipperActions[flipperName].up();
  }

  const onTouchEnd = (ev) => {
    const { id:flipperName } = ev.target;
    if (['RIGHT', 'LEFT'].includes(flipperName) === false) return;
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