import * as CANNON from 'cannon-es'


////////////////
// @param
// @param
export const CannonRect = (props) => {
  const { 
    xSize,
    ySize,
    zSize } = props;
    // ORIENTATION
    // x === 0 ? 'lengthWall'
    // y === 0 ? 'floor'
    // z === 0 ? 'widthWall'
    const orientation = xSize === 0 ? 'lengthWall' : ySize === 0 ? 'floor' : 'widthWall';
    let vertices = [];
    const halfLengths = {
      x: xSize / 2,
      y: ySize / 2,
      z: zSize / 2
    }
    switch (orientation) {
      case 'lengthWall':
        vertices = [
          0, -halfLengths.y, -halfLengths.z,
          0, -halfLengths.y, halfLengths.z,
          0, halfLengths.y, -halfLengths.z,
          0, halfLengths.y, halfLengths.z
        ];
        break;
      case 'floor':
        vertices = [
          -halfLengths.x, 0, -halfLengths.z,
          -halfLengths.x, 0, halfLengths.z,
          halfLengths.x, 0, -halfLengths.z,
          halfLengths.x, 0, halfLengths.z
        ];
        break;
      case 'widthWall':
        vertices = [
          -halfLengths.x, -halfLengths.y, 0,
          -halfLengths.x, halfLengths.y, 0,
          halfLengths.x, -halfLengths.y, 0,
          halfLengths.x, halfLengths.y, 0
        ];
        break;
      default:
        console.log(`CannonRect: Warning: no matching case for orientation value: ${orientation}`)
    }

    const indices = [
      0, 1, 2,
      1, 2, 3
    ];

  return new CANNON.Trimesh(vertices, indices);
}
