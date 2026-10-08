import * as THREE from 'three';
import { WATER } from '@src/App.config';
import { waterMessages } from './waterMessages';

const GRAVITY = 9.81;
// Lifts the water just above the playfield and its reflection.
const LIFT = 0.0006;
// Water thinner than this (m) is not drawn.
const VISIBLE_DEPTH = 0.00005;
// Steepens the surface's slopes for lighting, so the flow's shape catches the light.
const NORMAL_SCALE = 4;
// Seconds to wait for the worker to start.
const START_TIMEOUT = 5;
// Ripples: how often the pattern repeats per metre, cycles per second, and how much it tilts the
// surface.
const RIPPLE_SCALE = 25;
const RIPPLE_RATE = 0.8;
const RIPPLE_STRENGTH = 0.35;
// Rows of the falling sheet from the tank.
const FALL_SEGMENTS = 16;

const SHALLOW_COLOR = new THREE.Color(0.22, 0.01, 0.015);
const DEEP_COLOR = new THREE.Color(0.08, 0.0, 0.004);
const FOAM_COLOR = new THREE.Color(0.75, 0.35, 0.35);

// Only what the simulation needs, to keep the message to the worker small.
const simulationDefinition = ({ playfield, ball, walls, bumpers, drains, plunger, flippers }) =>
  ({ playfield, ball, walls, bumpers, drains, plunger, flippers });

// Starts the simulation in a worker, so the game never waits for it. If no worker starts (some
// headless browsers), the same code runs on the main thread instead. Either way the result is the
// simulation's `ready` message and a channel to it: post(message, transfer), listen(handler), stop().
const startWorker = (init) => new Promise((resolve, reject) => {
  const worker = new Worker(new URL('./water.worker.js', import.meta.url));
  const fail = (error) => { clearTimeout(timeout); worker.terminate(); reject(error); };
  const timeout = setTimeout(() => fail(new Error('the water worker did not start')), START_TIMEOUT * 1000);
  worker.onerror = fail;
  worker.onmessage = ({ data }) => {
    if (data.type !== 'ready') return;
    clearTimeout(timeout);
    resolve({
      ready: data,
      post: (message, transfer) => worker.postMessage(message, transfer),
      listen: (handler) => { worker.onmessage = ({ data: message }) => handler(message); },
      stop: () => worker.terminate()
    });
  };
  worker.postMessage(init);
});

const startOnMainThread = (init) => {
  let ready = null;
  let handler = () => {};
  const handle = waterMessages((message) => { if (message.type === 'ready') ready = message; else handler(message); });
  handle(init);
  return { ready, post: (message) => handle(message), listen: (listener) => { handler = listener; }, stop: () => {} };
}

const startSimulation = async (init) => {
  try {
    return await startWorker(init);
  } catch (error) {
    console.warn('The water simulation is running on the main thread, which may slow the game.', error);
    return startOnMainThread(init);
  }
}

// A grid mesh with a vertex at each cell's centre, in table space (y up from the playfield).
const surfaceGeometry = ({ cols, rows, cellSize, width, length }) => {
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      positions.set([-width / 2 + (c + 0.5) * cellSize, 0, -length / 2 + (r + 0.5) * cellSize], k * 3);
      uvs.set([(c + 0.5) / cols, (r + 0.5) / rows], k * 2);
    }
  }
  const indices = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c, b = a + 1, d = a + cols, e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  // The surface moves in the vertex shader, so it is never culled by its flat bounds.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Math.hypot(width, length));
  return geometry;
}

// A tileable bump pattern for ripples: smooth noise, stored as its slope (x and y in red and
// green), so the shader reads a ripple's tilt with one lookup.
const rippleTexture = (size = 128) => {
  let seed = 3;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const smooth = (t) => t * t * (3 - 2 * t);
  const height = new Float32Array(size * size);
  [[4, 1], [8, 0.5], [16, 0.25]].forEach(([cells, weight]) => {
    const lattice = Array.from({ length: cells * cells }, random);
    const at = (i, j) => lattice[(j % cells) * cells + (i % cells)];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / size * cells, v = y / size * cells;
        const i = Math.floor(u), j = Math.floor(v), fu = smooth(u - i), fv = smooth(v - j);
        const top = at(i, j) + (at(i + 1, j) - at(i, j)) * fu;
        const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fu;
        height[y * size + x] += (top + (bottom - top) * fv) * weight;
      }
    }
  });
  const slopes = new Float32Array(size * size * 2);
  let largest = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const k = y * size + x;
      slopes[2 * k] = height[y * size + (x + 1) % size] - height[y * size + (x + size - 1) % size];
      slopes[2 * k + 1] = height[((y + 1) % size) * size + x] - height[((y + size - 1) % size) * size + x];
      largest = Math.max(largest, Math.abs(slopes[2 * k]), Math.abs(slopes[2 * k + 1]));
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let k = 0; k < size * size; k++) {
    data[k * 4] = Math.round((slopes[2 * k] / largest * 0.5 + 0.5) * 255);
    data[k * 4 + 1] = Math.round((slopes[2 * k + 1] / largest * 0.5 + 0.5) * 255);
    data[k * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

// Three.js's standard material (so the water is lit and reflects the table's environment), with
// its surface raised by the simulated depth, coloured by depth and speed, and rippled: a bump
// pattern drifts with the local flow, in two cross-faded phases so it never stretches far (a flow
// map).
const surfaceMaterial = (waterMap, { cols, rows, cellSize }) => {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.05, metalness: 0, transparent: true, depthWrite: false });
  const uniforms = {
    waterMap: { value: waterMap },
    waterTexel: { value: new THREE.Vector2(1 / cols, 1 / rows) },
    waterCell: { value: cellSize },
    waterTime: { value: 0 },
    rippleMap: { value: rippleTexture() },
    shallowColor: { value: SHALLOW_COLOR },
    deepColor: { value: DEEP_COLOR },
    foamColor: { value: FOAM_COLOR }
  };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D waterMap;
        uniform vec2 waterTexel;
        uniform float waterCell;
        varying float vWaterDepth;
        varying float vWaterSpeed;
        varying vec2 vWaterFlow;
        varying vec2 vWaterPlane;
        varying vec3 vWaterAcross;
        varying vec3 vWaterAlong;
        float waterAt(vec2 at) { return texture2D(waterMap, at).r; }`)
      .replace('#include <beginnormal_vertex>', `
        vec4 water = texture2D(waterMap, uv);
        vWaterDepth = water.r;
        vWaterSpeed = water.g;
        vWaterFlow = water.ba;
        vWaterPlane = position.xz;
        // The table's x and z directions in view space, for tilting the normal by the ripples.
        vWaterAcross = normalize((modelViewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        vWaterAlong = normalize((modelViewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
        float slopeScale = ${NORMAL_SCALE.toFixed(1)} / (2.0 * waterCell);
        vec3 objectNormal = normalize(vec3(
          (waterAt(uv - vec2(waterTexel.x, 0.0)) - waterAt(uv + vec2(waterTexel.x, 0.0))) * slopeScale,
          1.0,
          (waterAt(uv - vec2(0.0, waterTexel.y)) - waterAt(uv + vec2(0.0, waterTexel.y))) * slopeScale));`)
      .replace('#include <begin_vertex>', `vec3 transformed = vec3(position.x, water.r + ${LIFT}, position.z);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float waterTime;
        uniform sampler2D rippleMap;
        uniform vec3 shallowColor;
        uniform vec3 deepColor;
        uniform vec3 foamColor;
        varying float vWaterDepth;
        varying float vWaterSpeed;
        varying vec2 vWaterFlow;
        varying vec2 vWaterPlane;
        varying vec3 vWaterAcross;
        varying vec3 vWaterAlong;
        vec2 rippleSlope(vec2 at) { return texture2D(rippleMap, at).rg * 2.0 - 1.0; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (vWaterDepth < ${VISIBLE_DEPTH}) discard;
        // Deeper water is bluer and more opaque; a thin film is nearly clear; fast water is foamy.
        float deep = 1.0 - exp(-vWaterDepth * 200.0);
        float film = smoothstep(${VISIBLE_DEPTH}, 0.002, vWaterDepth);
        float foam = smoothstep(1.2, 2.5, vWaterSpeed) * 0.45 * film;
        diffuseColor.rgb = mix(mix(shallowColor, deepColor, deep), foamColor, foam);
        diffuseColor.a = min(0.9, 0.08 + 0.2 * film + 0.55 * deep + 0.3 * foam) * smoothstep(${VISIBLE_DEPTH}, ${VISIBLE_DEPTH * 4}, vWaterDepth);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          float cycle = waterTime * ${RIPPLE_RATE.toFixed(2)};
          float phaseA = fract(cycle);
          float phaseB = fract(cycle + 0.5);
          vec2 at = vWaterPlane * ${RIPPLE_SCALE.toFixed(1)};
          vec2 drift = vWaterFlow * ${(RIPPLE_SCALE / RIPPLE_RATE).toFixed(2)};
          vec2 slope = mix(rippleSlope(at - drift * phaseA), rippleSlope(at - drift * phaseB + vec2(0.37, 0.71)), abs(1.0 - 2.0 * phaseA));
          float strength = ${RIPPLE_STRENGTH.toFixed(2)} * clamp(vWaterSpeed * 2.0, 0.2, 1.0) * smoothstep(${VISIBLE_DEPTH}, 0.002, vWaterDepth);
          normal = normalize(normal - (slope.x * vWaterAcross + slope.y * vWaterAlong) * strength);
        }`);
  };
  return material;
}

// The water released from a tank above the top of the table (see WaterSimulation), drawn over
// the playfield. The simulation runs in a worker; each frame the view sends it the flippers'
// positions and the time passed, and draws the depths it sends back. The tank opens WATER.delay
// seconds after the first ball is launched (?water=now opens it at once; ?water=off disables it).
export const WaterView = async ({ scene, physics }) => {
  const { definition, table, flippers, events } = physics;
  const { width, length } = definition.playfield;
  const mode = new URLSearchParams(window.location.search).get('water');

  const simulation = await startSimulation({
    type: 'init',
    definition: simulationDefinition(definition),
    settings: { cellSize: WATER.cellSize, tankHeight: WATER.tank.height, tankDepth: WATER.tank.depth, gap: WATER.tank.gap, openTime: WATER.openTime, gravity: WATER.gravity }
  });
  const { ready } = simulation;
  const { cols, rows, cellSize, tank } = ready;

  const group = new THREE.Group();
  scene.add(group);

  const waterMap = new THREE.DataTexture(new Float32Array(cols * rows * 4), cols, rows, THREE.RGBAFormat, THREE.FloatType);
  waterMap.magFilter = waterMap.minFilter = THREE.NearestFilter;
  waterMap.needsUpdate = true;
  const material = surfaceMaterial(waterMap, ready);
  const surface = new THREE.Mesh(surfaceGeometry({ cols, rows, cellSize, width, length }), material);
  // After the playfield reflection, which is also transparent.
  surface.renderOrder = 1;
  surface.visible = false;
  group.add(surface);

  // The sheet of water falling from the tank's gap onto the playfield: a parabola across the
  // tank's width, recomputed as the jet slows.
  const fallPositions = new Float32Array((FALL_SEGMENTS + 1) * 2 * 3);
  const fallGeometry = new THREE.BufferGeometry();
  fallGeometry.setAttribute('position', new THREE.BufferAttribute(fallPositions, 3));
  const fallIndices = [];
  for (let i = 0; i < FALL_SEGMENTS; i++) fallIndices.push(2 * i, 2 * i + 2, 2 * i + 1, 2 * i + 1, 2 * i + 2, 2 * i + 3);
  fallGeometry.setIndex(fallIndices);
  const fall = new THREE.Mesh(fallGeometry, new THREE.MeshStandardMaterial({
    color: SHALLOW_COLOR, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide
  }));
  fall.renderOrder = 2;
  fall.frustumCulled = false;
  fall.visible = false;
  group.add(fall);
  const gNormal = GRAVITY * WATER.gravity * Math.cos(definition.playfield.slopeDegrees * Math.PI / 180);
  const shapeFall = ({ speed, thickness }) => {
    const height = tank.railHeight + thickness / 2;
    const duration = Math.sqrt(2 * height / gNormal);
    for (let i = 0; i <= FALL_SEGMENTS; i++) {
      const t = duration * i / FALL_SEGMENTS;
      const z = tank.faceZ + speed * t;
      const y = Math.max(LIFT, height - gNormal * t * t / 2);
      fallPositions.set([tank.x0, y, z, tank.x1, y, z], i * 6);
    }
    fallGeometry.attributes.position.needsUpdate = true;
    fallGeometry.computeVertexNormals();
  }

  // Released WATER.delay seconds after the first ball is launched.
  let releaseAt = mode === 'now' ? 0 : null;
  let released = false;
  let finished = false;
  events.addEventListener('plunger', ({ detail }) => {
    if (detail.launched && releaseAt === null) releaseAt = performance.now() / 1000 + WATER.delay;
  });

  // One frame in flight at a time; the time passed meanwhile goes with the next request.
  let waiting = false;
  let lastSent = performance.now() / 1000;
  let spare = null;
  simulation.listen((data) => {
    if (data.type !== 'frame') return;
    waiting = false;
    spare = waterMap.image.data;
    waterMap.image.data = data.buffer;
    waterMap.needsUpdate = true;
    surface.visible = true;
    fall.visible = data.jet.speed > 0.01;
    if (fall.visible) shapeFall(data.jet);
    if (data.finished) {
      finished = true;
      surface.visible = fall.visible = false;
      simulation.stop();
    }
  });

  // Each flipper's capsule now, for the simulation.
  const flipperShapes = () => flippers.map(flipper => {
    const { pivot, restDirection: [x, z], length: span, baseRadius, tipRadius, upSign } = definition.flippers.find(f => f.name === flipper.name);
    // Positive rotation about the table's up axis turns +x toward -z.
    const angle = flipper.getStroke() * upSign;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return { pivot, direction: [x * cos + z * sin, -x * sin + z * cos], length: span, baseRadius, tipRadius };
  });

  const update = () => {
    // Follows the table body, so nudges move the water with the table.
    const position = table.body.translation();
    const rotation = table.body.rotation();
    group.position.set(position.x, position.y, position.z);
    group.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);

    if (finished) return;
    const now = performance.now() / 1000;
    material.userData.uniforms.waterTime.value = now;
    if (!released) {
      if (releaseAt === null || now < releaseAt) { lastSent = now; return; }
      released = true;
      simulation.post({ type: 'release' });
    }
    if (waiting) return;
    waiting = true;
    const buffer = spare;
    spare = null;
    const message = { type: 'frame', time: now - lastSent, flippers: flipperShapes(), buffer };
    lastSent = now;
    simulation.post(message, buffer ? [buffer.buffer] : []);
  }

  return { update };
}
