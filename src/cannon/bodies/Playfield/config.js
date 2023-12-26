import * as CANNON from 'cannon-es';
import { playFieldMaterial } from '@cannon/materials';
import { CannonRect, CannonCurve, CannonOrbit } from '@cannon/shapes';
import { PLAYFIELD_CONSTANTS } from '@cannon/constants';
import { COLLISION_GROUPS } from '@cannon/collisions';


export const PLAYFIELD_CONFIG = {
  quaternionPlayfieldSlope: PLAYFIELD_CONSTANTS.slopeQuaternion,
  collisionGroup: COLLISION_GROUPS.PLAYFIELD,
  playFieldMaterial,
  compositeElements: [
    {
      descripiton: 'Orbit',
      props: {
        offset: new CANNON.Vec3(0 + PLAYFIELD_CONSTANTS.offsetX, 0, -5),
        radius: 5,
        height: 1,
        radialSegments: 32,
        thetaStart: 0,
        thetaLength: -Math.PI
      },
      computeCompositeShape: (props) => CannonOrbit(props)
    }
  ],
  elements: [
  {
    description: 'Floor',
    props: {
      xSize: 10,
      ySize: 0,
      zSize: 20
    },
    offset: new CANNON.Vec3(0 + PLAYFIELD_CONSTANTS.offsetX, 0, 0),
    computeShape: (props) => CannonRect(props)
  },

  {
    description: 'Ceiling',
    props: {
      xSize: 11,
      ySize: .5,
      zSize: 20
    },
    offset: new CANNON.Vec3(0 + PLAYFIELD_CONSTANTS.offsetX, 1.25, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },   
  {
    description: 'top wall',
    props: {
      xSize: 10,
      ySize: 1,
      zSize: .5
    },
    offset: new CANNON.Vec3(0 + PLAYFIELD_CONSTANTS.offsetX, 0.5, -10.25),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'left gutter',
    props: {
      radius: 2,
      height: 1,
      radialSegments: 12,
      thetaStart: -Math.PI,
      thetaLength: -Math.PI * .30
    },
    offset: new CANNON.Vec3(-3 + PLAYFIELD_CONSTANTS.offsetX, 0, 4.75),
    computeShape: (props) => CannonCurve(props)
  },
  {
    description: 'right gutter',
    props: {
      radius: 2,
      height: 1,
      radialSegments: 12,
      thetaStart: 0,
      thetaLength: Math.PI * .30
    },
    offset: new CANNON.Vec3(2.25 + PLAYFIELD_CONSTANTS.offsetX, 0, 4.75),
    computeShape: (props) => CannonCurve(props)
  },
  {
    description: 'bottom left outlane',
    props: {
      xSize: 4,
      ySize: 1,
      zSize: 0.5
    },
    offset: new CANNON.Vec3(-3 + PLAYFIELD_CONSTANTS.offsetX, 0.5, 9.5),
    quaternion: PLAYFIELD_CONSTANTS.leftOutLaneQuaternion,
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'bottom right outlane',
    props: {
      xSize: 4,
      ySize: 1,
      zSize: 0.5
    },
    offset: new CANNON.Vec3(3 - PLAYFIELD_CONSTANTS.offsetX, 0.5, 9.5),
    quaternion: PLAYFIELD_CONSTANTS.rightOutLaneQuaternion,
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'Left wall',
    props: {
      xSize: .5,
      ySize: 1,
      zSize: 20
    },
    offset: new CANNON.Vec3(-5.25 + PLAYFIELD_CONSTANTS.offsetX, .5, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'Right wall',
    props: {
      xSize: .5,
      ySize: 1,
      zSize: 20
    },
    offset: new CANNON.Vec3(5.25 + PLAYFIELD_CONSTANTS.offsetX, .5, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  }
  ]
}