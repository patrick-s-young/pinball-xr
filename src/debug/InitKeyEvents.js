import KeyEvents from './KeyEvents';

const InitKeyEvents = ({
  leftFlipper,
  rightFlipper,
  plunger,
  nudge
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
  [['KeyZ', 'left'], ['Period', 'right'], ['KeyB', 'front']].forEach(([keyName, side]) => {
    keyEvents.addSubscriber({
      keyName,
      keyAction: 'keydown',
      callBack: () => nudge.nudge(side)
      });
  });

  return {
    keyEvents
  }
}

export default InitKeyEvents;