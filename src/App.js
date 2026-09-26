import * as THREE from 'three';
import InitThree from '@three/InitThree';
import InitMeshes from '@meshes/InitMeshes';
import { createGame } from './game/Game';
import { Gamepads } from './input/Gamepads';
import { TouchControls } from './ui/TouchControls';
import { HEIGHT_ABOVE_FLOOR, DEFAULT_TABLE } from './App.config';
import { selectTable } from './tables';
import {
  HitTestManager,
  XRManager } from '@webXR';
import {
  ARButton } from '@ui/ARButton';

// WebXR: find a surface, tap to place the table, then play with the on-screen buttons or the
// session's controllers.
export const App = () => {
  const clock = new THREE.Clock();
  const three = InitThree({ isDebugMode: false });
  const meshes = InitMeshes({ isDebugMode: false });
  const xrManager = XRManager({ startButton: ARButton(), onReady });
  let hitTestManager;
  let isPlacing = true;
  let game = null;
  let gamepads = null;

  three.scene.add([meshes.reticle.mesh]);

  // On-screen buttons, shown once the table is placed.
  const uiParent = document.createElement('div');
  uiParent.style.position = 'absolute';
  uiParent.style.visibility = 'hidden';
  document.body.appendChild(uiParent);

  async function onReady () {
    hitTestManager = HitTestManager({ xrSession: xrManager.xrSession });
    xrManager.setOnSelectCallback(onSelect);
    meshes.reticle.visible = true;
    three.renderer.setReferenceSpaceType('local');
    three.renderer.setSession(xrManager.xrSession);
    three.renderer.setAnimationLoop(animationLoop);
  }

  // Tap: place the table where the reticle is.
  const onSelect = async () => {
    if (isPlacing === false || meshes.reticle.visible === false) return;
    isPlacing = false;
    const { x, y, z } = new THREE.Vector3().setFromMatrixPosition(meshes.reticle.mesh.matrix);
    meshes.reticle.visible = false;
    game = await createGame({
      definition: selectTable(DEFAULT_TABLE),
      placement: [x, y + HEIGHT_ABOVE_FLOOR, z],
      scene: three.scene.self
    });
    TouchControls({ uiParent, controls: game.controls });
    gamepads = Gamepads(game.controls);
    uiParent.style.visibility = 'visible';
  }

  const updateReticle = (frame) => {
    if (hitTestManager.hitTestSourceRequested === false) hitTestManager.requestHitTestSource();
    const matrix = hitTestManager.hitTestSource ? hitTestManager.getHitTestResults(frame) : [];
    meshes.reticle.visible = matrix.length > 0;
    if (matrix.length > 0) meshes.reticle.setMatrixFromArray(matrix);
  }

  function animationLoop (timestamp, frame) {
    const dt = clock.getDelta();
    if (frame && isPlacing) {
      updateReticle(frame);
      meshes.reticle.updateMixer(dt);
    }
    if (game) {
      gamepads.poll(xrManager.xrSession.inputSources);
      game.physicsUpdate(dt);
      game.viewUpdate();
    }
    three.renderer.render(three.scene.self, three.camera.self);
  }
}
