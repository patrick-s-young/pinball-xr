import * as CANNON from 'cannon-es';
import { WORLD } from '@src/App.config';
import { HEIGHT_ABOVE_FLOOR } from '../App.config';

// Bodies
import { 
  WedgeFlipper, 
  Ball, 
  Playfield, 
  Bumper, 
  ShooterLane } from '@cannon/bodies';
// Materials
import { initContactMaterials } from '@cannon/materials/initContactMaterials';

const InitCannon = ({ 
  world,
  placement = [0, HEIGHT_ABOVE_FLOOR, 0] 
}) => {
  world.gravity.set(...WORLD.gravity);
  world.broadphase = new CANNON.NaiveBroadphase();

  initContactMaterials({ world });

  const playfield = Playfield({ world, placement });
  const shooterLane = ShooterLane({ world, placement });
  const bumpers = Bumper({ world, placement });
  const ball = Ball({ world, placement });
  const leftFlipper = WedgeFlipper({ world, side: 'left', ballRef: ball.bodyRef(), placement });
  const rightFlipper = WedgeFlipper({ world, side: 'right', ballRef: ball.bodyRef(), placement });

  shooterLane.onOpen();

  return {
    world,
    playfield,
    shooterLane,
    bumpers,
    ball,
    leftFlipper,
    rightFlipper
  }
}

export default InitCannon;