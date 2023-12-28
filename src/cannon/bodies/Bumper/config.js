import * as CANNON from 'cannon-es';
import { bumperMaterial } from '@cannon/materials';
import { PLAYFIELD } from '@src/App.config';
import { bumperCollisionHandler, COLLISION_GROUPS } from '@cannon/collisions';
const SCALER = 0.0584;

export const BUMPER_CONFIG = {
  collisionFilterGroup: COLLISION_GROUPS.PLAYFIELD,
  material: bumperMaterial,
  bumperCollisionHandler,
  shapeProps: {
    radiusTop: 0.0438,
    radiusBottom: 0.0438,
    height: 0.0584,
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
      offset: new CANNON.Vec3(-2 * SCALER + PLAYFIELD.offsetX, 0.5 * SCALER, -5 * SCALER),
      quaternion: PLAYFIELD.slopeQuaternion
    },
    {
      bumperName: 'upper_right_bumper',
      offset: new CANNON.Vec3(2 * SCALER + PLAYFIELD.offsetX * SCALER, 0.5 * SCALER, -5 * SCALER),
      quaternion: PLAYFIELD.slopeQuaternion
    },
    {
      bumperName: 'lower_center_bumper',
      offset: new CANNON.Vec3(0  + PLAYFIELD.offsetX * SCALER, 0.5 * SCALER, -2 * SCALER),
      quaternion: PLAYFIELD.slopeQuaternion
    }
  ]
}
