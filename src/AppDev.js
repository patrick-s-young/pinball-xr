import * as THREE from 'three';
import InitThree from '@three/InitThree';
import InitPhysics from '@physics/InitPhysics';
import InitTriggers from '@physics/triggers/InitTriggers';
import InitKeyEvents from '@debug/InitKeyEvents';
import InitMeshes from '@meshes/InitMeshes';
import { PhysicsDebugRenderer } from '@debug/PhysicsDebugRenderer';
import { PerformanceStats } from '@debug/PerformanceStats';
import { HEIGHT_ABOVE_FLOOR, DEBUG } from './App.config';

const isDebugMode = true;

//////////////////
// BEGIN COMPONENT
export const AppDev = () => {
  let animationUpdate = [];
  const clock = new THREE.Clock();
  const stats = PerformanceStats();

  const three = InitThree({ isDebugMode });
  const meshes = InitMeshes({ isDebugMode });
  let physics = null;
  let triggers;
  let keyEvents;

  three.scene.add([
    meshes.reticle.mesh
  ]);



  if (isDebugMode) {
    animationUpdate.push(
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

const onClick = async () => {
  three.renderer.domElement.removeEventListener('pointermove', onPointerMove);
  three.renderer.domElement.removeEventListener('click', onClick);
  // reticle
  const { x, y, z } = new THREE.Vector3().setFromMatrixPosition(meshes.reticle.mesh.matrix);
  meshes.reticle.visible = false;
  animationUpdate = animationUpdate.filter(item => item.name !== 'reticle');

  physics = await InitPhysics({ placement: [x, HEIGHT_ABOVE_FLOOR, z] });
  triggers = InitTriggers({ physics });
  keyEvents = InitKeyEvents({
    leftFlipper: physics.leftFlipper,
    rightFlipper: physics.rightFlipper,
    plunger: physics.plunger
  });
  if (DEBUG.showPhysics) {
    const physicsDebug = PhysicsDebugRenderer({ scene: three.scene.self, world: physics.world });
    animationUpdate.push({ name: 'physicsDebug', update: physicsDebug.update });
  }
}

initDebug();
//------------------------------------------------------------------------
//------------------------------------------------------------------------

  // animation loop
  function animate() {
    stats.begin();
    const dt = clock.getDelta();
    if (physics !== null) stats.measurePhysics(() => physics.update(dt));
    animationUpdate.forEach(item => item.update(dt));
    three.renderer.render( three.scene.self, three.camera.self );
    stats.end();
    requestAnimationFrame( animate );
  }
  animate();
}

