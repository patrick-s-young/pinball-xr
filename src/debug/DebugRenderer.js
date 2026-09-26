import * as THREE from 'three';

// Desktop renderer for emulation mode. The canvas asks for a desynchronized (low-latency)
// context, which lets the browser show each frame without waiting for the page compositor,
// cutting the delay between a key press and seeing the flipper move.
export function DebugRenderer () {
  const canvas = document.createElement('canvas');
  const attributes = { antialias: true, desynchronized: true, powerPreference: 'high-performance' };
  const context = canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes);
  const renderer = new THREE.WebGLRenderer({ canvas, context });
  renderer.setSize( window.innerWidth - 100, window.innerHeight - 100);
  document.body.appendChild( renderer.domElement );

  return {
    render: (scene, camera) => renderer.render(scene, camera),
    get domElement() { return renderer.domElement }
  }
}
