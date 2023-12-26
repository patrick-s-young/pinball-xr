import KeyEvents from './KeyEvents';

const InitKeyEvents = ({
  leftFlipper,
  rightFlipper
}) => {
  const keyEvents = new KeyEvents();
    
  keyEvents.addSubscriber({ 
    keyName: 'KeyA', 
    keyAction: 'keydown', 
    callBack: leftFlipper.onFlipperUp
    });
  keyEvents.addSubscriber({ 
    keyName: 'KeyA', 
    keyAction: 'keyup', 
    callBack: leftFlipper.onFlipperDown
    });
  keyEvents.addSubscriber({
    keyName: 'KeyL',
    keyAction: 'keydown',
    callBack: rightFlipper.onFlipperUp
    });
  keyEvents.addSubscriber({
    keyName: 'KeyL',
    keyAction: 'keyup',
    callBack: rightFlipper.onFlipperDown
    });

  return {
    keyEvents
  }
}

export default InitKeyEvents;