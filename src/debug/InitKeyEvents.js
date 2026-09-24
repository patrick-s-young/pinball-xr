import KeyEvents from './KeyEvents';

const InitKeyEvents = ({
  leftFlipper,
  rightFlipper,
  plunger
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
  keyEvents.addSubscriber({
    keyName: 'Space',
    keyAction: 'keydown',
    callBack: plunger.pull
    });
  keyEvents.addSubscriber({
    keyName: 'Space',
    keyAction: 'keyup',
    callBack: plunger.release
    });

  return {
    keyEvents
  }
}

export default InitKeyEvents;