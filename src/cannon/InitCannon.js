import * as CANNON from 'cannon-es';
// Bodies
import { 
  WedgeFlipper, 
  Ball, 
  Playfield, 
  Bumper, 
  ShooterLane } from '@cannon/bodies';
// Materials
import { initContactMaterials } from '@cannon/materials';

const InitCannon = () => {
  const world = new CANNON.World();
  world.gravity.set(0, -30, 0);
  world.broadphase = new CANNON.NaiveBroadphase();

  initContactMaterials({ world });

  const playfield = new Playfield({ world });
  const shooterLane = new ShooterLane({ world });
  const bumpers = Bumper({ world });
  const ball = new Ball({ world });
  const leftFlipper = new WedgeFlipper({ world, side: 'left', ballRef: ball.bodyRef() });
  const rightFlipper = new WedgeFlipper({ world, side: 'right', ballRef: ball.bodyRef() });

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