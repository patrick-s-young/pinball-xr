import { SHOOTER_LANE_CONFIG } from './ShooterLane.config';
import { MATERIALS } from '@physics/MATERIALS';
import { tableCuboid, polylineSegments } from '@physics/shapes';

export const ShooterLane = (physics) => {
  const { table, ball } = physics;
  const create = (config) => tableCuboid(physics, { ...config, material: MATERIALS.playfield });
  const divider = create(SHOOTER_LANE_CONFIG.divider);
  const bottom = create(SHOOTER_LANE_CONFIG.bottom);
  const [gate] = polylineSegments(SHOOTER_LANE_CONFIG.gate).map(create);
  let isGateOpen = false;

  const openGate = () => {
    gate.setEnabled(false);
    isGateOpen = true;
  }

  const closeGate = () => {
    gate.setEnabled(true);
    isGateOpen = false;
  }

  // Called once per physics step. Closes the gate once the ball is fully through it. A weak
  // plunge that falls back down the lane never gets that far, so the gate stays open.
  const update = () => {
    if (isGateOpen === false || ball.body.isEnabled() === false) return;
    if (table.toLocal(ball.body.translation()).z < SHOOTER_LANE_CONFIG.gateCloseZ) closeGate();
  }

  return {
    openGate,
    closeGate,
    update,
    get isGateOpen() { return isGateOpen },
    colliders: { divider, bottom, gate }
  }
}
