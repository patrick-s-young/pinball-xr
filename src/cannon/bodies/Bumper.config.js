import * as CANNON from 'cannon-es';
import { MATERIALS } from '@cannon/materials/MATERIALS';
import { PLAYFIELD } from '@src/App.config';
import { bumperCollisionHandler } from '@cannon/collisions/bumperCollisionHandler';
import { COLLISION_GROUPS } from '@cannon/collisions/COLLISION_GROUPS';
const SCALER = 0.0584; // TODO bake scaler values into vectors

export const BUMPER_CONFIG = {
  collisionFilterGroup: COLLISION_GROUPS.PLAYFIELD,
  material: MATERIALS.bumperMaterial,
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
      offset: new CANNON.Vec3(
        -2 * SCALER + PLAYFIELD.offsetX, 
        0.0584 * .5, 
        -6 * SCALER),
      quaternion: PLAYFIELD.slopeQuaternion
    },
    {
      bumperName: 'upper_right_bumper',
      offset: new CANNON.Vec3(
        2 * SCALER + PLAYFIELD.offsetX * SCALER, 
        0.0584 * .5, 
        -6 * SCALER),
      quaternion: PLAYFIELD.slopeQuaternion
    },
    {
      bumperName: 'lower_center_bumper',
      offset: new CANNON.Vec3(
        PLAYFIELD.offsetX * SCALER, 
        0.0584 * .5, 
        -4 * SCALER),
      quaternion: PLAYFIELD.slopeQuaternion
    }
  ]
}
