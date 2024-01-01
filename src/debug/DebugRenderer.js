import * as THREE from 'three';

export function DebugRenderer () {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth - 100, window.innerHeight - 100);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild( renderer.domElement );

  return {
    render: (scene, camera) => renderer.render(scene, camera),
    get domElement() { return renderer.domElement }
  }
}