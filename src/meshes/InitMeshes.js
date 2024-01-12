import { Reticle } from './Reticle';
import { DebugFloorMesh } from '@debug/DebugFloorMesh';

const InitMeshes = ({ isDebugMode }) => {
  const reticle = Reticle();
  const debugFloor =  isDebugMode
  ? DebugFloorMesh({  
      position: [0, 0, 0],
      size: [6, 6]
    })
  : null;

  return {
    reticle,
    debugFloor
  }
}

export default InitMeshes;