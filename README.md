# TrendScope — Serverless YouTube SEO & Competitor Dashboard

A **100% client-side** web dashboard that runs entirely in the visitor's browser and is
hosted for free on **GitHub Pages**. There is **no backend, no server, no proxy, and no
terminal setup**: the page talks directly to Google's APIs with `fetch()`.

> Enter a niche &rarr; TrendScope pulls live YouTube data &rarr; shows trending topics and
> competitor analytics &rarr; generates a structured Markdown SEO blueprint you can copy or
> download.

## Live site

```
https://rakesh2626260-ctrl.github.io/Video-engine/
```

## Features

- **Bring-your-own API keys** — enter a *YouTube Data API v3* key and (optionally) a
  *Gemini* key. They are saved in the browser's `localStorage` only, with a hide/show
  toggle, and are never sent to any server other than Google.
- **Client-side data pipeline** — YouTube Data API v3 calls (`search.list`, `videos.list`,
  `videos.list?chart=mostPopular`) are issued straight from the browser.
- **Trending topics** — keyword/n-gram extraction from competitor titles and descriptions.
- **Competitor analytics** — views, likes, comments, engagement rate and views/day, ranked.
- **SEO blueprint** — a data-driven Markdown blueprint, written by **Google Gemini** when a
  key is supplied, with a built-in template fallback when it is not.
- **Utility actions** — *Copy to clipboard* and *Download Markdown report*.
- **Loading + error states** — step-by-step progress while data is fetched.

## Getting the API keys

1. **YouTube Data API v3** — in the
   [Google Cloud console](https://console.cloud.google.com/apis/library/youtube.googleapis.com),
   create a project, enable **YouTube Data API v3**, then create an **API key**. For safety,
   restrict the key to your GitHub Pages domain (`rakesh2626260-ctrl.github.io`).
2. **Gemini** — create a free key in
   [Google AI Studio](https://aistudio.google.com/app/apikey). This is optional; without it
   the dashboard still produces a template-based blueprint.

## How it works

```
Browser (GitHub Pages)
   │  fetch()                         fetch()
   ├──────────────► YouTube Data API v3 ◄─── competitor + trending data
   └──────────────► Gemini API ───────────── SEO blueprint (Markdown)
```

- No build step, no bundler, no runtime dependencies — a single `index.html`.
- Markdown is rendered by a tiny built-in renderer, so no third-party CDN is required.
- API keys live only in the user's browser.

## Project layout

```
index.html                          # the whole dashboard (HTML + CSS + JS)
.nojekyll                           # tell GitHub Pages not to run Jekyll
.github/workflows/deploy-pages.yml  # auto-deploy to Pages on push to main
README.md
```

## Deployment

Publishing is automatic. Push to `main` and the
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) workflow builds
and deploys the static site using GitHub's official Pages actions. You can also run it
manually from the **Actions** tab (`workflow_dispatch`).

## Security notes

- Keys are stored unencrypted in `localStorage` — that is a deliberate trade-off for a
  serverless app. Use restricted keys and rotate them if a shared device is a concern.
- Never hard-code a key into `index.html`; the repository is public.
- All API calls use HTTPS directly from the browser; nothing is relayed through a third
  party.

## License

Provided as-is for personal use. Respect the terms of service and quotas of the YouTube Data
API and the Gemini API.
