import { quaternionFromAxisAngle } from '@math';

// Approximates a curved wall with box segments, in the tableCuboid { size, center, rotation } format.
// Angles are measured in the table's x/z plane (x = cos, z = sin).
// side 'outside': the wall sits outside the radius, so its inner face is the curve (ball inside the arc).
// side 'center': the wall straddles the radius (a guide the ball can touch from either side).
export const arcSegments = ({
  center,
  radius,
  thetaStart,
  thetaLength,
  segments,
  height,
  thickness,
  side = 'center'
  }) => {
  const [centerX, centerY, centerZ] = center;
  const angleStep = thetaLength / segments;
  const midRadius = side === 'outside' ? radius + thickness / 2 : radius;
  // Size each chord for the outer edge so neighbouring segments overlap instead of leaving gaps.
  const chord = 2 * (midRadius + thickness / 2) * Math.sin(Math.abs(angleStep) / 2);

  return Array.from({ length: segments }, (_, idx) => {
    const angle = thetaStart + (idx + 0.5) * angleStep;
    return {
      size: [thickness, height, chord],
      center: [
        centerX + Math.cos(angle) * midRadius,
        centerY + height / 2,
        centerZ + Math.sin(angle) * midRadius
      ],
      // Local x points outward along the radius, local z runs along the curve.
      rotation: quaternionFromAxisAngle({ x: 0, y: 1, z: 0 }, -angle)
    };
  });
}
