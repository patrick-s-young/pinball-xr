import * as CANNON from 'cannon-es';
import { SHOOTER_LANE_CONFIGS } from './config';

export function ShooterLane ({ world }) {
  // BIND OBJECT FUNCTIONS
  this.onOpen = this.onOpen.bind(this);
  this.onClose = this.onClose.bind(this);
  // SHOOTER LANE BODY
  this.shooterLaneBody = new CANNON.Body({
    mass: 0, 
    material: SHOOTER_LANE_CONFIGS.playFieldMaterial ,
    position: new CANNON.Vec3(0, 0, 0),
    collisionFilterGroup: SHOOTER_LANE_CONFIGS.collisionGroup
  });
  // SHOOTER LANE SHAPES
  const { shapes } = SHOOTER_LANE_CONFIGS;
  const { shooterLaneOpen, shooterLaneClosed, shooterLaneBottom } = shapes;
  this.lane = {
    open: {
      shape: shooterLaneOpen.shape,
      offset: shooterLaneOpen.offset
    },
    closed: {
      shape: shooterLaneClosed.shape,
      offset: shooterLaneClosed.offset
    }
  }
  this.shooterLaneBody.addShape(shooterLaneBottom.shape, shooterLaneBottom.offset);

  // TILT OF PLAYFIELD
  this.shooterLaneBody.quaternion.copy(SHOOTER_LANE_CONFIGS.quaternionPlayfieldSlope);
  world.addBody(this.shooterLaneBody);
  this.onOpen();
}

ShooterLane.prototype.onClose = function () {
  this.shooterLaneBody.removeShape(this.lane.open.shape);
  this.shooterLaneBody.addShape(this.lane.closed.shape, this.lane.closed.offset);
}

ShooterLane.prototype.onOpen = function () {
  this.shooterLaneBody.removeShape(this.lane.closed.shape);
  this.shooterLaneBody.addShape(this.lane.open.shape, this.lane.open.offset);
}