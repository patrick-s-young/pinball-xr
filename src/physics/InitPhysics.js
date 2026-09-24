import { WORLD, HEIGHT_ABOVE_FLOOR } from '@src/App.config';
import { PHYSICS } from './PHYSICS.config';
import { initRapier } from './initRapier';
import { FixedStepLoop } from './FixedStepLoop';
import { CollisionEvents } from './CollisionEvents';
import { Table } from './Table';
import {
  Ball,
  Bumper,
  Flipper,
  LowerPlayfield,
  Playfield,
  Plunger,
  ShooterLane } from '@physics/bodies';

// Builds the Rapier world and table at the chosen placement. Shared by the WebXR and
// emulation apps so both run the same simulation at the same fixed rate.
const InitPhysics = async ({
  placement = [0, HEIGHT_ABOVE_FLOOR, 0]
}) => {
  const RAPIER = await initRapier();
  const world = new RAPIER.World(WORLD.gravity);
  world.timestep = PHYSICS.timeStep;
  world.integrationParameters.numSolverIterations = PHYSICS.solverIterations;
  world.integrationParameters.lengthUnit = PHYSICS.lengthUnit;

  const collisionEvents = CollisionEvents({ RAPIER });
  const table = Table({ world, RAPIER, placement });
  const context = { world, RAPIER, table, collisionEvents };

  const playfield = Playfield(context);
  const ball = Ball(context);
  const shooterLane = ShooterLane({ ...context, ball });
  const plunger = Plunger({ ...context, ball, shooterLane });
  const bumpers = Bumper({ ...context, ball });
  const lowerPlayfield = LowerPlayfield({ ...context, ball });
  const leftFlipper = Flipper({ ...context, side: 'left' });
  const rightFlipper = Flipper({ ...context, side: 'right' });

  // The first ball starts at rest against the plunger.
  plunger.serveBall();

  const loop = FixedStepLoop({
    timeStep: PHYSICS.timeStep,
    maxFrameTime: PHYSICS.maxFrameTime,
    step: (dt) => {
      ball.beforeStep(dt);
      plunger.update(dt);
      leftFlipper.update(dt);
      rightFlipper.update(dt);
      world.step(collisionEvents.eventQueue);
      collisionEvents.dispatch();
      shooterLane.update();
    }
  });

  return {
    ...context,
    playfield,
    shooterLane,
    plunger,
    bumpers,
    lowerPlayfield,
    ball,
    leftFlipper,
    rightFlipper,
    // Call once per rendered frame with the frame's elapsed seconds.
    update: loop.update
  }
}

export default InitPhysics;
