import { createPhysics } from '@physics/createPhysics';
import { Controls } from '@src/input/Controls';
import { PhysicsDebugRenderer } from '@debug/PhysicsDebugRenderer';
import { StatusMessage, showTiltStatus } from '@ui/StatusMessage';
import { TableView } from '@src/view/TableView';
import { DEBUG } from '@src/App.config';

// Seconds between a drain and the next ball being served.
const SERVE_DELAY = 1;

// The physics wireframe is drawn when the table has no visuals, when DEBUG.showPhysics is set,
// or when the page URL has ?physics.
const wantsPhysicsWireframe = (definition) =>
  definition.visuals === undefined || DEBUG.showPhysics || new URLSearchParams(window.location.search).has('physics');

// One game on one table: the physics, the ball-serving cycle, tilt messages, and the view (the
// table's own visuals and/or the physics wireframe). Shared by the WebXR and desktop emulation
// apps, which add their own input devices to `controls` and call physicsUpdate and viewUpdate
// once per frame.
export const createGame = async ({ definition, placement, scene, renderer }) => {
  const physics = await createPhysics({ definition, placement });
  const controls = Controls(physics);

  physics.serveBall();
  physics.onDrain(() => {
    physics.ball.disable();
    setTimeout(() => {
      // Each new ball starts with the tilt cleared and playfield power restored.
      physics.nudge.resetTilt();
      physics.serveBall();
    }, SERVE_DELAY * 1000);
  });

  showTiltStatus(StatusMessage(), physics.nudge);

  const views = [];
  if (definition.visuals) {
    try {
      views.push(await TableView({ scene, renderer, physics }));
    } catch (error) {
      console.warn(`Could not load the table visuals (${definition.visuals.url}); showing the physics wireframe instead. Run the importer to export them.`, error);
    }
  }
  if (views.length === 0 || wantsPhysicsWireframe(definition)) views.push(PhysicsDebugRenderer({ scene, physics }));

  return {
    physics,
    controls,
    // Advances the physics by the frame's elapsed seconds.
    physicsUpdate: (dt) => physics.update(dt),
    // Brings the view up to date with the physics.
    viewUpdate: () => views.forEach(view => view.update())
  }
}
