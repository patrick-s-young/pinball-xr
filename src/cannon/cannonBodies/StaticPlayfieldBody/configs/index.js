import { CannonCurve, CannonRect } from '../../../cannonShapes';
import * as CANNON from 'cannon-es';



export const STATIC_PLAYFIELD_SHAPES = [
  {
    description: 'Floor',
    props: {
      xSize: 10,
      ySize: 0,
      zSize: 20
    },
    offset: undefined,
    quaternion: undefined,
    computeShape: (props) => CannonRect(props)
  },

  {
    description: 'Ceiling',
    props: {
      xSize: 10,
      ySize: .5,
      zSize: 20
    },
    offset: new CANNON.Vec3(0, 1.5, 0),
    quaternion: undefined,
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
    quaternion: undefined,
    computeShape: (props) => CannonCurve(props)
  },
  {
    description: 'Bottom straight wall',
    props: {
      xSize: 10,
      ySize: 1,
      zSize: 0
    },
    offset: new CANNON.Vec3(0, 0.5, 10),
    quaternion: undefined,
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
    quaternion: undefined,
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
    quaternion: undefined,
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
    quaternion: undefined,
    computeShape: (props) => new CANNON.Box(new CANNON.Vec3(props.xSize / 2, props.ySize / 2, props.zSize / 2))
  },
]