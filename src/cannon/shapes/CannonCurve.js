import * as CANNON from 'cannon-es'



////////////////
// @param
// @param
export const CannonCurve = (props) => {
  const { 
    radius,
    height,
    radialSegments,
    thetaStart,
    thetaLength } = props;
    const segmentLength = thetaLength /  radialSegments;
    const vertices = [];
// GENERATE VERTICES
  for (let idx = 0; idx <= radialSegments; idx++) {
    const angle = thetaStart + idx * segmentLength;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, 0, z);
    vertices.push(x, height, z);
  }
// GENERATE INDICES
  const outerLoop = vertices.length / 3;
  const innerLoop = 3;
  let vertexCounter = 0;
  const indices = [];
  for (let outerIdx = 0; outerIdx < outerLoop; outerIdx++ ) {
    for (let innerIdx = 0; innerIdx < innerLoop; innerIdx++ ) {
      indices.push(vertexCounter++)
    }
    vertexCounter -= 2;
  }
// RETURN CURVE TRIMESH
  return new CANNON.Trimesh(vertices, indices);
}
