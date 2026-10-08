import { WaterSimulation } from './WaterSimulation';

// The water simulation's message protocol, shared by the worker (water.worker.js) and the
// main-thread fallback, so the view talks to both the same way.
//
// Messages in:
//   { type: 'init', definition, settings }
//   { type: 'release' }
//   { type: 'frame', time, flippers, buffer } - advance by `time` seconds; `buffer` (optional) is
//     an earlier frame's buffer handed back for reuse.
// Messages out, through reply(message, transfer):
//   { type: 'ready', cols, rows, cellSize, tank }
//   { type: 'frame', buffer, jet, tankLevel, finished } - buffer holds depth, speed, and velocity
//     (x, z) for each cell, interleaved, row by row from the top of the table.
export const waterMessages = (reply) => {
  let simulation = null;

  return (data) => {
    if (data.type === 'init') {
      simulation = WaterSimulation({ definition: data.definition, settings: data.settings });
      const { cols, rows, cellSize, tank } = simulation;
      reply({ type: 'ready', cols, rows, cellSize, tank });
    } else if (data.type === 'release') {
      simulation.release();
    } else if (data.type === 'frame') {
      simulation.setFlippers(data.flippers);
      simulation.update(data.time);
      const { depth, speed, flowX, flowZ, state } = simulation;
      const buffer = data.buffer && data.buffer.length === depth.length * 4 ? data.buffer : new Float32Array(depth.length * 4);
      for (let k = 0, i = 0; k < depth.length; k++, i += 4) {
        buffer[i] = depth[k]; buffer[i + 1] = speed[k]; buffer[i + 2] = flowX[k]; buffer[i + 3] = flowZ[k];
      }
      reply({ type: 'frame', buffer, jet: { ...state.jet }, tankLevel: state.tankLevel, finished: state.finished }, [buffer.buffer]);
    }
  };
}
