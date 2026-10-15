# TrendScope — YouTube SEO research + script-to-animation

TrendScope is one repo that does two jobs, end to end:

1. **Research** — a dashboard (client-side by default, optionally server-side), hosted
   for free on **GitHub Pages**. It
   talks straight from the browser (via `fetch()`) to the **YouTube Data API v3** for
   competitor/trending data, and to an **AI engine** you pick — either the **Google Gemini**
   API or an **[OmniRoute](https://github.com/diegosouzapw/OmniRoute)** gateway — to write a
   structured Markdown **SEO blueprint**.
2. **Render** — turn the research into a **video**. The blueprint feeds an AI-written
   **voiceover script + code block**; one click dispatches
   [`.github/workflows/ultimate-youtube-engine.yml`](.github/workflows/ultimate-youtube-engine.yml),
   which uses **Piper TTS** for narration and **Revideo** (headless Chromium + ffmpeg) to type
   the code out in an animated editor, then returns the finished **MP4**.

> Research a niche &rarr; get a data-driven blueprint &rarr; write the script &rarr; render the
> animation. The research half is serverless; the render half runs on GitHub Actions, so you
> still never host a server yourself.

## Live site

```
https://rakesh2626260-ctrl.github.io/Video-engine/
```

## Quick start (30 seconds)

1. Open the live site.
2. Paste a **YouTube Data API v3 key** into **Start here**.
3. Type a topic, press **Analyze**.

That is the whole setup for research. Everything else on the page — the AI engine, where the
YouTube data is fetched from, and the GitHub token used to render a video — lives in the
collapsed **Advanced settings** panel and is optional.

## Documentation

- **[`GUIDE.md`](GUIDE.md)** — step-by-step usage guide: API keys, choosing an AI engine
  (Gemini or OmniRoute), running an analysis, rendering a video, and troubleshooting.

## Features

### Research (client-side by default, optionally server-side)

- **Bring-your-own API keys** — a *YouTube Data API v3* key plus the key for whichever AI
  engine you pick. Everything is saved in the browser's `localStorage` only, with a
  hide/show toggle.
- **Two data sources** — the YouTube calls normally run in your browser, but the same three
  calls can run on **GitHub Actions** instead (`.github/workflows/youtube-research.yml`) when
  your API key is restricted, a proxy/CORS blocks the browser, or you would rather not expose
  the key to the page at all. The default **Auto** mode uses the browser and falls back to
  GitHub automatically when the browser is blocked.
- **Two AI engines** — write the blueprint with the **Google Gemini** API directly, *or* route
  it through an **OmniRoute** gateway (open-source, OpenAI-compatible; local, VPS, or cloud).
- **Trending topics** — keyword/n-gram extraction from competitor titles and descriptions.
- **Competitor analytics** — views, likes, comments, engagement rate and views/day, ranked.
- **SEO blueprint** — a data-driven Markdown document, written by the selected AI engine, with
  a built-in template fallback when no key is configured.
- **Utility actions** — *Copy to clipboard* and *Download Markdown report*.

### Render (GitHub Actions)

- **AI script from research** — one button turns the blueprint into a voiceover script plus an
  on-screen code block (editable before you render).
- **Narrated animation** — Piper TTS narrates the script; Revideo types the code out in an
  animated IDE window at 1920×1080⁄60fps.
- **In-page preview + download** — the workflow uploads the MP4 as an artifact, which the page
  fetches and unzips, so you can watch it inline or download `trendscope-<job>.mp4`.
- **Live status** — dispatching, queued, rendering, ready/failed, with a link to the run.

## Getting the keys

1. **YouTube Data API v3** — in the
   [Google Cloud console](https://console.cloud.google.com/apis/library/youtube.googleapis.com),
   create a project, enable **YouTube Data API v3**, then create an **API key**. For safety,
   restrict the key to your GitHub Pages domain (`rakesh2626260-ctrl.github.io`).
2. **Gemini** *(optional)* — create a free key in
   [Google AI Studio](https://aistudio.google.com/app/apikey). Without it the dashboard still
   produces a template-based blueprint.
3. **OmniRoute** *(optional alternative)* — run the open-source gateway and use its API key:

   ```bash
   npx omniroute            # starts the gateway on http://localhost:20128
   ```

   Connect at least one provider in the OmniRoute dashboard, copy the key from
   **Dashboard → Endpoints**, then in TrendScope open **Advanced settings**, choose
   **OmniRoute gateway** and set the base URL (`http://localhost:20128/v1`) and key.
   OmniRoute's CORS is **fail-closed**: allow this page's origin with
   `CORS_ALLOWED_ORIGINS=https://rakesh2626260-ctrl.github.io` (or `CORS_ALLOW_ALL=true` for a
   throwaway test), or add it at runtime in **OmniRoute → Security → CORS origins** — see
   [`GUIDE.md`](GUIDE.md).
4. **YouTube API key as a repo secret** *(optional)* — add a repository secret named
   `YOUTUBE_API_KEY` (*Settings → Secrets and variables → Actions*) to let **server-side
   research** run without sending a key from the browser.
5. **GitHub token** *(only to render a video, or to use the GitHub data source)* — a token that
   can dispatch workflows on this repository: classic `repo` + `workflow`, or a fine-grained
   token with **Actions: read and write**. Kept in `localStorage`; only used to send the job and
   fetch the artifact. Set it in **Advanced settings**.

## How it works

```
Browser (GitHub Pages)  ── SEO research ────────────────────────────────────────┐
   │  fetch()                                                                    │
   ├── engine: Gemini ──────► Google Gemini API      blueprint (Markdown)        │
   ├── engine: OmniRoute ───► your OmniRoute /v1     …routed to any provider     │
   │                                                                             │
   │  fetch()  ── YouTube ───► YouTube Data API v3   competitor + trending data  │
   │            (or, when blocked / GitHub-only:                                 │
   │             repository_dispatch → youtube-research.yml → research.json)     │
   ▼                                                                             │
Script + code  ── repository_dispatch ──►  GitHub Actions                        │
   │                                        ffmpeg + Piper TTS + Revideo        │
   └──◄──── workflow artifact (MP4) ◄──────── final.mp4 ◄────────────────────────┘
```

## Project layout

```
index.html                            # the whole app UI (research + render controls)
src/project.ts                        # Revideo project (1920x1080 @ 60fps)
src/scenes/example.tsx                # the animated "typing code in an IDE" scene
render.mjs                            # headless render entry point (renderVideo)
scripts/patch-revideo.mjs             # removes the crashy forced --single-process flag
scripts/research.mjs                  # server-side YouTube fetching for the research workflow
package.json                          # Revideo dependencies for the render job
.github/workflows/deploy-pages.yml    # auto-deploy the UI to Pages on push to main
.github/workflows/ultimate-youtube-engine.yml  # repository_dispatch -> MP4 artifact
.github/workflows/youtube-research.yml         # repository_dispatch -> research.json artifact
GUIDE.md                              # step-by-step usage guide
README.md
```

## Deployment

- **The dashboard** publishes automatically: push to `main` and
  [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) deploys the static
  site with GitHub's official Pages actions. You can also run it from the **Actions** tab.
- **The video workflow** needs no setup: it runs when the page dispatches a
  `generate_video` event. (Only the repository_dispatch trigger, so pushes never render.)

## OmniRoute notes

- TrendScope calls OmniRoute's OpenAI-compatible endpoint
  (`POST {base URL}/chat/completions` with an `Authorization: Bearer <key>` header).
- A local OmniRoute runs on plain `http://localhost:20128/v1`. Browsers treat `localhost` as a
  *potentially trustworthy* origin, so an HTTPS GitHub Pages page may call it without a mixed-
  content error — but the gateway must send permissive **CORS** headers for this page's origin,
  or the request is blocked (OmniRoute's CORS is fail-closed: set `CORS_ALLOWED_ORIGINS`).
- `auto` routes across whatever providers you connected; a provider-prefixed id (for example
  `gemini/gemini-2.5-flash`) pins the request to one model.

## Security notes

- Keys and tokens are stored unencrypted in `localStorage` — a deliberate trade-off for a
  serverless app. Use **restricted** YouTube keys, **fine-grained** GitHub tokens limited to
  this repository (Actions: write), and rotate them if a shared device is a concern.
- Never hard-code a key into `index.html`; the repository is public.
- YouTube and Gemini calls go over HTTPS directly to Google. An OmniRoute call goes directly to
  the base URL you supply. Rendering happens inside your own repository's Actions runs only.

## License

Provided as-is for personal use. Respect the terms of service and quotas of the YouTube Data
API, the Gemini API and any OmniRoute upstream providers you connect. OmniRoute itself is MIT
licensed. Revideo and Piper are used under their respective open-source licenses.
