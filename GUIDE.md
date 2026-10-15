# TrendScope — Usage Guide

A practical, step-by-step guide to the dashboard: **research a niche**, then **render an
animation** from it. No coding required.

- **App:** https://rakesh2626260-ctrl.github.io/Video-engine/
- **Repo:** https://github.com/rakesh2626260-ctrl/Video-engine

TrendScope has two halves:

| Half | Where it runs | What you need |
|---|---|---|
| **Research** (topics, competitors, SEO blueprint) | your browser, or GitHub Actions | a YouTube API key (+ optionally an AI key) |
| **Render** (narrated animation &rarr; MP4) | GitHub Actions | a GitHub token |

---

## 0. Quick start

1. Open the app.
2. Paste a **YouTube Data API v3** key into the **Start here** box.
3. Type a topic (e.g. `home espresso machines`) and click **Analyze**.
4. Read the results, then **Copy to clipboard** or **Download Markdown report**.

That is the entire setup for research. The AI engine, where the YouTube data is fetched from,
and the GitHub token all live in the collapsed **Advanced settings** panel and are optional.

5. *(Optional)* In **Script → video**, click **Write script & code with AI**, tweak the text,
   then **Render video** and download the MP4. This one needs a GitHub token — see §6.1.

Keys are stored only in this browser's `localStorage`.

---

## 0.1 Where the research data comes from

The YouTube lookups (`search.list`, `videos.list`, `videos.list?chart=mostPopular`) can run in
either place. Open **Advanced settings → Where to fetch the YouTube data**:

| Mode | What happens | Use it when |
|---|---|---|
| **Auto** *(default)* | The browser fetches the data. If the browser is blocked (CORS, a proxy, or an API-key restriction that refuses a browser request), the same three calls are retried on GitHub Actions automatically. | Almost always. |
| **This browser (instant)** | Only the browser fetches the data. | You want nothing to touch GitHub. |
| **GitHub Actions (server-side)** | The `youtube-research` workflow fetches the data on a runner and hands back `research.json`. | Your key is IP- or HTTP-restricted, the browser is blocked, or you would rather the page never sees the key (store it as a repo secret, below). |

Server-side mode needs a **GitHub token** (Advanced settings). The API key is sent in the
dispatch payload unless you store it as a repository secret instead:

> **Optional:** *Repo → Settings → Secrets and variables → Actions → New repository secret*,
> name it `YOUTUBE_API_KEY`, and value = your YouTube key. Then server-side research works even
> with the YouTube field empty.

Server-side research takes ~20–40 seconds (a workflow run) instead of ~2 seconds.

---

## 1. Get a YouTube Data API v3 key (required)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create (or select) a
   project.
2. Enable the API: open
   [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com)
   and click **Enable**.
3. Create a key: **APIs & Services → Credentials → Create credentials → API key**.
4. (Recommended) Click **Edit** on the key and restrict it:
   - **Application restrictions → Websites**, and add
     `https://rakesh2626260-ctrl.github.io/*`.
   - **API restrictions → Restrict key → YouTube Data API v3**.
5. Copy the key (starts with `AIza…`) into the dashboard's **YouTube Data API v3 key** field.

> Quota note: Google gives the YouTube Data API a default quota of **10,000 units/day**. One
> TrendScope analysis costs roughly **100 units** (a search is ~100; video/trending lookups are
> ~1 each), so you get on the order of **~90–100 analyses per day** for free.

---

## 2. Choose an AI engine

The AI engine writes the **SEO blueprint** and, when you continue to video, the
**voiceover script**. Without one, the research still works (topics + competitor analytics) and
falls back to a built-in template blueprint.

> These settings live in **Advanced settings** (the collapsed panel at the bottom of the
> *Start here* card). The default is Google Gemini.

### Option A — Google Gemini (direct API) *(simplest)*

1. Open [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key.
2. In the dashboard, set **Blueprint engine → Google Gemini (direct API)**.
3. Paste the key into **Gemini API key**.
4. Pick a **Gemini model** (`gemini-2.5-flash` is fast and recommended).

### Option B — OmniRoute gateway *(open-source, many models)*

[OmniRoute](https://github.com/diegosouzapw/OmniRoute) is an open-source, OpenAI-compatible
gateway that routes to Gemini and 300+ other providers behind one endpoint.

**Requirements:** [Node.js](https://nodejs.org) 18+ (LTS) and a machine that can keep a
process running while you use the dashboard (your computer, Android/Termux, or a small VPS).

1. **Start the gateway and allow this dashboard's origin.** OmniRoute's CORS is
   **fail-closed** — it blocks every browser origin until you opt one in, so this step is
   **required**, not optional:

   ```bash
   # allow only the TrendScope dashboard origin:
   CORS_ALLOWED_ORIGINS=https://rakesh2626260-ctrl.github.io npx omniroute

   # ...or, for a quick throwaway test (less safe, allow-all):
   CORS_ALLOW_ALL=true npx omniroute
   ```

   Use the **origin only** — scheme + host, no path and no trailing slash (so
   `https://rakesh2626260-ctrl.github.io`, **not** `…/Video-engine/`). It serves the API and
   its own dashboard on **http://localhost:20128**.

2. **Connect at least one provider** in the OmniRoute dashboard
   (http://localhost:20128 → **Providers**) — e.g. Gemini, Groq or another free tier.
3. **Copy the gateway key** from **Dashboard → Endpoints**.
4. **Fill in TrendScope** — set **Blueprint engine → OmniRoute gateway**, then:
   - **OmniRoute base URL:** `http://localhost:20128/v1`
   - **OmniRoute API key:** the key from step 3 *(blank only if your gateway is keyless)*
   - **Model or route:** `auto`, or pin one such as `gemini/gemini-2.5-flash`
5. Keep the OmniRoute process running, then click **Analyze**.

> **CORS, in one line:** if you skip the allowlist the browser blocks the response and the
> dashboard shows an OmniRoute network error — add the origin (step 1) and it works. You can
> also add it at runtime, without editing the environment, in
> **OmniRoute → Security → CORS origins**.

---

## 3. Run an analysis

1. Type a **niche or keyword** into **Start here** (or click an example chip).
2. Choose a **region** (for trending videos) and a **number of competitors** (Top 10/25/50).
3. Click **Analyze**.

A progress panel walks through: search → competitor stats → trending → topic extraction →
blueprint.

---

## 4. Read the results

- **Trending topics** — the most frequent keywords/n-grams across competitor titles and
  descriptions (weighted; phrases score higher than single words).
- **Competitor analytics** — a ranked table: views, likes, comments, engagement rate and
  views/day for each top result.
- **SEO blueprint** — a structured Markdown document (title ideas, description template, tags,
  keyword analysis, outline, thumbnail/hook ideas, hashtags, publishing checklist). Written by
  the selected engine when configured, otherwise the built-in template.

---

## 5. Export the research

- **Copy to clipboard** — copies the full Markdown report.
- **Download Markdown report** — saves `seo-blueprint-<topic>-<date>.md`.

Both include the topics, the competitor table and the blueprint.

---

## 6. Render the video (Script → video)

The **Script → video** card turns your narration into an MP4: GitHub Actions narrates the
**voiceover script** with Piper TTS and types the **code block** out in an animated editor
(Revideo), then the file comes back into the page.

### 6.1 Create a GitHub token

The page dispatches the video workflow through the GitHub API, so it needs a token that can
run Actions on this repository. The same token also powers **server-side research** (§0.1).

- **Fine-grained (recommended):** GitHub → **Settings → Developer settings → Personal access
  tokens → Fine-grained tokens**. Limit *Repository access* to
  `rakesh2626260-ctrl/Video-engine`, and give it **Actions: Read and write**.
- **Classic:** give it the `repo` and `workflow` scopes.

Open **Advanced settings** at the top of the page and paste it into **GitHub token** (eye icon
to reveal/mask). It is kept only in this browser's `localStorage`. The **Script → video** card
links straight to that field if you try to render without one.

### 6.2 Write (or paste) the script

- Click **Write script &amp; code with AI** to generate a voiceover script and a code block from
  your research. (Requires an AI engine from §2 and a completed analysis, or at least a topic in
  the search box.)
- Or type/paste your own **voiceover script** and **code block**. The code block is what gets
  typed on screen; the voiceover is what gets spoken.

### 6.3 Render

1. Click **Render video**.
2. Watch the status: *Dispatching → Queued → Rendering → Done*. A render typically takes a
   few minutes (system deps + Piper + Revideo are set up per run).
3. When it finishes, the **preview** appears inline and **Download MP4** saves the file. The
   run also stays downloadable from the **Actions** tab as an artifact
   (`video-<job id>`), retained for **30 days**.

---

## 7. Settings & privacy

- **Hide/show toggles** (the eye icon) reveal or mask each key field.
- Keys and preferences are stored in **`localStorage`** under `trendscope.*`.
- **Clear saved keys** wipes the YouTube, AI and GitHub keys from this browser.
- Research sends data only to the APIs you configured (Google and/or your OmniRoute gateway).
  Rendering runs inside your own repository's GitHub Actions. There is no TrendScope server.

---

## 8. Troubleshooting

### Research

| Symptom | Likely cause | Fix |
|---|---|---|
| `403` / "quota exceeded" | Daily YouTube quota used up, or API not enabled | Wait for the daily reset, or check the API is enabled in Cloud Console |
| `403` / "API key not valid" or "referrer blocked" | Key restrictions don't allow this site | Add `https://rakesh2626260-ctrl.github.io/*` under **Websites** |
| "YouTube API key required" | The YouTube field is empty | Paste your YouTube Data API v3 key |
| Blueprint shows the built-in template | No AI key, or the AI request failed | Check the notice above the blueprint; add/verify your key or OmniRoute |
| OmniRoute network error | Gateway stopped, wrong URL, or CORS | Keep OmniRoute running, use `…/v1`, and allow `https://rakesh2626260-ctrl.github.io` |

### Rendering

| Symptom | Likely cause | Fix |
|---|---|---|
| "Open this page from its GitHub Pages URL…" | Owner/repo couldn't be derived (e.g. opened from a local file) | Use the Pages URL: `https://rakesh2626260-ctrl.github.io/Video-engine/` |
| "Add a GitHub token first" | Token field empty | Create a token (§6.1) and paste it |
| `401`/`403` "GitHub rejected the token" | Token lacks **Actions: write**, or expired | Make a new fine-grained token with **Actions: Read and write** on this repo |
| Stuck on "Queued…" | The workflow never started | Check the **Actions** tab; repository_dispatch only runs if `ultimate-youtube-engine.yml` exists on `main` |
| Run fails at Revideo/Chromium | Transient CI/Chromium issue | Re-run **Render video**; if it persists, open the run log and re-run the failed job |
| Render succeeds but no download | Artifact expired (30 days) or was deleted | Re-run a render |
| Video is silent | Narration text was empty | Add a voiceover script and render again |

---

## 9. How it works (for the curious)

```
Browser (GitHub Pages)
   │  fetch()
   ├──────────────────────────► YouTube Data API v3   competitor + trending data
   ├── engine: Gemini ────────► Google Gemini API      SEO blueprint + script
   └── engine: OmniRoute ─────► your OmniRoute /v1     …routed to any connected model

"Render video"
   └── repository_dispatch ──► GitHub Actions
                                 ffmpeg + Piper TTS + Revideo → final.mp4
        ◄── workflow artifact (zip with the MP4), unzipped in the page
```

- The research UI is a single `index.html` — no build step, no bundler.
- The render job lives in `.github/workflows/ultimate-youtube-engine.yml`, driven by
  `src/project.ts` / `src/scenes/example.tsx` and `render.mjs`.
