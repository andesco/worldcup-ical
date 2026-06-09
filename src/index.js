// src/index.js
import { parseFeedParams } from "./params.js";
import { buildFeed, selectMatches } from "./feed.js";
import { matchSummary } from "./ics.js";
import { handleScheduled } from "./cron.js";
import { renderSettingsPage } from "./ui.js";
import { probabilityLines, reasonLabel, requestLocale } from "./localization.js";

function hashETag(str) {
  // FNV-1a 32-bit -> hex, wrapped in quotes per HTTP ETag syntax.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `"${(h >>> 0).toString(16)}"`;
}

// Isolate-level memo of the parsed dataset, keyed by data_version. A warm isolate
// serving many feeds reuses this instead of re-reading KV + re-parsing 104 fixtures.
let DATASET = { version: null, fixtures: null, oddsMap: null };

async function dataVersion(env) {
  return (await env.WC_STORE.get("data_version")) || "0";
}

async function readDataset(env, version) {
  if (DATASET.version === version && DATASET.fixtures) return DATASET;
  const [fx, odds] = await Promise.all([
    env.WC_STORE.get("fixtures"),
    env.WC_STORE.get("odds"),
  ]);
  DATASET = {
    version,
    fixtures: fx ? JSON.parse(fx) : [],
    oddsMap: odds ? JSON.parse(odds) : {},
  };
  return DATASET;
}

function configFrom(url) {
  return parseFeedParams(url.searchParams);
}

// Decide whether a /feed.ics request is a human in a browser (serve the builder
// UI) or a calendar client / script (serve the raw .ics). Browsers send
// `Accept: text/html` on navigation and/or `Sec-Fetch-Dest: document`; calendar
// apps (Apple Calendar, Google, DAVx5, curl) do not. Default to the feed when
// the signal is absent so subscriptions always get calendar data.
function prefersHtml(request) {
  const dest = request.headers.get("Sec-Fetch-Dest") || "";
  if (dest === "document") return true;
  const accept = request.headers.get("Accept") || "";
  return accept.includes("text/html");
}

function htmlResponse(request) {
  const url = new URL(request.url);
  const locale = requestLocale(url, request.headers.get("Accept-Language") || "");
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "Content-Language": locale,
  };
  if (!url.searchParams.has("lang")) headers.Vary = "Accept-Language";
  return new Response(renderSettingsPage(locale), {
    headers,
  });
}

async function serveFeed(url, request, env, ctx) {
  const version = await dataVersion(env);
  const etag = hashETag(url.search + "|" + version);

  // 1) Cheapest path: 304 with no dataset read or build.
  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  // 2) Edge cache, keyed by URL + data version (so a data change auto-busts).
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = cache
    ? new Request(`${url.origin}${url.pathname}${url.search}${url.search ? "&" : "?"}__v=${version}`)
    : null;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  // 3) Build once per (params × version); reuse the memoized parsed dataset.
  const { fixtures, oddsMap } = await readDataset(env, version);
  const config = configFrom(url);
  const body = buildFeed(fixtures, oddsMap, config);
  const response = new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "Content-Language": config.lang,
      "ETag": etag,
      "Last-Modified": new Date(Number(version) || 0).toUTCString(),
      "Cache-Control": "public, max-age=1800",
    },
  });
  if (cache && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function servePreview(url, env) {
  const { fixtures, oddsMap } = await readDataset(env, await dataVersion(env));
  const config = configFrom(url);
  const opts = { flags: config.flags, code: config.code, lang: config.lang };
  const now = Date.now();
  const matches = selectMatches(fixtures, oddsMap, config)
    .filter((s) => Date.parse(s.fixture.utcKickoff) >= now)
    .sort((a, b) => Date.parse(a.fixture.utcKickoff) - Date.parse(b.fixture.utcKickoff))
    .map((s) => ({
      id: s.fixture.id,
      utcKickoff: s.fixture.utcKickoff,
      summary: matchSummary(s.fixture, opts),
      reasons: s.reasons.map((reason) => reasonLabel(reason, config.lang)),
      probabilities: probabilityLines(s.fixture, s.odds, config.lang),
    }));
  return Response.json({ matches }, { headers: { "Content-Language": config.lang } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/feed.ics") {
      // The same URL serves both: builder page for browsers, calendar data for
      // clients. /feed.ics remains as a backward-compatible alias.
      return prefersHtml(request) ? htmlResponse(request) : serveFeed(url, request, env, ctx);
    }
    if (url.pathname === "/api/preview") return servePreview(url, env);
    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env) {
    await handleScheduled(event, env);
  },
};
