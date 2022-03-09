import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import CannonDebugger from 'cannon-es-debugger';
import { initContactMaterials } from './cannon/cannonMaterials';

import Stats from 'stats.js';
// CANNON BODY CONSTRUCTORS
import { 
  StaticPlayfieldBody, 
  BallBody, 
  BumperBodies, 
  FlipperBodies } from './cannon/cannonBodies';
// VR
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';


////////////////////
// INIT CANNON WORLD
const world = new CANNON.World();
world.gravity.set(0, -20, 0);
world.broadphase = new CANNON.NaiveBroadphase();
initContactMaterials({ world });

///////////////
// INIT BODIES
//
// PLAYFIELD
StaticPlayfieldBody({ world });
// BUMPERS
BumperBodies({ world });
// FLIPPERS
const [leftFlipper, rightFlipper] = FlipperBodies({ world });
// BALL
const ballBody = BallBody({ world });





//////////////
// INIT THREE
//
// SCENE
const scene = new THREE.Scene()
// CAMERA
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 9, 13);
// RENDERER
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)
// VR
document.body.appendChild( VRButton.createButton( renderer ) );
renderer.xr.enabled = true;


///////////
// HELPERS
//
// RESIZE CAMERA TO WINDOW
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}
// CANNON DEBUGGER
const cannonDebugger = new CannonDebugger(scene, world);
// THREE ORBIT CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
// STATS DISPLAY
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);





////////////////
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

} ); 





/////////////// 
// INPUT EVENTS
const targetVelocity = 10;
const onKeyDown = (e) => {
  leftFlipper.motorEquation.targetVelocity = -targetVelocity;
  leftFlipper.motorEquation.enabled = true;
  rightFlipper.motorEquation.targetVelocity = targetVelocity;
  rightFlipper.motorEquation.enabled = true;
}
document.addEventListener('keydown', onKeyDown);
 
const onKeyUp = (e) => {
  leftFlipper.motorEquation.targetVelocity = targetVelocity ;
  rightFlipper.motorEquation.targetVelocity = -targetVelocity;
}
document.addEventListener('keyup', onKeyUp);



////////////
// ANIMATION
//
// CANNON STEP 
const clock = new THREE.Clock();
let delta;
const timeStep = 1/60;
const maxSubSteps = 5;
// REQUEST ANIMATION LOOP
function animate() {
  stats.begin();
// UPDATE HELPERS
  controls.update()
  cannonDebugger.update()
// UPDATE CANNON WORLD
  delta = Math.min(clock.getDelta(), 0.1)
  world.step(timeStep, delta, maxSubSteps);
// CALL RENDER THREE SCENE    
  render();
  stats.end();
  requestAnimationFrame(animate);
}
// RENDER THREE SCENE
function render() {
  renderer.render(scene, camera)
}
// INIT ANIMATION LOOP
ballBody.velocity.set(0, 0, -35  ); 
animate();
