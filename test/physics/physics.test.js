// Headless physics checks for every imported table: `npm run test:physics`.
// Each check drives the real physics with scripted input and reports PASS / FAIL. Positions come
// from the table definition, so the same checks apply to any table.
import { createPhysics } from '@physics/createPhysics';
import { TUNING } from '@physics/TUNING';
import { TABLES } from '@src/tables';
import { WATER } from '@src/App.config';
import { WaterSimulation } from '@src/water/WaterSimulation';

// Seeded so slingshot kick variation is the same on every run.
let randomSeed = 12345;
Math.random = () => { randomSeed = (randomSeed * 16807) % 2147483647; return (randomSeed - 1) / 2147483646; };

const placement = [0, 0.6, 0];
const dt = TUNING.simulation.timeStep;
const len = (v) => Math.hypot(v.x, v.y, v.z);
const fmt = (v) => `(${v.x.toFixed(3)}, ${(v.y ?? 0).toFixed(3)}, ${v.z.toFixed(3)})`;
const deg = (rad) => `${(rad * 180 / Math.PI).toFixed(1)}°`;
let failures = 0;
const check = (ok, label) => { if (!ok) failures++; return `${ok ? 'PASS' : 'FAIL'} ${label}`; };
const report = (name, lines) => console.log(`\n=== ${name}\n` + lines.map(l => '  ' + l).join('\n'));
const byName = (list, name) => list.find(item => item.name === name);

const insidePolygon = (x, z, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i]; const [xj, zj] = polygon[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
const boundsOf = (loop) => {
  const xs = loop.map(p => p[0]), zs = loop.map(p => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
}
const distanceToSegment = (px, pz, [x1, z1], [x2, z2]) => {
  const dx = x2 - x1, dz = z2 - z1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(px - x1 - t * dx, pz - z1 - t * dz);
}

const testTable = async (tableName, definition) => {
  const r = definition.ball.radius;
  const W = definition.playfield.width, L = definition.playfield.length;
  const plungerStrength = definition.plunger.strength / TUNING.plunger.referenceStrength;

  // Solid areas: inside a wall's outline, between a rubber's outer and inner edges, or inside a
  // bumper.
  const bumpers = definition.bumpers || [];
  const spinners = definition.spinners || [];
  const solids = definition.walls.map(({ name, loops: [outer, inner] }) => ({ name, outer, inner, box: boundsOf(outer) }));
  const insideSolid = ({ x, z }) => solids.find(({ outer, inner, box }) =>
    x >= box[0] && x <= box[1] && z >= box[2] && z <= box[3] &&
    insidePolygon(x, z, outer) && (inner === undefined || insidePolygon(x, z, inner) === false)) ||
    bumpers.find(({ center: [cx, cz], radius }) => Math.hypot(x - cx, z - cz) < radius - 0.001);
  const edges = definition.walls.flatMap(({ loops }) => loops.flatMap(loop => loop.map((p, i) => [p, loop[(i + 1) % loop.length]])));

  const setup = async () => {
    const physics = await createPhysics({ definition, placement });
    physics.serveBall();
    const state = { drains: 0 };
    physics.onDrain(() => { state.drains++; physics.ball.disable(); });
    return { physics, state };
  }
  const ballLocal = (physics) => physics.table.toLocal(physics.ball.body.translation());
  const velocityLocal = (physics) => {
    const origin = physics.table.toLocal({ x: 0, y: 0, z: 0 });
    const v = physics.table.toLocal(physics.ball.body.linvel());
    return { x: v.x - origin.x, y: v.y - origin.y, z: v.z - origin.z };
  }
  const place = (physics, { x, z, y = r + 0.0005 }, v = { x: 0, y: 0, z: 0 }) => {
    const body = physics.ball.body;
    body.setEnabled(true);
    body.setTranslation(physics.table.toWorld({ x, y, z }), true);
    body.setLinvel(physics.table.directionToWorld(v), true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  // Steps the simulation, recording any moment the ball is outside the playfield or inside a
  // wall. onStep(t, position) may return 'stop'; position is null once the ball has drained.
  const run = (physics, seconds, onStep) => {
    const steps = Math.round(seconds / dt);
    const escapes = [];
    for (let i = 0; i < steps; i++) {
      physics.update(dt + 1e-9);
      if (!physics.ball.body.isEnabled()) { if (onStep?.(i * dt, null) === 'stop') break; continue; }
      const p = ballLocal(physics);
      const outside = Math.abs(p.x) > W / 2 + 0.002 || Math.abs(p.z) > L / 2 + 0.002 || p.y < r - 0.004 || p.y > definition.playfield.glassHeight;
      const solid = outside ? null : insideSolid(p);
      if (outside || solid) escapes.push(`${(i * dt).toFixed(3)}s ${fmt(p)} ${outside ? 'outside the playfield' : `inside ${solid.name}`}`);
      if (onStep?.(i * dt, p) === 'stop') break;
    }
    return escapes;
  }
  const plunge = (physics, amount) => { physics.plunger.pull(); run(physics, amount * TUNING.plunger.fullPullTime); physics.plunger.release(); }
  const pullForSpeed = (speed) => Math.min(1, (speed / plungerStrength - TUNING.plunger.minLaunchSpeed) / (TUNING.plunger.maxLaunchSpeed - TUNING.plunger.minLaunchSpeed));
  // Whether pressing every flipper button once frees a ball that has come to rest: a ball
  // resting on a flipper, as a player would see it, rather than trapped.
  const freedByFlipping = (physics) => {
    const before = ballLocal(physics);
    [physics.leftFlipper, physics.rightFlipper].forEach(group => group.onFlipperUp());
    run(physics, 0.3);
    [physics.leftFlipper, physics.rightFlipper].forEach(group => group.onFlipperDown());
    run(physics, 1);
    if (!physics.ball.body.isEnabled()) return true;
    const after = ballLocal(physics);
    return Math.hypot(after.x - before.x, after.z - before.z) > 0.05;
  }
  const atPlunger = (physics) => {
    const p = ballLocal(physics); const s = physics.table.toLocal(physics.ball.spawnPoint);
    return Math.hypot(p.x - s.x, p.z - s.z) < TUNING.plunger.readyDistance;
  }

  report(`Table "${tableName}": ${definition.name} (${definition.source})`, [
    `${definition.walls.length} walls and rubbers, ${definition.slingshots.length} slingshots, ${definition.flippers.length} flippers, ${definition.gates.length} gates, ball radius ${(r * 1000).toFixed(1)} mm, slope ${definition.playfield.slopeDegrees}°`
  ]);

  // Served ball waits at the plunger tip.
  {
    const { physics, state } = await setup();
    const escapes = run(physics, 2);
    report('Served ball waits at the plunger', [check(atPlunger(physics) && state.drains === 0 && escapes.length === 0, `drains ${state.drains}, escapes ${escapes.length} ${escapes[0] ?? ''}`)]);
  }

  // Flipper stroke.
  {
    const { physics } = await setup();
    physics.ball.disable();
    const lines = [];
    for (const flipper of physics.flippers) {
      const spec = byName(definition.flippers, flipper.name);
      flipper.onFlipperUp();
      let reach = null; let maxStroke = 0;
      run(physics, 0.3, (t) => { const s = flipper.getStroke(); maxStroke = Math.max(maxStroke, s); if (reach === null && s >= spec.swing - 0.01) reach = t; });
      flipper.onFlipperDown();
      let back = null;
      run(physics, 0.6, (t) => { if (back === null && flipper.getStroke() <= 0.01) back = t; });
      lines.push(check(reach !== null && reach < 0.05 && back !== null && maxStroke - spec.swing < 0.02,
        `${flipper.name}: up in ${reach === null ? 'never' : (reach * 1000).toFixed(0) + ' ms'}, max ${deg(maxStroke)} (swing ${deg(spec.swing)}), return ${back === null ? 'never' : (back * 1000).toFixed(0) + ' ms'}`));
    }
    report('Flipper stroke', lines);
  }

  // Plunge strength sweep with idle flippers: nothing parks anywhere.
  {
    const stuck = []; const outcomes = {}; const escapes = [];
    for (const speed of [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5]) {
      const { physics, state } = await setup();
      run(physics, 0.3);
      plunge(physics, pullForSpeed(speed));
      let drained = false;
      escapes.push(...run(physics, 30, () => { if (state.drains) { drained = true; return 'stop'; } }).map(e => `${speed} m/s: ${e}`));
      const restingAt = drained || atPlunger(physics) ? null : ballLocal(physics);
      const outcome = drained ? 'drained' : restingAt === null ? 'back at plunger' : freedByFlipping(physics) ? 'resting on a flipper' : 'stuck';
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
      if (outcome === 'stuck') stuck.push(`${speed} m/s: at ${fmt(restingAt)} v=${len(physics.ball.body.linvel()).toFixed(3)}`);
    }
    report('Plunge sweep 0.5-5.5 m/s (idle flippers, 30 s)', [
      check(stuck.length === 0, `no ball parked (${stuck.length})`), ...stuck.slice(0, 5),
      check(escapes.length === 0, `no escapes (${escapes.length})`), ...escapes.slice(0, 3),
      check((outcomes.drained || 0) > 0, `plunges get into play: ${Object.entries(outcomes).map(([k, v]) => `${k} ${v}`).join(', ')}`)
    ]);
  }

  // One-way gates: pass the allowed way at nearly full speed, stop the other way.
  for (const gate of definition.gates) {
    const [cx, cz] = gate.center; const [ax, az] = gate.allowedDirection;
    const lines = [];
    for (const [label, sign] of [['allowed way', 1], ['blocked way', -1]]) {
      const { physics } = await setup();
      physics.ball.disable();
      const gap = r + 0.008;
      place(physics, { x: cx - sign * ax * gap, z: cz - sign * az * gap }, { x: sign * ax * 1.5, y: 0, z: sign * az * 1.5 });
      let crossedAt = null;
      run(physics, 0.4, (t, p) => { if (p && crossedAt === null && ((p.x - cx) * ax + (p.z - cz) * az) * sign > 0.03) crossedAt = len(physics.ball.body.linvel()); });
      lines.push(sign === 1
        ? check(crossedAt !== null && crossedAt > 1.5 * 0.85, `allowed way: passes at ${crossedAt === null ? '-' : crossedAt.toFixed(2)} m/s (entered at 1.50)`)
        : check(crossedAt === null, `blocked way: ${crossedAt === null ? 'stopped' : 'passes'}`));
    }
    report(`Gate ${gate.name}`, lines);
  }

  // Inlane feed, flip, and cradle, where the table names its inlane rollovers.
  for (const side of ['left', 'right']) {
    const inlane = byName(definition.triggers, side === 'left' ? 'LeftInlane' : 'RightInlane');
    const flipperDef = definition.flippers.find(f => f.side === side);
    if (!inlane || !flipperDef) continue;
    const [pivotX, pivotZ] = flipperDef.pivot; const [restX, restZ] = flipperDef.restDirection;
    const along = (p) => (p.x - pivotX) * restX + (p.z - pivotZ) * restZ;
    const across = (p) => Math.abs((p.x - pivotX) * restZ - (p.z - pivotZ) * restX);
    const group = (physics) => side === 'left' ? physics.leftFlipper : physics.rightFlipper;

    const feed = await setup();
    place(feed.physics, { x: inlane.center[0], z: inlane.center[1] });
    let reached = false;
    run(feed.physics, 3, (t, p) => { if (!p) return 'stop'; if (along(p) > flipperDef.length * 0.5 && across(p) < flipperDef.baseRadius + r + 0.01) { reached = true; return 'stop'; } });
    group(feed.physics).onFlipperUp();
    let maxSpeed = 0; let minZ = Infinity;
    run(feed.physics, 0.8, (t, p) => { if (!p) return; maxSpeed = Math.max(maxSpeed, len(feed.physics.ball.body.linvel())); minZ = Math.min(minZ, p.z); });
    report(`${side} inlane feed and flip`, [
      check(reached, 'ball rolls from the inlane rollover to mid-flipper'),
      check(maxSpeed > 2 && minZ < 0, `shot ${maxSpeed.toFixed(2)} m/s, reaches z=${minZ.toFixed(3)}`)
    ]);

    // Ball set down on the raised flipper rolls back and settles in the crook.
    const cradle = await setup();
    group(cradle.physics).onFlipperUp();
    run(cradle.physics, 0.1);
    const a = flipperDef.swing * flipperDef.upSign;
    const up = { x: restX * Math.cos(a) + restZ * Math.sin(a), z: -restX * Math.sin(a) + restZ * Math.cos(a) };
    let sideways = { x: up.z, z: -up.x };
    if (sideways.z > 0) sideways = { x: -sideways.x, z: -sideways.z };
    const offset = flipperDef.baseRadius * 0.8 + r + 0.001;
    place(cradle.physics, { x: pivotX + up.x * flipperDef.length * 0.6 + sideways.x * offset, z: pivotZ + up.z * flipperDef.length * 0.6 + sideways.z * offset });
    run(cradle.physics, 4);
    const p = ballLocal(cradle.physics);
    const speed = len(cradle.physics.ball.body.linvel());
    const fromPivot = Math.hypot(p.x - pivotX, p.z - pivotZ);
    report(`${side} cradle`, [check(cradle.state.drains === 0 && speed < 0.01 && fromPivot < flipperDef.length * 0.6, `ball set on the raised flipper settles ${(fromPivot * 1000).toFixed(0)} mm from the pivot, speed ${speed.toFixed(4)} m/s`)]);
  }

  // Slingshots kick.
  for (const sling of definition.slingshots) {
    const { physics } = await setup();
    const [x1, z1, x2, z2] = sling.segment; const [nx, nz] = sling.normal;
    place(physics, { x: (x1 + x2) / 2 + nx * 0.05, z: (z1 + z2) / 2 + nz * 0.05 }, { x: -nx * 0.8, y: 0, z: -nz * 0.8 });
    let exit = null;
    run(physics, 0.4, () => { const v = velocityLocal(physics); if (exit === null && v.x * nx + v.z * nz > 0) exit = v.x * nx + v.z * nz; });
    const expected = TUNING.slingshot.kickSpeed * sling.force / TUNING.slingshot.referenceForce;
    report(`Slingshot ${sling.name}`, [check(exit !== null && exit > expected * 0.85, `outward speed ${exit?.toFixed(2)} m/s after a 0.8 m/s hit (kick ${expected.toFixed(2)} m/s)`)]);
  }

  // Bumpers kick: a ball rolled into one from below leaves with at least the bumper's kick; with
  // the power off (tilted) it only bounces.
  for (const bumper of bumpers) {
    const outward = [];
    let fired = 0;
    for (const powered of [true, false]) {
      const { physics } = await setup();
      physics.power.isOn = powered;
      physics.events.addEventListener('bumper', () => fired++);
      const [cx, cz] = bumper.center;
      place(physics, { x: cx, z: cz + bumper.radius + r + 0.03 }, { x: 0, y: 0, z: -0.8 });
      let exit = null;
      run(physics, 0.3, () => { const v = velocityLocal(physics); if (exit === null && v.z > 0) exit = v.z; });
      outward.push(exit);
    }
    const [kicked, tilted] = outward;
    report(`Bumper ${bumper.name}`, [
      check(kicked !== null && kicked > bumper.kickSpeed * 0.9, `kicks the ball out at ${kicked?.toFixed(2)} m/s after a 0.8 m/s hit (kick ${bumper.kickSpeed.toFixed(2)} m/s)`),
      check(tilted !== null && tilted < kicked * 0.6, `tilted: only bounces, at ${tilted?.toFixed(2)} m/s`),
      check(fired === 1, `fires the bumper event once, not when tilted (${fired})`)
    ]);
  }

  // Spinners: the ball passes through and sets the plate spinning, which slows and settles.
  for (const spinner of spinners) {
    const { physics } = await setup();
    const turns = [];
    physics.events.addEventListener('spinner', ({ detail }) => turns.push(detail.name));
    const [cx, cz] = spinner.center; const [nx, nz] = spinner.normal;
    place(physics, { x: cx - nx * 0.05, z: cz - nz * 0.05 }, { x: nx * 1.2, y: 0, z: nz * 1.2 });
    let crossedAt = null;
    run(physics, 0.3, (t, p) => { if (p && crossedAt === null && (p.x - cx) * nx + (p.z - cz) * nz > 0.03) crossedAt = len(physics.ball.body.linvel()); });
    const model = byName(physics.spinners, spinner.name);
    const spinning = Math.abs(model.getAngle());
    physics.ball.disable();
    run(physics, 10);
    const settled = model.getAngle();
    const offVertical = Math.abs(settled - Math.round(settled / (2 * Math.PI)) * 2 * Math.PI);
    report(`Spinner ${spinner.name}`, [
      check(crossedAt !== null && crossedAt > 1.2 * 0.85, `the ball passes through at ${crossedAt === null ? '-' : crossedAt.toFixed(2)} m/s (entered at 1.20)`),
      check(turns.length >= 2, `a 1.2 m/s ball spins the plate ${turns.length} full turns`),
      check(offVertical < 0.05, `the plate settles hanging down (${deg(offVertical)} off, ${deg(spinning)} turned in the first 0.3 s)`)
    ]);
  }

  // Drains.
  for (const drain of definition.drains) {
    const { physics, state } = await setup();
    place(physics, { x: drain.center[0], z: drain.center[1] - 0.05 });
    run(physics, 3, () => (state.drains ? 'stop' : undefined));
    report(`Drain ${drain.name}`, [check(state.drains === 1, `ball dropped just above it drains (${state.drains})`)]);
  }

  // Tunneling: fast shots in every direction never end up outside the table or inside a wall.
  {
    const escapes = [];
    for (let i = 0; i < 16; i++) {
      const { physics } = await setup();
      const angle = i / 16 * Math.PI * 2;
      place(physics, { x: 0, z: 0.1 }, { x: Math.cos(angle) * 12, y: 0, z: Math.sin(angle) * 12 });
      escapes.push(...run(physics, 0.6).map(e => `${deg(angle)}: ${e}`));
    }
    report('12 m/s shots in 16 directions', [check(escapes.length === 0, `no escapes (${escapes.length})`), ...escapes.slice(0, 5)]);
  }

  // Pocket search: random drops anywhere the ball can reach must drain or return to the plunger.
  {
    // Reachable space, flood-filled on a 2 mm grid from the served ball through space clear of
    // walls (allowing 1.5 mm of contact, since lanes are only a little wider than the ball).
    const cell = 0.002, contactAllowance = 0.0015;
    const cols = Math.floor(W / cell), rows = Math.floor(L / cell);
    const centre = (k) => ({ x: -W / 2 + ((k % cols) + 0.5) * cell, z: -L / 2 + (Math.floor(k / cols) + 0.5) * cell });
    const edgeBoxes = edges.map(([a, b]) => ({ a, b, box: [Math.min(a[0], b[0]) - r, Math.max(a[0], b[0]) + r, Math.min(a[1], b[1]) - r, Math.max(a[1], b[1]) + r] }));
    const free = new Uint8Array(cols * rows);
    for (let k = 0; k < cols * rows; k++) {
      const { x, z } = centre(k);
      if (Math.abs(x) > W / 2 - r || Math.abs(z) > L / 2 - r || insideSolid({ x, z })) continue;
      free[k] = edgeBoxes.every(({ a, b, box }) => x < box[0] || x > box[1] || z < box[2] || z > box[3] || distanceToSegment(x, z, a, b) > r - contactAllowance) &&
        bumpers.every(({ center: [cx, cz], radius }) => Math.hypot(x - cx, z - cz) > radius + r - contactAllowance) ? 1 : 0;
    }
    const serve = { x: definition.plunger.tip[0], z: definition.plunger.tip[1] - r };
    let start = -1, best = Infinity;
    free.forEach((v, k) => { if (v) { const c = centre(k); const d = Math.hypot(c.x - serve.x, c.z - serve.z); if (d < best) { best = d; start = k; } } });
    const reach = new Uint8Array(cols * rows); const queue = [start]; reach[start] = 1;
    while (queue.length) {
      const k = queue.pop(); const c = k % cols;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dc, dr]) => {
        const n = k + dr * cols + dc;
        if (c + dc >= 0 && c + dc < cols && n >= 0 && n < cols * rows && free[n] && !reach[n]) { reach[n] = 1; queue.push(n); }
      });
    }
    // Start above the flippers and apron.
    const starts = [];
    reach.forEach((v, k) => { if (v && centre(k).z < L / 2 - 0.35) starts.push(k); });

    let seed = 7; const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const trapped = []; const escaped = []; const times = []; const restingOnFlipper = [];
    const trials = 40;
    for (let i = 0; i < trials && starts.length; i++) {
      const { physics, state } = await setup();
      const from = centre(starts[Math.floor(rand() * starts.length)]);
      const speed = rand() * 1.5; const angle = rand() * Math.PI * 2;
      place(physics, from, { x: Math.cos(angle) * speed, y: 0, z: Math.sin(angle) * speed });
      let drainedAt = null;
      const escapes = run(physics, 30, (t) => { if (state.drains) { drainedAt = t; return 'stop'; } });
      if (escapes.length) escaped.push(`${fmt(from)} ${escapes[0]}`);
      if (drainedAt !== null) times.push(drainedAt);
      else if (!atPlunger(physics)) {
        const restingAt = ballLocal(physics);
        if (freedByFlipping(physics)) restingOnFlipper.push(fmt(restingAt));
        else trapped.push(`from ${fmt(from)} -> at 30 s ${fmt(restingAt)} v=${len(physics.ball.body.linvel()).toFixed(3)}`);
      }
    }
    times.sort((a, b) => a - b);
    report(`Pocket search (${trials} random drops in reachable space, idle flippers, 30 s)`, [
      check(starts.length > 0, `${starts.length} reachable starting cells`),
      check(trapped.length === 0, `none trapped (${trapped.length})`), ...trapped.slice(0, 6),
      ...(restingOnFlipper.length ? [`${restingOnFlipper.length} came to rest on a flipper, and a flip freed them (at ${[...new Set(restingOnFlipper)].slice(0, 3).join(', ')})`] : []),
      check(escaped.length === 0, `no escapes (${escaped.length})`), ...escaped.slice(0, 3),
      `drain time median ${times[Math.floor(times.length / 2)]?.toFixed(1)} s, longest ${times[times.length - 1]?.toFixed(1)} s`
    ]);
  }

  // Nudge moves the cabinet and returns it; nudging too hard tilts.
  {
    const { physics } = await setup();
    const rest = physics.table.body.translation();
    physics.nudge.nudge('left');
    let maxOffset = 0;
    run(physics, 0.3, () => { const t = physics.table.body.translation(); maxOffset = Math.max(maxOffset, Math.hypot(t.x - rest.x, t.y - rest.y, t.z - rest.z)); });
    const t = physics.table.body.translation();
    const log = [];
    physics.nudge.addEventListener('warning', ({ detail }) => log.push(`warning ${detail}`));
    physics.nudge.addEventListener('tilt', () => log.push('tilt'));
    for (let i = 0; i < 40 && !physics.nudge.isTilted; i++) { physics.nudge.nudge('front'); run(physics, 0.15); }
    physics.leftFlipper.onFlipperUp();
    run(physics, 0.2);
    report('Nudge and tilt', [
      check(Math.abs(maxOffset - TUNING.nudge.distance) < 0.001 && Math.hypot(t.x - rest.x, t.y - rest.y, t.z - rest.z) < 1e-6, `cabinet moves ${(maxOffset * 1000).toFixed(1)} mm and returns to rest`),
      check(log.join(', ') === 'warning 1, warning 2, tilt', `rapid nudging: ${log.join(', ')}`),
      check(physics.leftFlipper.getStroke() < 0.01, 'tilted flippers do not rise')
    ]);
  }

  // Table events, which drive sound (and later scoring).
  {
    const { physics } = await setup();
    const seen = [];
    ['flipper', 'slingshot', 'bumper', 'spinner', 'plunger', 'drain', 'serve', 'hit'].forEach(type =>
      physics.events.addEventListener(type, ({ detail }) => seen.push(type === 'hit' ? `hit:${detail.kind}` : type)));
    const count = (type) => seen.filter(event => event === type).length;
    physics.serveBall();
    run(physics, 0.3);
    plunge(physics, 1);
    run(physics, 2);
    const leftFlippers = physics.leftFlipper.flippers.length;
    physics.leftFlipper.onFlipperUp();
    physics.leftFlipper.onFlipperUp();
    run(physics, 0.1);
    physics.leftFlipper.onFlipperDown();
    const lines = [
      check(count('serve') === 1 && count('plunger') === 2, `serve ${count('serve')}, plunger pull and release ${count('plunger')}`),
      check(count('hit:wall') + count('hit:rubber') > 0, `the plunge hits walls (${count('hit:wall') + count('hit:rubber')})`),
      check(count('flipper') === 2 * leftFlippers, `a press and release fire each of the ${leftFlippers} left flippers once each way (${count('flipper')})`)
    ];
    if (definition.gates.length) lines.push(check(count('hit:gate') > 0, `the plunge passes the gate (${count('hit:gate')})`));
    if (definition.slingshots.length) {
      const [x1, z1, x2, z2] = definition.slingshots[0].segment; const [nx, nz] = definition.slingshots[0].normal;
      place(physics, { x: (x1 + x2) / 2 + nx * 0.05, z: (z1 + z2) / 2 + nz * 0.05 }, { x: -nx * 0.8, y: 0, z: -nz * 0.8 });
      run(physics, 0.15);
      lines.push(check(count('slingshot') >= 1, `a slingshot kick fires the event (${count('slingshot')})`));
    }
    report('Table events', lines);
  }

  // Cost of a physics step.
  {
    const { physics } = await setup();
    plunge(physics, 1);
    const steps = 2400;
    let t0 = performance.now();
    for (let i = 0; i < steps; i++) physics.update(dt + 1e-9);
    const rolling = (performance.now() - t0) / steps;
    t0 = performance.now();
    for (let i = 0; i < steps; i++) { if (i % 24 === 0) physics.nudge.nudge('front'); physics.update(dt + 1e-9); }
    const nudging = (performance.now() - t0) / steps;
    report('Step cost', [`${(rolling * 1000).toFixed(1)} µs per step with the ball in play (${(rolling * 4).toFixed(3)} ms per 60 Hz frame); ${(nudging * 1000).toFixed(1)} µs while nudging`]);
  }

  // The water from the tank: it reaches every bumper, gets past the flippers, drains away, and is
  // neither lost nor created on the way.
  if (WATER.enabled && definition.visuals) {
    const settings = { cellSize: WATER.cellSize, tankHeight: WATER.tank.height, tankDepth: WATER.tank.depth, gap: WATER.tank.gap, openTime: WATER.openTime, gravity: WATER.gravity };
    const water = WaterSimulation({ definition, settings });
    const { cols, rows, cellSize, depth, solid, state, tank } = water;
    water.setFlippers(definition.flippers.map(({ pivot, restDirection, length, baseRadius, tipRadius }) => ({ pivot, direction: restDirection, length, baseRadius, tipRadius })));
    const cellAt = (x, z) => Math.floor((z + L / 2) / cellSize) * cols + Math.floor((x + W / 2) / cellSize);
    // Cells in a ring just outside each bumper, and a band just past the flipper tips.
    const ringCells = bumpers.map(({ center: [cx, cz], radius }) => Array.from({ length: 16 }, (_, i) => {
      const a = i / 16 * 2 * Math.PI;
      return cellAt(cx + Math.cos(a) * (radius + 2 * cellSize), cz + Math.sin(a) * (radius + 2 * cellSize));
    }).filter(k => !solid[k]));
    const tipZ = Math.max(...definition.flippers.map(({ pivot: [, pz], restDirection: [, dz], length }) => pz + dz * length));
    const pastFlippers = Array.from({ length: cols }, (_, c) => Math.floor((tipZ + 0.01 + L / 2) / cellSize) * cols + c).filter(k => !solid[k]);
    const wetBumpers = new Set();
    let pastFlippersAt = null, inSolid = 0, time = 0, worst = 0, total = 0;
    water.release();
    // Slower in lower gravity: about 30 s at real gravity.
    const limit = 30 / Math.sqrt(WATER.gravity);
    while (!state.finished && time < limit * 2) {
      const t0 = performance.now();
      water.update(1 / 60);
      const ms = performance.now() - t0;
      worst = Math.max(worst, ms); total += ms;
      time += 1 / 60;
      ringCells.forEach((cells, i) => { if (cells.some(k => depth[k] > 0.0005)) wetBumpers.add(i); });
      if (pastFlippersAt === null && pastFlippers.some(k => depth[k] > 0.0005)) pastFlippersAt = time;
      for (let k = 0; k < depth.length; k++) if (solid[k] && depth[k] > 0) { inSolid++; break; }
    }
    const { released, drained, evaporated } = state.totals;
    const imbalance = Math.abs(released - drained - evaporated - water.waterVolume());
    report(`Water (${(tank.volume * 1000).toFixed(1)} L tank over ${cols} x ${rows} cells of ${cellSize * 1000} mm)`, [
      check(Math.abs(released - tank.volume) < tank.volume * 0.01, `the tank empties: ${(released * 1000).toFixed(2)} L released`),
      check(wetBumpers.size === bumpers.length, `reaches ${wetBumpers.size} of ${bumpers.length} bumpers`),
      check(pastFlippersAt !== null, `gets past the flippers${pastFlippersAt === null ? '' : ` after ${pastFlippersAt.toFixed(1)} s`}`),
      check(state.finished && time < limit, `drains away in ${time.toFixed(1)} s${state.finished ? '' : ' (not finished)'}`),
      check(drained > released * 0.95, `${(drained / released * 100).toFixed(1)}% goes down the drain, ${(evaporated / released * 100).toFixed(1)}% evaporates from puddles`),
      check(imbalance < released * 1e-4, `no water lost or made (${(imbalance * 1e6).toFixed(2)} mL out of balance)`),
      check(inSolid === 0, 'no water inside anything solid'),
      `cost ${(total / (time * 60)).toFixed(2)} ms per 60 Hz frame on average, ${worst.toFixed(1)} ms at worst (in a worker in the browser)`
    ]);
  }
}

(async () => {
  for (const [name, definition] of Object.entries(TABLES)) await testTable(name, definition);
  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exitCode = failures === 0 ? 0 : 1;
})();
