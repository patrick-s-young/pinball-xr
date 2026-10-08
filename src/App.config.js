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

// Water released from a tank above the top of the table (src/water), desktop only. The tank is
// as wide as the table inside its rails; its height and depth, and the gap its front panel opens,
// are fractions of that. ?water=now in the page URL opens it at once, ?water=off disables it.
export const WATER = {
  enabled: true,
  // Seconds after the first ball is launched.
  delay: 5,
  tank: { height: 0.25, depth: 0.1052, gap: 0.05 },
  // Seconds for the panel to slide up.
  openTime: 0.5,
  // The water's own gravity, as a fraction of real gravity (the ball's is unchanged). Lower makes
  // it pour, fall, and flow more slowly.
  gravity: 0.25,
  // Simulation grid cell (m).
  cellSize: 0.005
}

// True 3D water (src/water3d), a prototype: ?water=3d in the page URL (or ?water=3d-now to open
// the tank at once). Needs WebGPU; the tank is as in WATER. cellSize is the simulation grid (m);
// resolution scales the water's drawing relative to the table's canvas; maxSteps caps the
// simulation steps per frame. The rest set the look: smoothing passes for the surface, blur for
// its thickness (pixels), the water's colour, how strongly it absorbs light, how much it bends
// the table seen through it, and how strongly it reflects the environment.
export const WATER3D = {
  cellSize: 0.006,
  // The fluid: how hard it resists being squeezed, how many particles per cell it settles at
  // (each particle stands for a cell's volume divided by this), its viscosity, and how much the
  // playfield slows water touching it (1/s), which lets it spread out sideways instead of racing
  // down the slope in rivers. The original's are 3, 4, 0.1, and 0.
  stiffness: 3,
  restDensity: 4,
  viscosity: 0.1,
  floorFriction: 2,
  resolution: 0.75,
  maxSteps: 12,
  // Each particle is drawn as a sphere this many cells across, so a thin layer of water joins up.
  particleSize: 2.4,
  depthSmoothing: 4,
  thicknessBlur: 12,
  color: [0.85, 0.03, 0.04],
  density: 14,
  refraction: 0.05,
  environment: 0.25,
  // How much deep water glows with its own colour (light scattered inside it).
  glow: 0.12
}

export const DEBUG = {
  // Draw the physics wireframe as well as the table's visuals (also: ?physics in the page URL).
  // Tables without exported visuals always show it.
  showPhysics: false
}
