import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { SETTINGS_KEY } from './Water3DView';

const round = (value) => Array.isArray(value) ? value.map(v => Number(v.toFixed(3))) : typeof value === 'number' ? Number(value.toFixed(4)) : value;
const same = (a, b) => JSON.stringify(round(a)) === JSON.stringify(round(b));

// The settings as text to paste back to make them the defaults: what changed from App.config.js,
// then every value.
const describe = (settings, defaults) => {
  const changed = Object.keys(defaults).filter(key => !same(settings[key], defaults[key]));
  const { gravity, volume, ...water3d } = Object.fromEntries(Object.keys(defaults).map(key => [key, round(settings[key])]));
  return [
    '3D water settings (from the panel)',
    changed.length ? 'Changed from the defaults:' : 'No changes from the defaults.',
    ...changed.map(key => `  ${key}: ${JSON.stringify(round(defaults[key]))} -> ${JSON.stringify(round(settings[key]))}`),
    'All values:',
    `  WATER3D: ${JSON.stringify(water3d)}`,
    `  WATER: { gravity: ${gravity} }, water in the tank: ${volume} litres`
  ].join('\n');
}

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// When the clipboard is not allowed: the text in a box beside the panel, selected, to copy by hand.
const showText = (text, beside) => {
  const area = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
  const { right, top } = beside.getBoundingClientRect();
  Object.assign(area.style, { position: 'fixed', left: `${right + 8}px`, top: `${top}px`, width: '520px', height: '240px', zIndex: 1001, font: '12px monospace' });
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.addEventListener('blur', () => area.remove());
}

// Sliders for trying the 3D water's settings live (shown with ?water=3d). Starts from WATER3D and
// WATER in App.config.js; the browser remembers changes between page loads. "Copy settings" puts
// them on the clipboard to paste back as new defaults; "Reset to defaults" forgets them. The fluid,
// gravity, and look change at once; the amount of water and the grid cell size apply on the next
// pour.
export const Water3DPanel = (water) => {
  const { settings, defaults } = water;
  const gui = new GUI({ title: '3D water' });
  // Below the FPS overlay, on the left, clear of the lighting panel.
  Object.assign(gui.domElement.style, { left: '8px', right: 'auto', top: '60px' });

  const save = () => {
    const changed = Object.fromEntries(Object.keys(defaults).filter(key => !same(settings[key], defaults[key])).map(key => [key, settings[key]]));
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(changed)); } catch { /* not remembered */ }
  }
  gui.onChange(save);

  const actions = {
    copy: async () => {
      const text = describe(settings, defaults);
      const copied = await copyText(text);
      if (copied) {
        copyButton.name('Copied: paste it to Claude');
        setTimeout(() => copyButton.name('Copy settings'), 2500);
      } else {
        showText(text, gui.domElement);
      }
    },
    reset: () => {
      Object.assign(settings, defaults, { color: [...defaults.color] });
      cell.millimetres = settings.cellSize * 1000;
      gui.controllersRecursive().forEach(controller => controller.updateDisplay());
      try { localStorage.removeItem(SETTINGS_KEY); } catch { /* nothing remembered */ }
      water.redraw();
    }
  };
  const copyButton = gui.add(actions, 'copy').name('Copy settings');
  gui.add(actions, 'reset').name('Reset to defaults');

  const nextPour = gui.addFolder('Next pour');
  nextPour.add({ pour: () => water.pourAgain() }, 'pour').name('Pour again');
  nextPour.add(settings, 'volume', 0.1, 7, 0.05).name('water (litres)');
  const cell = { millimetres: settings.cellSize * 1000 };
  nextPour.add(cell, 'millimetres', 4, 12, 0.5).name('grid cell (mm)').onChange(value => { settings.cellSize = value / 1000; });

  const fluid = gui.addFolder('Fluid');
  fluid.add(settings, 'gravity', 0.02, 1, 0.01).name('gravity (× real)');
  fluid.add(settings, 'floorFriction', 0, 30, 0.5).name('floor friction');
  fluid.add(settings, 'stiffness', 0.5, 30, 0.5);
  fluid.add(settings, 'restDensity', 1, 8, 0.1).name('rest density');
  fluid.add(settings, 'viscosity', 0, 1, 0.01);

  const look = gui.addFolder('Look');
  look.addColor(settings, 'color');
  look.add(settings, 'density', 0, 30, 0.5).name('absorption');
  look.add(settings, 'glow', 0, 0.5, 0.01);
  look.add(settings, 'environment', 0, 1, 0.01).name('reflection');
  look.add(settings, 'refraction', 0, 0.2, 0.005);
  look.add(settings, 'depthSmoothing', 0, 8, 1).name('smoothing passes');
  // These rebuild the drawing.
  look.add(settings, 'particleSize', 1, 4, 0.1).name('particle size').onFinishChange(() => water.redraw());
  look.add(settings, 'thicknessBlur', 2, 30, 1).name('thickness blur').onFinishChange(() => water.redraw());
  look.add(settings, 'resolution', 0.3, 1, 0.05).onFinishChange(() => water.redraw());
  look.close();

  const stats = gui.addFolder('Now');
  const shown = { particles: 0, tank: 0, steps: 0, grid: '' };
  stats.add(shown, 'particles').name('particles').disable().listen();
  stats.add(shown, 'tank').name('tank (%)').disable().listen();
  stats.add(shown, 'steps').name('steps per frame').disable().listen();
  stats.add(shown, 'grid').name('grid (cells)').disable().listen();
  setInterval(() => {
    const { particles, tank, stepsPerFrame, grid } = water.stats();
    Object.assign(shown, { particles, tank, steps: stepsPerFrame, grid });
  }, 250);
  return gui;
}
