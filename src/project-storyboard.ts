import {makeProject} from '@revideo/core';

import storyboard from './scenes/storyboard';

declare const __FPS__: number | undefined;

/**
 * Storyboard project: 1920x1080, 60fps by default.
 *
 * The frame rate lives in `settings.rendering.fps`; `renderVideo` cannot
 * override it, so `render.mjs` injects `__FPS__` via Vite `define` when the
 * caller sets FPS in the environment (used for fast 15fps local tests).
 */
const FPS = typeof __FPS__ === 'number' && __FPS__ > 0 ? __FPS__ : 60;

export default makeProject({
  scenes: [storyboard],
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
