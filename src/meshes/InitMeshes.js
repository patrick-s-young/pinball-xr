import { Reticle } from './Reticle';
import { DebugFloorMesh } from '@debug/DebugFloorMesh';

const InitMeshes = () => {
  const reticle = Reticle();
  const debugFloor =  DebugFloorMesh({  
    position: [0, 0, 0],
    size: [6, 6]
  });

  return {
    reticle,
    debugFloor
  }
}

export default InitMeshes;