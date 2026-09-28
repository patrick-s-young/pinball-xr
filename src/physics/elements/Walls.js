import { COLLISION_GROUPS } from '../COLLISION_GROUPS';
import { withMaterial } from '../colliders';

// Each wall or rubber becomes one triangle mesh: vertical faces around each of its outline loops,
// from the playfield up to the wall's height, plus a top so a ball that lands on it does not drop
// inside. Loops come from the importer wound so the faces point away from the solid, which lets
// FIX_INTERNAL_EDGES stop the ball catching on the seams between faces.
const wallMesh = ({ loops, height, cap }) => {
  const vertices = [];
  const indices = [];
  let first = 0;
  loops.forEach(loop => {
    // Vertex 2k is on the playfield and 2k + 1 at the top, for outline point k across all loops.
    loop.forEach(([x, z]) => vertices.push(x, 0, z, x, height, z));
    loop.forEach((_, i) => {
      const a = first + i;
      const b = first + (i + 1) % loop.length;
      indices.push(2 * a, 2 * b, 2 * b + 1, 2 * a, 2 * b + 1, 2 * a + 1);
    });
    first += loop.length;
  });
  (cap || []).forEach(([a, b, c]) => indices.push(2 * a + 1, 2 * b + 1, 2 * c + 1));
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}

export const Walls = ({ world, RAPIER, table }, walls) => walls.map(wall => {
  const { vertices, indices } = wallMesh(wall);
  const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES)
    .setCollisionGroups(COLLISION_GROUPS.table);
  withMaterial(RAPIER, colliderDesc, { friction: wall.friction, restitution: wall.restitution });
  return { name: wall.name, collider: world.createCollider(colliderDesc, table.body) };
});
