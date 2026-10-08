// The table's layout on a grid over the playfield, for the water simulations (WaterSimulation and
// the 3D water in src/water3d): where walls and bumpers are and how tall, the space the ball can
// never reach, the columns under the tank on the top rail, and where water drains away.
//
// Table space: x across, z toward the player (down the slope), metres. Cells are row by row from
// the top of the table.

// Columns whose first open cell is within this distance (m) of the playfield's top edge are under
// the tank.
const TANK_EDGE = 0.03;
// Space counts as reachable where the ball has this much clearance (m) from anything solid, and
// within the ball's radius of such space.
const BALL_CLEARANCE = 0.008;

const insidePolygon = (x, z, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

const distanceToSegment = (x, z, x1, z1, x2, z2) => {
  const dx = x2 - x1, dz = z2 - z1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - (x1 + dx * t), z - (z1 + dz * t));
}

// Chamfer distance (in cells) from each cell to the nearest cell where `isSource` holds, also
// counting the grid's edges as sources.
const distanceTransform = (cols, rows, isSource) => {
  const count = cols * rows;
  const distance = new Float32Array(count);
  for (let k = 0; k < count; k++) distance[k] = isSource(k) ? 0 : 1e9;
  const diagonal = Math.SQRT2;
  const relax = (k, n, d) => { if (distance[n] + d < distance[k]) distance[k] = distance[n] + d; };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const k = r * cols + c;
    if (r === 0 || c === 0 || c === cols - 1) distance[k] = Math.min(distance[k], 1);
    if (c > 0) relax(k, k - 1, 1);
    if (r > 0) { relax(k, k - cols, 1); if (c > 0) relax(k, k - cols - 1, diagonal); if (c < cols - 1) relax(k, k - cols + 1, diagonal); }
  }
  for (let r = rows - 1; r >= 0; r--) for (let c = cols - 1; c >= 0; c--) {
    const k = r * cols + c;
    if (r === rows - 1) distance[k] = Math.min(distance[k], 1);
    if (c < cols - 1) relax(k, k + 1, 1);
    if (r < rows - 1) { relax(k, k + cols, 1); if (c < cols - 1) relax(k, k + cols + 1, diagonal); if (c > 0) relax(k, k + cols - 1, diagonal); }
  }
  return distance;
}

// sinkRate: how fast (1/s) water drains at the drain; it rises from nothing a ball's width past
// the flipper tips to that rate at the drain (or the bottom of the table).
export const tableRaster = ({ definition, cellSize: cell, sinkRate: fullSinkRate }) => {
  const { width, length } = definition.playfield;
  const ballRadius = definition.ball.radius;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(length / cell);
  const count = cols * rows;
  const xOf = (c) => -width / 2 + (c + 0.5) * cell;
  const zOf = (r) => -length / 2 + (r + 0.5) * cell;
  const colAt = (x) => Math.floor((x + width / 2) / cell);
  const rowAt = (z) => Math.floor((z + length / 2) / cell);
  const clampCol = (c) => Math.max(0, Math.min(cols - 1, c));
  const clampRow = (r) => Math.max(0, Math.min(rows - 1, r));

  // 1 where a wall or bumper is, with its height. Every cell inside a wall, and every cell an edge
  // passes within half a cell of, so thin walls have no gaps water could leak through.
  const wall = new Uint8Array(count);
  const wallHeight = new Float32Array(count);
  const markWall = (k, height) => { wall[k] = 1; wallHeight[k] = Math.max(wallHeight[k], height); };
  definition.walls.forEach(({ loops, height }) => {
    const [outer, inner] = loops;
    const xs = outer.map(p => p[0]), zs = outer.map(p => p[1]);
    for (let r = clampRow(rowAt(Math.min(...zs))); r <= clampRow(rowAt(Math.max(...zs))); r++) {
      for (let c = clampCol(colAt(Math.min(...xs))); c <= clampCol(colAt(Math.max(...xs))); c++) {
        const x = xOf(c), z = zOf(r);
        if (insidePolygon(x, z, outer) && !(inner && insidePolygon(x, z, inner))) markWall(r * cols + c, height);
      }
    }
    loops.forEach(loop => loop.forEach(([x1, z1], i) => {
      const [x2, z2] = loop[(i + 1) % loop.length];
      for (let r = clampRow(rowAt(Math.min(z1, z2) - cell)); r <= clampRow(rowAt(Math.max(z1, z2) + cell)); r++) {
        for (let c = clampCol(colAt(Math.min(x1, x2) - cell)); c <= clampCol(colAt(Math.max(x1, x2) + cell)); c++) {
          if (distanceToSegment(xOf(c), zOf(r), x1, z1, x2, z2) <= cell / 2 + 1e-9) markWall(r * cols + c, height);
        }
      }
    }));
  });
  (definition.bumpers || []).forEach(({ center: [cx, cz], radius, height }) => {
    for (let r = clampRow(rowAt(cz - radius)); r <= clampRow(rowAt(cz + radius)); r++) {
      for (let c = clampCol(colAt(cx - radius)); c <= clampCol(colAt(cx + radius)); c++) {
        if (Math.hypot(xOf(c) - cx, zOf(r) - cz) <= radius) markWall(r * cols + c, height);
      }
    }
  });

  // Columns under the tank: those whose first open cell is right at the top of the playfield
  // (the face of the top rail).
  const tankColumns = [];
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows && wall[r * cols + c]) r++;
    if (r === rows || zOf(r) + length / 2 > TANK_EDGE) continue;
    tankColumns.push({ c, faceZ: zOf(r) - cell / 2, railHeight: r > 0 ? wallHeight[(r - 1) * cols + c] : 0 });
  }

  // Space the ball cannot reach (outside the playfield's top arch, for example): open cells that
  // are neither reachable by a flood fill from the served ball through space with room for it, nor
  // within the ball's radius of such space.
  const outside = new Uint8Array(count);
  {
    const clearance = distanceTransform(cols, rows, (k) => wall[k] === 1);
    const roomy = (k) => clearance[k] * cell >= BALL_CLEARANCE;
    const reach = new Int16Array(count).fill(-1);
    const { tip: [tipX, tipZ] } = definition.plunger;
    let start = clampRow(rowAt(tipZ - ballRadius)) * cols + clampCol(colAt(tipX));
    if (!roomy(start)) {
      let best = Infinity;
      for (let k = 0; k < count; k++) {
        if (!roomy(k)) continue;
        const d = Math.hypot(xOf(k % cols) - tipX, zOf(Math.floor(k / cols)) - tipZ);
        if (d < best) { best = d; start = k; }
      }
    }
    const neighbours = (k) => {
      const c = k % cols, list = [];
      if (c > 0) list.push(k - 1);
      if (c < cols - 1) list.push(k + 1);
      if (k >= cols) list.push(k - cols);
      if (k + cols < count) list.push(k + cols);
      return list;
    }
    let frontier = [start];
    reach[start] = 0;
    while (frontier.length) {
      const next = [];
      frontier.forEach(k => neighbours(k).forEach(n => { if (reach[n] < 0 && roomy(n)) { reach[n] = 0; next.push(n); } }));
      frontier = next;
    }
    for (let k = 0; k < count; k++) if (reach[k] === 0) frontier.push(k);
    for (let step = 1; step <= Math.ceil(ballRadius / cell); step++) {
      const next = [];
      frontier.forEach(k => neighbours(k).forEach(n => { if (reach[n] < 0 && !wall[n]) { reach[n] = step; next.push(n); } }));
      frontier = next;
    }
    for (let k = 0; k < count; k++) if (reach[k] < 0 && !wall[k]) outside[k] = 1;
  }

  // Where water drains away (1/s).
  const sinkRate = new Float32Array(count);
  {
    const tipZ = Math.max(...definition.flippers.map(({ pivot: [, pz], restDirection: [, dz], length: span }) => pz + dz * span));
    const from = tipZ + 2 * ballRadius;
    const to = definition.drains.length ? Math.max(...definition.drains.map(({ center: [, cz] }) => cz)) : length / 2;
    for (let r = 0; r < rows; r++) {
      const t = Math.min(1, Math.max(0, (zOf(r) - from) / Math.max(to - from, cell)));
      for (let c = 0; c < cols; c++) if (!wall[r * cols + c] && !outside[r * cols + c]) sinkRate[r * cols + c] = fullSinkRate * t;
    }
  }

  return {
    cols, rows, cellSize: cell, xOf, zOf, colAt, rowAt, clampCol, clampRow,
    // Per cell: 1 where a wall or bumper is, and its height (m).
    wall, wallHeight,
    // Per cell: 1 where the ball can never go (and is not a wall).
    outside,
    // Per cell: how fast water drains there (1/s).
    sinkRate,
    // The columns under the tank: { c, faceZ (the rail's face), railHeight }.
    tankColumns,
    // The tank's x range and the rail face it is flush with, and the rail's height.
    tank: {
      x0: tankColumns.length ? xOf(tankColumns[0].c) - cell / 2 : 0,
      x1: tankColumns.length ? xOf(tankColumns[tankColumns.length - 1].c) + cell / 2 : 0,
      width: tankColumns.length * cell,
      faceZ: tankColumns.length ? Math.min(...tankColumns.map(t => t.faceZ)) : -length / 2,
      railHeight: tankColumns.length ? Math.max(...tankColumns.map(t => t.railHeight)) : 0
    },
    distanceTransform: (isSource) => distanceTransform(cols, rows, isSource)
  };
}
