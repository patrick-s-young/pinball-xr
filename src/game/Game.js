import { createPhysics } from '@physics/createPhysics';
import { Controls } from '@src/input/Controls';
import { PhysicsDebugRenderer } from '@debug/PhysicsDebugRenderer';
import { StatusMessage, showTiltStatus } from '@ui/StatusMessage';
import { DEBUG } from '@src/App.config';

// Seconds between a drain and the next ball being served.
const SERVE_DELAY = 1;

// One game on one table: the physics, the ball-serving cycle, tilt messages, and the physics
// wireframe. Shared by the WebXR and desktop emulation apps, which add their own input devices
// to `controls` and call physicsUpdate and viewUpdate once per frame.
export const createGame = async ({ definition, placement, scene }) => {
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
  const debugView = DEBUG.showPhysics ? PhysicsDebugRenderer({ scene, physics }) : null;

  return {
    physics,
    controls,
    // Advances the physics by the frame's elapsed seconds.
    physicsUpdate: (dt) => physics.update(dt),
    // Brings the view up to date with the physics.
    viewUpdate: () => debugView?.update()
  }
}
