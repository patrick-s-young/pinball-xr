import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats.js';
import { initCannonBodies } from 'cannon/bodies';
import { initContactMaterials } from 'cannon/materials';
import { initInputEventListeners } from './inputEvents';
//import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';


//////////////
// INIT CANNON
const world = new CANNON.World();
world.gravity.set(0, -30, 0);
world.broadphase = new CANNON.NaiveBroadphase();
initContactMaterials({ world });
const cannonBodies = initCannonBodies({ world });
initInputEventListeners({ 
  leftFlipper: cannonBodies.flippers.leftFlipper.constraint,
  rightFlipper: cannonBodies.flippers.rightFlipper.constraint
});

//////////////
// INIT THREE
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 9, 13);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
/*/ VR
document.body.appendChild( VRButton.createButton( renderer ) );
renderer.xr.enabled = true; */

///////////
// HELPERS
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}
const cannonDebugger = new CannonDebugger(scene, world);
const controls = new OrbitControls(camera, renderer.domElement);
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

/*///////////////
// VR ANIMATION
renderer.setAnimationLoop( function () {
  stats.begin();
// UPDATE HELPERS
  controls.update()
  cannonDebugger.update()
// UPDATE CANNON WORLD
  delta = Math.min(clock.getDelta(), 0.1)
  world.step(timeStep, delta, maxSubSteps);
// CALL RENDER THREE SCENE    
  stats.end();
  renderer.render(scene, camera)
} ); */




/////////////////
// ANIMATION LOOP
const clock = new THREE.Clock();
let delta;
const timeStep = 1/60;
const maxSubSteps = 5;
// REQUEST ANIMATION LOOP
function animate() {
  stats.begin();
  controls.update()
  cannonDebugger.update()
  delta = Math.min(clock.getDelta(), 0.1)
  world.step(timeStep, delta, maxSubSteps);   
  render();
  stats.end();
  requestAnimationFrame(animate);
}

function render() {
  renderer.render(scene, camera)
}
// SET BALL VELOCITY AT START OF ANIMATION
cannonBodies.ball.velocity.set(0, 0, -55 ); 
animate();
