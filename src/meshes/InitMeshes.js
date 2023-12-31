import { Reticle } from './Reticle';
import { DebugFloor } from './DebugFloor';

const InitMeshes = () => {
  const reticle = Reticle();
  const debugFloor =  DebugFloor({  
    position: [0, 0, 0],
    size: [6, 6]
  });

  return {
    reticle,
    debugFloor
  }
}

export default InitMeshes;