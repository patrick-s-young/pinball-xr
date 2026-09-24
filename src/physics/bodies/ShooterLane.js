import { SHOOTER_LANE_CONFIG } from './ShooterLane.config';
import { MATERIALS } from '@physics/MATERIALS';
import { tableCuboid } from '@physics/shapes';

export const ShooterLane = (physics) => {
  const create = (config) => tableCuboid(physics, { ...config, material: MATERIALS.playfield });
  const bottom = create(SHOOTER_LANE_CONFIG.bottom);
  const open = create(SHOOTER_LANE_CONFIG.open);
  const closed = create(SHOOTER_LANE_CONFIG.closed);

  const onOpen = () => {
    closed.setEnabled(false);
    open.setEnabled(true);
  }

  const onClose = () => {
    open.setEnabled(false);
    closed.setEnabled(true);
  }

  return {
    onOpen,
    onClose,
    colliders: { bottom, open, closed }
  }
}
