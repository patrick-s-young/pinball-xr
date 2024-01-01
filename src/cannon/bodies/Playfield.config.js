import * as CANNON from 'cannon-es';
import { MATERIALS } from '@cannon/materials/MATERIALS';
import { CannonRect, CannonCurve, CannonOrbit } from '@cannon/shapes';
import { PLAYFIELD } from '@src/App.config';
import { COLLISION_GROUPS } from '@cannon/collisions/COLLISION_GROUPS';

const SCALER = 0.0584;
export const PLAYFIELD_CONFIG = {
  quaternionPlayfieldSlope: PLAYFIELD.slopeQuaternion,
  collisionGroup: COLLISION_GROUPS.PLAYFIELD,
  playFieldMaterial: MATERIALS.playFieldMaterial,
  compositeElements: [
    {
      descripiton: 'Orbit',
      props: {
        offset: new CANNON.Vec3(0 + PLAYFIELD.offsetX, 0, -5 * SCALER),
        radius: 0.292,
        height: 0.0584,
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
      xSize: 0.584,
      ySize: 0,
      zSize: 1.168
    },
    offset: new CANNON.Vec3(0 + PLAYFIELD.offsetX, 0, 0),
    computeShape: (props) => CannonRect(props)
  },

  {
    description: 'Ceiling',
    props: {
      xSize: 0.6424,
      ySize: 0.0292,
      zSize: 1.168
    },
    offset: new CANNON.Vec3(0 + PLAYFIELD.offsetX, 1.25 * SCALER, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },   
  {
    description: 'top wall',
    props: {
      xSize: 0.584,
      ySize: 0.0584,
      zSize: 0.0292
    },
    offset: new CANNON.Vec3(0 + PLAYFIELD.offsetX, 0.5 * SCALER, -10.25 * SCALER),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'left gutter',
    props: {
      radius: 0.1168,
      height: 0.0584,
      radialSegments: 12,
      thetaStart: -Math.PI,
      thetaLength: -Math.PI * .30
    },
    offset: new CANNON.Vec3(-3 * SCALER + PLAYFIELD.offsetX, 0, 4.75 * SCALER),
    computeShape: (props) => CannonCurve(props)
  },
  {
    description: 'right gutter',
    props: {
      radius: 0.1168,
      height: 0.0584,
      radialSegments: 12,
      thetaStart: 0,
      thetaLength: Math.PI * .30
    },
    offset: new CANNON.Vec3(2.25 * SCALER + PLAYFIELD.offsetX, 0, 4.75 * SCALER),
    computeShape: (props) => CannonCurve(props)
  },
  {
    description: 'bottom left outlane',
    props: {
      xSize: 0.2336,
      ySize: 0.0584,
      zSize: 0.0292
    },
    offset: new CANNON.Vec3(-3 * SCALER + PLAYFIELD.offsetX, 0.5 * SCALER, 9.5 * SCALER),
    quaternion: PLAYFIELD.leftOutLaneQuaternion,
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'bottom right outlane',
    props: {
      xSize: 0.2336,
      ySize: 0.0584,
      zSize: 0.0292
    },
    offset: new CANNON.Vec3(3 * SCALER - PLAYFIELD.offsetX, 0.5 * SCALER, 9.5 * SCALER),
    quaternion: PLAYFIELD.rightOutLaneQuaternion,
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'Left wall',
    props: {
      xSize: 0.0292,
      ySize: 0.0584,
      zSize: 1.168
    },
    offset: new CANNON.Vec3(-5.25 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'Right wall',
    props: {
      xSize: 0.0292,
      ySize: 0.0584,
      zSize: 1.168
    },
    offset: new CANNON.Vec3(5.25 * SCALER + PLAYFIELD.offsetX, .5 * SCALER, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  }
  ]
}