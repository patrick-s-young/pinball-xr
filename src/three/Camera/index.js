import * as THREE from 'three';
import { CAMERA } from '../../App.config';

export function Camera() {
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(...CAMERA.position);

  return {
    get self() { return camera },
    get quaternion() { return camera.quaternion },
    setPosition: ({ x, y, z }) => camera.position.set(x, y, z)
  }
}