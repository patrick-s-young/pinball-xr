import * as THREE from 'three';
import InitThree from '@three/InitThree';
import InitPhysics from '@physics/InitPhysics';
import InitMeshes from '@meshes/InitMeshes';
import InitTriggers from '@physics/triggers/InitTriggers';
import { PhysicsDebugRenderer } from '@debug/PhysicsDebugRenderer';
import { DirectionControls } from './ui/DirectionControls';
import { HEIGHT_ABOVE_FLOOR, DEBUG } from './App.config';
// webXR
import {
  HitTestManager,
  XRManager } from '@webXR';
// ui
import {
  ARButton } from '@ui/ARButton';

//////////////////
// BEGIN COMPONENT
export const App = () => {
  let animationUpdate = [];
  const clock = new THREE.Clock();


  const three = InitThree({ isDebugMode: false });
  const meshes = InitMeshes({ isDebugMode: false });
  let physics = null;
  let triggers;


  three.scene.add([
    meshes.reticle.mesh
  ]);
  // XR MANAGER
  const xrManager = XRManager({ startButton: ARButton(), onReady });
  let hitTestManager;
  let hitTestActive = true;

  // UI
  const uiParent = document.createElement('div');
  uiParent.style.position = 'absolute';
  uiParent.style.visibility = 'hidden';
  document.body.appendChild(uiParent);
  let directionControls;

  // XR SESSION READY
  async function onReady () {
    hitTestManager = HitTestManager({ xrSession: xrManager.xrSession });
    xrManager.setOnSelectCallback(onSelectCallback);
    meshes.reticle.visible = true;
    animationUpdate.push({ name: 'reticle', update: (dt) => meshes.reticle.updateMixer(dt)});
    three.renderer.setReferenceSpaceType( 'local' );
    three.renderer.setSession( xrManager.xrSession  );
    three.renderer.setAnimationLoop(animationLoopCallback);
  }


  // ON SCREEN TAP
  const onSelectCallback = async (ev) => {
    if (hitTestActive === false) return;
    if (meshes.reticle.visible) {
      const { x, y, z } = new THREE.Vector3().setFromMatrixPosition(meshes.reticle.mesh.matrix);
      animationUpdate = animationUpdate.filter(item => item.name !== 'reticle');
      hitTestActive = false;
      meshes.reticle.visible = false;

      physics = await InitPhysics({ placement: [x, y + HEIGHT_ABOVE_FLOOR, z] });
      triggers = InitTriggers({ physics });
      if (DEBUG.showPhysics) {
        const physicsDebug = PhysicsDebugRenderer({ scene: three.scene.self, world: physics.world });
        animationUpdate.push({ name: 'physicsDebug', update: physicsDebug.update });
      }

      directionControls = DirectionControls({
        uiParent,
        leftFlipper: physics.leftFlipper,
        rightFlipper: physics.rightFlipper
      })
      uiParent.style.visibility = 'visible';
      directionControls?.enableTouch();

      setTimeout(physics.ball.spawn, 1000);
      setTimeout(physics.shooterLane.onClose, 3000);
    }
}



  function animationLoopCallback(timestamp, frame) {
    let hitPoseTransformMatrix = [];
    if ( frame && hitTestActive === true) {
      if ( hitTestManager.hitTestSourceRequested === false ) hitTestManager.requestHitTestSource();
      hitPoseTransformMatrix = hitTestManager.hitTestSource ? hitTestManager.getHitTestResults(frame) : [];
      if (hitPoseTransformMatrix.length > 0) {
        meshes.reticle.visible = true;
        meshes.reticle.setMatrixFromArray(hitPoseTransformMatrix);
      } else {
        meshes.reticle.visible = false;
      }
    }
    const dt = clock.getDelta();
    physics?.update(dt);
    animationUpdate.forEach(item => item.update(dt));
    three.renderer.render(three.scene.self, three.camera.self);
  }

}

