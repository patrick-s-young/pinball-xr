import { tableCuboid } from '../colliders';

const FLOOR_THICKNESS = 0.02;
const GLASS_THICKNESS = 0.01;
const BOUNDARY_THICKNESS = 0.05;

// The playfield surface, the glass above it, and walls around the playfield rectangle, which
// Visual Pinball enforces even where the table has no walls of its own.
export const Playfield = (physics, { width, length, glassHeight, friction, restitution }) => {
  const material = { friction, restitution };
  const boxes = [
    { size: [width, FLOOR_THICKNESS, length], center: [0, -FLOOR_THICKNESS / 2, 0] },
    { size: [width, GLASS_THICKNESS, length], center: [0, glassHeight + GLASS_THICKNESS / 2, 0] },
    { size: [BOUNDARY_THICKNESS, glassHeight, length + 2 * BOUNDARY_THICKNESS], center: [-(width + BOUNDARY_THICKNESS) / 2, glassHeight / 2, 0] },
    { size: [BOUNDARY_THICKNESS, glassHeight, length + 2 * BOUNDARY_THICKNESS], center: [(width + BOUNDARY_THICKNESS) / 2, glassHeight / 2, 0] },
    { size: [width, glassHeight, BOUNDARY_THICKNESS], center: [0, glassHeight / 2, -(length + BOUNDARY_THICKNESS) / 2] },
    { size: [width, glassHeight, BOUNDARY_THICKNESS], center: [0, glassHeight / 2, (length + BOUNDARY_THICKNESS) / 2] }
  ];
  return boxes.map(box => tableCuboid(physics, { ...box, material }));
}
