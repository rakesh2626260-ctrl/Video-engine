import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

/**
 * Headless render entry: Revideo (headless Chromium) -> out/silent.mp4.
 * The workflow then muxes the Piper voiceover onto it.
 */

/** The workflow reads out/silent.mp4. */
const OUT_FILE = 'out/silent.mp4';

/**
 * `@revideo/renderer` force-appends `--single-process`, which crashes Chrome in
 * CI. Patch it before importing the renderer (a static import would win).
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

/**
 * Revideo string-concatenates `projectFile` into a virtual module:
 *   import project from '<projectFile>';
 * A bare specifier such as `src/project.ts` is resolved as an npm package, the
 * page dies with "Failed to resolve import", and the render then waits FOREVER
 * without printing anything -- which is exactly how the earlier CI runs burned
 * their 45 minute timeout. It must be relative (leading `./`) or absolute.
 */
const PROJECT_FILE = './src/project.ts';

/** Hard watchdog so a broken page can never hang until the job timeout. */
const TIMEOUT_MINUTES = Number(process.env.RENDER_TIMEOUT_MINUTES ?? 30);
let watchdog;

try {
  const result = await Promise.race([
    renderVideo({
      projectFile: PROJECT_FILE,
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
            // A headless page is treated as backgrounded; without these the
            // animation clock can stall instead of reaching the last frame.
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
        ffmpeg,
        viteConfig: {
          server: {
            watch: {usePolling: true, interval: 120},
          },
        },
      },
    }),
    new Promise((_, reject) => {
      watchdog = setTimeout(
        () =>
          reject(
            new Error(
              `render watchdog: still no result after ${TIMEOUT_MINUTES} minutes - ` +
                'the render page probably failed to load, check the vite errors above',
            ),
          ),
        TIMEOUT_MINUTES * 60_000,
      );
    }),
  ]);

  clearTimeout(watchdog);
  console.log(`[render] done: ${result}`);
} catch (error) {
  clearTimeout(watchdog);
  console.error('[render] failed:', error);
  process.exit(1);
}