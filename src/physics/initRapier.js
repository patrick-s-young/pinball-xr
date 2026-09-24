import RAPIER from '@dimforge/rapier3d-compat';

let ready = null;

// Loads the Rapier WASM module once and resolves with the RAPIER namespace.
export const initRapier = () => {
  if (ready === null) ready = RAPIER.init().then(() => RAPIER);
  return ready;
}
