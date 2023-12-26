import * as THREE from 'three';

export function DebugFloor({
  position = [0, 0, 0],
  size = [10, 10]
}) {
  const loader = new THREE.TextureLoader();
  const texture = loader.load('/models/floor/checkerboard.png');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.x = texture.repeat.y = 40;
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

