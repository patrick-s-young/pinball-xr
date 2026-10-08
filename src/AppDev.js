import * as THREE from 'three';
import InitThree from '@three/InitThree';
import InitMeshes from '@meshes/InitMeshes';
import { PerformanceStats } from '@debug/PerformanceStats';
import { createGame } from './game/Game';
import { Keyboard } from './input/Keyboard';
import { Gamepads } from './input/Gamepads';
import { HEIGHT_ABOVE_FLOOR, DEFAULT_TABLE } from './App.config';
import { selectTable } from './tables';
import { LightingPanel } from '@debug/LightingPanel';

// Where the desktop app places the table's playfield centre (x, z on the floor).
const TABLE_POSITION = { x: 0, z: 0 };

// The desktop app: the table is placed on the floor straight away; play with the keyboard or a
// gamepad. The orbit controls move the camera.
export const AppDev = () => {
  const clock = new THREE.Clock();
  const stats = PerformanceStats();
  const three = InitThree({ isDebugMode: true });
  const meshes = InitMeshes({ isDebugMode: true });
  let game = null;
  let gamepads = null;

  three.scene.add([meshes.debugFloor.mesh]);

  const placeTable = async () => {
    const { x, z } = TABLE_POSITION;
    game = await createGame({
      definition: selectTable(DEFAULT_TABLE),
      placement: [x, HEIGHT_ABOVE_FLOOR, z],
      scene: three.scene.self,
      renderer: three.renderer.self,
      camera: three.camera.self
    });
    if (new URLSearchParams(window.location.search).has('lighting')) LightingPanel({ scene: three.scene.self, renderer: three.renderer.self });
    Keyboard(game.controls);
    gamepads = Gamepads(game.controls);
    // Frame the table from in front of and above the player's end, like Visual Pinball's
    // desktop view. The orbit controls still move the camera from there.
    three.orbitControls.target.set(x, HEIGHT_ABOVE_FLOOR, z);
    three.camera.self.position.set(x, HEIGHT_ABOVE_FLOOR + 0.9, z + 0.95);
  }

  placeTable();

  const animate = () => {
    stats.begin();
    const dt = clock.getDelta();
    if (game) {
      gamepads.poll();
      stats.measurePhysics(() => game.physicsUpdate(dt));
      game.viewUpdate();
    }
    three.orbitControls.update();
    three.renderer.render(three.scene.self, three.camera.self);
    game?.afterRender();
    stats.end();
    requestAnimationFrame(animate);
  }
  animate();
}
