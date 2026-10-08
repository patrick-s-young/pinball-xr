import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader';
import { WATER, WATER3D } from '@src/App.config';
import { tableRaster } from '@src/water/tableRaster';
import { wallMesh } from '@physics/elements/Walls';
import {
  clearGridShader, p2g1Shader, p2g2Shader, updateGridShader, g2pShader, countShader,
  proxyShader, depthMapShader, thicknessMapShader, fullScreenShader, bilateralShader, gaussianShader, fluidShader
} from './shaders';

const GRAVITY = 9.81;
// The original simulation's units: gravity 0.3 cells per time unit², steps of 0.2 time units.
// Matching that to the real 9.81 m/s² fixes how long a time unit is for a given cell size; the
// water's own gravity is then a fraction of it.
const GRID_GRAVITY = 0.3;
const GRID_STEP = 0.2;
// Cells of padding around the table in the grid (the original keeps particles 3 cells inside).
const PAD = 3;
const PARTICLE_BYTES = 80;
// Free space (m) above the top of the rail, for splashes.
const HEADROOM = 0.05;
// The tank's last film goes all at once below this level (m).
const TANK_EMPTY = 0.0005;
const CONTRACTION = 0.61;
// How fast water in space the ball cannot reach disappears, and at the drain (1/s).
const OUTSIDE_SINK = 4;
const DRAIN_SINK = 60;
// Particles are allocated for the tank's water at up to this many per cell.
const MAX_REST_DENSITY = 8;
// How often (frames) to count the remaining particles.
const COUNT_EVERY = 30;

// A cylinder (bumpers), in table space.
const cylinder = ([cx, cz], radius, height, segments = 24) => {
  const positions = [], indices = [];
  for (let i = 0; i < segments; i++) {
    const a = i / segments * 2 * Math.PI;
    positions.push(cx + Math.cos(a) * radius, 0, cz + Math.sin(a) * radius, cx + Math.cos(a) * radius, height, cz + Math.sin(a) * radius);
  }
  positions.push(cx, height, cz);
  for (let i = 0; i < segments; i++) {
    const a = 2 * i, b = 2 * ((i + 1) % segments);
    indices.push(a, b, b + 1, a, b + 1, a + 1, a + 1, b + 1, 2 * segments);
  }
  return { positions, indices };
}

// A flipper at rest: the outline around its base and tip circles, extruded to its height.
const flipperProxy = ({ pivot: [px, pz], restDirection: [dx, dz], length, baseRadius, tipRadius, height }) => {
  const points = [];
  for (let i = 0; i < 32; i++) {
    const a = i / 32 * 2 * Math.PI;
    points.push([px + Math.cos(a) * baseRadius, pz + Math.sin(a) * baseRadius]);
    points.push([px + dx * length + Math.cos(a) * tipRadius, pz + dz * length + Math.sin(a) * tipRadius]);
  }
  // Convex hull (monotone chain).
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => list.reduce((hull, p) => {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
    hull.push(p);
    return hull;
  }, []);
  const loop = [...half(points).slice(0, -1), ...half([...points].reverse()).slice(0, -1)];
  const cap = loop.slice(1, -1).map((_, i) => [0, i + 1, i + 2]);
  const { vertices, indices } = wallMesh({ loops: [loop], height, cap });
  return { positions: Array.from(vertices), indices: Array.from(indices) };
}

const sphere = (radius, detail = 2) => {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  return { positions: Array.from(geometry.attributes.position.array), indices: Array.from({ length: geometry.attributes.position.count }, (_, i) => i) };
}

// WebGPU's perspective projection (depth 0 to 1) for a three.js camera.
const projection = (camera) => {
  const f = 1 / Math.tan(camera.fov * Math.PI / 360);
  const { near, far, aspect } = camera;
  return new THREE.Matrix4().set(
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, far / (near - far), near * far / (near - far),
    0, 0, -1, 0);
}

// The table's environment image as an 8-bit equirectangular texture (tone-mapped, sRGB), for the
// water's reflections.
const loadEnvironment = async (device, url) => {
  let width = 2, height = 1, pixels = new Uint8Array([90, 90, 90, 255, 90, 90, 90, 255]);
  if (url) {
    try {
      const texture = await new EXRLoader().setDataType(THREE.FloatType).loadAsync(url);
      ({ width, height } = texture.image);
      const data = texture.image.data;
      const channels = data.length / (width * height);
      pixels = new Uint8Array(width * height * 4);
      for (let k = 0; k < width * height; k++) {
        for (let c = 0; c < 3; c++) {
          const value = data[k * channels + c];
          pixels[k * 4 + c] = Math.round(Math.pow(value / (1 + value), 1 / 2.2) * 255);
        }
        pixels[k * 4 + 3] = 255;
      }
    } catch (error) {
      console.warn('The 3D water could not load the environment image; using grey.', error);
    }
  }
  const texture = device.createTexture({ size: [width, height], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
  device.queue.writeTexture({ texture }, pixels, { bytesPerRow: width * 4 }, [width, height]);
  return texture;
}

// The obstacle field over the playfield, at half the grid's cell size: per field cell, the signed
// distance (field cells) to the nearest wall or bumper, its height (grid cells), and how fast
// water drains there.
const obstacleField = (definition, cell) => {
  const raster = tableRaster({ definition, cellSize: cell / 2, sinkRate: DRAIN_SINK });
  const { cols, rows } = raster;
  const toOpen = raster.distanceTransform((k) => !raster.wall[k]);
  const toWall = raster.distanceTransform((k) => raster.wall[k] === 1);
  // Heights reach a few cells out from each wall, for water just beside it.
  const height = Float32Array.from(raster.wallHeight);
  for (let pass = 0; pass < 3; pass++) {
    const next = Float32Array.from(height);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      if (raster.wall[k]) continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
        const cc = c + dc, rr = r + dr;
        if (cc >= 0 && cc < cols && rr >= 0 && rr < rows) next[k] = Math.max(next[k], height[rr * cols + cc]);
      });
    }
    height.set(next);
  }
  const field = new Float32Array(cols * rows * 4);
  for (let k = 0; k < cols * rows; k++) {
    field[k * 4] = raster.wall[k] ? -(toOpen[k] - 0.5) : toWall[k] - 0.5;
    field[k * 4 + 1] = PAD + height[k] / cell;
    field[k * 4 + 2] = raster.outside[k] ? OUTSIDE_SINK : raster.sinkRate[k];
  }
  return { raster, field };
}

// Where the panel keeps the viewer's settings between page loads (see Water3DPanel).
export const SETTINGS_KEY = 'pinball-xr.water3d';

// Settings the viewer saved from the panel, keeping only ones that still exist.
const savedSettings = (defaults) => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([key, value]) => key in defaults && typeof value === typeof defaults[key]));
  } catch {
    return {};
  }
}

// True 3D water (?water=3d, desktop, needs WebGPU): the tank's water as particles in an MLS-MPM
// fluid simulation (adapted from WebGPU-Ocean, see shaders.js), drawn with WebGPU on a canvas
// over the table's own (WebGL) canvas. Splashes, droplets, and water over walls; the ball and the
// water do not affect each other. The tank pours as in WATER: WATER.delay seconds after the first
// launch (or at once with ?water=3d-now), at the rate its level and gap give.
//
// `settings` starts from WATER3D, plus the water's gravity and volume (litres); the panel
// (Water3DPanel) changes it. The fluid, gravity, and look apply at once; the volume and grid cell
// size, and anything that needs rebuilding, apply when the water is poured again (pourAgain).
export const Water3DView = async ({ physics, renderer, camera, releaseNow = false }) => {
  if (!navigator.gpu) throw new Error('this browser has no WebGPU');
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('no WebGPU adapter');
  const device = await adapter.requestDevice();
  device.addEventListener('uncapturederror', (event) => console.error('3D water:', event.error.message));

  const { definition, table, flippers, events, ball } = physics;
  const { width, length, slopeDegrees } = definition.playfield;
  const slope = slopeDegrees * Math.PI / 180;
  const tankLayout = tableRaster({ definition, cellSize: 0.005, sinkRate: 0 }).tank;
  const tankHeight = WATER.tank.height * tankLayout.width;
  // The defaults from App.config.js, and the panel's settings: those, with any the viewer saved.
  const defaults = {
    ...WATER3D,
    gravity: WATER.gravity,
    // Litres in the tank.
    volume: Math.round(tankLayout.width * WATER.tank.depth * tankLayout.width * tankHeight * 1000 * 100) / 100
  };
  const settings = { ...defaults, ...savedSettings(defaults) };
  settings.color = [...settings.color];
  // Water goes under the apron (out of sight) where it starts to drain: a ball's width past the
  // flipper tips.
  const tipZ = Math.max(...definition.flippers.map(({ pivot: [, pz], restDirection: [, dz], length: span }) => pz + dz * span));

  // --- The simulation, rebuilt for each pour ----------------------------------------------------

  const fixedPoint = { fixed_point_multiplier: 1e7 };
  const computePipeline = (code, constants = {}) => device.createComputePipeline({ layout: 'auto', compute: { module: device.createShaderModule({ code }), entryPoint: 'main', constants } });
  const bind = (pipeline, buffers) => device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: buffers.map((buffer, binding) => ({ binding, resource: { buffer } })) });
  const pipelines = {
    clearGrid: computePipeline(clearGridShader),
    p2g1: computePipeline(p2g1Shader, fixedPoint),
    p2g2: computePipeline(p2g2Shader, fixedPoint),
    updateGrid: computePipeline(updateGridShader, fixedPoint),
    g2p: computePipeline(g2pShader, fixedPoint),
    count: computePipeline(countShader)
  };
  const simParams = new Float32Array(52);
  const simBuffer = device.createBuffer({ size: simParams.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const countBuffer = device.createBuffer({ size: 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST });
  const countReadBuffer = device.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });

  const buildSimulation = () => {
    const cell = settings.cellSize;
    const { raster, field } = obstacleField(definition, cell);
    const { tank } = raster;
    const timeUnit = Math.sqrt(GRID_GRAVITY * cell / GRAVITY);
    const grid = [Math.ceil(width / cell) + 2 * PAD, Math.ceil((tank.railHeight + HEADROOM) / cell) + 2 * PAD, Math.ceil(length / cell) + 2 * PAD];
    const gridCount = grid[0] * grid[1] * grid[2];
    const tankArea = settings.volume / 1000 / tankHeight;
    const maxParticles = Math.ceil(settings.volume / 1000 / (cell ** 3 / MAX_REST_DENSITY)) + 1024;
    const particleBuffer = device.createBuffer({ size: maxParticles * PARTICLE_BYTES, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    const cellBuffer = device.createBuffer({ size: gridCount * 16, usage: GPUBufferUsage.STORAGE });
    const fieldBuffer = device.createBuffer({ size: field.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(fieldBuffer, 0, field);
    const { clearGrid, p2g1, p2g2, updateGrid, g2p, count } = pipelines;
    const simulation = {
      cell, timeUnit, stepSeconds: GRID_STEP * timeUnit, grid, gridCount, raster, tank, tankArea, maxParticles,
      particleBuffer, cellBuffer, fieldBuffer,
      toGrid: (x, y, z) => [PAD + (x + width / 2) / cell, PAD + y / cell, PAD + (z + length / 2) / cell],
      gridToTable: new THREE.Matrix4().makeTranslation(-width / 2 - PAD * cell, -PAD * cell, -length / 2 - PAD * cell).multiply(new THREE.Matrix4().makeScale(cell, cell, cell)),
      hiddenBeyond: PAD + (tipZ + 2 * definition.ball.radius + length / 2) / cell,
      tankState: { level: tankHeight, jetSpeed: 0, pending: 0, start: 0 },
      emitted: 0,
      live: 0,
      countBindGroup: bind(count, [particleBuffer, countBuffer])
    };
    simulation.passes = [
      [clearGrid, bind(clearGrid, [cellBuffer]), () => gridCount],
      [p2g1, bind(p2g1, [particleBuffer, cellBuffer, simBuffer]), () => simulation.emitted],
      [p2g2, bind(p2g2, [particleBuffer, cellBuffer, simBuffer]), () => simulation.emitted],
      [updateGrid, bind(updateGrid, [cellBuffer, simBuffer, fieldBuffer]), () => gridCount],
      [g2p, bind(g2p, [particleBuffer, cellBuffer, simBuffer, fieldBuffer]), () => simulation.emitted]
    ];
    return simulation;
  }
  let sim = buildSimulation();
  const discard = (old) => [old.particleBuffer, old.cellBuffer, old.fieldBuffer].forEach(buffer => buffer.destroy());

  // --- Rendering -------------------------------------------------------------------------------

  const glCanvas = renderer.domElement;
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'absolute', pointerEvents: 'none' });
  document.body.appendChild(canvas);
  const context = canvas.getContext('webgpu');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'premultiplied' });

  const environment = await loadEnvironment(device, definition.visuals?.environment?.url);
  const linearSampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  const renderParams = new Float32Array(68);
  const renderBuffer = device.createBuffer({ size: renderParams.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const shadingBuffer = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const blurX = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const blurY = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  device.queue.writeBuffer(blurX, 0, new Float32Array([1, 0]));
  device.queue.writeBuffer(blurY, 0, new Float32Array([0, 1]));

  // Stand-ins for the table's solid parts: walls, rubbers, and bumpers (fixed, in table space),
  // the flippers (each turned about its pivot), and the ball.
  const proxyPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: device.createShaderModule({ code: proxyShader }), entryPoint: 'vs', buffers: [{ arrayStride: 12, attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x3' }] }] },
    primitive: { topology: 'triangle-list' },
    depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' }
  });
  const proxy = ({ positions, indices }) => {
    const vertexBuffer = device.createBuffer({ size: positions.length * 4, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(vertexBuffer, 0, new Float32Array(positions));
    const indexBuffer = device.createBuffer({ size: indices.length * 4, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(indexBuffer, 0, new Uint32Array(indices));
    const uniform = device.createBuffer({ size: 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    return { vertexBuffer, indexBuffer, count: indices.length, uniform, bindGroup: bind(proxyPipeline, [uniform]) };
  }
  const merged = { positions: [], indices: [] };
  const addTo = (target, { positions, indices }) => {
    const base = target.positions.length / 3;
    target.positions.push(...positions);
    target.indices.push(...indices.map(i => i + base));
  }
  definition.walls.forEach(wall => { const { vertices, indices } = wallMesh(wall); addTo(merged, { positions: Array.from(vertices), indices: Array.from(indices) }); });
  (definition.bumpers || []).forEach(({ center, radius, height }) => addTo(merged, cylinder(center, radius, height)));
  const staticProxy = proxy(merged);
  const flipperProxies = flippers.map(flipper => {
    const spec = definition.flippers.find(f => f.name === flipper.name);
    return { flipper, spec, ...proxy(flipperProxy(spec)) };
  });
  const ballProxy = proxy(sphere(ball.radius));

  let screen = null;
  const screenPipeline = (code, targetFormat, constants) => device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: device.createShaderModule({ code: fullScreenShader }), entryPoint: 'vs', constants: screen },
    fragment: { module: device.createShaderModule({ code }), entryPoint: 'fs', constants, targets: [{ format: targetFormat }] },
    primitive: { topology: 'triangle-list' }
  });
  const spritePipeline = (code, targetFormat, depth, blend) => device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: device.createShaderModule({ code }), entryPoint: 'vs' },
    fragment: { module: device.createShaderModule({ code }), entryPoint: 'fs', targets: [{ format: targetFormat, ...(blend && { blend }) }] },
    primitive: { topology: 'triangle-list' },
    ...(depth && { depthStencil: { format: 'depth32float', depthWriteEnabled: true, depthCompare: 'less' } })
  });

  // Everything sized to the canvas, or depending on the particles or the drawing settings, is
  // rebuilt when any of those change (targets = null).
  let targets = null;
  const resize = () => {
    const w = Math.max(1, Math.round(glCanvas.width * settings.resolution)), h = Math.max(1, Math.round(glCanvas.height * settings.resolution));
    const rect = glCanvas.getBoundingClientRect();
    Object.assign(canvas.style, { left: `${rect.left + window.scrollX}px`, top: `${rect.top + window.scrollY}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    if (targets && canvas.width === w && canvas.height === h && targets.background.width === glCanvas.width && targets.background.height === glCanvas.height) return;
    if (targets) targets.textures.forEach(texture => texture.destroy());
    canvas.width = w; canvas.height = h;
    screen = { screenWidth: w, screenHeight: h };
    const texture = (format, usage = GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING, size = [w, h]) => device.createTexture({ size, format, usage });
    const radius = settings.particleSize / 2 * sim.cell;
    const filter = {
      depth_threshold: radius * 10,
      max_filter_size: 100,
      projected_particle_constant: (12 * 2 * radius * 0.05 * (h / 2)) / Math.tan(camera.fov * Math.PI / 360)
    };
    const t = {
      proxyDepth: texture('depth32float'),
      particleDepth: texture('depth32float', GPUTextureUsage.RENDER_ATTACHMENT),
      depth: texture('r32float'),
      depthTemp: texture('r32float'),
      thickness: texture('r16float'),
      thicknessTemp: texture('r16float'),
      background: texture('rgba8unorm', GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST, [glCanvas.width, glCanvas.height])
    };
    const views = Object.fromEntries(Object.entries(t).map(([name, tex]) => [name, tex.createView()]));
    const depthMap = spritePipeline(depthMapShader, 'r32float', true);
    const thicknessMap = spritePipeline(thicknessMapShader, 'r16float', false, {
      color: { operation: 'add', srcFactor: 'one', dstFactor: 'one' }, alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one' }
    });
    const bilateral = screenPipeline(bilateralShader, 'r32float', filter);
    const gaussian = screenPipeline(gaussianShader.replace('let filter_size = 30;', `let filter_size = ${Math.round(settings.thicknessBlur)};`), 'r16float');
    const fluid = screenPipeline(fluidShader, format);
    const group = (pipeline, entries) => device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries });
    const particles = { binding: 0, resource: { buffer: sim.particleBuffer } };
    targets = {
      ...t, textures: Object.values(t), views, depthMap, thicknessMap, bilateral, gaussian, fluid,
      depthMapGroup: group(depthMap, [particles, { binding: 1, resource: { buffer: renderBuffer } }, { binding: 2, resource: views.proxyDepth }]),
      thicknessMapGroup: group(thicknessMap, [particles, { binding: 1, resource: { buffer: renderBuffer } }, { binding: 2, resource: views.proxyDepth }]),
      bilateralGroups: [[views.depth, blurX], [views.depthTemp, blurY]].map(([source, dir]) => group(bilateral, [{ binding: 1, resource: source }, { binding: 2, resource: { buffer: dir } }])),
      gaussianGroups: [[views.thickness, blurX], [views.thicknessTemp, blurY]].map(([source, dir]) => group(gaussian, [{ binding: 1, resource: source }, { binding: 2, resource: { buffer: dir } }])),
      fluidGroup: group(fluid, [
        { binding: 0, resource: linearSampler }, { binding: 1, resource: views.depth }, { binding: 2, resource: { buffer: renderBuffer } },
        { binding: 3, resource: views.thickness }, { binding: 4, resource: environment.createView() }, { binding: 5, resource: views.background },
        { binding: 6, resource: { buffer: shadingBuffer } }
      ])
    };
    renderParams.set([1 / w, 1 / h, 2 * radius, sim.hiddenBeyond], 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // --- The tank ----------------------------------------------------------------------------------

  let releaseAt = releaseNow ? 0 : null;
  events.addEventListener('plunger', ({ detail }) => {
    if (detail.launched && releaseAt === null) releaseAt = performance.now() / 1000 + WATER.delay;
  });
  let released = false, finished = false, lastFrame = null, frame = 0, counting = false, stepsPerFrame = 0;
  const emitBuffer = new ArrayBuffer(PARTICLE_BYTES * 4096);

  // Water leaving the gap this frame, as new particles spread along the jet it makes.
  const pour = (seconds, time) => {
    const { tankState, tank, tankArea, cell, timeUnit } = sim;
    const gapHeight = WATER.tank.gap * tankHeight;
    const opened = Math.min(1, time / WATER.openTime) * gapHeight;
    if (opened <= 0 || tankState.level <= 0) { tankState.jetSpeed = 0; return; }
    const flowing = Math.min(opened, tankState.level);
    const jetSpeed = Math.sqrt(2 * GRAVITY * settings.gravity * (tankState.level - flowing / 2));
    const thickness = flowing * CONTRACTION;
    let volume = thickness * jetSpeed * seconds * tank.width;
    if (tankState.level - volume / tankArea < TANK_EMPTY) volume = tankState.level * tankArea;
    tankState.level = Math.max(0, tankState.level - volume / tankArea);
    tankState.jetSpeed = jetSpeed;
    tankState.pending += volume / (cell ** 3 / settings.restDensity);
    const n = Math.min(Math.floor(tankState.pending), sim.maxParticles - sim.emitted, 4096);
    if (n <= 0) return;
    tankState.pending -= n;
    const velocity = jetSpeed * timeUnit / cell;
    for (let i = 0; i < n; i++) {
      const x = tank.x0 + Math.random() * (tank.x1 - tank.x0);
      const y = tank.railHeight + Math.random() * Math.max(thickness, cell / 2);
      const z = tank.faceZ + cell / 2 + Math.random() * jetSpeed * seconds;
      const view = new Float32Array(emitBuffer, i * PARTICLE_BYTES, PARTICLE_BYTES / 4);
      view.fill(0);
      view.set([...sim.toGrid(x, y, z), 1, 0, 0, velocity, 0]);
    }
    device.queue.writeBuffer(sim.particleBuffer, sim.emitted * PARTICLE_BYTES, emitBuffer, 0, n * PARTICLE_BYTES);
    sim.emitted += n;
  }

  const tableMatrix = new THREE.Matrix4();
  const matrix = new THREE.Matrix4();
  const writeMatrix = (buffer, m) => device.queue.writeBuffer(buffer, 0, new Float32Array(m.elements));

  const render = (encoder) => {
    const { views } = targets;
    const viewProjection = projection(camera).multiply(camera.matrixWorldInverse);
    const position = table.body.translation(), rotation = table.body.rotation();
    tableMatrix.compose(new THREE.Vector3(position.x, position.y, position.z), new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w), new THREE.Vector3(1, 1, 1));

    // Stand-ins into the depth buffer the water is hidden behind.
    writeMatrix(staticProxy.uniform, matrix.copy(viewProjection).multiply(tableMatrix));
    flipperProxies.forEach(({ flipper, spec, uniform }) => {
      const [px, pz] = spec.pivot;
      const turn = new THREE.Matrix4().makeTranslation(px, 0, pz)
        .multiply(new THREE.Matrix4().makeRotationY(flipper.getStroke() * spec.upSign))
        .multiply(new THREE.Matrix4().makeTranslation(-px, 0, -pz));
      writeMatrix(uniform, matrix.copy(viewProjection).multiply(tableMatrix).multiply(turn));
    });
    const ballPosition = ball.body.translation();
    writeMatrix(ballProxy.uniform, matrix.copy(viewProjection).multiply(new THREE.Matrix4().makeTranslation(ballPosition.x, ballPosition.y, ballPosition.z)));
    const proxyPass = encoder.beginRenderPass({ colorAttachments: [], depthStencilAttachment: { view: views.proxyDepth, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' } });
    proxyPass.setPipeline(proxyPipeline);
    [staticProxy, ...flipperProxies, ...(ball.body.isEnabled() ? [ballProxy] : [])].forEach(({ vertexBuffer, indexBuffer, count, bindGroup }) => {
      proxyPass.setBindGroup(0, bindGroup);
      proxyPass.setVertexBuffer(0, vertexBuffer);
      proxyPass.setIndexBuffer(indexBuffer, 'uint32');
      proxyPass.drawIndexed(count);
    });
    proxyPass.end();

    // Camera, grid matrices, and shading for the water.
    const view = new THREE.Matrix4().copy(camera.matrixWorldInverse).multiply(tableMatrix).multiply(sim.gridToTable);
    const proj = projection(camera);
    renderParams.set(new THREE.Matrix4().copy(proj).invert().elements, 4);
    renderParams.set(proj.elements, 20);
    renderParams.set(view.elements, 36);
    renderParams.set(camera.matrixWorld.elements, 52);
    device.queue.writeBuffer(renderBuffer, 0, renderParams);
    device.queue.writeBuffer(shadingBuffer, 0, new Float32Array([...settings.color, settings.density, settings.refraction, settings.environment, 1, settings.glow]));

    const colorPass = (target, clear = [0, 0, 0, 1], depth) => encoder.beginRenderPass({
      colorAttachments: [{ view: target, clearValue: clear, loadOp: 'clear', storeOp: 'store' }],
      ...(depth && { depthStencilAttachment: { view: depth, depthClearValue: 1, depthLoadOp: 'clear', depthStoreOp: 'store' } })
    });
    const drawParticles = (pass, pipeline, bindGroup) => { pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup); pass.draw(6, sim.emitted); pass.end(); };
    const fullScreen = (pass, pipeline, bindGroup) => { pass.setPipeline(pipeline); pass.setBindGroup(0, bindGroup); pass.draw(6); pass.end(); };

    drawParticles(colorPass(views.depth, [0, 0, 0, 1], views.particleDepth), targets.depthMap, targets.depthMapGroup);
    for (let i = 0; i < Math.round(settings.depthSmoothing); i++) {
      fullScreen(colorPass(views.depthTemp), targets.bilateral, targets.bilateralGroups[0]);
      fullScreen(colorPass(views.depth), targets.bilateral, targets.bilateralGroups[1]);
    }
    drawParticles(colorPass(views.thickness), targets.thicknessMap, targets.thicknessMapGroup);
    fullScreen(colorPass(views.thicknessTemp), targets.gaussian, targets.gaussianGroups[0]);
    fullScreen(colorPass(views.thickness), targets.gaussian, targets.gaussianGroups[1]);
    fullScreen(colorPass(context.getCurrentTexture().createView(), [0, 0, 0, 0]), targets.fluid, targets.fluidGroup);
  }

  // This step's settings for the simulation, including each flipper's capsule in grid cells.
  const writeSimParams = () => {
    const { grid, cell, timeUnit, stepSeconds, raster } = sim;
    simParams.fill(0);
    simParams.set([...grid, GRID_STEP], 0);
    simParams.set([0, -GRID_GRAVITY * settings.gravity * Math.cos(slope), GRID_GRAVITY * settings.gravity * Math.sin(slope), stepSeconds], 4);
    simParams.set([raster.cols, raster.rows, cell / raster.cellSize, PAD], 8);
    simParams.set([flippers.length, frame % 16777216, settings.floorFriction * timeUnit, 0], 12);
    flippers.slice(0, 4).forEach((flipper, i) => {
      const { pivot: [px, pz], restDirection: [x, z], length: span, baseRadius, tipRadius, height, upSign } = definition.flippers.find(f => f.name === flipper.name);
      const angle = flipper.getStroke() * upSign;
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const [gx, , gz] = sim.toGrid(px, 0, pz);
      simParams.set([gx, gz, x * cos + z * sin, -x * sin + z * cos, span / cell, baseRadius / cell, tipRadius / cell, PAD + height / cell], 16 + i * 8);
    });
    simParams.set([settings.stiffness, settings.restDensity, settings.viscosity, 0], 48);
    device.queue.writeBuffer(simBuffer, 0, simParams);
  }

  // Clears the water's canvas (when there is no water to draw).
  const clear = () => {
    const encoder = device.createCommandEncoder();
    encoder.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), clearValue: [0, 0, 0, 0], loadOp: 'clear', storeOp: 'store' }] }).end();
    device.queue.submit([encoder.finish()]);
  }

  return {
    settings,
    defaults,
    update: () => {},
    // After the table's frame is drawn: copy it (for refraction), advance the water, and draw it.
    afterRender: () => {
      if (finished) return;
      const now = performance.now() / 1000;
      if (!released) {
        if (releaseAt === null || now < releaseAt) return;
        released = true;
        lastFrame = now;
        sim.tankState.start = now;
      }
      const seconds = Math.min(now - lastFrame, 1 / 20);
      lastFrame = now;
      frame++;
      resize();
      pour(seconds, now - sim.tankState.start);

      stepsPerFrame = Math.min(Math.round(settings.maxSteps), Math.max(1, Math.round(seconds / sim.stepSeconds)));
      for (let s = 0; s < stepsPerFrame; s++) {
        writeSimParams();
        // Each step's settings must be in place before its passes run, so each step is its own
        // submission.
        const stepEncoder = device.createCommandEncoder();
        const pass = stepEncoder.beginComputePass();
        sim.passes.forEach(([pipeline, bindGroup, size]) => {
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.dispatchWorkgroups(Math.ceil(size() / 64));
        });
        pass.end();
        device.queue.submit([stepEncoder.finish()]);
        frame++;
      }
      const encoder = device.createCommandEncoder();
      device.queue.copyExternalImageToTexture({ source: glCanvas }, { texture: targets.background }, [glCanvas.width, glCanvas.height]);
      render(encoder);

      // Every so often, count the water left; once the tank is empty and none is left, stop.
      if (frame % COUNT_EVERY <= stepsPerFrame && !counting && sim.emitted > 0) {
        counting = true;
        const counted = sim;
        encoder.clearBuffer(countBuffer);
        const pass = encoder.beginComputePass();
        pass.setPipeline(pipelines.count);
        pass.setBindGroup(0, counted.countBindGroup);
        pass.dispatchWorkgroups(Math.ceil(counted.emitted / 64));
        pass.end();
        encoder.copyBufferToBuffer(countBuffer, 0, countReadBuffer, 0, 4);
        device.queue.submit([encoder.finish()]);
        countReadBuffer.mapAsync(GPUMapMode.READ).then(() => {
          counted.live = new Uint32Array(countReadBuffer.getMappedRange())[0];
          countReadBuffer.unmap();
          counting = false;
          if (counted === sim && counted.tankState.level <= 0 && counted.live === 0) {
            finished = true;
            clear();
          }
        });
      } else {
        device.queue.submit([encoder.finish()]);
      }
    },
    // Redraws with the current drawing settings (particle size, blur, resolution).
    redraw: () => { targets = null; },
    // Starts the water again from a full tank, with the current settings, at once.
    pourAgain: () => {
      const old = sim;
      sim = buildSimulation();
      discard(old);
      targets = null;
      released = true;
      finished = false;
      lastFrame = performance.now() / 1000;
      sim.tankState.start = lastFrame;
    },
    // How much water there is, for the panel.
    stats: () => ({
      particles: sim.live,
      emitted: sim.emitted,
      tank: Math.round(sim.tankState.level / tankHeight * 100),
      grid: sim.grid.join(' x '),
      cells: sim.gridCount,
      stepsPerFrame
    })
  };
}
