#!/usr/bin/env node
// Converts a Visual Pinball table (.vpx) into a pinball-xr table definition (JSON).
//
//   npm run import-table -- tables/spike.vpx [--no-visuals] [--no-sounds]
//
// Writes src/tables/<name>.table.json (physics), public/tables/<name>.glb (visuals: the table's own
// meshes, materials, textures, and lights, exported with vpxtool), and public/tables/<name>/sounds/
// (the sounds the table plays). The GLB keeps Visual Pinball's layout: origin at the playfield's
// top-left corner, playfield level, metres. Spare parts that table authors keep beside the table
// are left out of the visuals.
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

const VPXTOOL = process.env.VPXTOOL || 'vpxtool';

const extractTable = (vpxPath) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpx-import-'));
  execFileSync(VPXTOOL, ['extract', '--force', '--no-media', '--output-dir', outputDir, vpxPath], { stdio: 'pipe' });
  return outputDir;
}

// ---------------------------------------------------------------------------------------------
// Sounds
//
// Visual Pinball plays a table's sounds from its script, which does not run here. Most tables
// start from Visual Pinball's standard script, so its conventions are used: these sounds for these
// events, and a hit sound for each element in these collections. Speeds are in Visual Pinball's
// units; TUNING.audio converts the ball's speed into them. Sound names are matched without regard
// to case, and anything the table does not have is reported and left out.
const STANDARD_EVENT_SOUNDS = {
  flipperUp: ['fx_flipperup'],
  flipperDown: ['fx_flipperdown'],
  plungerPull: ['plungerpull'],
  plungerRelease: ['plunger'],
  drain: ['drain'],
  ballRelease: ['ballrelease'],
  flipperHit: ['flip_hit_1', 'flip_hit_2', 'flip_hit_3'],
  rolling: ['fx_ballrolling0'],
  ballDrop: ['fx_ball_drop0']
};
const RUBBER_HIT = ['rubber_hit_1', 'rubber_hit_2', 'rubber_hit_3'];
// For each collection, hit sounds by the ball's minimum speed, fastest first.
const STANDARD_HIT_SOUNDS = {
  Rubbers: [{ minSpeed: 20, sounds: ['fx_rubber2'] }, { minSpeed: 6, sounds: RUBBER_HIT }],
  Posts: [{ minSpeed: 16, sounds: ['fx_rubber2'] }, { minSpeed: 6, sounds: RUBBER_HIT }],
  Pins: [{ minSpeed: 0, sounds: ['pinhit_low'] }],
  Targets: [{ minSpeed: 0, sounds: ['target'] }],
  Metals_Thin: [{ minSpeed: 0, sounds: ['metalhit_thin'] }],
  Metals_Medium: [{ minSpeed: 0, sounds: ['metalhit_medium'] }],
  Metals2: [{ minSpeed: 0, sounds: ['metalhit2'] }],
  Gates: [{ minSpeed: 0, sounds: ['gate4'] }]
};
const slingshotSounds = (name) => /left/i.test(name) ? ['left_slingshot'] : /right/i.test(name) ? ['right_slingshot'] : [];

const extractSounds = (vpxPath) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpx-sounds-'));
  execFileSync(VPXTOOL, ['extract', '--force', '--only', 'sounds/*', '--only', 'sounds.json', '--output-dir', outputDir, vpxPath], { stdio: 'pipe' });
  return outputDir;
}

// Maps the table's events and elements to its sounds, copies the sounds used to outputDir, and
// returns the definition's `sounds` section plus a report of what could not be matched.
const importSounds = (vpxPath, definition, collections, outputDir, url) => {
  const extractDir = extractSounds(vpxPath);
  try {
    // Lower-case sound name -> file in the extract. A table without sounds has no sounds folder.
    const soundsDir = path.join(extractDir, 'sounds');
    const available = new Map((fs.existsSync(soundsDir) ? fs.readdirSync(soundsDir) : [])
      .map(file => [path.basename(file, path.extname(file)).toLowerCase(), file]));
    const used = new Set();
    const missing = new Set();
    const pick = (names) => names.filter(name => {
      if (available.has(name)) { used.add(name); return true; }
      missing.add(name);
      return false;
    });

    const events = {};
    Object.entries(STANDARD_EVENT_SOUNDS).forEach(([event, names]) => {
      const found = pick(names);
      if (found.length) events[event] = found;
    });

    const slingshots = {};
    definition.slingshots.forEach(({ name }) => {
      const found = pick(slingshotSounds(name));
      if (found.length) slingshots[name] = found;
    });

    // Element name -> collection, for collections that fire hit events and have a known sound.
    const hits = {};
    const hitProfiles = {};
    const unknownCollections = [];
    collections.filter(collection => collection.fire_events && (collection.items || []).length).forEach(collection => {
      const profile = STANDARD_HIT_SOUNDS[collection.name];
      if (profile === undefined) { unknownCollections.push(collection.name); return; }
      const tiers = profile.map(tier => ({ minSpeed: tier.minSpeed, sounds: pick(tier.sounds) })).filter(tier => tier.sounds.length);
      if (tiers.length === 0) return;
      hitProfiles[collection.name] = tiers;
      collection.items.forEach(item => { hits[item] = collection.name; });
    });

    fs.mkdirSync(outputDir, { recursive: true });
    const files = {};
    used.forEach(name => {
      const file = available.get(name);
      fs.copyFileSync(path.join(extractDir, 'sounds', file), path.join(outputDir, file));
      files[name] = `${url}/${file}`;
    });

    return {
      sounds: { files, events, slingshots, hits, hitProfiles },
      report: { used: used.size, available: available.size, missing: [...missing], unknownCollections }
    };
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------
// Visuals

// Objects placed entirely this far (m) or more outside the playfield are spare parts that table
// authors keep beside the table for reference, not part of the machine.
const SPARE_PART_MARGIN = 0.03;

const readGlb = (buffer) => {
  const jsonLength = buffer.readUInt32LE(12);
  return { json: JSON.parse(buffer.slice(20, 20 + jsonLength).toString('utf8')), binary: buffer.slice(20 + jsonLength) };
}

const writeGlb = ({ json, binary }) => {
  let text = Buffer.from(JSON.stringify(json), 'utf8');
  // Chunks are padded to 4 bytes; the JSON chunk with spaces.
  text = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
  const header = Buffer.alloc(20);
  header.write('glTF', 0, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + text.length + binary.length, 8);
  header.writeUInt32LE(text.length, 12);
  header.write('JSON', 16, 'ascii');
  return Buffer.concat([header, text, binary]);
}

// Column-major 4x4 matrix of a glTF node's translation, rotation, and scale.
const nodeMatrix = ({ matrix, translation: [tx, ty, tz] = [0, 0, 0], rotation: [x, y, z, w] = [0, 0, 0, 1], scale: [sx, sy, sz] = [1, 1, 1] }) => matrix || [
  (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
  2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
  2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
  tx, ty, tz, 1
];
const multiply = (a, b) => Array.from({ length: 16 }, (_, i) => {
  const column = Math.floor(i / 4), row = i % 4;
  return [0, 1, 2, 3].reduce((sum, k) => sum + a[k * 4 + row] * b[column * 4 + k], 0);
});
const transformPoint = (m, [x, y, z]) => [0, 1, 2].map(r => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r]);

// Removes spare parts from the GLB's scene: mesh nodes whose bounds lie wholly outside the
// playfield (GLB coordinates: x across from 0, z down the table from 0). Returns their names.
const removeSpareParts = (gltf, width, length) => {
  const removed = [];
  const outside = (node, world) => {
    const corners = [];
    gltf.meshes[node.mesh].primitives.forEach(primitive => {
      const { min, max } = gltf.accessors[primitive.attributes.POSITION];
      for (let i = 0; i < 8; i++) corners.push(transformPoint(world, [i & 1 ? max[0] : min[0], i & 2 ? max[1] : min[1], i & 4 ? max[2] : min[2]]));
    });
    const xs = corners.map(c => c[0]), zs = corners.map(c => c[2]);
    return Math.max(...xs) < -SPARE_PART_MARGIN || Math.min(...xs) > width + SPARE_PART_MARGIN ||
      Math.max(...zs) < -SPARE_PART_MARGIN || Math.min(...zs) > length + SPARE_PART_MARGIN;
  };
  const visit = (children, parentMatrix) => children.filter(index => {
    const node = gltf.nodes[index];
    const world = multiply(parentMatrix, nodeMatrix(node));
    if (node.mesh !== undefined && outside(node, world)) {
      removed.push(node.name);
      return false;
    }
    if (node.children) node.children = visit(node.children, world);
    return true;
  });
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  gltf.scenes.forEach(scene => { scene.nodes = visit(scene.nodes, identity); });
  return removed;
}

// Shadows that Visual Pinball tables fake in their script, found by the common idioms:
//   ball shadows (ninuzzu):    BallShadow = Array (BallShadow1, BallShadow2, ...)
//   flipper shadows (ninuzzu): FlipperLSh.RotZ = LeftFlipper.CurrentAngle
// Returns { ballShadows: [names], flipperShadows: { shadowName: flipperName } }.
const scriptShadows = (script) => {
  const ballArray = script.match(/^\s*BallShadow\s*=\s*Array\s*\(([^)]*)\)/im);
  const ballShadows = ballArray ? ballArray[1].split(',').map(name => name.trim()).filter(Boolean) : [];
  const flipperShadows = {};
  for (const [, shadow, flipper] of script.matchAll(/^\s*(\w+)\.RotZ\s*=\s*(\w+)\.CurrentAngle/gim)) flipperShadows[shadow] = flipper;
  return { ballShadows, flipperShadows };
}

// The table's playfield lights, drawn by Visual Pinball as a glow from the bulb that fades out
// over the falloff radius, clipped to the light's outline. Positions are in the GLB's coordinates
// (metres from the playfield's top-left corner). A light is on if it starts on, or the script
// turns on a collection holding it (For each xx in GI:xx.State = 1). Lights a slingshot's script
// turns off when it kicks (gi1.State = 0 in RightSlingShot_Slingshot) are listed under
// offWhenKicked, with how long they stay off (until its timer turns them back on).
const tableLights = ({ items, collections, script }) => {
  const lights = items.filter(({ type, data }) => type === 'Light' && !data.is_backglass).map(({ data }) => data);
  const onByScript = new Set();
  for (const [, , collection] of script.matchAll(/^\s*For\s+each\s+(\w+)\s+in\s+(\w+)\s*:\s*\1\.State\s*=\s*1/gim)) {
    const found = collections.find(c => c.name.toLowerCase() === collection.toLowerCase());
    (found?.items || []).forEach(name => onByScript.add(name.toLowerCase()));
  }
  const offWhenKicked = {};
  const walls = Object.fromEntries(items.filter(({ type }) => type === 'Wall').map(({ data }) => [data.name.toLowerCase(), data]));
  for (const [, slingshot, body] of script.matchAll(/^\s*Sub\s+(\w+)_Slingshot\b([\s\S]*?)^\s*End\s+Sub/gim)) {
    const names = [...body.matchAll(/(\w+)\.State\s*=\s*0/gi)].map(([, name]) => name.toLowerCase());
    if (names.length === 0) continue;
    // Its timer turns them back on at "Case n", the (n + 1)th tick.
    const timer = script.match(new RegExp(`^\\s*Sub\\s+${slingshot}_Timer\\b([\\s\\S]*?)^\\s*End\\s+Sub`, 'im'));
    const backOn = timer && timer[1].match(new RegExp(`Case\\s+(\\d+)\\s*:[^\\n]*\\b(${names.join('|')})\\.State\\s*=\\s*1`, 'i'));
    const interval = walls[slingshot.toLowerCase()]?.timer_interval ?? 50;
    const seconds = backOn ? (Number(backOn[1]) + 1) * interval / 1000 : 0.25;
    names.forEach(name => { offWhenKicked[name] = { slingshot, seconds }; });
  }
  return lights.map(light => {
    const key = light.name.toLowerCase();
    return {
      name: light.name,
      center: [round(light.center.x * METRES_PER_VPU), round(light.center.y * METRES_PER_VPU)],
      falloff: round(light.falloff_radius * METRES_PER_VPU),
      falloffPower: light.falloff_power,
      color: light.color,
      intensity: light.intensity,
      on: light.state > 0 || onByScript.has(key),
      ...(offWhenKicked[key] && { offWhenKicked: offWhenKicked[key] })
    };
  });
}

// Copies the table's environment image (what metal, plastic and the ball reflect) to outputDir.
// Returns its file name, or null if the table has none.
const exportEnvironment = (vpxPath, imageName, outputDir) => {
  if (!imageName) return null;
  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpx-environment-'));
  try {
    execFileSync(VPXTOOL, ['extract', '--force', '--only', `images/${imageName}.*`, '--output-dir', extractDir, vpxPath], { stdio: 'pipe' });
    const imagesDir = path.join(extractDir, 'images');
    const [file] = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
    if (!file) return null;
    fs.mkdirSync(outputDir, { recursive: true });
    const name = `environment${path.extname(file).toLowerCase()}`;
    fs.copyFileSync(path.join(imagesDir, file), path.join(outputDir, name));
    return name;
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

// Exports the table's visuals as a single GLB in metres, without the spare parts beside the
// table, to outputPath. Returns the names of the spare parts left out.
const exportVisuals = (vpxPath, outputPath, playfield) => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vpx-visuals-'));
  try {
    execFileSync(VPXTOOL, ['export', 'gltf', '--format', 'glb', '--units', 'm', '--output-dir', outputDir, vpxPath], { stdio: 'pipe' });
    const [file] = fs.readdirSync(outputDir).filter(name => name.endsWith('.glb'));
    const glb = readGlb(fs.readFileSync(path.join(outputDir, file)));
    const removed = removeSpareParts(glb.json, playfield.width, playfield.length);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, writeGlb(glb));
    return removed;
  } finally {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
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
  const script = fs.readFileSync(path.join(extractDir, 'script.vbs'), 'utf8');
  return { gamedata: read('gamedata.json'), info: read('info.json'), collections: read('collections.json'), script, items };
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
      // Travel from the rest position to full pull.
      pullDistance: round(convert.length(plunger.stroke * (1 - plunger.park_position))),
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
  const args = process.argv.slice(2);
  const vpxPath = args.find(arg => arg.startsWith('--') === false);
  if (!vpxPath) {
    console.error('Usage: npm run import-table -- <table.vpx> [--no-visuals] [--no-sounds]');
    process.exit(1);
  }
  const sourceName = path.basename(vpxPath, '.vpx');
  const outputPath = path.join(__dirname, '..', 'src', 'tables', `${sourceName}.table.json`);
  const visualsPath = path.join(__dirname, '..', 'public', 'tables', `${sourceName}.glb`);
  const extractDir = extractTable(vpxPath);
  try {
    const table = readTable(extractDir);
    const definition = buildDefinition(table, path.basename(vpxPath));
    if (args.includes('--no-visuals') === false) {
      const spareParts = exportVisuals(vpxPath, visualsPath, definition.playfield);
      const tableDir = path.join(__dirname, '..', 'public', 'tables', sourceName);
      const environment = exportEnvironment(vpxPath, table.gamedata.env_image, tableDir);
      // Served from public/ by the dev server.
      definition.visuals = {
        url: `tables/${sourceName}.glb`,
        environment: environment && { url: `tables/${sourceName}/${environment}`, intensity: table.gamedata.env_emission_scale ?? 1 },
        // How strongly the playfield reflects what is on it, and the ball.
        reflections: {
          playfield: table.gamedata.playfield_reflection_strength ?? 0,
          ball: table.gamedata.ball_playfield_reflection_strength ?? 1
        },
        shadows: scriptShadows(table.script),
        lights: tableLights(table),
        spareParts
      };
      if (environment) console.log(`  environment image: ${table.gamedata.env_image}`);
      const { ballShadows, flipperShadows } = definition.visuals.shadows;
      console.log(`  shadows from the script: ${ballShadows.length} ball, ${Object.keys(flipperShadows).length} flipper`);
      console.log(`Wrote ${path.relative(process.cwd(), visualsPath)} (${(fs.statSync(visualsPath).size / 1e6).toFixed(1)} MB)`);
      if (spareParts.length) console.log(`  left out ${spareParts.length} spare parts beside the table: ${spareParts.slice(0, 6).join(', ')}${spareParts.length > 6 ? ', ...' : ''}`);
    }
    if (args.includes('--no-sounds') === false) {
      const soundsDir = path.join(__dirname, '..', 'public', 'tables', sourceName, 'sounds');
      fs.rmSync(soundsDir, { recursive: true, force: true });
      const { sounds, report } = importSounds(vpxPath, definition, table.collections, soundsDir, `tables/${sourceName}/sounds`);
      if (report.available === 0) {
        fs.rmSync(soundsDir, { recursive: true, force: true });
        console.log('The table has no sounds.');
      } else {
        definition.sounds = sounds;
        console.log(`Wrote ${path.relative(process.cwd(), soundsDir)} (${report.used} of the table's ${report.available} sounds)`);
        if (report.missing.length) console.log(`  the table has no ${report.missing.join(', ')}; those events are silent`);
        if (report.unknownCollections.length) console.log(`  collections with hit events but no standard sound: ${report.unknownCollections.join(', ')}`);
      }
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(definition) + '\n');
    const vertices = definition.walls.reduce((sum, wall) => sum + wall.loops.reduce((s, loop) => s + loop.length, 0), 0);
    console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
    console.log(`  ${definition.walls.length} walls and rubbers (${vertices} outline points), ${definition.slingshots.length} slingshots, ` +
      `${definition.flippers.length} flippers, ${definition.gates.length} gates, ${definition.drains.length} drains, ${definition.triggers.length} triggers`);
    definition.warnings.forEach(warning => console.log(`  warning: ${warning}`));
    // Skipped elements, grouped by reason (the full list is in the definition's `skipped`).
    const byReason = {};
    definition.skipped.forEach(({ type, name, reason }) => (byReason[`${type}: ${reason}`] = byReason[`${type}: ${reason}`] || []).push(name));
    console.log(`  skipped ${definition.skipped.length}:`);
    Object.entries(byReason).forEach(([reason, names]) =>
      console.log(`    ${reason} (${names.length}): ${names.slice(0, 6).join(', ')}${names.length > 6 ? ', ...' : ''}`));
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
}

main();
