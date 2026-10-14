# TrendScope — Usage Guide

A practical, step-by-step guide to using the dashboard. No coding required.

- **App:** https://rakesh2626260-ctrl.github.io/Video-engine/
- **Repo:** https://github.com/rakesh2626260-ctrl/Video-engine

---

## 0. First 60 seconds (quick start)

1. Open the app.
2. Paste a **YouTube Data API v3** key into the first field.
3. Pick a **Blueprint engine** (Gemini is simplest; OmniRoute if you already run it).
4. Type a topic (e.g. `home espresso machines`) and click **Analyze**.
5. Read the results, then **Copy to clipboard** or **Download Markdown report**.

Everything runs in your browser. Keys are stored only in this browser's `localStorage`.

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

## 2. Choose a blueprint engine

The dashboard needs an AI engine only to write the **SEO blueprint**. It always builds topics
and competitor analytics on its own, and it always has a built-in template blueprint as a
fallback.

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

1. Type a **niche or keyword** into **Research a topic** (or click an example chip).
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

## 5. Export

- **Copy to clipboard** — copies the full Markdown report.
- **Download Markdown report** — saves `seo-blueprint-<topic>-<date>.md`.

Both include the topics, the competitor table and the blueprint.

---

## 6. Settings & privacy

- **Hide/show toggles** (the eye icon) reveal or mask each key field.
- Keys and preferences are stored in **`localStorage`** under `trendscope.*`.
- **Clear saved keys** wipes the YouTube and AI keys from this browser.
- Nothing is sent anywhere except to the API you configured (Google, and/or your OmniRoute
  gateway). There is no TrendScope server.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `403` / "quota exceeded" | Daily YouTube quota used up, or API not enabled | Wait for the daily reset, or check the API is enabled in Cloud Console |
| `403` / "API key not valid" or "referrer blocked" | Key restrictions don't allow this site | Add `https://rakesh2626260-ctrl.github.io/*` under **Websites** |
| "YouTube API key required" | The YouTube field is empty | Paste your YouTube Data API v3 key |
| Blueprint shows the built-in template | No AI key, or the AI request failed | Check the notice above the blueprint; add/verify your key or engine URL |
| "OmniRoute request failed … CORS" | Gateway not running, wrong URL, or CORS blocked | Start OmniRoute, verify the base URL ends in `/v1`, and allow this origin |
| "model not found" from OmniRoute | Unknown model/route id | Use `auto`, or pick an id your gateway lists |
| No topics / empty table | Very obscure query returned no results | Try a broader keyword |

---

## 8. Deploying your own copy

Fork the repo (or copy `index.html`), then push to `main`. The bundled
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) publishes it to
GitHub Pages automatically. Enable **Settings → Pages → Build and deployment → Source: GitHub
Actions** once.
