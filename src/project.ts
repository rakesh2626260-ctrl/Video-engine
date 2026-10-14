import {makeProject} from '@revideo/core';

import example from './scenes/example';

/**
 * The Revideo project: 1920x1080, 60fps.
 *
 * The frame rate lives in `settings.rendering.fps`; `renderVideo` (render.mjs)
 * only accepts range/background/size/exporter overrides, so it has to be set
 * here.
 */
export default makeProject({
  scenes: [example],
  settings: {
    shared: {
      size: {x: 1920, y: 1080},
      background: '#05070d',
    },
    rendering: {
      fps: 60,
    },
    preview: {
      fps: 60,
    },
  },
});
