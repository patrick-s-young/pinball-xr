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
import { Bumpers } from './elements/Bumpers';
import { Spinners } from './elements/Spinners';
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
  // What happens on the table, for sound and, later, scoring. See `events` below.
  const events = new EventTarget();
  const emit = (type, detail) => events.dispatchEvent(new CustomEvent(type, { detail }));
  // Collider handle -> { kind, name } for the things the ball can hit.
  const colliderInfo = new Map();

  const ball = Ball({ world, RAPIER, table }, {
    radius: ballDefinition.radius,
    // Resting against the plunger tip.
    servePosition: { x: plungerDefinition.tip[0], y: ballDefinition.radius, z: plungerDefinition.tip[1] - ballDefinition.radius - 0.0005 }
  });
  const physics = { world, RAPIER, table, collisionEvents, contactFilters, power, ball, emit, colliderInfo };
  const playfieldMaterial = { friction: playfield.friction, restitution: playfield.restitution };

  Playfield(physics, playfield);
  const walls = Walls(physics, definition.walls);
  const slingshots = Slingshots(physics, definition.slingshots);
  const gates = Gates(physics, definition.gates);
  const bumpers = Bumpers(physics, definition.bumpers || []);
  const spinners = Spinners(physics, definition.spinners || []);
  Drains(physics, definition.drains, () => emit('drain', { position: ball.body.translation() }));
  const plunger = Plunger(physics, plungerDefinition, playfieldMaterial);
  const flippers = definition.flippers.map(flipper => Flipper(physics, flipper));
  flippers.forEach(flipper => colliderInfo.set(flipper.collider.handle, { kind: 'flipper', name: flipper.name }));

  // Every time the ball touches something it can hit: what, and how fast the ball was moving.
  // `speed` is the ball's speed; `normalSpeed` is how fast it was moving into the playfield, for
  // landing after a jump.
  collisionEvents.onAnyCollisionStart((handle1, handle2) => {
    const info = colliderInfo.get(handle1 === ball.collider.handle ? handle2 : handle1);
    if (info === undefined) return;
    const velocity = ball.getVelocityBeforeStep();
    const normalSpeed = -(velocity.x * table.normal.x + velocity.y * table.normal.y + velocity.z * table.normal.z);
    emit('hit', { ...info, speed: Math.hypot(velocity.x, velocity.y, velocity.z), normalSpeed, position: ball.body.translation() });
  });
  const nudge = Nudge({ table, power });

  const loop = FixedStepLoop({
    timeStep,
    maxFrameTime,
    step: (dt) => {
      nudge.update(dt);
      ball.beforeStep(dt);
      plunger.update(dt);
      flippers.forEach(flipper => flipper.update(dt));
      spinners.update(dt);
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
    bumpers,
    spinners: spinners.spinners,
    plunger,
    nudge,
    flippers,
    leftFlipper: flipperGroup(flippers.filter(flipper => flipper.side === 'left')),
    rightFlipper: flipperGroup(flippers.filter(flipper => flipper.side === 'right')),
    // Table events, each a CustomEvent whose detail includes a world `position`:
    //   flipper { name, side, up }, slingshot { name }, bumper { name } (it fired),
    //   spinner { name } (a full turn), plunger { pulling, launched (on release) }, drain, serve,
    //   hit { kind: 'wall' | 'rubber' | 'flipper' | 'gate' | 'bumper' | 'floor', name, speed, normalSpeed }.
    events,
    // Puts a ball at rest against the plunger.
    serveBall: () => {
      ball.serve();
      emit('serve', { position: ball.spawnPoint });
    },
    // Registers a handler for the ball draining.
    onDrain: (handler) => events.addEventListener('drain', handler),
    // Call once per rendered frame with the frame's elapsed seconds.
    update: loop.update
  }
}
