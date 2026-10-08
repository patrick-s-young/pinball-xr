import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { PlayfieldReflection, REFLECTION_LAYER } from './PlayfieldReflection';
import { VIEW } from '@src/App.config';

// The table's lights from Visual Pinball are photometric (candela); this project's lights are not,
// so they are scaled down to sit alongside the scene's own lighting.
const TABLE_LIGHT_SCALE = 0.0005;
// Visual Pinball units (m), for the scripts' shadow offsets.
const METRES_PER_VPU = 0.0269875 / 50;
// Lifts the reflection just above the playfield.
const REFLECTION_LIFT = 0.0003;
// Brightness of a playfield light's glow per unit of its Visual Pinball intensity.
const LIGHT_GLOW_SCALE = 0.08;
// How quickly a light fades on and off (seconds), like a bulb's filament.
const LIGHT_FADE_SECONDS = 0.04;

// A playfield light's glow, as Visual Pinball draws a bulb light: brightest at the bulb, fading to
// nothing at the falloff radius, added over whatever is under it and clipped to the light's
// outline (the mesh it is drawn on). center is the bulb in the mesh's own coordinates.
const lightGlowMaterial = ({ center, falloff, falloffPower, color, intensity }) => new THREE.ShaderMaterial({
  uniforms: {
    center: { value: center },
    falloff: { value: falloff },
    falloffPower: { value: falloffPower },
    color: { value: new THREE.Color(color).multiplyScalar(intensity * LIGHT_GLOW_SCALE) },
    brightness: { value: 1 }
  },
  vertexShader: /* glsl */`
    varying vec3 vPosition;
    void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 center;
    uniform float falloff;
    uniform float falloffPower;
    uniform vec3 color;
    uniform float brightness;
    varying vec3 vPosition;
    void main() {
      float glow = pow( clamp( 1.0 - distance( vPosition, center ) / falloff, 0.0, 1.0 ), falloffPower );
      gl_FragColor = vec4( color * glow * brightness, 1.0 );
    }`,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false
});

// Parents a flipper's meshes to a new group at their pivot, so turning the group turns them
// about the pivot. Visual Pinball exports each flipper part positioned at the pivot.
const pivotGroupFor = (node) => {
  const pivot = new THREE.Group();
  pivot.position.copy(node.children[0].position);
  [...node.children].forEach(child => {
    child.position.sub(pivot.position);
    pivot.add(child);
  });
  node.add(pivot);
  return pivot;
}

// The table's environment image (what metal, plastic, and the ball reflect), or a generic room.
const loadEnvironment = async (renderer, environment) => {
  let image = null;
  if (environment) {
    try {
      image = await new EXRLoader().loadAsync(environment.url);
    } catch (error) {
      console.warn(`Could not load the table's environment image (${environment.url}); using a generic one.`, error);
    }
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = image
    ? pmrem.fromEquirectangular(image).texture
    : pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  image?.dispose();
  return texture;
}

// Which playfield reflections to draw: 'all', 'ball', or 'off' (VIEW.reflections, overridden by
// ?reflections= in the page URL). WebXR defaults to the ball only, to keep phones fast.
const reflectionMode = (renderer) => {
  const fromUrl = new URLSearchParams(window.location.search).get('reflections');
  if (['all', 'ball', 'off'].includes(fromUrl)) return fromUrl;
  return renderer.xr.enabled ? VIEW.reflections.xr : VIEW.reflections.desktop;
}

// Draws the table with its own Visual Pinball visuals (exported by the importer as a GLB) and
// keeps the moving parts in step with the physics: flippers, plunger, bumper rings, spinner plates,
// the ball, and the shadows
// the table's script fakes for them. The playfield reflects what is on it, as in Visual Pinball.
export const TableView = async ({ scene, renderer, physics }) => {
  const { definition, table, ball, flippers, plunger, spinners = [] } = physics;
  const { width, length } = definition.playfield;
  const { environment, reflections = { playfield: 0, ball: 0 }, shadows = { ballShadows: [], flipperShadows: {} }, lights = [] } = definition.visuals;
  const gltf = await new GLTFLoader().loadAsync(definition.visuals.url);
  const model = gltf.scene;

  scene.environment = await loadEnvironment(renderer, environment);
  const environmentIntensity = (environment ? environment.intensity / 2 : 1) * VIEW.lighting.environment;
  model.traverse(node => {
    if (node.isLight) node.intensity *= TABLE_LIGHT_SCALE;
    if (node.isMesh && node.material.envMapIntensity !== undefined) node.material.envMapIntensity = environmentIntensity;
  });

  // The plunger's visual tip is drawn fully forward; line it up with where the physics stops the
  // ball. Measured before the model is moved, so the box is in the GLB's own coordinates.
  const plungerParts = ['Tip', 'Rod', 'Spring']
    .map(part => model.getObjectByName(`${definition.plunger.name}${part}`))
    .filter(Boolean);
  const tipNode = model.getObjectByName(`${definition.plunger.name}Tip`);
  const plungerRestOffset = tipNode
    ? definition.plunger.tip[1] + length / 2 - new THREE.Box3().setFromObject(tipNode).min.z
    : 0;
  const plungerBase = plungerParts.map(part => part.position.z);

  // The GLB's origin is the playfield's top-left corner and its playfield is level. The table
  // frame's origin is the playfield centre, tilted and placed by the table body.
  model.position.set(-width / 2, 0, -length / 2);
  const tableGroup = new THREE.Group();
  const { x, y, z, w } = table.body.rotation();
  tableGroup.quaternion.set(x, y, z, w);
  tableGroup.add(model);
  scene.add(tableGroup);

  const flipperViews = flippers.map(flipper => {
    const node = model.getObjectByName(flipper.name);
    if (node === undefined || node.children.length === 0) return null;
    const { upSign } = definition.flippers.find(f => f.name === flipper.name);
    return { flipper, upSign, pivot: pivotGroupFor(node) };
  }).filter(Boolean);

  // Flipper shadows turn with their flippers. Each is exported at its flipper's pivot.
  const flipperShadowViews = Object.entries(shadows.flipperShadows).map(([shadowName, flipperName]) => {
    const node = model.getObjectByName(shadowName);
    const flipper = flippers.find(f => f.name === flipperName);
    if (!node || !flipper) return null;
    const { upSign } = definition.flippers.find(f => f.name === flipperName);
    return { node, flipper, upSign, rest: node.rotation.y };
  }).filter(Boolean);

  // One ball, so the first ball shadow follows it and the rest are hidden.
  const [ballShadow, ...spareBallShadows] = shadows.ballShadows.map(name => model.getObjectByName(name)).filter(Boolean);
  spareBallShadows.forEach(node => { node.visible = false; });
  // The ball-shadow script sizes the shadow 5 by 5 (the table draws it 6.5 wide).
  if (ballShadow) ballShadow.scale.x *= 5 / 6.5;

  // Playfield lights: their outlines (exported as <name>_insert) glow from the bulb. The bulb is
  // in the GLB's coordinates; the glow needs it in the outline's own.
  model.updateMatrixWorld(true);
  const lightViews = lights.map(light => {
    const node = model.getObjectByName(`${light.name}_insert`);
    if (!node) return null;
    const center = node.worldToLocal(model.localToWorld(new THREE.Vector3(light.center[0], 0, light.center[1])));
    // The falloff, in the outline's own units (it may be scaled).
    const falloff = light.falloff / node.getWorldScale(new THREE.Vector3()).x;
    node.material = lightGlowMaterial({ ...light, center, falloff });
    return { light, node, brightness: light.on ? 1 : 0, offUntil: 0 };
  }).filter(Boolean);
  // Bumper rings drop when the bumper fires and spring back, as Visual Pinball animates them.
  const ringViews = (definition.bumpers || []).map(bumper => {
    const node = model.getObjectByName(`${bumper.name}Ring`);
    return node && { bumper, node, rest: node.position.y, offset: 0, dropping: false };
  }).filter(Boolean);
  physics.events.addEventListener('bumper', ({ detail }) => {
    const view = ringViews.find(({ bumper }) => bumper.name === detail.name);
    if (view) view.dropping = true;
  });

  // Spinner plates turn about their axle (the spinner's tangent, in the plate's parent's frame).
  const spinnerViews = spinners.map(spinner => {
    const node = model.getObjectByName(`${spinner.name}Plate`);
    if (!node) return null;
    const { tangent: [tangentX, tangentZ] } = definition.spinners.find(s => s.name === spinner.name);
    const parentRotation = node.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    const axis = new THREE.Vector3(tangentX, 0, tangentZ).applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(parentRotation);
    return { spinner, node, axis, rest: node.quaternion.clone(), turn: new THREE.Quaternion() };
  }).filter(Boolean);

  // Lights a slingshot's script turns off for a moment when it kicks.
  physics.events.addEventListener('slingshot', ({ detail }) => {
    lightViews.forEach(view => {
      const { offWhenKicked } = view.light;
      if (offWhenKicked && offWhenKicked.slingshot === detail.name) view.offUntil = performance.now() / 1000 + offWhenKicked.seconds;
    });
  });
  let lastUpdate = performance.now() / 1000;

  // Visual Pinball creates the ball at run time, so it is not in the GLB.
  const ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(ball.radius, 32, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.12, envMapIntensity: environmentIntensity })
  );
  scene.add(ballMesh);

  // Playfield reflections: everything above the playfield, or just the ball.
  const mode = reflectionMode(renderer);
  if (mode !== 'off' && reflections.playfield > 0) {
    ballMesh.layers.enable(REFLECTION_LAYER);
    const notReflected = new Set(['playfield_mesh', ...shadows.ballShadows, ...Object.keys(shadows.flipperShadows), ...lights.map(light => `${light.name}_insert`)]);
    if (mode === 'all') model.traverse(node => { if (node.isMesh && !notReflected.has(node.name)) node.layers.enable(REFLECTION_LAYER); });
    // Lights only light objects on a layer they are on.
    scene.traverse(node => { if (node.isLight) node.layers.enable(REFLECTION_LAYER); });
    const reflection = new PlayfieldReflection(new THREE.PlaneGeometry(width, length), {
      strength: (VIEW.lighting.reflection ?? reflections.playfield) * (mode === 'ball' ? reflections.ball : 1),
      resolution: renderer.xr.enabled ? 512 : 1024
    });
    reflection.name = 'playfieldReflection';
    reflection.rotation.x = -Math.PI / 2;
    reflection.position.y = REFLECTION_LIFT;
    tableGroup.add(reflection);
  }

  const update = () => {
    // Follows the table body, so nudges move the whole table.
    const position = table.body.translation();
    tableGroup.position.set(position.x, position.y, position.z);

    flipperViews.forEach(({ flipper, upSign, pivot }) => { pivot.rotation.y = flipper.getStroke() * upSign; });
    flipperShadowViews.forEach(({ node, flipper, upSign, rest }) => { node.rotation.y = rest + flipper.getStroke() * upSign; });

    const pull = plungerRestOffset + plunger.pullAmount * definition.plunger.pullDistance;
    plungerParts.forEach((part, i) => { part.position.z = plungerBase[i] + pull; });

    const now = performance.now() / 1000;
    const elapsed = Math.min(0.1, now - lastUpdate);
    const fade = Math.min(1, elapsed / LIGHT_FADE_SECONDS);
    lastUpdate = now;

    ringViews.forEach(view => {
      const { ringDrop, ringSpeed } = view.bumper;
      if (view.dropping) {
        view.offset = Math.min(ringDrop, view.offset + ringSpeed * elapsed);
        if (view.offset >= ringDrop) view.dropping = false;
      } else {
        view.offset = Math.max(0, view.offset - ringSpeed * elapsed);
      }
      view.node.position.y = view.rest - view.offset;
    });
    spinnerViews.forEach(({ spinner, node, axis, rest, turn }) => {
      node.quaternion.copy(turn.setFromAxisAngle(axis, spinner.getAngle())).multiply(rest);
    });
    lightViews.forEach(view => {
      const target = view.light.on && now >= view.offUntil ? 1 : 0;
      view.brightness += (target - view.brightness) * fade;
      view.node.material.uniforms.brightness.value = view.brightness;
      view.node.visible = view.brightness > 0.001;
    });

    ballMesh.visible = ball.body.isEnabled();
    const ballPosition = ball.body.translation();
    const ballRotation = ball.body.rotation();
    ballMesh.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
    ballMesh.quaternion.set(ballRotation.x, ballRotation.y, ballRotation.z, ballRotation.w);

    if (ballShadow) {
      // The ball-shadow script: under the ball, pushed outward from the table's centre line by
      // 1.25/50 of the distance to it, and 12 VP units toward the player. In the GLB's coordinates.
      const local = table.toLocal(ballPosition);
      const glbX = local.x + width / 2;
      ballShadow.visible = ballMesh.visible;
      ballShadow.position.x = glbX + (glbX - width / 2) * 1.25 / 50;
      ballShadow.position.z = local.z + length / 2 + 12 * METRES_PER_VPU;
    }
  }

  return { update };
}
