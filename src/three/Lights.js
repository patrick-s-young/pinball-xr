import * as THREE from 'three';
import { VIEW } from '@src/App.config';

export function Lights() {
  const { lighting } = VIEW;
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0xbbbbff, lighting.hemisphere);
  hemisphere.name = 'hemisphere';
  hemisphere.position.set( 0.5, 1, 0.25 );

  const directional = new THREE.DirectionalLight(0xffffff, lighting.directional);
  directional.name = 'directional';
  directional.position.set( 0.2, 1, 1);

  const point = new THREE.PointLight(0xffffff, lighting.point);
  point.name = 'point';
  point.position.set(0, 2, -1);
  point.castShadow = true;
  point.shadow.mapSize.width = 2048;
  point.shadow.mapSize.height = 2048;
  return {
    getLights: () => [hemisphere, point, directional]
  }
}