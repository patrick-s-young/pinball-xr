#!/usr/bin/env node
// Converts a Visual Pinball table (.vpx) into a pinball-xr table definition (JSON).
//
//   npm run import-table -- tables/spike.vpx [src/tables/spike.table.json]
//
// Requires vpxtool (https://github.com/francisdb/vpxtool) to read the .vpx. Set the VPXTOOL
// environment variable to its path, or put it on PATH.
//
// Output is in metres, in table space: x across the table, y up from the playfield, z toward
// the player, with the origin at the centre of the playfield. The importer records geometry and
// Visual Pinball's own physics settings; src/physics/TUNING.js decides how those settings map onto
// the runtime, so retuning never needs a re-import. Visuals and the table script are not imported.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const FORMAT = 2;
// A Visual Pinball ball is 50 VP units across and 1-1/16" (26.9875 mm) in reality.
const METRES_PER_VPU = 0.0269875 / 50;
const BALL_DIAMETER_VPU = 50;
// Curves are subdivided until they stray less than this from a straight segment (VP units).
const CURVE_TOLERANCE_VPU = 0.5;
const MAX_CURVE_DEPTH = 8;

const round = (value) => Math.round(value * 1e5) / 1e5;
const roundPoint = (values) => values.map(round);

// ---------------------------------------------------------------------------------------------
// Reading the table

const extractTable = (vpxPath) => {
  const vpxtool = process.env.VPXTOOL || 'vpxtool';
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpx-import-'));
  execFileSync(vpxtool, ['extract', '--force', '--no-media', '--output-dir', outputDir, vpxPath], { stdio: 'pipe' });
  return outputDir;
}

const readTable = (extractDir) => {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(extractDir, file), 'utf8'));
  const items = fs.readdirSync(path.join(extractDir, 'gameitems'))
    .filter(file => file.endsWith('.json'))
    .map(file => {
      const item = read(path.join('gameitems', file));
      const [type] = Object.keys(item);
      return { type, data: item[type] };
    });
  return { gamedata: read('gamedata.json'), info: read('info.json'), items };
}

// ---------------------------------------------------------------------------------------------
// Visual Pinball's drag-point curves

// Centripetal Catmull-Rom coefficients, as Visual Pinball computes them for smooth drag points.
const catmullCoefficients = (x0, x1, x2, x3, dt0, dt1, dt2) => {
  let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
  let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;
  t1 *= dt1;
  t2 *= dt1;
  return [x1, t1, -3 * x1 + 3 * x2 - 2 * t1 - t2, 2 * x1 - 2 * x2 + t1 + t2];
}

const catmullCurve = (p0, p1, p2, p3) => {
  const distance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  let dt0 = Math.sqrt(distance(p0, p1));
  let dt1 = Math.sqrt(distance(p1, p2));
  let dt2 = Math.sqrt(distance(p2, p3));
  if (dt1 < 1e-4) dt1 = 1;
  if (dt0 < 1e-4) dt0 = dt1;
  if (dt2 < 1e-4) dt2 = dt1;
  const cx = catmullCoefficients(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2);
  const cy = catmullCoefficients(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2);
  const at = (c, t) => c[0] + t * (c[1] + t * (c[2] + t * c[3]));
  return (t) => ({ x: at(cx, t), y: at(cy, t) });
}

// Parameters along a curve where it must be split so no piece strays from its chord by more
// than the tolerance. Gentle curves get few points and tight ones many.
const subdivide = (curve, t0, t1, depth, out) => {
  const a = curve(t0), b = curve(t1), middle = curve((t0 + t1) / 2);
  const chord = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const deviation = Math.abs((b.x - a.x) * (a.y - middle.y) - (a.x - middle.x) * (b.y - a.y)) / chord;
  if (depth < MAX_CURVE_DEPTH && (depth < 1 || deviation > CURVE_TOLERANCE_VPU)) {
    subdivide(curve, t0, (t0 + t1) / 2, depth + 1, out);
    subdivide(curve, (t0 + t1) / 2, t1, depth + 1, out);
  } else {
    out.push(t0);
  }
}

// Points around a closed drag-point loop, in VP units. A segment is curved when either end point
// is marked smooth, using the neighbouring points as Visual Pinball does; otherwise it is
// straight. Each point records whether the segment starting there is a slingshot.
const sampleLoop = (dragPoints) => {
  const count = dragPoints.length;
  const points = [];
  for (let i = 0; i < count; i++) {
    const p1 = dragPoints[i];
    const p2 = dragPoints[(i + 1) % count];
    if (p1.x === p2.x && p1.y === p2.y) continue;
    const previous = p1.smooth ? (i - 1 + count) % count : i;
    const next = p2.smooth ? (i + 2) % count : (i + 1) % count;
    const curve = catmullCurve(dragPoints[previous], p1, p2, dragPoints[next]);
    const parameters = [];
    if (p1.smooth || p2.smooth) subdivide(curve, 0, 1, 0, parameters);
    else parameters.push(0);
    parameters.forEach((t, step) => points.push({ ...curve(t), isSlingshot: step === 0 && Boolean(p1.is_slingshot) }));
  }
  return points;
}

// ---------------------------------------------------------------------------------------------
// Geometry in table space

const makeConverter = (gamedata) => {
  const centerX = (gamedata.left + gamedata.right) / 2;
  const centerY = (gamedata.top + gamedata.bottom) / 2;
  return {
    // VP x/y (y toward the player) to table-space [x, z] in metres.
    point: ({ x, y }) => [(x - centerX) * METRES_PER_VPU, (y - centerY) * METRES_PER_VPU],
    length: (vpu) => vpu * METRES_PER_VPU
  };
}

const signedArea = (loop) => loop.reduce((sum, p, i) => {
  const q = loop[(i + 1) % loop.length];
  return sum + p[0] * q[1] - q[0] * p[1];
}, 0) / 2;

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

// Triangulates a simple polygon by ear clipping. Returns index triples with the same winding as
// the polygon, or null if the outline is not simple enough to triangulate.
const triangulate = (loop) => {
  const orientation = Math.sign(signedArea(loop));
  const remaining = loop.map((_, i) => i);
  const triangles = [];
  const inTriangle = (p, a, b, c) =>
    cross(a, b, p) * orientation >= 0 && cross(b, c, p) * orientation >= 0 && cross(c, a, p) * orientation >= 0;
  let guard = 0;
  while (remaining.length > 3 && guard++ < loop.length * loop.length) {
    let clipped = false;
    for (let i = 0; i < remaining.length; i++) {
      const ia = remaining[(i - 1 + remaining.length) % remaining.length];
      const ib = remaining[i];
      const ic = remaining[(i + 1) % remaining.length];
      const [a, b, c] = [loop[ia], loop[ib], loop[ic]];
      if (cross(a, b, c) * orientation <= 1e-14) continue;
      if (remaining.some(j => j !== ia && j !== ib && j !== ic && inTriangle(loop[j], a, b, c))) continue;
      triangles.push([ia, ib, ic]);
      remaining.splice(i, 1);
      clipped = true;
      break;
    }
    if (clipped === false) return null;
  }
  if (remaining.length === 3) triangles.push(remaining);
  return triangles;
}

// Loops are stored clockwise when seen from above (negative signed area in x/z), so the wall
// faces built from them point outward.
const clockwise = (loop) => signedArea(loop) > 0 ? [...loop].reverse() : loop;

// Offsets a closed loop sideways by distance (positive = outward for a clockwise loop).
const offsetLoop = (loop, distance) => loop.map((p, i) => {
  const previous = loop[(i - 1 + loop.length) % loop.length];
  const next = loop[(i + 1) % loop.length];
  const normalOf = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
  const n1 = normalOf(previous, p), n2 = normalOf(p, next);
  const n = [n1[0] + n2[0], n1[1] + n2[1]];
  const length = Math.hypot(n[0], n[1]) || 1;
  // Keep the offset distance along each edge by lengthening the corner normal, within limits.
  const scale = Math.min(2, 1 / Math.max(0.5, (n[0] * n1[0] + n[1] * n1[1]) / length));
  return [p[0] + n[0] / length * distance * scale, p[1] + n[1] / length * distance * scale];
});

// ---------------------------------------------------------------------------------------------
// Element importers. Each returns an object to merge into the definition, or a skip reason.

const touchesBall = (bottom) => bottom < BALL_DIAMETER_VPU * 0.9;

const importWall = (wall, convert) => {
  if (wall.is_collidable === false) return { skip: 'not collidable' };
  if (touchesBall(wall.height_bottom) === false) return { skip: `above the ball (${wall.height_bottom}-${wall.height_top} VP units)` };
  const sampled = sampleLoop(wall.drag_points);
  let loop = sampled.map(p => convert.point(p));
  let flags = sampled.map(p => p.isSlingshot);
  if (signedArea(loop) > 0) {
    // Reverse to clockwise; each point's flag belongs to the segment that started at it, which
    // now starts at the next point.
    loop = [...loop].reverse();
    flags = [...flags].reverse();
    flags = flags.map((_, i) => flags[(i + 1) % flags.length]);
  }
  const cap = triangulate(loop);
  const slingshots = [];
  loop.forEach((p, i) => {
    if (!flags[i]) return;
    const q = loop[(i + 1) % loop.length];
    const length = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    slingshots.push({
      name: wall.name,
      segment: roundPoint([...p, ...q]),
      // Outward from a clockwise loop.
      normal: roundPoint([-(q[1] - p[1]) / length, (q[0] - p[0]) / length]),
      force: wall.slingshot_force
    });
  });
  return {
    wall: {
      name: wall.name,
      kind: 'wall',
      // Walls are at least as tall as the ball, as Visual Pinball treats them.
      height: round(convert.length(Math.max(wall.height_top, BALL_DIAMETER_VPU))),
      friction: wall.friction,
      restitution: wall.elasticity,
      loops: [loop.map(roundPoint)],
      cap
    },
    slingshots,
    warning: cap === null ? `${wall.name}: outline could not be triangulated, so it has no top` : null
  };
}

const importRubber = (rubber, convert) => {
  if (rubber.is_collidable === false) return { skip: 'not collidable' };
  if (touchesBall(rubber.height - rubber.thickness / 2) === false) return { skip: 'above the ball' };
  const centre = clockwise(sampleLoop(rubber.drag_points).map(p => convert.point(p)));
  const half = convert.length(rubber.thickness) / 2;
  const outer = offsetLoop(centre, half);
  // The inner edge runs the other way so its faces point into the ring.
  const inner = offsetLoop(centre, -half).reverse();
  const count = centre.length;
  // Top between the two edges; inner vertex k (reversed) sits opposite outer vertex count-1-k.
  const cap = [];
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    const innerI = count + (count - 1 - i), innerNext = count + (count - 1 - next);
    cap.push([i, next, innerNext], [i, innerNext, innerI]);
  }
  return {
    wall: {
      name: rubber.name,
      kind: 'rubber',
      height: round(convert.length(Math.max(rubber.height + rubber.thickness / 2, BALL_DIAMETER_VPU))),
      friction: rubber.friction,
      restitution: rubber.elasticity,
      loops: [outer.map(roundPoint), inner.map(roundPoint)],
      cap
    }
  };
}

// VP measures angles in degrees clockwise from straight up the table.
const vpDirection = (degrees) => {
  const radians = degrees * Math.PI / 180;
  return [Math.sin(radians), -Math.cos(radians)];
}

const importFlipper = (flipper, convert) => {
  if (flipper.is_enabled === false) return { skip: 'disabled' };
  const restDirection = vpDirection(flipper.start_angle);
  return {
    flipper: {
      name: flipper.name,
      // A flipper that rests pointing right sits on the left of the table.
      side: restDirection[0] > 0 ? 'left' : 'right',
      pivot: roundPoint(convert.point(flipper.center)),
      restDirection: roundPoint(restDirection),
      // Positive rotation about the table's up axis turns +x toward -z (up the table).
      upSign: flipper.start_angle > flipper.end_angle ? 1 : -1,
      swing: round(Math.abs(flipper.start_angle - flipper.end_angle) * Math.PI / 180),
      length: round(convert.length(flipper.flipper_radius_max)),
      baseRadius: round(convert.length(flipper.base_radius)),
      tipRadius: round(convert.length(flipper.end_radius)),
      height: round(convert.length(flipper.height)),
      // Visual Pinball's own settings; TUNING.flipper maps them onto the runtime.
      strength: flipper.strength,
      mass: flipper.mass,
      returnStrength: flipper.return,
      endOfStrokeTorque: flipper.torque_damping,
      endOfStrokeAngle: round(flipper.torque_damping_angle * Math.PI / 180),
      friction: flipper.friction,
      restitution: flipper.elasticity
    }
  };
}

const importGate = (gate, convert) => {
  if (gate.is_collidable === false) return { skip: 'not collidable' };
  if (gate.two_way) return { skip: 'two-way gates do not stop the ball' };
  const radians = gate.rotation * Math.PI / 180;
  return {
    gate: {
      name: gate.name,
      center: roundPoint(convert.point(gate.center)),
      length: round(convert.length(gate.length)),
      height: round(convert.length(Math.max(gate.height, BALL_DIAMETER_VPU))),
      // Direction along the gate.
      tangent: roundPoint([Math.cos(radians), Math.sin(radians)]),
      // The ball passes moving this way: straight up the table at rotation 0, as VP's default
      // lane gate does.
      allowedDirection: roundPoint(vpDirection(gate.rotation)),
      friction: gate.friction,
      restitution: gate.elasticity
    }
  };
}

const importPlunger = (plunger, convert) => {
  // The plunger tip rests park_position of the way back from its fully forward position.
  const tipY = plunger.center.y - plunger.stroke * (1 - plunger.park_position);
  return {
    plunger: {
      name: plunger.name,
      tip: roundPoint(convert.point({ x: plunger.center.x, y: tipY })),
      width: round(convert.length(plunger.width)),
      strength: plunger.mech_strength
    }
  };
}

const importKicker = (kicker, convert) => {
  if (/drain/i.test(kicker.name) === false) return { skip: 'only drain kickers are imported; balls are served at the plunger' };
  return {
    drain: {
      name: kicker.name,
      center: roundPoint(convert.point(kicker.center)),
      radius: round(convert.length(kicker.radius))
    }
  };
}

const importTrigger = (trigger, convert) => ({
  trigger: {
    name: trigger.name,
    center: roundPoint(convert.point(trigger.center)),
    radius: round(convert.length(trigger.radius))
  }
});

const IMPORTERS = {
  Wall: importWall,
  Rubber: importRubber,
  Flipper: importFlipper,
  Gate: importGate,
  Plunger: importPlunger,
  Kicker: importKicker,
  Trigger: importTrigger
};

const SKIP_REASONS = {
  Ramp: (ramp) => ramp.is_collidable ? 'ramps are not supported yet' : 'not collidable',
  Primitive: (primitive) => primitive.is_collidable && !primitive.is_toy ? 'collidable meshes are not supported yet' : 'not collidable',
  Bumper: () => 'bumpers are not supported yet',
  Spinner: () => 'spinners are not supported yet',
  HitTarget: () => 'targets are not supported yet'
};

// ---------------------------------------------------------------------------------------------

const buildDefinition = ({ gamedata, info, items }, sourceName) => {
  const convert = makeConverter(gamedata);
  const definition = {
    format: FORMAT,
    name: info.table_name || sourceName,
    source: sourceName,
    generatedBy: 'tools/vpx-import.js',
    units: 'metres; table space: x across, y up from the playfield, z toward the player, origin at the playfield centre',
    playfield: {
      width: round(convert.length(gamedata.right - gamedata.left)),
      length: round(convert.length(gamedata.bottom - gamedata.top)),
      slopeDegrees: gamedata.angle_tilt_max,
      glassHeight: round(convert.length(gamedata.glass_top_height)),
      friction: gamedata.friction,
      restitution: gamedata.elasticity
    },
    ball: { radius: round(convert.length(BALL_DIAMETER_VPU / 2)) },
    walls: [],
    slingshots: [],
    flippers: [],
    gates: [],
    plunger: null,
    drains: [],
    triggers: [],
    skipped: [],
    warnings: []
  };

  items.forEach(({ type, data }) => {
    const importer = IMPORTERS[type];
    if (importer === undefined) {
      const reason = SKIP_REASONS[type] ? SKIP_REASONS[type](data) : 'not used by the physics';
      definition.skipped.push({ type, name: data.name, reason });
      return;
    }
    const result = importer(data, convert);
    if (result.skip) definition.skipped.push({ type, name: data.name, reason: result.skip });
    if (result.warning) definition.warnings.push(result.warning);
    if (result.wall) definition.walls.push(result.wall);
    if (result.slingshots) definition.slingshots.push(...result.slingshots);
    if (result.flipper) definition.flippers.push(result.flipper);
    if (result.gate) definition.gates.push(result.gate);
    if (result.plunger) definition.plunger = result.plunger;
    if (result.drain) definition.drains.push(result.drain);
    if (result.trigger) definition.triggers.push(result.trigger);
  });

  if (definition.plunger === null) throw new Error('The table has no plunger.');
  if (definition.flippers.length === 0) throw new Error('The table has no flippers.');
  return definition;
}

const main = () => {
  const [vpxPath, outputArg] = process.argv.slice(2);
  if (!vpxPath) {
    console.error('Usage: npm run import-table -- <table.vpx> [output.table.json]');
    process.exit(1);
  }
  const sourceName = path.basename(vpxPath, '.vpx');
  const outputPath = outputArg || path.join(__dirname, '..', 'src', 'tables', `${sourceName}.table.json`);
  const extractDir = extractTable(vpxPath);
  try {
    const definition = buildDefinition(readTable(extractDir), path.basename(vpxPath));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(definition) + '\n');
    const vertices = definition.walls.reduce((sum, wall) => sum + wall.loops.reduce((s, loop) => s + loop.length, 0), 0);
    console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
    console.log(`  ${definition.walls.length} walls and rubbers (${vertices} outline points), ${definition.slingshots.length} slingshots, ` +
      `${definition.flippers.length} flippers, ${definition.gates.length} gates, ${definition.drains.length} drains, ${definition.triggers.length} triggers`);
    definition.warnings.forEach(warning => console.log(`  warning: ${warning}`));
    console.log(`  skipped ${definition.skipped.length}:`);
    definition.skipped.forEach(({ type, name, reason }) => console.log(`    ${type} ${name}: ${reason}`));
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

main();
