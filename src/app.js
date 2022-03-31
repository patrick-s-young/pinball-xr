import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats.js';
import { initCannonBodies } from 'cannon/bodies';
import { initContactMaterials } from 'cannon/materials';
import { initInputEventListeners } from './inputEvents';
//import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import Flipper from './cannon/objects/Flipper';
import KeyEvents from './inputEvents';

//////////////
// INIT CANNON
const world = new CANNON.World();
world.gravity.set(0, -30, 0);
world.broadphase = new CANNON.NaiveBroadphase();


// FLOOR
const floorShape = new CANNON.Box(new CANNON.Vec3(5, .25, 5));
const floorBody = new CANNON.Body({
  mass: 0,
  position: new CANNON.Vec3(0, -.25, 0)
});
floorBody.addShape(floorShape, new CANNON.Vec3(2, 0, -4));
world.addBody(floorBody);
let quat = new CANNON.Quaternion();
quat.setFromAxisAngle(new CANNON.Vec3( 1, 0, 0 ), Math.PI/180 * 3);
floorBody.quaternion.copy(quat);

// BALL
const ballShape = new CANNON.Sphere(.25);
const ballBody = new CANNON.Body({ mass: 10, position: new CANNON.Vec3(Math.random() * 3.5, 2, -3) });
ballBody.addShape(ballShape);
world.addBody(ballBody);

// LEFT FLIPPER 
const leftFlipper = new Flipper({ world });

//////////////
// INIT THREE
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 9, 13);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


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
const axesHelper = new THREE.AxesHelper( 5 );
scene.add( axesHelper );



/////////////////
// ANIMATION LOOP
const clock = new THREE.Clock();
let delta;
const timeStep = 1/60;
const maxSubSteps = 5;

//////////////////
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

// REQUEST ANIMATION LOOP
function animate() {
  stats.begin();
  controls.update();
  cannonDebugger.update();
  leftFlipper.step();
  delta = Math.min(clock.getDelta(), 0.1)
  world.step(timeStep, delta, maxSubSteps);   
  render();
  stats.end();
  requestAnimationFrame(animate);
}

function render() {
  renderer.render(scene, camera)
}

animate();
