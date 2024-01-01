import { DrainTrigger } from '@cannon/triggers/DrainTrigger';

const PXREvent = new EventTarget();
const DRAIN_EVENT = new Event('DRAIN_EVENT');

const InitTriggers = ({ 
  cannon,
  placement
}) => {
  const drainTrigger = new DrainTrigger({ world: cannon.world, placement });
  drainTrigger.addCollideDispatch(() => PXREvent.dispatchEvent(DRAIN_EVENT));
  PXREvent.addEventListener('DRAIN_EVENT', () => {
    cannon.shooterLane.onOpen();
    setTimeout(cannon.ball.spawn, 1000);
    setTimeout(cannon.shooterLane.onClose, 4000);
  });

  return {
    drainTrigger
  }
}

export default InitTriggers;