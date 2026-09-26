import * as THREE from 'three';

const lineGeometry = (vertices, colors) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  return geometry;
}

// Draws the physics colliders as wireframe. Everything attached to the table is drawn once and
// moved with the table, so nudges show; only the moving parts (ball, flippers, plunger rod) are
// redrawn each frame, into buffers that are reused rather than reallocated.
export const PhysicsDebugRenderer = ({ scene, physics }) => {
  const { world, table } = physics;
  const material = new THREE.LineBasicMaterial({ vertexColors: true });
  const isOnTable = (collider) => collider.parent()?.handle === table.body.handle;

  const tableAtRest = table.body.translation();
  const staticBuffers = world.debugRender(undefined, isOnTable);
  const tableLines = new THREE.LineSegments(lineGeometry(staticBuffers.vertices, staticBuffers.colors), material);
  tableLines.frustumCulled = false;
  const tableGroup = new THREE.Group();
  tableGroup.add(tableLines);
  scene.add(tableGroup);

  let capacity = 0;
  const movingGeometry = new THREE.BufferGeometry();
  const movingLines = new THREE.LineSegments(movingGeometry, material);
  movingLines.frustumCulled = false;
  scene.add(movingLines);

  const update = () => {
    const position = table.body.translation();
    tableGroup.position.set(position.x - tableAtRest.x, position.y - tableAtRest.y, position.z - tableAtRest.z);

    const { vertices, colors } = world.debugRender(undefined, (collider) => !isOnTable(collider));
    const count = vertices.length / 3;
    if (count > capacity) {
      capacity = Math.ceil(count * 1.5);
      movingGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
      movingGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(capacity * 4), 4));
    }
    const positions = movingGeometry.getAttribute('position');
    const vertexColors = movingGeometry.getAttribute('color');
    positions.array.set(vertices);
    vertexColors.array.set(colors);
    positions.needsUpdate = true;
    vertexColors.needsUpdate = true;
    movingGeometry.setDrawRange(0, count);
  }

  return { update };
}
