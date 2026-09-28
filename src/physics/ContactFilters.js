// Rapier physics hooks that decide, contact by contact, whether the solver acts. A collider added
// with a rule is solid for a body only while rule(bodyHandle) returns true.
// Rapier calls the hooks in the middle of world.step, when the world cannot be read, so a rule
// must only use values prepared before the step (see Gates).
export const ContactFilters = ({ RAPIER }) => {
  const rules = new Map();

  const hooks = {
    filterContactPair: (collider1, collider2, body1, body2) => {
      const rule = rules.get(collider1) || rules.get(collider2);
      if (rule === undefined) return RAPIER.SolverFlags.COMPUTE_IMPULSE;
      const otherBody = rules.has(collider1) ? body2 : body1;
      return rule(otherBody) ? RAPIER.SolverFlags.COMPUTE_IMPULSE : RAPIER.SolverFlags.EMPTY;
    },
    filterIntersectionPair: () => true
  };

  const add = (collider, rule) => {
    collider.setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS);
    rules.set(collider.handle, rule);
  }

  return { hooks, add };
}
