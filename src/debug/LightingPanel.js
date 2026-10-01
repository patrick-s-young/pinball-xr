import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { VIEW } from '@src/App.config';

// A panel for trying lighting values live on the desktop (?lighting in the page URL). Starts
// from VIEW.lighting; copy values you like back into App.config.js.
export const LightingPanel = ({ scene, renderer }) => {
  const lights = ['hemisphere', 'point', 'directional'].map(name => scene.getObjectByName(name)).filter(Boolean);
  const reflection = scene.getObjectByName('playfieldReflection');
  // Each material's environment intensity as the table view set it (VIEW.lighting.environment = 1).
  const baseEnvironment = new Map();
  scene.traverse(node => {
    if (node.isMesh && node.material.envMapIntensity !== undefined) {
      baseEnvironment.set(node.material, node.material.envMapIntensity / VIEW.lighting.environment);
    }
  });

  // The playfield lights' glows (see TableView), by their colour as the table view set it.
  const baseGlow = new Map();
  scene.traverse(node => {
    const uniforms = node.isMesh && node.material.uniforms;
    if (uniforms?.falloff && uniforms.color) baseGlow.set(uniforms.color, uniforms.color.value.clone());
  });

  const settings = {
    ...VIEW.lighting,
    reflection: reflection ? reflection.material.uniforms.strength.value : 0,
    lights: 1
  };
  const gui = new GUI({ title: 'Lighting' });
  gui.add(settings, 'exposure', 0, 2, 0.05).onChange(value => { renderer.toneMappingExposure = value; });
  lights.forEach(light => gui.add(settings, light.name, 0, 4, 0.05).onChange(value => { light.intensity = value; }));
  gui.add(settings, 'environment', 0, 2, 0.05)
    .onChange(value => baseEnvironment.forEach((base, material) => { material.envMapIntensity = base * value; }));
  if (reflection) {
    gui.add(settings, 'reflection', 0, 1, 0.01).onChange(value => { reflection.material.uniforms.strength.value = value; });
  }
  if (baseGlow.size) {
    gui.add(settings, 'lights', 0, 4, 0.05)
      .onChange(value => baseGlow.forEach((base, uniform) => { uniform.value.copy(base).multiplyScalar(value); }));
  }
  return gui;
}
