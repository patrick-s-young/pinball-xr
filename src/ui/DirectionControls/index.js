import { buttonRows } from "./configs";
import './styles.css';

export const DirectionControls = ({ 
  uiParent, 
  setDirection,
  setClipAction,
  camera }) => {
// onTouchEnd delay before transition from 'Walk' to 'Idle'
  let timeoutId;

// Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'ButtonContainer';
  uiParent.appendChild(buttonContainer);
// Button layout
  const buttonLayout = document.createElement('div');
  buttonLayout.className='ButtonLayout'
  //Object.entries(buttonContainerStyles).forEach(([key, value]) => buttonContainer.style[key] = value);
  buttonContainer.appendChild(buttonLayout);

// Button rows
  buttonRows.forEach(items => {
    const rowContainer = document.createElement('div');
    items.forEach(item => rowContainer.appendChild(navButton({ label: item })))
    buttonLayout.appendChild(rowContainer);
  });

// Button
  function navButton ({ label }) {
    const button = document.createElement('div');
    button.className='DirectionButton';
    //Object.entries(buttonStyles).forEach(([key, value]) => button.style[key] = value);
    button.style.backgroundColor = label === 'spacer' ? undefined : 'orange';
    button.innerHTML = label === 'spacer' ? '&nbsp;' : `<img src='/images/arrow_${label}.png' />`;
    button.id = label;
    button.onpointerdown = label === 'spacer' ? undefined : (ev) => onTouchStart({ ev, label });
    preventLongPressMenu(button);
    return button;
  }

// Calculate up/right/down/left relative to device orientation
  function onMove ({ ev, label }) {
    const [x, y, z, w] = camera.quaternion.toArray();
    const angle = 2 * Math.acos(w);
    let s;
    if (1 - w * w < 0.000001) {
      s = 1;
    } else {
      s = Math.sqrt(1 - w * w);
    }
    const cameraYradians = y/s * angle;
    const yAngle = { 
      TOP: cameraYradians,
      RIGHT: cameraYradians - Math.PI/2,
      BOTTOM: cameraYradians + Math.PI,
      LEFT: cameraYradians + Math.PI/2
    }
    setDirection(yAngle[label] );
    setClipAction('Walk');
  }


  const enableTouch = () => buttonContainer.addEventListener('touchend', onTouchEnd);

  const onTouchStart = ({ ev, label }) => {
    if (['TOP', 'RIGHT', 'BOTTOM', 'LEFT'].includes(ev.target.parentNode.id) === false) return;
    ev.target.parentNode.style.backgroundColor = '#FFD580'; 
    clearTimeout(timeoutId);
    onMove({ ev, label });
  }

  const onTouchEnd = (ev) => {
    if (['TOP', 'RIGHT', 'BOTTOM', 'LEFT'].includes(ev.target.parentNode.id) === false) return;
    ev.target.parentNode.style.backgroundColor = 'orange'; 
    timeoutId = setTimeout(() => setClipAction('Idle'), 500);
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
    //node.ontouchend = absorbEvent_;
    node.ontouchcancel = absorbEvent_;
  }

  return {
    enableTouch,
    get domElement() { return buttonContainer }
  }
}