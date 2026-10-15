import {makeProject} from '@revideo/core';

import example from './scenes/example';

declare const __FPS__: number | undefined;

/**
 * The Revideo project (code mode): 1920x1080, 60fps by default.
 *
 * The frame rate lives in `settings.rendering.fps`; `renderVideo` (render.mjs)
 * only accepts range/background/size/exporter overrides, so it has to be set
 * here. `render.mjs` injects `__FPS__` via Vite `define` when the caller sets
 * FPS in the environment (used for fast 15fps local tests).
 */
const FPS = typeof __FPS__ === 'number' && __FPS__ > 0 ? __FPS__ : 60;

export default makeProject({
  scenes: [example],
  settings: {
    shared: {
      size: {x: 1920, y: 1080},
      background: '#05070d',
    },
    rendering: {
      fps: FPS,
    },
    preview: {
      fps: FPS,
    },
  },
});
