# TrendScope — Serverless YouTube SEO & Competitor Dashboard

A **100% client-side** web dashboard that runs entirely in the visitor's browser and is
hosted for free on **GitHub Pages**. There is **no backend, no server, no build step and no
terminal setup**: the page talks directly (with `fetch()`) to the APIs you configure —
Google's YouTube Data API and, for the AI blueprint, either the **Google Gemini** API or an
**[OmniRoute](https://github.com/diegosouzapw/OmniRoute)** gateway.

> Enter a niche &rarr; TrendScope pulls live YouTube data &rarr; shows trending topics and
> competitor analytics &rarr; generates a structured Markdown SEO blueprint you can copy or
> download.

## Live site

```
https://rakesh2626260-ctrl.github.io/Video-engine/
```

## Documentation

- **[`GUIDE.md`](GUIDE.md)** — step-by-step usage guide: getting the API keys, choosing an AI
  engine (Gemini or OmniRoute), running an analysis, and troubleshooting.

## Features

- **Bring-your-own API keys** — enter a *YouTube Data API v3* key plus the key for whichever
  AI engine you pick. Everything is saved in the browser's `localStorage` only, with a
  hide/show toggle.
- **Two AI engines** — write the blueprint with the **Google Gemini** API directly, *or*
  route it through an **OmniRoute** gateway (open-source, OpenAI-compatible; run it locally,
  on a VPS, or via its cloud endpoint). Choose the engine in the UI.
- **Client-side data pipeline** — YouTube Data API v3 calls (`search.list`, `videos.list`,
  `videos.list?chart=mostPopular`) are issued straight from the browser.
- **Trending topics** — keyword/n-gram extraction from competitor titles and descriptions.
- **Competitor analytics** — views, likes, comments, engagement rate and views/day, ranked.
- **SEO blueprint** — a data-driven Markdown blueprint, written by the selected AI engine
  when one is configured, with a built-in template fallback when it is not.
- **Utility actions** — *Copy to clipboard* and *Download Markdown report*.
- **Loading + error states** — step-by-step progress while data is fetched.

## Getting the API keys

1. **YouTube Data API v3** — in the
   [Google Cloud console](https://console.cloud.google.com/apis/library/youtube.googleapis.com),
   create a project, enable **YouTube Data API v3**, then create an **API key**. For safety,
   restrict the key to your GitHub Pages domain (`rakesh2626260-ctrl.github.io`).
2. **Gemini** *(optional)* — create a free key in
   [Google AI Studio](https://aistudio.google.com/app/apikey). Without it the dashboard still
   produces a template-based blueprint.
3. **OmniRoute** *(optional alternative)* — run the open-source gateway and use its API key:

   ```bash
   npx omniroute            # starts the gateway + dashboard on http://localhost:20128
   ```

   In the OmniRoute dashboard, connect at least one provider (e.g. Gemini, Groq, a free tier),
   then copy the key from **Dashboard → Endpoints**. Back in TrendScope, set the engine to
   **OmniRoute gateway**, enter the base URL (`http://localhost:20128/v1` by default) and the
   key, and pick a model — `auto` lets OmniRoute choose, or use a provider-prefixed id such as
   `gemini/gemini-2.5-flash`.

## How it works

```
Browser (GitHub Pages)
   │  fetch()
   ├──────────────────────────► YouTube Data API v3   competitor + trending data
   │
   ├── engine: Gemini ────────► Google Gemini API      SEO blueprint (Markdown)
   │
   └── engine: OmniRoute ─────► your OmniRoute /v1     …routed to any connected model
```

- No build step, no bundler, no runtime dependencies — a single `index.html`.
- Markdown is rendered by a tiny built-in renderer, so no third-party CDN is required.
- API keys live only in the user's browser.

## Project layout

```
index.html                          # the whole dashboard (HTML + CSS + JS)
GUIDE.md                            # step-by-step usage guide
.nojekyll                           # tell GitHub Pages not to run Jekyll
.github/workflows/deploy-pages.yml  # auto-deploy to Pages on push to main
README.md
```

## Deployment

Publishing is automatic. Push to `main` and the
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) workflow builds
and deploys the static site using GitHub's official Pages actions. You can also run it
manually from the **Actions** tab (`workflow_dispatch`).

## OmniRoute notes

- TrendScope calls OmniRoute's OpenAI-compatible endpoint
  (`POST {base URL}/chat/completions` with an `Authorization: Bearer <key>` header).
- A local OmniRoute runs on plain `http://localhost:20128/v1`. Browsers treat `localhost` as a
  *potentially trustworthy* origin, so an HTTPS GitHub Pages page may call it without a mixed-
  content error — but the gateway must also send permissive **CORS** headers for this page's
  origin, otherwise the request is blocked. If it is blocked, set the engine back to Gemini, or
  put OmniRoute behind an HTTPS reverse proxy on a domain that allows CORS.
- `auto` routes across whatever providers you connected; a provider-prefixed id (for example
  `gemini/gemini-2.5-flash`) pins the request to one model.

## Security notes

- Keys are stored unencrypted in `localStorage` — that is a deliberate trade-off for a
  serverless app. Use restricted keys and rotate them if a shared device is a concern.
- Never hard-code a key into `index.html`; the repository is public.
- YouTube and Gemini calls go over HTTPS directly to Google. An OmniRoute call goes directly to
  the base URL you supply; nothing is relayed through any third-party server.

## License

Provided as-is for personal use. Respect the terms of service and quotas of the YouTube Data
API, the Gemini API and any OmniRoute upstream providers you connect. OmniRoute itself is MIT
licensed.
