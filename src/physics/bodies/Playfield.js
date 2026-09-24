import { PLAYFIELD_CONFIG } from './Playfield.config';
import { MATERIALS } from '@physics/MATERIALS';
import { tableCuboid } from '@physics/shapes';

export const Playfield = (physics) => {
  const segments = PLAYFIELD_CONFIG.arcs.flatMap(arc => arc.segments);
  const colliders = [...PLAYFIELD_CONFIG.cuboids, ...segments].map(({ size, center, rotation }) =>
    tableCuboid(physics, { size, center, rotation, material: MATERIALS.playfield })
  );

  return { colliders };
}
