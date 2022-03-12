import * as CANNON from 'cannon-es';
import { quaternionPlayfieldSlope } from 'cannon/constants';
import { COLLISION_GROUPS, lowerLimitFlipperCollisionHandler } from 'cannon/collisions';
import { flipperMaterial } from 'cannon/materials';

export const FLIPPER_CONFIG = {
  quaternionPlayfieldSlope,
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
    upperLimit: { 
      position: [-3 , -.1, 6] 
    },
    lowerLimit: { 
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
        maxForce: 100
      },
    },
    upperLimit: { 
      position: [2 , -.1, 6]
    },
    lowerLimit: { 
      position: [1, -.2, 9]
    }
  },
  _hingedBody: {
    shape: new CANNON.Vec3(1.5, 0.4, 0.4),
    options: {
      mass: 4,
      material: flipperMaterial,
      quaternion: quaternionPlayfieldSlope,
      angularDamping: 0.5,
      linearDamping: 0.5,
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
    lowerLimitFlipperCollisionHandler,
    shape: new CANNON.Vec3(0.20, .20, .20),
    options: { 
      mass: 0, 
      collisionFilterGroup: COLLISION_GROUPS.TRIGGERS
    }
  }
}