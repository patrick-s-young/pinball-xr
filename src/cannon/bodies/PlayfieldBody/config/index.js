import * as CANNON from 'cannon-es';
import { playFieldMaterial } from 'cannon/materials';
import { CannonCurve, CannonRect } from 'cannon/shapes';
import { quaternionPlayfieldSlope } from 'cannon/constants';
import { COLLISION_GROUPS } from 'cannon/collisions';

export const PLAYFIELD_CONFIG = {
  quaternionPlayfieldSlope,
  collisionGroup: COLLISION_GROUPS.PLAYFIELD,
  playFieldMaterial,
  elements: [
  {
    description: 'Floor',
    props: {
      xSize: 10,
      ySize: 0,
      zSize: 20
    },
    offset: undefined,
    computeShape: (props) => CannonRect(props)
  },

  {
    description: 'Ceiling',
    props: {
      xSize: 10,
      ySize: .5,
      zSize: 20
    },
    offset: new CANNON.Vec3(0, 1.25, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },   
  {
    description: 'top wall',
    props: {
      xSize: 10,
      ySize: 1,
      zSize: .5
    },
    offset: new CANNON.Vec3(0, 0.5, -10.25),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'Top curved wall',
    props: {
      radius: 5,
      height: 1,
      radialSegments: 32,
      thetaStart: 0,
      thetaLength: -Math.PI * 1.2
    },
    offset: new CANNON.Vec3(0, 0, -5),
    computeShape: (props) => CannonCurve(props)
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
    offset: new CANNON.Vec3(-3, 0, 5.75),
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
    offset: new CANNON.Vec3(2.25, 0, 5.75),
    computeShape: (props) => CannonCurve(props)
  },
  {
    description: 'Bottom wall',
    props: {
      xSize: 10,
      ySize: 1,
      zSize: 0
    },
    offset: new CANNON.Vec3(0, 0.5, 10),
    computeShape: (props) => CannonRect(props)
  },
  {
    description: 'Left wall',
    props: {
      xSize: .5,
      ySize: 1,
      zSize: 20
    },
    offset: new CANNON.Vec3(-5.25, .5, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'Right wall',
    props: {
      xSize: .5,
      ySize: 1,
      zSize: 20
    },
    offset: new CANNON.Vec3(5.25, .5, 0),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
  {
    description: 'Right wall',
    props: {
      xSize: 0.2,
      ySize: 1,
      zSize: 15
    },
    offset: new CANNON.Vec3(4.3, .5, 2.5),
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  }
  ]
}