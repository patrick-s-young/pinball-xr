import * as CANNON from 'cannon-es';
export const flipperMaterial = new CANNON.Material('flipper');
import { quaternionPlayfieldSlope } from '../../../constants';
import { COLLISION_GROUPS } from '../../../constants';

export const FLIPPER_CONFIG = {
  flipperNames: ['leftFlipper', 'rightFlipper'],
  leftFlipper: {
    hingedBody: { 
      position: [-1.5, -0.25, 8]
    },
    staticBody: { 
      position: [-4, -0.25, 8]
    },
    hingeConstraint: { 
      options: {
        pivotA: new CANNON.Vec3(0, 0, 0),
        axisA: new CANNON.Vec3(0, 1, 0),
        pivotB: new CANNON.Vec3(-1, 0, 0),
        axisB: new CANNON.Vec3(0, 1, 0),
        maxForce: 50
      }
    },
    forwardTrigger: { 
      position: [-3 , -.1, 6] 
    },
    backwardTrigger: { 
      position: [-2  , -.2, 9]
    }
  },
  rightFlipper: {
    hingedBody: { 
      position: [1.5, -0.25, 8]
    },
    staticBody: { 
      position: [3, -0.25, 8]
    },
    hingeConstraint: { 
      options: {
        pivotA: new CANNON.Vec3(0, 0, 0),
        axisA: new CANNON.Vec3(0, 1, 0),
        pivotB: new CANNON.Vec3(1, 0, 0),
        axisB: new CANNON.Vec3(0, 1, 0),
        maxForce: 50
      },
    },
    forwardTrigger: { 
      position: [2 , -.1, 6]
    },
    backwardTrigger: { 
      position: [1, -.2, 9]
    }
  },
  _hingedBody: {
    shape: new CANNON.Vec3(1.5, 0.4, 0.4),
    options: {
      mass: 2,
      material: flipperMaterial,
      quaternion: quaternionPlayfieldSlope,
      angularDamping: 0.9,
      linearDamping: 0.9,
      collisionFilterGroup: COLLISION_GROUPS.PLAYFIELD,
      collisionFilterMask:  COLLISION_GROUPS.BALL |  COLLISION_GROUPS.TRIGGERS
    }
  },
  _staticBody: {
    shape: [.25, .25, .5, 8], // Cylinder
    options: {
      mass: 0,
      quaternion: quaternionPlayfieldSlope,
    }
  },
  _triggerBody: {
    shape: new CANNON.Vec3(0.20, .20, .20),
    options: { 
      mass: 0, 
      collisionFilterGroup: COLLISION_GROUPS.TRIGGERS
    }
  }
}