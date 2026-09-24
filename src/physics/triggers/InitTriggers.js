import { DrainTrigger } from './DrainTrigger';

const PXREvent = new EventTarget();
const DRAIN_EVENT = new Event('DRAIN_EVENT');

const InitTriggers = ({ physics }) => {
  const drainTrigger = DrainTrigger(physics, {
    onDrain: () => PXREvent.dispatchEvent(DRAIN_EVENT)
  });
  PXREvent.addEventListener('DRAIN_EVENT', () => {
    physics.ball.disable();
    setTimeout(physics.plunger.serveBall, 1000);
  });

  return {
    drainTrigger
  }
}

export default InitTriggers;
