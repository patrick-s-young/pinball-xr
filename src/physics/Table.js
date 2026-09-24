import { PLAYFIELD } from '@src/App.config';
import { multiplyQuaternions, rotateVector } from '@math';

// The tilted table frame: x across the table, y up from the playfield surface, z toward the player.
// Every static table collider hangs off this one fixed body; moving parts use toWorld helpers.
export const Table = ({ world, RAPIER, placement }) => {
  const [x, y, z] = placement;
  const rotation = PLAYFIELD.slopeQuaternion;
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(x, y, z)
      .setRotation(rotation)
  );

  const directionToWorld = (local) => rotateVector(local, rotation);

  const toWorld = (local) => {
    const rotated = directionToWorld(local);
    return { x: rotated.x + x, y: rotated.y + y, z: rotated.z + z };
  }

  const rotationToWorld = (localRotation) => multiplyQuaternions(rotation, localRotation);

  const normal = directionToWorld({ x: 0, y: 1, z: 0 });

  // Distance of a world point above the playfield surface.
  const heightAbovePlayfield = (point) =>
    (point.x - x) * normal.x + (point.y - y) * normal.y + (point.z - z) * normal.z;

  return {
    body,
    normal,
    heightAbovePlayfield,
    toWorld,
    directionToWorld,
    rotationToWorld
  }
}
