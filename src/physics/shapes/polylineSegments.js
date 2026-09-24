import { quaternionFromAxisAngle } from '@math';

// Turns a path of table-space [x, z] points into box segments, in the tableCuboid
// { size, center, rotation } format. The wall is centred on the path, and each segment is
// extended by the thickness so neighbouring segments overlap at the corners.
export const polylineSegments = ({ points, thickness, height }) =>
  points.slice(1).map(([x2, z2], idx) => {
    const [x1, z1] = points[idx];
    const dx = x2 - x1;
    const dz = z2 - z1;
    return {
      size: [Math.hypot(dx, dz) + thickness, height, thickness],
      center: [(x1 + x2) / 2, height / 2, (z1 + z2) / 2],
      // Local x runs along the segment.
      rotation: quaternionFromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.atan2(dz, dx))
    };
  });
