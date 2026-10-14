/**
 * Headless render entry point.
 *
 * Renders src/project.ts to out/silent.mp4 with Revideo's `renderVideo`
 * (Chromium + ffmpeg, no GUI). The workflow then muxes this silent video with
 * the Piper voiceover into final.mp4.
 */
import {existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const OUT_FILE = 'out/silent.mp4';

/**
 * Upstream @revideo/renderer force-appends `--single-process`, which crashes
 * headless Chromium before it can serve DevTools. Apply the committed patch
 * BEFORE importing the renderer: a static import would load the module first
 * and defeat the patch.
 */
execFileSync(
  process.execPath,
  [fileURLToPath(new URL('./scripts/patch-revideo.mjs', import.meta.url))],
  {stdio: 'inherit'},
);

const {renderVideo} = await import('@revideo/renderer');

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
    projectFile: 'src/project.ts',
    settings: {
      // `renderVideo` joins outFile's *stem* with outDir, so outFile must be a
      // bare filename - a path like 'out/silent.mp4' would land in
      // out/out/silent.mp4 and the workflow could not find it.
      outFile: 'silent.mp4',
      outDir: 'out',
      workers: 1,
      logProgress: true,
      projectSettings: {
        exporter: {
          name: '@revideo/core/ffmpeg',
          options: {format: 'mp4'},
        },
      },
      puppeteer: {
        headless: true,
        dumpio: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
        ],
      },
      ffmpeg,
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
