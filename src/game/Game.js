import { createPhysics } from '@physics/createPhysics';
import { Controls } from '@src/input/Controls';
import { PhysicsDebugRenderer } from '@debug/PhysicsDebugRenderer';
import { StatusMessage, showTiltStatus } from '@ui/StatusMessage';
import { TableView } from '@src/view/TableView';
import { TableAudio } from '@src/audio/TableAudio';
import { WaterView } from '@src/water/WaterView';
import { Water3DView } from '@src/water3d/Water3DView';
import { Water3DPanel } from '@src/water3d/Water3DPanel';
import { DEBUG, WATER } from '@src/App.config';

// Seconds between a drain and the next ball being served.
const SERVE_DELAY = 1;

// The physics wireframe is drawn when the table has no visuals, when DEBUG.showPhysics is set,
// or when the page URL has ?physics.
const wantsPhysicsWireframe = (definition) =>
  definition.visuals === undefined || DEBUG.showPhysics || new URLSearchParams(window.location.search).has('physics');

// The water is desktop only for now, and drawn over the table's own visuals.
const wantsWater = (definition, renderer) =>
  WATER.enabled && definition.visuals !== undefined && !renderer.xr.enabled &&
  new URLSearchParams(window.location.search).get('water') !== 'off';

// One game on one table: the physics, the ball-serving cycle, tilt messages, and the view (the
// table's own visuals and/or the physics wireframe). Shared by the WebXR and desktop emulation
// apps, which add their own input devices to `controls` and call physicsUpdate and viewUpdate
// once per frame.
export const createGame = async ({ definition, placement, scene, renderer, camera }) => {
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
  if (wantsWater(definition, renderer)) {
    const mode = new URLSearchParams(window.location.search).get('water') || '';
    let water = null;
    if (mode.startsWith('3d')) {
      try {
        water = await Water3DView({ physics, renderer, camera, releaseNow: mode === '3d-now' });
        Water3DPanel(water);
      } catch (error) {
        console.warn('Could not start the 3D water; using the flat water instead.', error);
      }
    }
    try {
      views.push(water || await WaterView({ scene, physics }));
    } catch (error) {
      console.warn('Could not start the water simulation.', error);
    }
  }
  if (definition.sounds) views.push(TableAudio({ scene, camera, physics }));

  return {
    physics,
    controls,
    // Advances the physics by the frame's elapsed seconds.
    physicsUpdate: (dt) => physics.update(dt),
    // Brings the view up to date with the physics.
    viewUpdate: () => views.forEach(view => view.update()),
    // Call after each frame is drawn, for views that draw over it.
    afterRender: () => views.forEach(view => view.afterRender?.())
  }
}
