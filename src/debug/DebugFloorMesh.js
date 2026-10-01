import * as THREE from 'three';

// The floor's image and how much floor one copy of it covers (metres): about 7.5 planks of
// roughly 15 cm each.
const FLOOR_IMAGE = '/models/floor/wood-floor.jpg';
const FLOOR_TILE_SIZE = 1.2;

export function DebugFloorMesh({
  position = [0, 0, 0],
  size = [10, 10]
}) {
  const loader = new THREE.TextureLoader();
  const texture = loader.load(FLOOR_IMAGE);
  texture.encoding = THREE.sRGBEncoding;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(size[0] / FLOOR_TILE_SIZE, size[1] / FLOOR_TILE_SIZE);
  // Keeps the boards sharp where the floor is seen at a low angle.
  texture.anisotropy = 8;
  let body;

  const material = new THREE.MeshBasicMaterial({
    map: texture
  });

  const materialShadow = new THREE.ShadowMaterial();
  materialShadow.opacity = 0.2;

  const geometry = new THREE.PlaneGeometry(...size);
  const mesh = new THREE.Mesh( geometry, material );
  mesh.position.set(...position);
  mesh.rotateX(-Math.PI / 2);
  mesh.receiveShadow = true;

  const setPosition = ({x, y, z}) => {
    mesh.position.x = x;
    mesh.position.y = y;
    mesh.position.z = z;
  }

  return {
    get mesh() { return mesh },
    set visible(isVisible) { mesh.visible = isVisible },
    setPosition
  }
}

