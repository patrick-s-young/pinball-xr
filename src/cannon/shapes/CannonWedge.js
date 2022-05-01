import * as CANNON from 'cannon-es'


////////////////
// @param
// @param
export const CannonWedge = ({ 
  widthX,
  heightY,
  depthZ }) => {
  const vertices = [
    -1 * widthX,  1 * heightY, -1 * depthZ, // 0
    -1 * widthX,  1 * heightY,  1 * depthZ, // 1
    -1 * widthX, -1 * heightY,  1 * depthZ, // 2
    -1 * widthX, -1 * heightY, -1 * depthZ, // 3
     1 * widthX,  1 * heightY, -0.1 * depthZ, // 4
     1 * widthX,  1 * heightY,  0.1 * depthZ, // 5
     1 * widthX, -1 * heightY,  0.1 * depthZ, // 6
     1 * widthX, -1 * heightY, -0.1 * depthZ, // 7
  ];

  const indices = [
    0, 1, 2, // left
    2, 3, 0, // left
    0, 1, 5, // top
    5, 4, 0, // top
    4, 5, 6, // right
    6, 7, 4, // right
    2, 3, 7, // bottom
    7, 6, 2, // bottom
    0, 3, 7, // back
    7, 4, 0, // back
    1, 2, 6, // front
    6, 5, 1, // front
  ];

  return new CANNON.Trimesh(vertices, indices);
}
