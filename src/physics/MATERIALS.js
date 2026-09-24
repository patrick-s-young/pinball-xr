// The ball uses the Min combine rule with coefficients of 1, and Min outranks the default
// Average rule. Every ball contact therefore takes the friction and restitution of the surface
// it touches, which is how the old per-pair contact materials behaved.
export const MATERIALS = {
  ball: { friction: 1, restitution: 1, combineRule: 'Min' },
  playfield: { friction: 0.1, restitution: 0.6 },
  bumper: { friction: 0.0, restitution: 0.5 },
  flipper: { friction: 0.2, restitution: 0.7 }
}

export const withMaterial = (RAPIER, colliderDesc, { friction, restitution, combineRule }) => {
  colliderDesc.setFriction(friction).setRestitution(restitution);
  if (combineRule) {
    const rule = RAPIER.CoefficientCombineRule[combineRule];
    colliderDesc.setFrictionCombineRule(rule).setRestitutionCombineRule(rule);
  }
  return colliderDesc;
}
