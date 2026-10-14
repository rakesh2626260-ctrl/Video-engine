/**
 * Server-side YouTube research.
 *
 * Runs inside the `youtube-research` GitHub Actions workflow. It performs the
 * exact same three YouTube Data API v3 calls the browser does (search, video
 * details, regional trending) and writes them verbatim to `research.json`, so
 * the dashboard can hand the result to its normal analysis code.
 *
 * Why this exists: the browser half is blocked for some users (API key HTTP
 * restrictions, corporate proxies, CORS). Running the fetch on GitHub's servers
 * with the same API key is a drop-in fallback.
 *
 * Input  : the repository_dispatch client_payload (query/region/max_results/
 *          yt_key) and the YT_KEY environment variable.
 * Output : research.json -- {query, region, search, videos, trending} or
 *          {error} when the API refuses the request.
 */
import {readFileSync, writeFileSync} from 'node:fs';

const API = 'https://www.googleapis.com/youtube/v3/';
const OUT = 'research.json';

function clientPayload() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return {};
  try {
    return JSON.parse(readFileSync(eventPath, 'utf8')).client_payload ?? {};
  } catch {
    return {};
  }
}

const payload = clientPayload();
const key = process.env.YT_KEY ?? '';

const query = String(payload.query ?? '').trim();
const region = String(payload.region ?? 'US').trim() || 'US';
const maxResults = Math.min(50, Math.max(1, parseInt(payload.max_results, 10) || 25));

function fail(message) {
  writeFileSync(OUT, JSON.stringify({error: message}, null, 2));
  console.error(`[research] ${message}`);
  process.exit(0); // still upload the artifact; the workflow fails afterwards
}

if (!key) fail('No YouTube API key: set the YOUTUBE_API_KEY repository secret or send one in the dispatch payload.');
if (!query) fail('No query was supplied.');

async function api(endpoint, params) {
  const url = new URL(API + endpoint);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  url.searchParams.set('key', key);

  const res = await fetch(url);
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    const detail = data?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`${endpoint}: ${detail}`);
  }
  return data;
}

try {
  console.log(`[research] query="${query}" region=${region} max=${maxResults}`);

  const search = await api('search', {
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults,
    order: 'viewCount',
  });

  const ids = (search.items ?? []).map((item) => item.id?.videoId).filter(Boolean);
  const videos = ids.length
    ? await api('videos', {part: 'snippet,statistics,contentDetails', id: ids.join(',')})
    : {items: []};

  let trending = {items: []};
  try {
    trending = await api('videos', {
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode: region,
      maxResults: 20,
    });
  } catch (error) {
    // Trending is a bonus: analyse without it rather than fail the whole job.
    console.warn(`[research] trending unavailable: ${error.message}`);
  }

  const result = {
    query,
    region,
    maxResults,
    generatedAt: new Date().toISOString(),
    search,
    videos,
    trending,
  };
  writeFileSync(OUT, JSON.stringify(result));
  console.log(
    `[research] wrote ${OUT}: ${ids.length} competitor videos, ` +
      `${(trending.items ?? []).length} trending items`,
  );
} catch (error) {
  fail(error.message);
}
