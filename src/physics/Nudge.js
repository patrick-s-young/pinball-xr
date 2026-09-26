import { NUDGE_CONFIG } from './Nudge.config';

// Direction the cabinet moves, in table space, for each side the player shoves from.
const NUDGE_DIRECTIONS = {
  left: { x: 1, y: 0, z: 0 },
  right: { x: -1, y: 0, z: 0 },
  front: { x: 0, y: 0, z: -1 }
};

// Nudging and tilt. A nudge physically shoves the table, so it only affects the ball through
// contact, as on a real machine. Too much nudging tilts the machine, which cuts playfield
// power (flippers, slingshots, bumpers) until the ball drains and the next one is served.
// Dispatches 'warning' (detail: warning number), 'tilt', and 'reset' events.
export const Nudge = ({ table, power }) => {
  const {
    distance,
    duration,
    swingPerNudge,
    swingHalfLife,
    contactThreshold,
    swingPeriod,
    warningsAllowed } = NUDGE_CONFIG;
  const events = new EventTarget();
  let shoves = [];
  let isDisplaced = false;
  let swing = 0;
  // Time since the bob last struck the ring.
  let sinceContact = Infinity;
  let contacts = 0;

  const nudge = (side) => {
    const direction = NUDGE_DIRECTIONS[side];
    if (direction === undefined) return;
    shoves.push({ direction, elapsed: 0 });
    swing += swingPerNudge;
  }

  const resetTilt = () => {
    swing = 0;
    sinceContact = Infinity;
    contacts = 0;
    power.isOn = true;
    events.dispatchEvent(new Event('reset'));
  }

  const updateTilt = (dt) => {
    swing *= Math.pow(0.5, dt / swingHalfLife);
    sinceContact += dt;
    if (swing < contactThreshold || sinceContact < swingPeriod / 2 || power.isOn === false) return;
    sinceContact = 0;
    contacts += 1;
    if (contacts <= warningsAllowed) {
      events.dispatchEvent(new CustomEvent('warning', { detail: contacts }));
    } else {
      power.isOn = false;
      events.dispatchEvent(new Event('tilt'));
    }
  }

  // Called once per physics step, before world.step.
  const update = (dt) => {
    updateTilt(dt);
    if (shoves.length === 0 && isDisplaced === false) return;
    const offset = { x: 0, y: 0, z: 0 };
    shoves.forEach(shove => {
      shove.elapsed += dt;
      // Out and back along a half sine.
      const amount = distance * Math.sin(Math.PI * Math.min(shove.elapsed / duration, 1));
      offset.x += shove.direction.x * amount;
      offset.z += shove.direction.z * amount;
    });
    shoves = shoves.filter(shove => shove.elapsed < duration);
    isDisplaced = shoves.length > 0;
    table.setOffset(isDisplaced ? offset : { x: 0, y: 0, z: 0 });
  }

  return {
    nudge,
    resetTilt,
    update,
    addEventListener: (type, listener) => events.addEventListener(type, listener),
    get isTilted() { return power.isOn === false }
  }
}
