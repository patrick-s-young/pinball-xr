import Stats from 'stats.js';

// FPS / frame-time overlay with an extra panel for the physics update. Click it to cycle panels.
export const PerformanceStats = () => {
  const stats = new Stats();
  const physicsPanel = stats.addPanel(new Stats.Panel('PHYS ms', '#ff8', '#221'));
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  // Runs fn and records how long it took on the physics panel.
  const measurePhysics = (fn) => {
    const start = performance.now();
    fn();
    physicsPanel.update(performance.now() - start, 5);
  }

  return {
    begin: () => stats.begin(),
    end: () => stats.end(),
    measurePhysics
  }
}
