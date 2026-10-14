/**
 * Headless render entry point.
 *
 * Renders src/project.ts to out/silent.mp4 with Revideo's `renderVideo`
 * (Chromium + ffmpeg, no GUI). The workflow then muxes this silent video with
 * the Piper voiceover into final.mp4.
 */
import {existsSync} from 'node:fs';
import {renderVideo} from '@revideo/renderer';

const OUT_FILE = 'out/silent.mp4';

/** Prefer a real system ffmpeg (installed by the workflow) when available. */
const ffmpeg = {};
for (const [key, envName, fallback] of [
  ['ffmpegPath', 'FFMPEG_PATH', '/usr/bin/ffmpeg'],
  ['ffprobePath', 'FFPROBE_PATH', '/usr/bin/ffprobe'],
]) {
  const candidate = process.env[envName] ?? fallback;
  if (candidate && existsSync(candidate)) {
    ffmpeg[key] = candidate;
  }
}

console.log(`[render] output      : ${OUT_FILE}`);
console.log(`[render] ffmpeg paths: ${JSON.stringify(ffmpeg)}`);

try {
  const result = await renderVideo({
    projectFile: './src/project.ts',
    settings: {
      outFile: OUT_FILE,
      outDir: 'out',
      workers: 1,
      logProgress: true,
      projectSettings: {
        exporter: {
          name: '@revideo/core/ffmpeg',
          options: {format: 'mp4'},
        },
      },
      ffmpeg,
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--hide-scrollbars',
          '--font-render-hinting=none',
        ],
      },
      viteConfig: {
        server: {
          watch: {usePolling: true, interval: 120},
        },
      },
    },
  });

  console.log(`[render] done: ${result}`);
} catch (error) {
  console.error('[render] failed:', error);
  process.exit(1);
}
