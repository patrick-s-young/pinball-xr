import { DrainTrigger } from './DrainTrigger';

const PXREvent = new EventTarget();
const DRAIN_EVENT = new Event('DRAIN_EVENT');

const InitTriggers = ({ physics }) => {
  const drainTrigger = DrainTrigger(physics, {
    onDrain: () => PXREvent.dispatchEvent(DRAIN_EVENT)
  });
  PXREvent.addEventListener('DRAIN_EVENT', () => {
    physics.ball.disable();
    physics.shooterLane.onOpen();
    setTimeout(physics.ball.spawn, 1000);
    setTimeout(physics.shooterLane.onClose, 4000);
  });

  return {
    drainTrigger
  }
}

export default InitTriggers;
