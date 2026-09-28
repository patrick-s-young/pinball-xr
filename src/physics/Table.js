import { multiplyQuaternions, quaternionFromAxisAngle, rotateVector } from '@math';

// The tilted table frame: x across the table, y up from the playfield surface, z toward the player.
// Every static table collider hangs off this one body; moving parts use the toWorld helpers,
// which describe the table at its rest position. The body is kinematic so a nudge can shove the
// whole cabinet a few millimetres and let it spring back.
export const Table = ({ world, RAPIER, placement, slopeRadians }) => {
  const [x, y, z] = placement;
  const rotation = quaternionFromAxisAngle({ x: 1, y: 0, z: 0 }, slopeRadians);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(x, y, z)
      .setRotation(rotation)
  );

  const inverseRotation = { x: -rotation.x, y: -rotation.y, z: -rotation.z, w: rotation.w };

  const directionToWorld = (local) => rotateVector(local, rotation);

  const toWorld = (local) => {
    const rotated = directionToWorld(local);
    return { x: rotated.x + x, y: rotated.y + y, z: rotated.z + z };
  }

  const toLocal = (point) =>
    rotateVector({ x: point.x - x, y: point.y - y, z: point.z - z }, inverseRotation);

  const rotationToWorld = (localRotation) => multiplyQuaternions(rotation, localRotation);

  const normal = directionToWorld({ x: 0, y: 1, z: 0 });

  // Moves the table from its rest position by a table-space offset, over the next physics step.
  const setOffset = (offset) => {
    const moved = directionToWorld(offset);
    body.setNextKinematicTranslation({ x: moved.x + x, y: moved.y + y, z: moved.z + z });
  }

  // Distance of a world point above the playfield surface.
  const heightAbovePlayfield = (point) =>
    (point.x - x) * normal.x + (point.y - y) * normal.y + (point.z - z) * normal.z;

  return {
    body,
    normal,
    heightAbovePlayfield,
    setOffset,
    toWorld,
    toLocal,
    directionToWorld,
    rotationToWorld
  }
}
