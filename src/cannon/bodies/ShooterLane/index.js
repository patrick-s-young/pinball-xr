import * as CANNON from 'cannon-es';
import { SHOOTER_LANE_CONFIGS } from './config';
import { HEIGHT_ABOVE_FLOOR } from '../../../App.config';

export const ShooterLane = ({ 
  world,
  placement }) => {
  // SHOOTER LANE BODY
  const body = new CANNON.Body({
    mass: 0, 
    material: SHOOTER_LANE_CONFIGS.playFieldMaterial ,
    position: new CANNON.Vec3(...placement),
    collisionFilterGroup: SHOOTER_LANE_CONFIGS.collisionGroup
  });
  // SHOOTER LANE SHAPES
  const { shapes } = SHOOTER_LANE_CONFIGS;
  const { shooterLaneOpen, shooterLaneClosed, shooterLaneBottom } = shapes;
  const lane = {
    open: {
      shape: shooterLaneOpen.shape,
      offset: shooterLaneOpen.offset
    },
    closed: {
      shape: shooterLaneClosed.shape,
      offset: shooterLaneClosed.offset
    }
  }
  body.addShape(shooterLaneBottom.shape, shooterLaneBottom.offset);
  // TILT OF PLAYFIELD
  body.quaternion.copy(SHOOTER_LANE_CONFIGS.quaternionPlayfieldSlope);
  world.addBody(body);

  const onClose = () => {
    body.removeShape(lane.open.shape);
    body.addShape(lane.closed.shape, lane.closed.offset);
  }

  const onOpen = () => {
    body.removeShape(lane.closed.shape);
    body.addShape(lane.open.shape, lane.open.offset);
  }

  return {
    onOpen,
    onClose,
    body
  }
}