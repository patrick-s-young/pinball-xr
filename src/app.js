import * as THREE from 'three';
import InitThree from '@three/InitThree';
import InitCannon from '@cannon/InitCannon';
import InitKeyEvents from './inputEvents/InitKeyEvents';
import InitMeshes from './meshes/InitMeshes';
import InitTriggers from './cannon/triggers/InitTriggers';
import CannonDebugger from 'cannon-es-debugger';


const TIME_STEP = 1/60;
const MAX_SUB_STEPS = 10;

//////////////////
// BEGIN COMPONENT
export const App = ({ isDebugMode = false }) => {
  const animationUpdate = [];
  const clock = new THREE.Clock();
  let delta;

  const three = InitThree({ isDebugMode });
  const meshes = InitMeshes();
  const cannon = InitCannon();
  const triggers = InitTriggers({ cannon });
  const keyEvents = InitKeyEvents({
    leftFlipper: cannon.leftFlipper,
    rightFlipper: cannon.rightFlipper
  });
  const cannonDebugger = isDebugMode 
    ? new CannonDebugger(three.scene.self, cannon.world) 
    : null;

  three.scene.add([
    meshes.reticle.mesh
  ]);

  animationUpdate.push(
    { name: 'cannonLeftFlipper', update: () => cannon.leftFlipper.step()},
    { name: 'cannonRightFlipper', update: () => cannon.rightFlipper.step()}
  );

  if (isDebugMode) {
    animationUpdate.push(
      { name: 'cannonDebugger', update: () => cannonDebugger.update()},
      { name: 'orbitControls', update: () => three.orbitControls.update()}
    );
    // three.scene.add([
    //   meshes.debugFloor.mesh
    // ]);
  }

  // start
  setTimeout(cannon.ball.spawn, 1000);
  setTimeout(cannon.shooterLane.onClose, 3000);


  // animation loop
  function animate() {
    delta = Math.min(clock.getDelta(), 0.1)
    cannon.world.step(TIME_STEP, delta, MAX_SUB_STEPS); 
    animationUpdate.forEach(item => item.update());
    three.renderer.render( three.scene.self, three.camera.self );
    requestAnimationFrame( animate );
  }
  animate();
}


