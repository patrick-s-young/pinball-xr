import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import InitThree from '@three/InitThree';
import InitCannon from '@cannon/InitCannon';
import InitKeyEvents from './inputEvents/InitKeyEvents';
import InitMeshes from './meshes/InitMeshes';
import InitTriggers from './cannon/triggers/InitTriggers';
import CannonDebugger from 'cannon-es-debugger';
import { HEIGHT_ABOVE_FLOOR } from './App.config';

const TIME_STEP = 1/60;
const MAX_SUB_STEPS = 10;

//////////////////
// BEGIN COMPONENT
export const App = ({ isDebugMode = false }) => {
  let animationUpdate = [];
  const clock = new THREE.Clock();
  let delta;

  const three = InitThree({ isDebugMode });
  const meshes = InitMeshes();
  let cannon = {
    world: new CANNON.World()
  }
  let triggers;
  let keyEvents;

  const cannonDebugger = isDebugMode 
    ? new CannonDebugger(three.scene.self, cannon.world) 
    : null;

  three.scene.add([
    meshes.reticle.mesh
  ]);



  if (isDebugMode) {
    animationUpdate.push(
      { name: 'cannonDebugger', update: () => cannonDebugger.update()},
      { name: 'orbitControls', update: () => three.orbitControls.update()}
    );
    three.scene.add([
      meshes.debugFloor.mesh,
    ]);
  }


/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

const hitTest = {
  raycaster: new THREE.Raycaster(),
  pointer: new THREE.Vector2()
}

function initDebug () {
  meshes.reticle.visible = true;
  animationUpdate.push(
    { name: 'reticle', update: (dt) => meshes.reticle.updateMixer(dt)}
  );
  three.renderer.domElement.addEventListener('pointermove', onPointerMove);
  three.renderer.domElement.addEventListener('click', onClick);
}

function onPointerMove(event) { 
  hitTest.pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1; 
  hitTest.pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1; 
  hitTest.raycaster.setFromCamera( hitTest.pointer, three.camera.self );
  const intersects = hitTest.raycaster.intersectObject(meshes.debugFloor.mesh); 
  if (intersects.length > 0) meshes.reticle.setPosition(intersects[0].point);
}

const onClick = () => {
  three.renderer.domElement.removeEventListener('pointermove', onPointerMove);
  three.renderer.domElement.removeEventListener('click', onClick);
  // reticle
  const { x, y, z } = new THREE.Vector3().setFromMatrixPosition(meshes.reticle.mesh.matrix);
  meshes.reticle.visible = false;
  animationUpdate = animationUpdate.filter(item => item.name !== 'reticle');
  cannon = {
    ...InitCannon({ world: cannon.world, placement: [x, HEIGHT_ABOVE_FLOOR, z] })
  }

  triggers = InitTriggers({ cannon, placement: [x, HEIGHT_ABOVE_FLOOR, z] });
  keyEvents = InitKeyEvents({
    leftFlipper: cannon.leftFlipper,
    rightFlipper: cannon.rightFlipper
  });
  animationUpdate.push(
    { name: 'cannonLeftFlipper', update: () => cannon.leftFlipper.step()},
    { name: 'cannonRightFlipper', update: () => cannon.rightFlipper.step()}
  );
    // start
    setTimeout(cannon.ball.spawn, 1000);
    setTimeout(cannon.shooterLane.onClose, 3000);
}

initDebug();
//------------------------------------------------------------------------
//------------------------------------------------------------------------






  // animation loop
  function animate() {
    delta = Math.min(clock.getDelta(), 0.1)
    cannon.world.step(TIME_STEP, delta, MAX_SUB_STEPS); 
    animationUpdate.forEach(item => item.update(delta));
    three.renderer.render( three.scene.self, three.camera.self );
    requestAnimationFrame( animate );
  }
  animate();
}


