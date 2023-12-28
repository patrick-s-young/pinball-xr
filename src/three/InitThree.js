import { Camera } from './Camera';
import { Lights } from './Lights';
import { Renderer } from './Renderer';
import { DebugRenderer } from '@debug/DebugRenderer';
import { Scene } from './Scene';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CAMERA } from '@src/App.config';

const InitThree = ({
  isDebugMode = false
}) => {

  const scene = Scene();
  const camera = Camera();
  const lights = Lights();
  const renderer = isDebugMode ? new DebugRenderer() : new Renderer();
  const orbitControls = isDebugMode ? new OrbitControls( camera.self, renderer.domElement ) : null;

  camera.setPosition({...CAMERA.position});
  scene.add(lights.getLights());

  return {
    scene,
    camera,
    lights,
    renderer,
    orbitControls
  }
}

export default InitThree;