// Three js
import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
// Cannon es
import * as CANNON from 'cannon-es';
// Dev/Debug
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'stats.js';
// Objects
import { WedgeFlipper, Ball, Playfield, Bumper, ShooterLane } from '@cannon/bodies';
// Triggers
import { DrainTrigger } from '@cannon/triggers';
// Custom EventTarget
import { PXREvent, DRAIN_EVENT } from '@cannon/customEvents';
// Input
import KeyEvents from './inputEvents';
// Contact Materials
import { initContactMaterials } from '@cannon/materials';

//////////////////
// BEGIN COMPONENT
export const App = () => {
  // INIT CANNON ES
  const world = new CANNON.World();
  world.gravity.set(0, -30, 0);
  world.broadphase = new CANNON.NaiveBroadphase();

  // INIT THREE JS
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 10, 14);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // LIGHTS
  scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

  const light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( 1, 1, 1 ).normalize();
  scene.add( light );

  /////////////////////////////////////
  // SET UP CONTROLLERS
  let controller1, controller2;
  let controllerGrip1, controllerGrip2;

  function onSelectStart() {
    this.userData.isSelecting = true;
    handleController(this);
  }

  function onSelectEnd() {
    this.userData.isSelecting = false;
    handleController(this);
  }

  controller1 = renderer.xr.getController( 0 );
  controller1.name = 'controller1';
  controller1.addEventListener( 'selectstart', onSelectStart );
  controller1.addEventListener( 'selectend', onSelectEnd );
  controller1.addEventListener( 'connected', function ( event ) {
    this.add( buildController( event.data ) );
  });
  controller1.addEventListener( 'disconnected', function () {
    this.remove( this.children[ 0 ] );
  });
  scene.add( controller1 );

  controller2 = renderer.xr.getController( 1 );
  controller2.name = 'controller2'
  controller2.addEventListener( 'selectstart', onSelectStart );
  controller2.addEventListener( 'selectend', onSelectEnd );
  controller2.addEventListener( 'connected', function ( event ) {
    this.add( buildController( event.data ) );
  });
  controller2.addEventListener( 'disconnected', function () {
    this.remove( this.children[ 0 ] );
  });
  scene.add( controller2 );

  const controllerModelFactory = new XRControllerModelFactory();

  controllerGrip1 = renderer.xr.getControllerGrip( 0 );
  controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
  scene.add( controllerGrip1);

  controllerGrip2 = renderer.xr.getControllerGrip( 1 );
  controllerGrip2.add( controllerModelFactory.createControllerModel( controllerGrip2 ) );
  scene.add( controllerGrip2 );


  function buildController( data ) {
    let geometry, material;
    switch ( data.targetRayMode ) {
      case 'tracked-pointer':
        geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [ 0, 0, 0, 0, 0, - 1 ], 3 ) );
        geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( [ 0.5, 0.5, 0.5, 0, 0, 0 ], 3 ) );
        material = new THREE.LineBasicMaterial( { vertexColors: true, blending: THREE.AdditiveBlending } );
        return new THREE.Line( geometry, material );
      case 'gaze':
        geometry = new THREE.RingGeometry( 0.02, 0.04, 32 ).translate( 0, 0, - 1 );
        material = new THREE.MeshBasicMaterial( { opacity: 0.5, transparent: true } );
        return new THREE.Mesh( geometry, material );
    }
  }

  const selectState = {
    controller1: {
      isSelecting: false,
      callBack () { this.isSelecting === true ? rightFlipper.onFlipperUp() : rightFlipper.onFlipperDown() },
    },
    controller2: {
      isSelecting: false,
      callBack () { this.isSelecting === true ? leftFlipper.onFlipperUp(): leftFlipper.onFlipperDown() },
    }
  }

  function handleController( controller ) {
    const { name, userData } = controller;
    if (selectState[name].isSelecting === userData.isSelecting) return;
    console.log(`${name} select state is now ${userData.isSelecting}`);
    selectState[name].isSelecting = userData.isSelecting;
    selectState[name].callBack();

  }

  // ADD PLAYFIELD
  const playField = new Playfield({ world });

  // ADD SHOOTER LANE
  const shooterLane = new ShooterLane({ world });
  setTimeout(shooterLane.onClose, 3000);

  // ADD BUMPERS
  const bumpers = Bumper({ world });

  // ADD BALL
  const ball = new Ball({ world });
  setTimeout(ball.spawn, 1000);

  // ADD FLIPPERS 
  const leftFlipper = new WedgeFlipper({ world, side: 'left', ballRef: ball.bodyRef() });
  const rightFlipper = new WedgeFlipper({ world, side: 'right', ballRef: ball.bodyRef() });

  // INIT CONTACT MATERIALS
  initContactMaterials({ world });

  // ADD TRIGGERS
  const drainTrigger = new DrainTrigger({ world });
  drainTrigger.addCollideDispatch(() => PXREvent.dispatchEvent(DRAIN_EVENT));

  // LISTENERS
  PXREvent.addEventListener('DRAIN_EVENT', () => {
    shooterLane.onOpen();
    setTimeout(ball.spawn, 1000);
    setTimeout(shooterLane.onClose, 4000);
  });

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
  const maxSubSteps = 10;
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
  //animate();

  function animateXR() {
    renderer.setAnimationLoop( render );
  }
  animateXR();

  function render() {
    stats.begin();
    controls.update();
    cannonDebugger.update();
    leftFlipper.step();
    rightFlipper.step();
    delta = Math.min(clock.getDelta(), 0.1)
    world.step(timeStep, delta, maxSubSteps);   
    renderer.render(scene, camera)
    stats.end();
  }



  // HELPERS
  window.addEventListener('resize', onWindowResize, false);

  function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      render()
  }

  return null;
}