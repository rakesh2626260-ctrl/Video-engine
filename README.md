# video-engine

A serverless video generator. Type a voiceover script and a code block in a
static GitHub Pages page; a GitHub Actions workflow renders a 1920×1080 60fps
video of the code being typed, narrates it with a local text-to-speech model
(Piper), and hands the MP4 back as a downloadable build artifact. There is no
server to run and no account to create beyond GitHub.

```
index.html (GitHub Pages)
      │  POST /repos/{owner}/{repo}/dispatches   event_type: generate_video
      ▼
.github/workflows/ultimate-youtube-engine.yml
      │  jq payload → narration.txt + src/assets/code.txt
      │  Piper (en_US-ryan-high) → voiceover.wav → ffprobe → src/assets/meta.json
      │  npm install && node render.mjs (Revideo, headless Chromium) → out/silent.mp4
      │  ffmpeg mux (h264 + aac, 60fps, yuv420p, apad, -shortest) → final.mp4
      ▼
actions/upload-artifact@v4  →  video-{job_id}
      ▲
      │  every 10s: /actions/artifacts?name=video-{job_id} + /actions/runs
      │  JSZip → <video> preview + Download button
```

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | The dark, mobile-first UI served by GitHub Pages. Dispatches the job and polls for the artifact. |
| `.github/workflows/ultimate-youtube-engine.yml` | The render pipeline (Ubuntu 24.04, ffmpeg, Piper, Revideo, artifact upload). |
| `src/project.ts` | Revideo project: 1920×1080, 60fps. |
| `src/scenes/example.tsx` | The IDE-window scene: regex syntax highlighting, typewriter reveal, smooth auto-scroll, progress bar. |
| `render.mjs` | Headless render entry point (`renderVideo`, Chromium `--no-sandbox`) → `out/silent.mp4`. |
| `vite.config.ts`, `tsconfig.json`, `package.json` | Tooling. |

## Setup

1. **Pages** — Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`.
2. **Token** — `index.html` ships with placeholders at the top of the script:

   ```js
   const GITHUB_TOKEN = "YOUR_GITHUB_TOKEN";
   const REPO_OWNER   = "YOUR_GITHUB_USERNAME";
   const REPO_NAME    = "YOUR_REPOSITORY_NAME";
   ```

   * If `GITHUB_TOKEN` is still a placeholder, the page shows a password field
     and stores the token in `localStorage` (browser-only, never committed).
     Use a token that may dispatch workflows on this repo: classic `repo` +
     `workflow`, or a fine-grained token with **Actions: read & write**.
   * If `REPO_OWNER` / `REPO_NAME` are placeholders they are detected from the
     `*.github.io/<repo>/` URL. Hard-code them if you serve the page elsewhere.
3. Open the Pages URL, paste a script and a code block, hit **Generate**.

## Local development

```bash
npm install
mkdir -p src/assets                  # the workflow generates these at runtime
printf '{"duration": 7.5}\n' > src/assets/meta.json
printf 'const hello = () => "world";\n' > src/assets/code.txt
node render.mjs                      # → out/silent.mp4
npx tsc --noEmit                     # type check
```

`src/assets/code.txt` and `src/assets/meta.json` are build inputs, not sources —
they are git-ignored and written by the workflow on every run.

## How the timeline works

The narration length decides the scene length: `typing = max(1.5, duration - 2)`
seconds, plus a 0.9s intro and a 1.1s outro. Every animated value (revealed
characters, caret, auto-scroll, progress) is a pure function of the animation
clock, exposed through computed signals, so the typing always ends exactly with
the voiceover.
