import * as THREE from 'three';
import InitThree from '@three/InitThree';
import InitMeshes from '@meshes/InitMeshes';
import { PerformanceStats } from '@debug/PerformanceStats';
import { createGame } from './game/Game';
import { Keyboard } from './input/Keyboard';
import { Gamepads } from './input/Gamepads';
import { HEIGHT_ABOVE_FLOOR, DEFAULT_TABLE } from './App.config';
import { selectTable } from './tables';

// Desktop emulation: click the floor to place the table, then play with the keyboard or a
// gamepad.
export const AppDev = () => {
  const clock = new THREE.Clock();
  const stats = PerformanceStats();
  const three = InitThree({ isDebugMode: true });
  const meshes = InitMeshes({ isDebugMode: true });
  const canvas = three.renderer.domElement;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let game = null;
  let gamepads = null;

  three.scene.add([meshes.reticle.mesh, meshes.debugFloor.mesh]);
  meshes.reticle.visible = true;

  const onPointerMove = (event) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, three.camera.self);
    const [hit] = raycaster.intersectObject(meshes.debugFloor.mesh);
    if (hit) meshes.reticle.setPosition(hit.point);
  }

  const onClick = async () => {
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('click', onClick);
    const { x, z } = new THREE.Vector3().setFromMatrixPosition(meshes.reticle.mesh.matrix);
    meshes.reticle.visible = false;
    game = await createGame({
      definition: selectTable(DEFAULT_TABLE),
      placement: [x, HEIGHT_ABOVE_FLOOR, z],
      scene: three.scene.self
    });
    Keyboard(game.controls);
    gamepads = Gamepads(game.controls);
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('click', onClick);

  const animate = () => {
    stats.begin();
    const dt = clock.getDelta();
    if (game) {
      gamepads.poll();
      stats.measurePhysics(() => game.physicsUpdate(dt));
      game.viewUpdate();
    } else {
      meshes.reticle.updateMixer(dt);
    }
    three.orbitControls.update();
    three.renderer.render(three.scene.self, three.camera.self);
    stats.end();
    requestAnimationFrame(animate);
  }
  animate();
}
