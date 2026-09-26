// Headless physics checks for every imported table: `npm run test:physics`.
// Each check drives the real physics with scripted input and reports PASS / FAIL. Positions come
// from the table definition, so the same checks apply to any table.
import { createPhysics } from '@physics/createPhysics';
import { TUNING } from '@physics/TUNING';
import { TABLES } from '@src/tables';

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

  // Solid areas: inside a wall's outline, or between a rubber's outer and inner edges.
  const solids = definition.walls.map(({ name, loops: [outer, inner] }) => ({ name, outer, inner, box: boundsOf(outer) }));
  const insideSolid = ({ x, z }) => solids.find(({ outer, inner, box }) =>
    x >= box[0] && x <= box[1] && z >= box[2] && z <= box[3] &&
    insidePolygon(x, z, outer) && (inner === undefined || insidePolygon(x, z, inner) === false));
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
      const outcome = drained ? 'drained' : atPlunger(physics) ? 'back at plunger' : 'stuck';
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
      if (outcome === 'stuck') stuck.push(`${speed} m/s: at ${fmt(ballLocal(physics))} v=${len(physics.ball.body.linvel()).toFixed(3)}`);
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
      free[k] = edgeBoxes.every(({ a, b, box }) => x < box[0] || x > box[1] || z < box[2] || z > box[3] || distanceToSegment(x, z, a, b) > r - contactAllowance) ? 1 : 0;
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
    const trapped = []; const escaped = []; const times = [];
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
      else if (!atPlunger(physics)) trapped.push(`from ${fmt(from)} -> at 30 s ${fmt(ballLocal(physics))} v=${len(physics.ball.body.linvel()).toFixed(3)}`);
    }
    times.sort((a, b) => a - b);
    report(`Pocket search (${trials} random drops in reachable space, idle flippers, 30 s)`, [
      check(starts.length > 0, `${starts.length} reachable starting cells`),
      check(trapped.length === 0, `none trapped (${trapped.length})`), ...trapped.slice(0, 6),
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
}

(async () => {
  for (const [name, definition] of Object.entries(TABLES)) await testTable(name, definition);
  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exitCode = failures === 0 ? 0 : 1;
})();
