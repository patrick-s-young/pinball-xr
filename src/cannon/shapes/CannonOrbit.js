import * as CANNON from 'cannon-es'
import { Box, Vec3 } from 'cannon-es';



////////////////
// @param
// @param
export const CannonOrbit = (props) => {
  const { 
    offset,
    radius,
    height,
    radialSegments,
    thetaStart,
    thetaLength } = props;

  const angleIncrement = thetaLength /  radialSegments;
  const compositeShape = [];
  const halfExtents = new Vec3(
    height/2,
    height/2, 
    (() => {
      const opposite = Math.sin(angleIncrement) * radius;
      const adjacent = radius - Math.cos(angleIncrement) * radius;
      return 0.5 * Math.sqrt(Math.pow(opposite, 2) + Math.pow(adjacent, 2));
    })(), );



// GENERATE SHAPES
  for (let idx = 0; idx < radialSegments; idx++) {
    const compositeShapeObj = {};
    const radians = thetaStart + angleIncrement + idx * angleIncrement;
    const x = Math.cos(radians) * (radius + height/2);
    const z = Math.sin(radians) * (radius + height/2);
    compositeShapeObj.shape = new Box(new CANNON.Vec3(halfExtents.x, halfExtents.y, halfExtents.z));
    compositeShapeObj.offset = new Vec3(x + offset.x, height / 2 + offset.y, z + offset.z);
    compositeShapeObj.orientation = new CANNON.Quaternion();
    compositeShapeObj.orientation.setFromAxisAngle(new CANNON.Vec3( 0, 1, 0 ), -radians);
    compositeShape.push(compositeShapeObj);
  }

// RETURN CURVE TRIMESH
  return compositeShape;
}
