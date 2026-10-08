// WGSL shaders for the 3D water: an MLS-MPM fluid simulation and screen-space fluid rendering,
// adapted from WebGPU-Ocean by matsuoka-601 (MIT License, https://github.com/matsuoka-601/WebGPU-Ocean).
// Changes from the original: the box is the pinball table (tilted gravity, walls, bumpers, and
// flippers as obstacles, drains that remove particles), particles can be dead, and the surface is
// drawn over the table: hidden behind stand-ins for the table's solid parts, refracting the
// table's own image, and transparent where there is no water.
//
// Simulation positions and velocities are in grid cells, and time in the simulation's own unit
// (see Water3DView for the conversion to metres and seconds).

// --- Simulation --------------------------------------------------------------------------------

const particleStruct = /* wgsl */`
struct Particle {
  position: vec3f,
  alive: f32,
  v: vec3f,
  unused: f32,
  C: mat3x3f,
}`;

// Per-frame simulation settings (see Water3DView's simParams for the layout).
const simStruct = /* wgsl */`
struct Sim {
  grid: vec3f,
  dt: f32,
  gravity: vec3f,
  seconds: f32,
  fieldSize: vec2f,
  fieldScale: f32,
  fieldOffset: f32,
  flipperCount: f32,
  seed: f32,
  // How much the playfield slows water touching it, per time unit.
  floor_friction: f32,
  unused: f32,
  flippers: array<vec4f, 8>,
  // The fluid: stiffness, rest density, viscosity.
  fluid: vec4f,
}`;

const fixedPoint = /* wgsl */`
override fixed_point_multiplier: f32;
fn encodeFixedPoint(value: f32) -> i32 { return i32(value * fixed_point_multiplier); }
fn decodeFixedPoint(value: i32) -> f32 { return f32(value) / fixed_point_multiplier; }`;

// The table's obstacles at a point (in grid cells): (signed distance across the table, height,
// outward normal x, z). Walls and bumpers come from a 2D field over the table; flippers are
// capsules, computed exactly.
const obstacles = /* wgsl */`
fn fieldTap(i: i32, j: i32) -> vec4f {
  let size = vec2i(sim.fieldSize);
  return field[clamp(j, 0, size.y - 1) * size.x + clamp(i, 0, size.x - 1)];
}
fn fieldDistance(at: vec2f) -> f32 {
  let base = floor(at);
  let f = at - base;
  let i = i32(base.x);
  let j = i32(base.y);
  return mix(mix(fieldTap(i, j).x, fieldTap(i + 1, j).x, f.x), mix(fieldTap(i, j + 1).x, fieldTap(i + 1, j + 1).x, f.x), f.y);
}
fn fieldAt(p: vec3f) -> vec2f {
  return (p.xz - vec2f(sim.fieldOffset)) * sim.fieldScale - 0.5;
}
fn obstacle(p: vec3f) -> vec4f {
  let at = fieldAt(p);
  var distance = fieldDistance(at) / sim.fieldScale;
  let gradient = vec2f(fieldDistance(at + vec2f(1.0, 0.0)) - fieldDistance(at - vec2f(1.0, 0.0)),
                       fieldDistance(at + vec2f(0.0, 1.0)) - fieldDistance(at - vec2f(0.0, 1.0)));
  var normal = select(vec2f(0.0, 1.0), normalize(gradient), length(gradient) > 1e-6);
  let nearest = vec2i(round(at));
  var height = fieldTap(nearest.x, nearest.y).y;
  for (var k = 0; k < i32(sim.flipperCount); k++) {
    let a = sim.flippers[2 * k];
    let b = sim.flippers[2 * k + 1];
    let fromPivot = p.xz - a.xy;
    let t = clamp(dot(fromPivot, a.zw), 0.0, b.x);
    let closest = a.xy + a.zw * t;
    let radius = mix(b.y, b.z, t / b.x);
    let offset = p.xz - closest;
    let d = length(offset) - radius;
    if (d < distance) {
      distance = d;
      height = b.w;
      normal = select(vec2f(0.0, 1.0), offset / max(length(offset), 1e-6), length(offset) > 1e-6);
    }
  }
  return vec4f(distance, height, normal);
}`;

const kernel = /* wgsl */`
fn cellIndex(cell: vec3f) -> i32 {
  return i32(cell.x) * i32(sim.grid.y) * i32(sim.grid.z) + i32(cell.y) * i32(sim.grid.z) + i32(cell.z);
}
fn kernelWeights(position: vec3f) -> array<vec3f, 3> {
  let cell_diff = position - (floor(position) + 0.5);
  var weights: array<vec3f, 3>;
  weights[0] = 0.5 * (0.5 - cell_diff) * (0.5 - cell_diff);
  weights[1] = 0.75 - cell_diff * cell_diff;
  weights[2] = 0.5 * (0.5 + cell_diff) * (0.5 + cell_diff);
  return weights;
}`;

export const clearGridShader = /* wgsl */`
struct Cell { vx: i32, vy: i32, vz: i32, mass: i32, }
@group(0) @binding(0) var<storage, read_write> cells: array<Cell>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x < arrayLength(&cells)) { cells[id.x] = Cell(0, 0, 0, 0); }
}`;

export const p2g1Shader = /* wgsl */`
${particleStruct}
${simStruct}
struct Cell { vx: atomic<i32>, vy: atomic<i32>, vz: atomic<i32>, mass: atomic<i32>, }
${fixedPoint}
@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> cells: array<Cell>;
@group(0) @binding(2) var<uniform> sim: Sim;
${kernel}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= arrayLength(&particles)) { return; }
  let particle = particles[id.x];
  if (particle.alive < 0.5) { return; }
  let weights = kernelWeights(particle.position);
  let cell_idx = floor(particle.position);
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let weight = weights[gx].x * weights[gy].y * weights[gz].z;
        let cell_x = cell_idx + vec3f(f32(gx) - 1.0, f32(gy) - 1.0, f32(gz) - 1.0);
        let cell_dist = (cell_x + 0.5) - particle.position;
        let Q = particle.C * cell_dist;
        let vel_contrib = weight * (particle.v + Q);
        let index = cellIndex(cell_x);
        atomicAdd(&cells[index].mass, encodeFixedPoint(weight));
        atomicAdd(&cells[index].vx, encodeFixedPoint(vel_contrib.x));
        atomicAdd(&cells[index].vy, encodeFixedPoint(vel_contrib.y));
        atomicAdd(&cells[index].vz, encodeFixedPoint(vel_contrib.z));
      }
    }
  }
}`;

export const p2g2Shader = /* wgsl */`
${particleStruct}
${simStruct}
struct Cell { vx: atomic<i32>, vy: atomic<i32>, vz: atomic<i32>, mass: i32, }
${fixedPoint}
@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> cells: array<Cell>;
@group(0) @binding(2) var<uniform> sim: Sim;
${kernel}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= arrayLength(&particles)) { return; }
  let particle = particles[id.x];
  if (particle.alive < 0.5) { return; }
  let weights = kernelWeights(particle.position);
  let cell_idx = floor(particle.position);
  var density = 0.0;
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let weight = weights[gx].x * weights[gy].y * weights[gz].z;
        let cell_x = cell_idx + vec3f(f32(gx) - 1.0, f32(gy) - 1.0, f32(gz) - 1.0);
        density += decodeFixedPoint(cells[cellIndex(cell_x)].mass) * weight;
      }
    }
  }
  let volume = 1.0 / density;
  let pressure = max(0.0, sim.fluid.x * (pow(density / sim.fluid.y, 5.0) - 1.0));
  var stress = mat3x3f(-pressure, 0.0, 0.0, 0.0, -pressure, 0.0, 0.0, 0.0, -pressure);
  let strain = particle.C + transpose(particle.C);
  stress += sim.fluid.z * strain;
  let eq_16_term0 = -volume * 4.0 * stress * sim.dt;
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let weight = weights[gx].x * weights[gy].y * weights[gz].z;
        let cell_x = cell_idx + vec3f(f32(gx) - 1.0, f32(gy) - 1.0, f32(gz) - 1.0);
        let cell_dist = (cell_x + 0.5) - particle.position;
        let momentum = eq_16_term0 * weight * cell_dist;
        let index = cellIndex(cell_x);
        atomicAdd(&cells[index].vx, encodeFixedPoint(momentum.x));
        atomicAdd(&cells[index].vy, encodeFixedPoint(momentum.y));
        atomicAdd(&cells[index].vz, encodeFixedPoint(momentum.z));
      }
    }
  }
}`;

export const updateGridShader = /* wgsl */`
${simStruct}
struct Cell { vx: i32, vy: i32, vz: i32, mass: i32, }
${fixedPoint}
@group(0) @binding(0) var<storage, read_write> cells: array<Cell>;
@group(0) @binding(1) var<uniform> sim: Sim;
@group(0) @binding(2) var<storage, read> field: array<vec4f>;
${obstacles}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= arrayLength(&cells) || cells[id.x].mass <= 0) { return; }
  var v = vec3f(decodeFixedPoint(cells[id.x].vx), decodeFixedPoint(cells[id.x].vy), decodeFixedPoint(cells[id.x].vz));
  v = v / decodeFixedPoint(cells[id.x].mass) + sim.gravity * sim.dt;
  let gy = i32(sim.grid.y);
  let gz = i32(sim.grid.z);
  let x = i32(id.x) / gz / gy;
  let y = (i32(id.x) / gz) % gy;
  let z = i32(id.x) % gz;
  // Water cannot flow into the table's obstacles: over the top of one, or through its side.
  let p = vec3f(f32(x), f32(y), f32(z)) + 0.5;
  let o = obstacle(p);
  if (o.x < 0.0 && p.y < o.y) {
    if (o.y - p.y < -o.x) {
      v.y = max(v.y, 0.0);
    } else {
      let into = dot(v.xz, o.zw);
      if (into < 0.0) { v.x -= o.z * into; v.z -= o.w * into; }
    }
  }
  // Water touching the playfield is slowed by it (the playfield is at cell 3).
  if (y <= 3) { let keep = 1.0 / (1.0 + sim.floor_friction * sim.dt); v.x *= keep; v.z *= keep; }
  if (x < 2 || x > i32(sim.grid.x) - 3) { v.x = 0.0; }
  if (y < 2 || y > gy - 3) { v.y = 0.0; }
  if (z < 2 || z > gz - 3) { v.z = 0.0; }
  cells[id.x].vx = encodeFixedPoint(v.x);
  cells[id.x].vy = encodeFixedPoint(v.y);
  cells[id.x].vz = encodeFixedPoint(v.z);
}`;

export const g2pShader = /* wgsl */`
${particleStruct}
${simStruct}
struct Cell { vx: i32, vy: i32, vz: i32, mass: i32, }
${fixedPoint}
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read> cells: array<Cell>;
@group(0) @binding(2) var<uniform> sim: Sim;
@group(0) @binding(3) var<storage, read> field: array<vec4f>;
${kernel}
${obstacles}
// Particles keep this far (cells) from obstacles.
const particle_radius = 0.5;
fn random(index: u32, seed: u32) -> f32 {
  var state = index * 747796405u + seed * 2891336453u + 1u;
  state = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  state = (state >> 22u) ^ state;
  return f32(state) / 4294967295.0;
}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= arrayLength(&particles)) { return; }
  var particle = particles[id.x];
  if (particle.alive < 0.5) { return; }
  let weights = kernelWeights(particle.position);
  let cell_idx = floor(particle.position);
  var v = vec3f(0.0);
  var B = mat3x3f(vec3f(0.0), vec3f(0.0), vec3f(0.0));
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let weight = weights[gx].x * weights[gy].y * weights[gz].z;
        let cell_x = cell_idx + vec3f(f32(gx) - 1.0, f32(gy) - 1.0, f32(gz) - 1.0);
        let cell_dist = (cell_x + 0.5) - particle.position;
        let cell = cells[cellIndex(cell_x)];
        let weighted_velocity = vec3f(decodeFixedPoint(cell.vx), decodeFixedPoint(cell.vy), decodeFixedPoint(cell.vz)) * weight;
        B += mat3x3f(weighted_velocity * cell_dist.x, weighted_velocity * cell_dist.y, weighted_velocity * cell_dist.z);
        v += weighted_velocity;
      }
    }
  }
  particle.C = B * 4.0;
  var position = clamp(particle.position + v * sim.dt, vec3f(1.0), sim.grid - 2.0);

  // Keep out of the table's obstacles: land on top of one, or slide off its side.
  let o = obstacle(position);
  if (position.y < o.y && o.x < particle_radius) {
    let side = particle_radius - o.x;
    let top = o.y - position.y;
    if (top < side) {
      position.y = o.y;
      v.y = max(v.y, 0.0);
    } else {
      position.x += o.z * side;
      position.z += o.w * side;
      let into = dot(v.xz, o.zw);
      if (into < 0.0) { v.x -= o.z * into; v.z -= o.w * into; }
    }
  }

  // The box's walls (the playfield below, the domain's sides) push back softly, as in the original.
  let x_n = position + v * sim.dt * 3.0;
  let wall_min = vec3f(3.0);
  let wall_max = sim.grid - 4.0;
  let wall_stiffness = 0.3;
  if (x_n.x < wall_min.x) { v.x += wall_stiffness * (wall_min.x - x_n.x); }
  if (x_n.x > wall_max.x) { v.x += wall_stiffness * (wall_max.x - x_n.x); }
  if (x_n.y < wall_min.y) { v.y += wall_stiffness * (wall_min.y - x_n.y); }
  if (x_n.y > wall_max.y) { v.y += wall_stiffness * (wall_max.y - x_n.y); }
  if (x_n.z < wall_min.z) { v.z += wall_stiffness * (wall_min.z - x_n.z); }
  if (x_n.z > wall_max.z) { v.z += wall_stiffness * (wall_max.z - x_n.z); }

  particle.position = position;
  particle.v = v;
  // Drains: water there disappears at the field's rate.
  let sink = fieldTap(i32(round(fieldAt(position).x)), i32(round(fieldAt(position).y))).z;
  if (random(id.x, u32(sim.seed)) < sink * sim.seconds) { particle.alive = 0.0; }
  particles[id.x] = particle;
}`;

// Counts the live particles, so the view knows when all the water is gone.
export const countShader = /* wgsl */`
${particleStruct}
@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> count: atomic<u32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x < arrayLength(&particles) && particles[id.x].alive > 0.5) { atomicAdd(&count, 1u); }
}`;

// --- Rendering ---------------------------------------------------------------------------------

const renderStruct = /* wgsl */`
struct RenderUniforms {
  texel_size: vec2f,
  sphere_size: f32,
  // Water further down the table than this (grid cells) is under the apron, out of sight.
  hidden_beyond: f32,
  inv_projection_matrix: mat4x4f,
  projection_matrix: mat4x4f,
  view_matrix: mat4x4f,
  inv_view_matrix: mat4x4f,
}`;

// Stand-ins for the table's solid parts, drawn into a depth buffer the water is hidden behind.
export const proxyShader = /* wgsl */`
@group(0) @binding(0) var<uniform> mvp: mat4x4f;
@vertex
fn vs(@location(0) position: vec3f) -> @builtin(position) vec4f {
  return mvp * vec4f(position, 1.0);
}`;

// Each particle as a sphere facing the camera, as in the original; spheres behind the table's
// solid parts are dropped. `depth` writes each pixel's nearest water depth (view z); `thickness`
// adds up how much water each pixel looks through.
const particleSprite = /* wgsl */`
${particleStruct}
${renderStruct}
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) view_position: vec3f,
}
@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> uniforms: RenderUniforms;
@group(0) @binding(2) var proxy_depth: texture_depth_2d;
@vertex
fn vs(@builtin(vertex_index) vertex_index: u32, @builtin(instance_index) instance_index: u32) -> VertexOutput {
  var corners = array(vec2(0.5, 0.5), vec2(0.5, -0.5), vec2(-0.5, -0.5), vec2(0.5, 0.5), vec2(-0.5, -0.5), vec2(-0.5, 0.5));
  let particle = particles[instance_index];
  if (particle.alive < 0.5 || particle.position.z > uniforms.hidden_beyond) { return VertexOutput(vec4f(2.0, 2.0, 2.0, 1.0), vec2f(0.0), vec3f(0.0)); }
  let corner = vec3(corners[vertex_index] * uniforms.sphere_size, 0.0);
  let view_position = (uniforms.view_matrix * vec4f(particle.position, 1.0)).xyz;
  return VertexOutput(uniforms.projection_matrix * vec4f(view_position + corner, 1.0), corners[vertex_index] + 0.5, view_position);
}
// The sphere's surface at this pixel, in view space, or nothing if the pixel is off the sphere or
// behind the table.
fn sphereSurface(frag_position: vec4f, uv: vec2f, view_position: vec3f) -> vec4f {
  let xy = uv * 2.0 - 1.0;
  let r2 = dot(xy, xy);
  if (r2 > 1.0) { return vec4f(0.0, 0.0, 0.0, -1.0); }
  let surface = view_position + vec3(xy, sqrt(1.0 - r2)) * uniforms.sphere_size / 2.0;
  let clip = uniforms.projection_matrix * vec4f(surface, 1.0);
  let depth = clip.z / clip.w;
  if (depth >= textureLoad(proxy_depth, vec2i(frag_position.xy), 0)) { return vec4f(0.0, 0.0, 0.0, -1.0); }
  return vec4f(surface, depth);
}`;

export const depthMapShader = /* wgsl */`
${particleSprite}
struct FragmentOutput {
  @location(0) color: vec4f,
  @builtin(frag_depth) depth: f32,
}
@fragment
fn fs(@builtin(position) frag_position: vec4f, @location(0) uv: vec2f, @location(1) view_position: vec3f) -> FragmentOutput {
  let surface = sphereSurface(frag_position, uv, view_position);
  if (surface.w < 0.0) { discard; }
  return FragmentOutput(vec4f(surface.z, 0.0, 0.0, 1.0), surface.w);
}`;

export const thicknessMapShader = /* wgsl */`
${particleSprite}
@fragment
fn fs(@builtin(position) frag_position: vec4f, @location(0) uv: vec2f, @location(1) view_position: vec3f) -> @location(0) vec4f {
  let surface = sphereSurface(frag_position, uv, view_position);
  if (surface.w < 0.0) { discard; }
  let xy = uv * 2.0 - 1.0;
  return vec4f(vec3f(0.05 * sqrt(1.0 - dot(xy, xy))), 1.0);
}`;

export const fullScreenShader = /* wgsl */`
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) iuv: vec2f,
}
override screenWidth: f32;
override screenHeight: f32;
@vertex
fn vs(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
  var positions = array(vec2(1.0, 1.0), vec2(1.0, -1.0), vec2(-1.0, -1.0), vec2(1.0, 1.0), vec2(-1.0, -1.0), vec2(-1.0, 1.0));
  var uvs = array(vec2(1.0, 0.0), vec2(1.0, 1.0), vec2(0.0, 1.0), vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, 0.0));
  var out: VertexOutput;
  out.position = vec4(positions[vertex_index], 0.0, 1.0);
  out.uv = uvs[vertex_index];
  out.iuv = out.uv * vec2f(screenWidth, screenHeight);
  return out;
}`;

// Smooths the water's depth while keeping its edges (a bilateral filter), as in the original.
export const bilateralShader = /* wgsl */`
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var<uniform> blur_dir: vec2f;
override depth_threshold: f32;
override projected_particle_constant: f32;
override max_filter_size: f32;
@fragment
fn fs(@location(0) uv: vec2f, @location(1) iuv: vec2f) -> @location(0) vec4f {
  let depth = abs(textureLoad(source, vec2u(iuv), 0).r);
  if (depth >= 1e4 || depth <= 0.0) { return vec4f(vec3f(depth), 1.0); }
  let filter_size = min(i32(max_filter_size), i32(ceil(projected_particle_constant / depth)));
  let sigma = f32(filter_size) / 3.0;
  let two_sigma = 2.0 * sigma * sigma;
  let sigma_depth = depth_threshold / 3.0;
  let two_sigma_depth = 2.0 * sigma_depth * sigma_depth;
  var sum = 0.0;
  var wsum = 0.0;
  for (var x = -filter_size; x <= filter_size; x++) {
    let coords = vec2f(f32(x));
    let sampled_depth = abs(textureLoad(source, vec2u(iuv + coords * blur_dir), 0).r);
    let w = exp(-dot(coords, coords) / two_sigma);
    let r_depth = sampled_depth - depth;
    let wd = exp(-r_depth * r_depth / two_sigma_depth);
    sum += sampled_depth * w * wd;
    wsum += w * wd;
  }
  return vec4f(sum / wsum, 0.0, 0.0, 1.0);
}`;

export const gaussianShader = /* wgsl */`
@group(0) @binding(1) var source: texture_2d<f32>;
@group(0) @binding(2) var<uniform> blur_dir: vec2f;
@fragment
fn fs(@location(0) uv: vec2f, @location(1) iuv: vec2f) -> @location(0) vec4f {
  let thickness = textureLoad(source, vec2u(iuv), 0).r;
  if (thickness == 0.0) { return vec4f(0.0, 0.0, 0.0, 1.0); }
  let filter_size = 30;
  let sigma = f32(filter_size) / 3.0;
  let two_sigma = 2.0 * sigma * sigma;
  var sum = 0.0;
  var wsum = 0.0;
  for (var x = -filter_size; x <= filter_size; x++) {
    let coords = vec2f(f32(x));
    let w = exp(-coords.x * coords.x / two_sigma);
    sum += textureLoad(source, vec2u(iuv + blur_dir * coords), 0).r * w;
    wsum += w;
  }
  return vec4f(sum / wsum, 0.0, 0.0, 1.0);
}`;

// The water's surface: lit, reflecting the table's environment, refracting the table's own image
// beneath it (tinted by how much water the light passes through), and transparent where there is
// no water. Output is premultiplied for the canvas over the table.
export const fluidShader = /* wgsl */`
${renderStruct}
struct Shading {
  water_color: vec3f,
  density: f32,
  refraction: f32,
  environment: f32,
  flip_environment: f32,
  glow: f32,
}
@group(0) @binding(0) var linear_sampler: sampler;
@group(0) @binding(1) var depth_texture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> uniforms: RenderUniforms;
@group(0) @binding(3) var thickness_texture: texture_2d<f32>;
@group(0) @binding(4) var environment_texture: texture_2d<f32>;
@group(0) @binding(5) var background_texture: texture_2d<f32>;
@group(0) @binding(6) var<uniform> shading: Shading;
const PI = 3.14159265;
fn viewPosition(tex_coord: vec2f, depth: f32) -> vec3f {
  var ndc = vec4f(tex_coord.x * 2.0 - 1.0, 1.0 - 2.0 * tex_coord.y, 0.0, 1.0);
  ndc.z = -uniforms.projection_matrix[2].z + uniforms.projection_matrix[3].z / depth;
  let eye = uniforms.inv_projection_matrix * ndc;
  return eye.xyz / eye.w;
}
// A neighbouring pixel's surface; where there is no water there, as if the surface were level.
fn viewPositionAt(tex_coord: vec2f, iuv: vec2f, fallback: f32) -> vec3f {
  var depth = abs(textureLoad(depth_texture, vec2u(iuv), 0).x);
  if (depth >= 1e4 || depth <= 0.0) { depth = fallback; }
  return viewPosition(tex_coord, depth);
}
fn toLinear(color: vec3f) -> vec3f { return pow(color, vec3f(2.2)); }
fn environment(direction: vec3f) -> vec3f {
  var uv = vec2f(atan2(direction.z, direction.x) / (2.0 * PI) + 0.5, asin(clamp(direction.y, -1.0, 1.0)) / PI + 0.5);
  uv.y = select(1.0 - uv.y, uv.y, shading.flip_environment > 0.5);
  return toLinear(textureSampleLevel(environment_texture, linear_sampler, uv, 0.0).rgb) * shading.environment;
}
@fragment
fn fs(@location(0) uv: vec2f, @location(1) iuv: vec2f) -> @location(0) vec4f {
  let depth = abs(textureLoad(depth_texture, vec2u(iuv), 0).r);
  if (depth >= 1e4 || depth <= 0.0) { return vec4f(0.0); }
  let view = viewPosition(uv, depth);
  var ddx = viewPositionAt(uv + vec2f(uniforms.texel_size.x, 0.0), iuv + vec2f(1.0, 0.0), depth) - view;
  var ddy = viewPositionAt(uv + vec2f(0.0, uniforms.texel_size.y), iuv + vec2f(0.0, 1.0), depth) - view;
  let ddx2 = view - viewPositionAt(uv + vec2f(-uniforms.texel_size.x, 0.0), iuv + vec2f(-1.0, 0.0), depth);
  let ddy2 = view - viewPositionAt(uv + vec2f(0.0, -uniforms.texel_size.y), iuv + vec2f(0.0, -1.0), depth);
  if (abs(ddx.z) > abs(ddx2.z)) { ddx = ddx2; }
  if (abs(ddy.z) > abs(ddy2.z)) { ddy = ddy2; }
  let crossed = cross(ddx, ddy);
  let normal = select(vec3f(0.0, 0.0, 1.0), -normalize(crossed), length(crossed) > 1e-12);
  let ray = normalize(view);
  // A light above and in front of the table, to one side, so flat water does not mirror it
  // straight into the player's eyes.
  let light = normalize((transpose(uniforms.inv_view_matrix) * vec4f(0.4, 1.0, 0.6, 0.0)).xyz);
  let specular = 0.5 * pow(max(0.0, dot(normalize(light - ray), normal)), 250.0);

  let thickness = textureLoad(thickness_texture, vec2u(iuv), 0).r;
  // The table beneath, bent by the surface and tinted by the water it is seen through.
  let bent = clamp(uv + vec2f(normal.x, -normal.y) * shading.refraction * min(thickness, 1.0), vec2f(0.0), vec2f(1.0));
  let background = toLinear(textureSampleLevel(background_texture, linear_sampler, bent, 0.0).rgb);
  let transmittance = exp(-shading.density * thickness * (1.0 - shading.water_color));
  // Light scattered inside the water gives deep water its own colour, rather than going black.
  let refracted = background * transmittance + shading.water_color * (1.0 - dot(transmittance, vec3f(1.0 / 3.0))) * shading.glow;
  let fresnel = clamp(0.02 + 0.98 * pow(1.0 - dot(normal, -ray), 5.0), 0.0, 1.0);
  let reflected = environment((uniforms.inv_view_matrix * vec4f(reflect(ray, normal), 0.0)).xyz);
  let color = specular + mix(refracted, reflected, fresnel);
  // Thin spray fades out at its edges.
  let alpha = smoothstep(0.0, 0.03, thickness);
  return vec4f(pow(color, vec3f(1.0 / 2.2)) * alpha, alpha);
}`;
