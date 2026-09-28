// Height of the playfield centre above the floor, in metres.
export const HEIGHT_ABOVE_FLOOR = .6;

export const WORLD = {
  gravity: { x: 0, y: -9.82, z: 0 }
}

export const CAMERA = {
  position: [0, 1.9, .7 ]
}

// Table loaded when the page URL has no ?table= parameter. See src/tables.
export const DEFAULT_TABLE = 'import-test';

export const DEBUG = {
  // Draw the physics wireframe as well as the table's visuals (also: ?physics in the page URL).
  // Tables without exported visuals always show it.
  showPhysics: false
}
