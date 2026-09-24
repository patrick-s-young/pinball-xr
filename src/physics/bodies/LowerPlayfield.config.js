import { PLAYFIELD, SCALER } from '@src/App.config';
import { FLIPPER_CONFIG, LOWER_PLAYFIELD_CENTER_X } from './Flipper.config';

// Layout below the bumpers, derived from the flipper geometry so the guides stay flush with the
// flippers if they move. Values are table space, relative to LOWER_PLAYFIELD_CENTER_X, and
// written for the left side; the right side mirrors x.
const GUIDE_THICKNESS = 0.008;
const SLINGSHOT_THICKNESS = 0.008;
// The inlane/outlane divider's vertical run. The outlane lies between it and the outer wall.
const DIVIDER_X = -0.222;
const DIVIDER_TOP_Z = 0.26;
// Clear width of the inlane, between the divider and the slingshot.
const INLANE_WIDTH = 0.042;
// Clear gap between the resting flipper and the slingshot's bottom edge, where the inlane
// carries the ball onto the flipper. A little wider than the ball.
const INLANE_CHANNEL = 0.040;
const SLINGSHOT_TOP_Z = 0.25;
// Where the slingshot's bottom-inner corner sits along the flipper, measured from the pivot
// (negative is behind the pivot). Far enough back that a ball cannot be pinched between the
// corner and the raised flipper.
const SLINGSHOT_CORNER_ALONG_FLIPPER = -0.03;

const { baseRadius, restAngle, pivot } = FLIPPER_CONFIG;
const PIVOT = { x: -pivot.x, z: pivot.z };
// Along the left flipper, pivot to tip, at rest.
const ALONG = { x: Math.cos(restAngle), z: Math.sin(restAngle) };
// Perpendicular to the flipper, toward the top of the table.
const UP_TABLE = { x: Math.sin(restAngle), z: -Math.cos(restAngle) };
const onFlipperLine = (along, offset) => ({
  x: PIVOT.x + ALONG.x * along + UP_TABLE.x * offset,
  z: PIVOT.z + ALONG.z * along + UP_TABLE.z * offset
});

// The divider ends just behind the flipper's pivot, with its top face flush with the flipper's
// top face so a ball rolling down the inlane passes smoothly onto the flipper.
const dividerEnd = onFlipperLine(-(baseRadius + 0.004), baseRadius - GUIDE_THICKNESS / 2);
const dividerBend = onFlipperLine(
  -(baseRadius + 0.004) - (dividerEnd.x - DIVIDER_X) / ALONG.x,
  baseRadius - GUIDE_THICKNESS / 2
);

// The slingshot's bottom edge runs parallel to the flipper, INLANE_CHANNEL above its top face.
const slingshotOffset = baseRadius + INLANE_CHANNEL + SLINGSHOT_THICKNESS / 2;
const slingshotOuterX = DIVIDER_X + GUIDE_THICKNESS / 2 + INLANE_WIDTH + SLINGSHOT_THICKNESS / 2;
const slingshotBottomCenter = onFlipperLine(0, slingshotOffset);
const slingshot = {
  top: { x: slingshotOuterX, z: SLINGSHOT_TOP_Z },
  bottomOuter: {
    x: slingshotOuterX,
    z: slingshotBottomCenter.z + (slingshotOuterX - slingshotBottomCenter.x) * ALONG.z / ALONG.x
  },
  bottomInner: onFlipperLine(SLINGSHOT_CORNER_ALONG_FLIPPER, slingshotOffset)
};

// Inner face of the side wall. The right side mirrors onto the shooter lane divider.
const OUTER_WALL_X = -5 * SCALER + PLAYFIELD.offsetX - LOWER_PLAYFIELD_CENTER_X;
// A rubber wedge on the side wall above the outlane. A ball running down the wall, such as one
// coming off the orbit after the plunge, is knocked inward instead of dropping straight into the
// outlane. Balls arriving at an angle can still reach the outlane below it.
const outlaneDeflector = [
  { x: OUTER_WALL_X, z: 0.08 },
  { x: OUTER_WALL_X + 0.035, z: 0.15 },
  { x: OUTER_WALL_X, z: 0.17 }
];

const LEFT_LAYOUT = {
  divider: [{ x: DIVIDER_X, z: DIVIDER_TOP_Z }, dividerBend, dividerEnd],
  dividerPost: { x: DIVIDER_X, z: DIVIDER_TOP_Z },
  outlaneDeflector,
  slingshot
};

const toTable = (side) => ({ x, z }) => [LOWER_PLAYFIELD_CENTER_X + (side === 'left' ? x : -x), z];

export const LOWER_PLAYFIELD_CONFIG = {
  wallHeight: SCALER,
  guideThickness: GUIDE_THICKNESS,
  slingshotThickness: SLINGSHOT_THICKNESS,
  postRadius: 0.007,
  slingshot: {
    // Minimum speed (m/s) the kicker sends the ball away from its face.
    kickSpeed: 1.6,
    // The kicker only fires when the ball moves into its face faster than this (m/s), like a real
    // slingshot switch that a ball rolling gently along the rubber does not close.
    minTriggerSpeed: 0.15,
    // Random variation in each kick, from coil strength and where the rubber is struck. Without
    // it the kick is perfectly repeatable and the ball can settle into an endless bounce loop.
    speedVariation: 0.1,
    angleVariation: Math.PI / 36
  },
  // Table-space [x, z] points for one side.
  layout: (side) => {
    const map = toTable(side);
    const { top, bottomOuter, bottomInner } = LEFT_LAYOUT.slingshot;
    return {
      divider: LEFT_LAYOUT.divider.map(map),
      dividerPost: map(LEFT_LAYOUT.dividerPost),
      outlaneDeflector: LEFT_LAYOUT.outlaneDeflector.map(map),
      slingshot: {
        top: map(top),
        bottomOuter: map(bottomOuter),
        bottomInner: map(bottomInner)
      }
    };
  }
}
