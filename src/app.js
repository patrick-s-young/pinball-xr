import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import InitThree from '@three/InitThree';
import InitCannon from '@cannon/InitCannon';
import InitMeshes from '@meshes/InitMeshes';
import InitTriggers from '@cannon/triggers/InitTriggers';
import CannonDebugger from 'cannon-es-debugger';
import { DirectionControls } from './ui/DirectionControls';
import { HEIGHT_ABOVE_FLOOR } from './App.config';
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
  let cannon = {
    world: new CANNON.World()
  }
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
  const onSelectCallback = (ev) => {
    if (hitTestActive === false) return;
    if (meshes.reticle.visible) {
      const { x, y, z } = new THREE.Vector3().setFromMatrixPosition(meshes.reticle.mesh.matrix);
      console.log('y:',y)
      meshes.reticle.visible = false;
      animationUpdate = animationUpdate.filter(item => item.name === 'reticle');
      hitTestActive = false;
      meshes.reticle.visible = false; 

      const cannonDebugger = new CannonDebugger(three.scene.self, cannon.world);
      cannon = {
        ...InitCannon({ world: cannon.world, placement: [x, y + HEIGHT_ABOVE_FLOOR, z] })
      }
    
      triggers = InitTriggers({ cannon, placement: [x,  y + HEIGHT_ABOVE_FLOOR, z] });
      animationUpdate.push(
        { name: 'cannonDebugger', update: () => cannonDebugger.update()},
        { name: 'cannonLeftFlipper', update: () => cannon.leftFlipper.step()},
        { name: 'cannonRightFlipper', update: () => cannon.rightFlipper.step()}
      );

      directionControls = DirectionControls({
        uiParent,
        leftFlipper: cannon.leftFlipper,
        rightFlipper: cannon.rightFlipper
      }) 
      uiParent.style.visibility = 'visible';
      directionControls?.enableTouch();

      setTimeout(cannon.ball.spawn, 1000);
      setTimeout(cannon.shooterLane.onClose, 3000);
    }
}



  let dt;
  const timeStep = 1/60;
  const maxSubSteps = 10;

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
    dt = Math.min(clock.getDelta(), 0.1);
    cannon.world.step(timeStep, dt, maxSubSteps);   
    animationUpdate.forEach(item => item.update(dt));
    three.renderer.render(three.scene.self, three.camera.self);
  }





  // // animation loop
  // function animate() {
  //   const dt = clock.getDelta();
  //   cannon.world.step(dt); 
  //   animationUpdate.forEach(item => item.update(dt));
  //   three.renderer.render( three.scene.self, three.camera.self );
  //   requestAnimationFrame( animate );
  // }
 
}


