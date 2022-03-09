import * as CANNON from 'cannon-es';
import { bumperMaterial } from '../../../cannonMaterials';
import { quaternionPlayfieldSlope } from '../../../constants';

export const BUMPER_CONFIG = {
  shapeProps: {
    radiusTop: 0.75,
    radiusBottom: 0.75,
    height: 1,
    numSegments: 12
  },
  material: bumperMaterial,
  computeShape: (props) => new CANNON.Cylinder(
    props.radiusTop, 
    props.radiusBottom, 
    props.height, 
    props.numSegments
  ),
  locations: [    
    {
      description: 'Bumper 2',
      offset: new CANNON.Vec3(0, 0.5, -1.5),
      quaternion: quaternionPlayfieldSlope
    },
    {
      description: 'Bumper 3',
      offset: new CANNON.Vec3(1, 0.5, -3) ,
      quaternion: quaternionPlayfieldSlope
    },
    {
      description: 'Bumper 7',
      offset: new CANNON.Vec3(2, 0.5, 2 ),
      quaternion: quaternionPlayfieldSlope
    },
    {
      description: 'Bumper 8',
      offset: new CANNON.Vec3(-2.75, 0.5, 3),
      quaternion: quaternionPlayfieldSlope
    }
  ]
}
