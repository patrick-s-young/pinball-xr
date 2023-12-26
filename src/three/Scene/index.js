import * as THREE from 'three';

export function Scene() {
  const scene = new THREE.Scene();
  
  // ALLOW SINGLE ELEMENT OR ARRAY TO BE PASSED
  const add = (element) => {
    if (Array.isArray(element)) { 
      element.forEach(item => {
        scene.add(item);
      });
    } else {
      scene.add(element)
    }
  }


  return {
    get self() { return scene },
    add
  }
}