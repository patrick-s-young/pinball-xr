import { DrainTrigger } from './DrainTrigger';

const PXREvent = new EventTarget();
const DRAIN_EVENT = new Event('DRAIN_EVENT');

const InitTriggers = ({ physics }) => {
  const drainTrigger = DrainTrigger(physics, {
    onDrain: () => PXREvent.dispatchEvent(DRAIN_EVENT)
  });
  PXREvent.addEventListener('DRAIN_EVENT', () => {
    physics.ball.disable();
    setTimeout(() => {
      // Each new ball starts with the tilt cleared and playfield power restored.
      physics.nudge.resetTilt();
      physics.plunger.serveBall();
    }, 1000);
  });

  return {
    drainTrigger
  }
}

export default InitTriggers;
