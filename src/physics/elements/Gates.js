import { COLLISION_GROUPS } from '../COLLISION_GROUPS';
import { segmentCuboid } from '../colliders';

const THICKNESS = 0.003;

// One-way gates: a thin wall across each gate that only acts on a ball already past it. A ball
// arriving from the entry side goes straight through without losing speed, as in Visual
// Pinball; one coming back from the exit side is stopped. Deciding per contact (rather than
// switching the wall on and off) keeps this correct with more than one ball on the table.
export const Gates = (physics, gates) => {
  const { table, ball, contactFilters } = physics;

  const built = gates.map(({ name, center: [centerX, centerZ], length, height, tangent: [tangentX, tangentZ], allowedDirection: [allowedX, allowedZ], friction, restitution }) => {
    const half = length / 2;
    const collider = segmentCuboid(physics,
      [centerX - tangentX * half, centerZ - tangentZ * half, centerX + tangentX * half, centerZ + tangentZ * half],
      { thickness: THICKNESS, height, collisionGroups: COLLISION_GROUPS.table });
    collider.setFriction(friction);
    collider.setRestitution(restitution);

    // Body handle -> whether that ball's centre is on the exit side, refreshed before each step.
    const pastGate = new Map();
    contactFilters.add(collider, (bodyHandle) => pastGate.get(bodyHandle) === true);

    const beforeStep = () => {
      const { x, z } = table.toLocal(ball.body.translation());
      pastGate.set(ball.body.handle, (x - centerX) * allowedX + (z - centerZ) * allowedZ > 0);
    }

    return { name, collider, beforeStep };
  });

  return {
    gates: built,
    // Call once per physics step, before world.step.
    beforeStep: () => built.forEach(gate => gate.beforeStep())
  };
}
