import * as CANNON from 'cannon-es';
import { bumperMaterial } from '../../../materials';
import { quaternionPlayfieldSlope } from '../../../constants';
import { bumperCollisionHandler, COLLISION_GROUPS } from 'cannon/collisions';

const bodyOffsetX = 0.45; 
export const BUMPER_CONFIG = {
  collisionFilterGroup: COLLISION_GROUPS.PLAYFIELD,
  material: bumperMaterial,
  bumperCollisionHandler,
  shapeProps: {
    radiusTop: 0.75,
    radiusBottom: 0.75,
    height: 1,
    numSegments: 12
  },
  computeShape: (props) => new CANNON.Cylinder(
    props.radiusTop, 
    props.radiusBottom, 
    props.height, 
    props.numSegments
  ),
  locations: [    
    {
      bumperName: 'upper_left_bumper',
      offset: new CANNON.Vec3(-2 + bodyOffsetX, 0.5, -5),
      quaternion: quaternionPlayfieldSlope
    },
    {
      bumperName: 'upper_right_bumper',
      offset: new CANNON.Vec3(2 + bodyOffsetX, 0.5, -5),
      quaternion: quaternionPlayfieldSlope
    },
    {
      bumperName: 'lower_center_bumper',
      offset: new CANNON.Vec3(0  + bodyOffsetX, 0.5, -2),
      quaternion: quaternionPlayfieldSlope
    }
  ]
}
