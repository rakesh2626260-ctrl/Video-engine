import {defineConfig} from 'vite';

// The scene is a Revideo/Motion Canvas project. It is rendered headlessly by
// `@revideo/renderer` (see render.mjs), which spins up its own Vite build. This
// config only keeps a conventional dev entry point for local previewing.
export default defineConfig({
  server: {
    port: 5173,
  },
  build: {
    target: 'esnext',
  },
});
