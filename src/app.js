// Three js
import * as THREE from 'three';
// Cannon es
import * as CANNON from 'cannon-es';
// Dev/Debug
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats.js';
// Objects
import { WedgeFlipper, Ball, Playfield, Bumper } from './cannon/objects';
import KeyEvents from './inputEvents';
// Collison groups
import { COLLISION_GROUPS } from './cannon/collisions';

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

// ADD PLAYFIELD
const playField = new Playfield({ world });

// ADD BUMPERS
const bumpers = Bumper({ world });

// ADD BALL
const ball = new Ball({ world });
ball.spawn();

// ADD FLIPPERS 
const leftFlipper = new WedgeFlipper({ world, side: 'left', ballRef: ball.bodyRef() });
const rightFlipper = new WedgeFlipper({ world, side: 'right', ballRef: ball.bodyRef() });

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
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
    render()
}