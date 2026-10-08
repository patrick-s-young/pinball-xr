import { tableRaster } from './tableRaster';

// Water released from a tank above the top of the table, flowing down the sloping playfield,
// around everything on it, and away down the drain. Purely visual: the ball and the water do not
// affect each other.
//
// The water is a thin sheet, so it is simulated as shallow water on a grid over the playfield:
// each cell holds a depth, and velocities live on the faces between cells (a staggered grid).
// Each step, the faces accelerate from differences in water level and the slope, bed friction
// slows them (thin water more than deep), and water moves across each face from its upstream
// cell. Walls, bumpers, and flippers block faces; the flippers' cells follow the flippers. Space
// the ball cannot reach (the corners outside the playfield's top arch, for example) counts as
// solid, so no water is lost there.
//
// The tank sits on top of the top rail, its front flush with the rail's face. When its front
// panel slides up, water leaves through the gap at the speed its depth gives it and falls from
// the rail top onto the playfield. A full tank throws it well down the table; as the tank empties
// the landing line moves back toward the rail. Below the flippers the water drains away, faster
// the nearer it gets to the drain.
//
// Table space throughout: x across, z toward the player (down the slope), metres.

const GRAVITY = 9.81;
// A cell is dry below this depth (m).
const DRY = 1e-6;
// Bed friction: linear drag (1/s), and a quadratic term divided by depth (dimensionless, as a
// friction coefficient). Terminal speed down the slope is about sqrt(slope gravity · depth / it).
const LINEAR_DRAG = 0.5;
const BED_FRICTION = 0.004;
// Largest fraction of a cell water may cross in one step.
const COURANT = 0.6;
const MAX_STEP = 1 / 240;
const MAX_FRAME = 1 / 20;
// Fraction of the gap the jet fills (vena contracta) and of the jet's speed carried into the
// water where it lands.
const CONTRACTION = 0.61;
const LANDING_CARRY = 0.5;
// The tank counts as empty below this level (m).
const TANK_EMPTY = 0.0005;
// Below the flippers water drains at up to this rate (1/s), rising from nothing a ball's width
// past the flipper tips to the full rate at the drain.
const SINK_RATE = 60;
// Water left standing (slower than STILL_SPEED, m/s) evaporates at this rate (m/s), so puddles
// caught in corners fade instead of staying forever.
const STILL_SPEED = 0.03;
const EVAPORATION = 0.0005;
// The simulation ends when the tank is empty and less than this much water (m³) is left.
const FINISHED_VOLUME = 1e-7;

// settings: cellSize (m); tankHeight, tankDepth (fractions of the tank's width); gap (fraction of
// the tank's height); openTime (s for the panel to slide up); gravity (fraction of real gravity).
export const WaterSimulation = ({ definition, settings }) => {
  const { cellSize: cell, tankHeight, tankDepth, gap, openTime } = settings;
  const { width, length, slopeDegrees } = definition.playfield;
  const slope = slopeDegrees * Math.PI / 180;
  const gravity = GRAVITY * (settings.gravity ?? 1);
  const gNormal = gravity * Math.cos(slope);
  const gSlope = gravity * Math.sin(slope);
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(length / cell);
  const count = cols * rows;
  const area = cell * cell;
  const xOf = (c) => -width / 2 + (c + 0.5) * cell;
  const zOf = (r) => -length / 2 + (r + 0.5) * cell;
  const colAt = (x) => Math.floor((x + width / 2) / cell);
  const rowAt = (z) => Math.floor((z + length / 2) / cell);
  const clampCol = (c) => Math.max(0, Math.min(cols - 1, c));
  const clampRow = (r) => Math.max(0, Math.min(rows - 1, r));

  // --- The table's layout -------------------------------------------------------------------

  const raster = tableRaster({ definition, cellSize: cell, sinkRate: SINK_RATE });
  const { tankColumns, sinkRate, wallHeight: solidHeight } = raster;
  // Walls, bumpers, and space the ball cannot reach (so no water collects there) are solid.
  const solid = new Uint8Array(count);
  for (let k = 0; k < count; k++) solid[k] = raster.wall[k] || raster.outside[k];

  // Flippers move, so their cells are recomputed each frame (setFlippers). open = neither solid
  // nor under a flipper.
  const open = new Uint8Array(count);
  for (let k = 0; k < count; k++) open[k] = solid[k] ? 0 : 1;
  let flipperCells = [];

  // --- The tank -------------------------------------------------------------------------------

  const tankWidth = tankColumns.length * cell;
  const tankHeightM = tankHeight * tankWidth;
  const tankArea = tankWidth * tankDepth * tankWidth;
  const gapHeight = gap * tankHeightM;

  // --- State ----------------------------------------------------------------------------------

  const depth = new Float32Array(count);
  const speed = new Float32Array(count);
  // Velocity at each cell's centre (m/s).
  const flowX = new Float32Array(count);
  const flowZ = new Float32Array(count);
  // Face velocities: u between (c - 1, r) and (c, r); w between (c, r - 1) and (c, r).
  const uStride = cols + 1;
  const u = new Float32Array(uStride * rows);
  const w = new Float32Array(cols * (rows + 1));
  const potential = new Float32Array(count);
  const scale = new Float32Array(count);
  const bedPotential = new Float32Array(count);
  for (let k = 0; k < count; k++) bedPotential[k] = -gSlope * zOf(Math.floor(k / cols));
  // Rows that may hold water (with a margin), to skip dry parts of the table.
  let wetFrom = rows, wetTo = -1;

  const state = {
    released: false,
    finished: false,
    time: 0,
    // Water height in the tank (m).
    tankLevel: tankHeightM,
    totals: { released: 0, drained: 0, evaporated: 0 },
    // The falling sheet from the gap: speed (m/s) and thickness (m) as it leaves.
    jet: { speed: 0, thickness: 0 },
    maxSpeed: 0,
    maxDepth: 0,
    steps: 0
  };

  // Water from the tank for one step, landing where the jet does.
  const pour = (dt) => {
    const opened = Math.min(1, state.time / openTime) * gapHeight;
    if (opened <= 0 || state.tankLevel <= 0) { state.jet.speed = 0; state.jet.thickness = 0; return; }
    // Once the level is below the top of the gap, the water spills over the gap's sill.
    const flowing = Math.min(opened, state.tankLevel);
    const jetSpeed = Math.sqrt(2 * gravity * (state.tankLevel - flowing / 2));
    const thickness = flowing * CONTRACTION;
    // The last film of water in the tank goes all at once.
    let perWidth = thickness * jetSpeed * dt;
    if (state.tankLevel - perWidth * tankWidth / tankArea < TANK_EMPTY) perWidth = state.tankLevel * tankArea / tankWidth;
    state.tankLevel = Math.max(0, state.tankLevel - perWidth * tankWidth / tankArea);
    state.totals.released += perWidth * tankWidth;
    state.jet.speed = jetSpeed;
    state.jet.thickness = thickness;
    const added = perWidth * cell / area;
    tankColumns.forEach(({ c, faceZ, railHeight }) => {
      const fall = Math.sqrt(2 * (railHeight + thickness / 2) / gNormal);
      const landing = clampRow(rowAt(faceZ + jetSpeed * fall));
      // Where the jet lands on something solid it splashes back off it, upstream; if there is
      // nothing open upstream (the space outside the playfield), it pours down onto the playfield.
      let r = landing;
      while (r >= 0 && !open[r * cols + c]) r--;
      if (r < 0) { r = landing; while (r < rows && !open[r * cols + c]) r++; }
      if (r >= rows) return;
      const k = r * cols + c;
      depth[k] += added;
      wetFrom = Math.min(wetFrom, r); wetTo = Math.max(wetTo, r);
      // The landing water carries some of the jet's speed down the table.
      if (r + 1 < rows && open[k + cols]) {
        const face = (r + 1) * cols + c;
        w[face] = Math.max(w[face], jetSpeed * LANDING_CARRY);
      }
    });
  }

  const step = (dt) => {
    state.time += dt;
    state.steps++;
    if (state.released) pour(dt);
    if (wetTo < 0) return;
    const r0 = Math.max(0, wetFrom - 2), r1 = Math.min(rows - 1, wetTo + 2);
    const k0 = r0 * cols, k1 = (r1 + 1) * cols;

    for (let k = k0; k < k1; k++) potential[k] = gNormal * depth[k] + bedPotential[k];

    // Accelerate the faces, slowed by bed friction (implicitly, so it is stable).
    const inverseCell = 1 / cell;
    for (let r = r0; r <= r1; r++) {
      let a = r * cols, f = r * uStride + 1;
      for (let c = 1; c < cols; c++, a++, f++) {
        const b = a + 1;
        const faceDepth = depth[a] > depth[b] ? depth[a] : depth[b];
        if (!open[a] || !open[b] || faceDepth < DRY) { u[f] = 0; continue; }
        const v = u[f] + dt * (potential[a] - potential[b]) * inverseCell;
        u[f] = v / (1 + dt * (LINEAR_DRAG + BED_FRICTION * (v < 0 ? -v : v) / (faceDepth > 1e-4 ? faceDepth : 1e-4)));
      }
    }
    for (let r = Math.max(1, r0); r <= r1; r++) {
      let b = r * cols;
      for (let c = 0; c < cols; c++, b++) {
        const a = b - cols;
        const faceDepth = depth[a] > depth[b] ? depth[a] : depth[b];
        if (!open[a] || !open[b] || faceDepth < DRY) { w[b] = 0; continue; }
        const v = w[b] + dt * (potential[a] - potential[b]) * inverseCell;
        w[b] = v / (1 + dt * (LINEAR_DRAG + BED_FRICTION * (v < 0 ? -v : v) / (faceDepth > 1e-4 ? faceDepth : 1e-4)));
      }
    }

    // No cell may send out more than it holds.
    for (let r = r0; r <= r1; r++) {
      let k = r * cols, f = r * uStride;
      for (let c = 0; c < cols; c++, k++, f++) {
        const right = u[f + 1], left = u[f], down = w[k + cols], up = w[k];
        const out = (right > 0 ? right : 0) - (left < 0 ? left : 0) + (r < rows - 1 && down > 0 ? down : 0) - (up < 0 ? up : 0);
        scale[k] = out * dt > cell ? cell / (out * dt) : 1;
      }
    }

    // Move the water across each face, from its upstream cell.
    const perFace = dt * inverseCell;
    for (let r = r0; r <= r1; r++) {
      let a = r * cols, f = r * uStride + 1;
      for (let c = 1; c < cols; c++, a++, f++) {
        const v = u[f];
        if (v === 0) continue;
        const donor = v > 0 ? a : a + 1;
        const moved = v * depth[donor] * scale[donor] * perFace;
        depth[a] -= moved; depth[a + 1] += moved;
      }
    }
    for (let r = Math.max(1, r0); r <= r1; r++) {
      let b = r * cols;
      for (let c = 0; c < cols; c++, b++) {
        const v = w[b];
        if (v === 0) continue;
        const donor = v > 0 ? b - cols : b;
        const moved = v * depth[donor] * scale[donor] * perFace;
        depth[b - cols] -= moved; depth[b] += moved;
      }
    }

    // Drains, evaporation, and what the view needs.
    let maxSpeed = 0, maxDepth = 0, from = rows, to = -1;
    for (let r = r0; r <= r1; r++) {
      let k = r * cols, f = r * uStride;
      for (let c = 0; c < cols; c++, k++, f++) {
        let h = depth[k];
        if (h <= 0) { depth[k] = 0; speed[k] = flowX[k] = flowZ[k] = 0; continue; }
        const vx = (u[f] + u[f + 1]) * 0.5, vz = (w[k] + w[k + cols]) * 0.5;
        const s = Math.sqrt(vx * vx + vz * vz);
        speed[k] = s; flowX[k] = vx; flowZ[k] = vz;
        if (sinkRate[k] > 0) {
          const drained = h * Math.min(1, sinkRate[k] * dt);
          h -= drained;
          state.totals.drained += drained * area;
        }
        if (s < STILL_SPEED && open[k]) {
          const evaporated = Math.min(h, EVAPORATION * dt);
          h -= evaporated;
          state.totals.evaporated += evaporated * area;
        }
        depth[k] = h;
        if (h > DRY) { if (r < from) from = r; to = r; }
        if (s > maxSpeed) maxSpeed = s;
        if (h > maxDepth) maxDepth = h;
      }
    }
    wetFrom = from; wetTo = to;
    state.maxSpeed = maxSpeed;
    state.maxDepth = maxDepth;
  }

  const waterVolume = () => {
    let sum = 0;
    for (let k = 0; k < count; k++) sum += depth[k];
    return sum * area;
  }

  return {
    cols,
    rows,
    cellSize: cell,
    // Per cell, row by row from the top of the table: water depth (m), speed and velocity (m/s),
    // and 1 where something solid is (including space the ball cannot reach).
    depth,
    speed,
    flowX,
    flowZ,
    solid,
    // The tank: the x range it spans, the rail face it is flush with and the rail's height, its
    // size (m), and the gap's full height.
    tank: {
      x0: tankColumns.length ? xOf(tankColumns[0].c) - cell / 2 : 0,
      x1: tankColumns.length ? xOf(tankColumns[tankColumns.length - 1].c) + cell / 2 : 0,
      faceZ: tankColumns.length ? Math.min(...tankColumns.map(t => t.faceZ)) : -length / 2,
      railHeight: tankColumns.length ? Math.max(...tankColumns.map(t => t.railHeight)) : 0,
      width: tankWidth,
      height: tankHeightM,
      volume: tankArea * tankHeightM,
      gapHeight
    },
    state,
    // Slides the tank's front panel up.
    release: () => { if (!state.released) { state.released = true; state.time = 0; } },
    // Marks the flippers' cells closed. Each flipper: { pivot: [x, z], direction: [x, z] (unit,
    // pivot to tip), length, baseRadius, tipRadius }.
    setFlippers: (flippers) => {
      flipperCells.forEach(k => { open[k] = solid[k] ? 0 : 1; });
      flipperCells = [];
      flippers.forEach(({ pivot: [px, pz], direction: [dx, dz], length: span, baseRadius, tipRadius }) => {
        const reach = span + baseRadius;
        for (let r = clampRow(rowAt(pz - reach)); r <= clampRow(rowAt(pz + reach)); r++) {
          for (let c = clampCol(colAt(px - reach)); c <= clampCol(colAt(px + reach)); c++) {
            const x = xOf(c) - px, z = zOf(r) - pz;
            const t = Math.max(0, Math.min(span, x * dx + z * dz));
            const radius = baseRadius + (tipRadius - baseRadius) * t / span;
            const k = r * cols + c;
            if (open[k] && Math.hypot(x - dx * t, z - dz * t) <= radius + cell / 2) { open[k] = 0; flipperCells.push(k); }
          }
        }
      });
    },
    // Advances the simulation by a frame's elapsed seconds, in as many steps as the water's speed
    // needs. Does nothing until released or once finished.
    update: (frameTime) => {
      if (!state.released || state.finished) return;
      const total = Math.min(frameTime, MAX_FRAME);
      const fastest = state.maxSpeed + Math.sqrt(gNormal * state.maxDepth) + state.jet.speed * LANDING_CARRY + 0.1;
      const steps = Math.max(1, Math.ceil(total / Math.min(MAX_STEP, COURANT * cell / fastest)));
      for (let i = 0; i < steps; i++) step(total / steps);
      if (state.tankLevel <= 0 && wetTo < 0) state.finished = true;
      else if (state.tankLevel <= 0 && waterVolume() < FINISHED_VOLUME) state.finished = true;
    },
    waterVolume
  };
}
