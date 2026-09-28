import { WORLD } from '@src/App.config';
import { TUNING } from './TUNING';
import { initRapier } from './initRapier';
import { FixedStepLoop } from './FixedStepLoop';
import { CollisionEvents } from './CollisionEvents';
import { ContactFilters } from './ContactFilters';
import { Table } from './Table';
import { Nudge } from './Nudge';
import { Playfield } from './elements/Playfield';
import { Walls } from './elements/Walls';
import { Slingshots } from './elements/Slingshots';
import { Gates } from './elements/Gates';
import { Drains } from './elements/Drains';
import { Ball } from './elements/Ball';
import { Flipper } from './elements/Flipper';
import { Plunger } from './elements/Plunger';

// Presents every flipper on one side as a single flipper, for the controls.
const flipperGroup = (flippers) => ({
  flippers,
  onFlipperUp: () => flippers.forEach(flipper => flipper.onFlipperUp()),
  onFlipperDown: () => flippers.forEach(flipper => flipper.onFlipperDown()),
  getStroke: () => flippers[0].getStroke()
});

// Builds the Rapier world for a table definition (see tools/vpx-import.js), placed with its
// playfield centre at `placement` in world space. Everything runs in fixed steps of
// TUNING.simulation.timeStep, so behaviour does not depend on the display's frame rate.
export const createPhysics = async ({ definition, placement }) => {
  const RAPIER = await initRapier();
  const { timeStep, maxFrameTime, solverIterations, lengthUnit } = TUNING.simulation;
  const world = new RAPIER.World(WORLD.gravity);
  world.timestep = timeStep;
  world.integrationParameters.numSolverIterations = solverIterations;
  world.integrationParameters.lengthUnit = lengthUnit;

  const { playfield, ball: ballDefinition, plunger: plungerDefinition } = definition;
  const table = Table({ world, RAPIER, placement, slopeRadians: playfield.slopeDegrees * Math.PI / 180 });
  const collisionEvents = CollisionEvents({ RAPIER });
  const contactFilters = ContactFilters({ RAPIER });
  // Playfield power for flippers and slingshots. A tilt switches it off.
  const power = { isOn: true };
  const drainEvents = new EventTarget();

  const ball = Ball({ world, RAPIER, table }, {
    radius: ballDefinition.radius,
    // Resting against the plunger tip.
    servePosition: { x: plungerDefinition.tip[0], y: ballDefinition.radius, z: plungerDefinition.tip[1] - ballDefinition.radius - 0.0005 }
  });
  const physics = { world, RAPIER, table, collisionEvents, contactFilters, power, ball };
  const playfieldMaterial = { friction: playfield.friction, restitution: playfield.restitution };

  Playfield(physics, playfield);
  const walls = Walls(physics, definition.walls);
  const slingshots = Slingshots(physics, definition.slingshots);
  const gates = Gates(physics, definition.gates);
  Drains(physics, definition.drains, () => drainEvents.dispatchEvent(new Event('drain')));
  const plunger = Plunger(physics, plungerDefinition, playfieldMaterial);
  const flippers = definition.flippers.map(flipper => Flipper(physics, flipper));
  const nudge = Nudge({ table, power });

  const loop = FixedStepLoop({
    timeStep,
    maxFrameTime,
    step: (dt) => {
      nudge.update(dt);
      ball.beforeStep(dt);
      plunger.update(dt);
      flippers.forEach(flipper => flipper.update(dt));
      gates.beforeStep();
      world.step(collisionEvents.eventQueue, contactFilters.hooks);
      collisionEvents.dispatch();
    }
  });

  return {
    ...physics,
    definition,
    walls,
    slingshots,
    gates: gates.gates,
    plunger,
    nudge,
    flippers,
    leftFlipper: flipperGroup(flippers.filter(flipper => flipper.side === 'left')),
    rightFlipper: flipperGroup(flippers.filter(flipper => flipper.side === 'right')),
    // Puts a ball at rest against the plunger.
    serveBall: () => ball.serve(),
    // Registers a handler for the ball draining.
    onDrain: (handler) => drainEvents.addEventListener('drain', handler),
    // Call once per rendered frame with the frame's elapsed seconds.
    update: loop.update
  }
}
