
export const initInputEventListeners = ({
  leftFlipper,
  rightFlipper }) => {
    const targetVelocity = 15;
    const onKeyDown = ({ code }) => {
      switch (code) {
        case 'KeyA':
          leftFlipper.motorEquation.targetVelocity = -targetVelocity;
          leftFlipper.motorEquation.enabled = true;
          break;
        case 'KeyL':
          rightFlipper.motorEquation.targetVelocity = targetVelocity;
          rightFlipper.motorEquation.enabled = true;
          break;
        default: console.log(`Warning: onKeyDown > no match found for code: ${code}`);
      }
    }
    document.addEventListener('keydown', onKeyDown);
     
    const onKeyUp = ({ code }) => {
      switch (code) {
        case 'KeyA':
          leftFlipper.motorEquation.targetVelocity = targetVelocity ;
          break;
        case 'KeyL':
          rightFlipper.motorEquation.targetVelocity = -targetVelocity;
          break;
        default: console.log(`Warning: onKeyDown > no match found for code: ${code}`);
      }
    }
    document.addEventListener('keyup', onKeyUp);
  }
