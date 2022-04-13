// Three js
import * as THREE from 'three';
// Cannon es
import * as CANNON from 'cannon-es';
// Dev/Debug
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats.js';
// Objects
import Flipper from './cannon/objects/Flipper';
import KeyEvents from './inputEvents';


// INIT CANNON ES
const world = new CANNON.World();
world.gravity.set(0, -30, 0);
world.broadphase = new CANNON.NaiveBroadphase();
// INIT THREE JS
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 15, 5);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// ADD TEST FLOOR
const floorShape = new CANNON.Box(new CANNON.Vec3(6, .25, 8));
const floorBody = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, -.25, -6)
});
floorBody.addShape(floorShape, new CANNON.Vec3(0, 0, 0));
world.addBody(floorBody);
let quat = new CANNON.Quaternion();
quat.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), Math.PI/180 * 3);
floorBody.quaternion.copy(quat);
// ADD BALL
const ballShape = new CANNON.Sphere(.25);
const ballBody = new CANNON.Body({ 
  mass: 10, 
  position: new CANNON.Vec3(0, 2, -6) 
});
ballBody.velocity.x = 1 + Math.random() * 2;
ballBody.velocity.z = 4;
ballBody.addShape(ballShape);
world.addBody(ballBody);
// ADD FLIPPERS 
const leftFlipper = new Flipper({ name: 'leftFlipper',  world, ballRef: ballBody });
const rightFlipper = new Flipper({ name: 'rightFlipper',  world, ballRef: ballBody });
// DEV/DEBUG HELPERS
const cannonDebugger = new CannonDebugger(scene, world);
const controls = new OrbitControls(camera, renderer.domElement);
const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);
const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );
// KEYBOARD INPUT
const keyEvents = new KeyEvents();
keyEvents.addSubscriber({ 
  keyName: 'KeyA', 
  keyAction: 'keydown', 
  callBack: leftFlipper.onFlipperUp
  });
keyEvents.addSubscriber({ 
  keyName: 'KeyA', 
  keyAction: 'keyup', 
  callBack: leftFlipper.onFlipperDown
  });
keyEvents.addSubscriber({
  keyName: 'KeyL',
  keyAction: 'keydown',
  callBack: rightFlipper.onFlipperUp
  });
keyEvents.addSubscriber({
  keyName: 'KeyL',
  keyAction: 'keyup',
  callBack: rightFlipper.onFlipperDown
  });
// INIT ANIMATION VALUES
const clock = new THREE.Clock();
let delta;
const timeStep = 1/60;
const maxSubSteps = 5;
// ANIMATION LOOP
function animate() {
  stats.begin();
  controls.update();
  cannonDebugger.update();
  leftFlipper.step();
  rightFlipper.step();
  delta = Math.min(clock.getDelta(), 0.1)
  world.step(timeStep, delta, maxSubSteps);   
  renderer.render(scene, camera)
  stats.end();
  requestAnimationFrame(animate);
}
// START ANIMATION
animate();




// HELPERS
window.addEventListener('resize', onWindowResize, false)
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}