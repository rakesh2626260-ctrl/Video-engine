/**
 * Reproducible patch for @revideo/renderer.
 *
 * Upstream `renderVideo` force-appends `--single-process` to the Chromium
 * launch arguments:
 *
 *     const args = settings.puppeteer?.args ?? [];
 *     if (!args.includes('--single-process')) {
 *       args.push('--single-process');
 *     }
 *
 * Recent Chromium/Chrome releases crash immediately in that mode: the process
 * dies before the DevTools endpoint is printed, so puppeteer reports
 * "Failed to launch the browser process ... Code: null". Patching it out here,
 * after every `npm install`, keeps CI and local renders reproducible - a
 * hand-edited node_modules is not, because CI re-installs the pristine package.
 *
 * Idempotent: running it twice is a no-op.
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';

const TARGET = new URL(
  '../node_modules/@revideo/renderer/lib/server/render-video.js',
  import.meta.url,
);

const PUSH = "args.push('--single-process');";
const REPLACEMENT =
  '/* patched: --single-process omitted (crashes headless Chromium) */';

if (!existsSync(TARGET)) {
  console.warn(`[patch-revideo] not found, skipping: ${TARGET.pathname}`);
  process.exit(0);
}

const source = readFileSync(TARGET, 'utf8');

if (!source.includes(PUSH)) {
  console.log('[patch-revideo] already patched (no --single-process push found)');
  process.exit(0);
}

writeFileSync(TARGET, source.split(PUSH).join(REPLACEMENT));
console.log('[patch-revideo] removed the forced --single-process flag');
