import { Reticle } from './Reticle';
import { DebugFloor } from './DebugFloor';

const InitMeshes = () => {
  const reticle = Reticle();
  const debugFloor =  DebugFloor({  
    position: [0, 0, 0],
    size: [10, 10]
  });

  return {
    reticle,
    debugFloor
  }
}

export default InitMeshes;