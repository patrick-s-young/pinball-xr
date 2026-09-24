// Membership bits. Each must be a distinct power of two.
const GROUP = {
  BALL: 1,
  TABLE: 2,
  FLIPPER: 4,
  TRIGGER: 8
}

// Rapier packs membership into the high 16 bits and the filter into the low 16 bits.
const interactionGroups = (membership, filter) => (membership << 16) | filter;

export const COLLISION_GROUPS = {
  ball: interactionGroups(GROUP.BALL, GROUP.TABLE | GROUP.FLIPPER | GROUP.TRIGGER),
  table: interactionGroups(GROUP.TABLE, GROUP.BALL),
  flipper: interactionGroups(GROUP.FLIPPER, GROUP.BALL),
  trigger: interactionGroups(GROUP.TRIGGER, GROUP.BALL)
}
