import * as THREE from 'three';

// Draws every Rapier collider as wireframe lines in one draw call.
export const PhysicsDebugRenderer = ({ scene, world }) => {
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({ vertexColors: true });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  scene.add(lines);

  const update = () => {
    const { vertices, colors } = world.debugRender();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
  }

  return { update };
}
