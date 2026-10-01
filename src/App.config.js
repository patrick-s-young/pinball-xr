// Height of the playfield centre above the floor, in metres.
export const HEIGHT_ABOVE_FLOOR = .6;

export const WORLD = {
  gravity: { x: 0, y: -9.82, z: 0 }
}

export const CAMERA = {
  position: [0, 1.9, .7 ]
}

// Table loaded when the page URL has no ?table= parameter. See src/tables.
export const DEFAULT_TABLE = 'spike';

export const VIEW = {
  // Playfield reflections: 'all' reflects everything on the playfield (desktop), 'ball' only the
  // ball (one extra draw call, for WebXR on phones), 'off' none. ?reflections=all|ball|off in the
  // page URL overrides both.
  reflections: { desktop: 'all', xr: 'ball' },
  // Scene lighting. exposure is the renderer's tone-mapping exposure; hemisphere, point and
  // directional are the scene's own lights; environment multiplies the table's environment
  // image (what metal, plastic and the ball reflect); reflection is the playfield reflection's
  // strength (null: the table's own, from Visual Pinball). ?lighting in the page URL shows a
  // panel for trying values on the desktop.
  lighting: { exposure: 0.5, hemisphere: 0.5, point: 0.5, directional: 0, environment: 0.5, reflection: 0.08 }
}

export const DEBUG = {
  // Draw the physics wireframe as well as the table's visuals (also: ?physics in the page URL).
  // Tables without exported visuals always show it.
  showPhysics: false
}
