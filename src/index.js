// src/index.js
import { parseFeedParams } from "./params.js";
import { buildFeed, selectMatches } from "./feed.js";
import { matchSummary } from "./ics.js";
import { handleScheduled } from "./cron.js";
import { renderSettingsPage } from "./ui.js";
import { probabilityLines, reasonLabel, requestLocale } from "./localization.js";
import { applyBbcKnockout } from "./bbc.js";

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
let DATASET = { version: null, fixtures: null, oddsMap: null, bbcMap: null };

// Isolate-level memo of the data version. The cron bumps it at most every 30
// minutes, so re-reading KV on every request is wasted: a warm isolate caches
// it for 60s, cutting KV reads by orders of magnitude under load. Worst case
// a feed is up to 60s stale, which is irrelevant for calendar data.
const VERSION_TTL_MS = 60_000;
let VERSION = { store: null, value: null, readAt: 0 };

async function dataVersion(env) {
  const now = Date.now();
  if (VERSION.store === env.WC_STORE && now - VERSION.readAt < VERSION_TTL_MS) {
    return VERSION.value;
  }
  const value = (await env.WC_STORE.get("data_version")) || "0";
  VERSION = { store: env.WC_STORE, value, readAt: now };
  return value;
}

async function readDataset(env, version) {
  if (DATASET.version === version && DATASET.fixtures) return DATASET;
  const [fx, odds, bbc] = await Promise.all([
    env.WC_STORE.get("fixtures"),
    env.WC_STORE.get("odds"),
    env.WC_STORE.get("bbc_knockout"),
  ]);
  DATASET = {
    version,
    fixtures: fx ? JSON.parse(fx) : [],
    oddsMap: odds ? JSON.parse(odds) : {},
    bbcMap: bbc ? JSON.parse(bbc) : {},
  };
  return DATASET;
}

function configFrom(url) {
  return parseFeedParams(url.searchParams);
}

// Highest q-value at which the Accept header accepts `type`, or 0 if absent.
// Only exact type matches count (wildcards like */* deliberately score 0 here:
// a generic client should fall through to each endpoint's default).
function acceptQ(accept, type) {
  let best = 0;
  for (const part of accept.split(",")) {
    const [media, ...params] = part.trim().split(";");
    if (media.trim().toLowerCase() !== type) continue;
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const q = qParam ? Number(qParam.slice(2)) : 1;
    best = Math.max(best, Number.isFinite(q) ? q : 0);
  }
  return best;
}

function prefersCalendar(request) {
  const accept = request.headers.get("Accept") || "";
  return acceptQ(accept, "text/calendar") > 0;
}

// Isolate-level memo of the rendered builder page per locale: the page only
// changes on deploy (which recycles isolates), so re-rendering ~100KB of HTML
// per request is pure waste.
const PAGE_CACHE = new Map();

function settingsPage(locale) {
  let html = PAGE_CACHE.get(locale);
  if (!html) {
    html = renderSettingsPage(locale);
    PAGE_CACHE.set(locale, html);
  }
  return html;
}

function htmlResponse(request) {
  const url = new URL(request.url);
  const locale = requestLocale(url, request.headers.get("Accept-Language") || "");
  const headers = {
    "content-type": "text/html; charset=utf-8",
    "Content-Language": locale,
    "Cache-Control": "public, max-age=300",
  };
  if (!url.searchParams.has("lang")) headers.Vary = "Accept-Language";
  return new Response(settingsPage(locale), {
    headers,
  });
}

// Build identifier, hashed into the ETag and edge-cache key alongside the data
// version. Bump on any deploy that changes feed CONTENT for unchanged data
// (translations, summary/description format) so subscribers aren't served 304s
// or stale cached bodies until the next fixture change. Data-only updates are
// still handled automatically by data_version.
const BUILD = "4";

async function serveFeed(url, request, env, ctx) {
  const dataVer = await dataVersion(env);
  const version = `${dataVer}-${BUILD}`;
  const etag = hashETag(url.search + "|" + version);

  // 1) Cheapest path: 304 with no dataset read or build. Proxies may convert
  // our strong ETag to a weak one (W/"...") or send several; match any.
  const inm = request.headers.get("If-None-Match") || "";
  const clientTags = inm.split(",").map((t) => t.trim().replace(/^W\//, ""));
  if (clientTags.includes(etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": "public, max-age=1800" },
    });
  }

  // 2) Edge cache, keyed by URL + data version + build (so a data change OR a
  // content-affecting deploy auto-busts).
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = cache
    ? new Request(`${url.origin}${url.pathname}${url.search}${url.search ? "&" : "?"}__v=${version}`)
    : null;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  // 3) Build once per (params × version); reuse the memoized parsed dataset.
  const { fixtures, oddsMap, bbcMap } = await readDataset(env, dataVer);
  const config = configFrom(url);
  const resolvedFixtures = applyBbcKnockout(fixtures, bbcMap, config.bbc);
  const body = buildFeed(resolvedFixtures, oddsMap, config);
  const response = new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "Content-Language": config.lang,
      "ETag": etag,
      "Last-Modified": new Date(Number(dataVer) || 0).toUTCString(),
      "Cache-Control": "public, max-age=1800",
    },
  });
  if (cache && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function servePreview(url, env, ctx) {
  const dataVer = await dataVersion(env);

  // Edge cache, keyed like the feed (URL + data version + build). The preview
  // is the hottest endpoint while people play with the builder; identical
  // settings should be served from cache, not rebuilt. Short TTL because the
  // "upcoming matches only" filter depends on the current time.
  const cache = typeof caches !== "undefined" ? caches.default : null;
  const cacheKey = cache
    ? new Request(`${url.origin}${url.pathname}${url.search}${url.search ? "&" : "?"}__v=${dataVer}-${BUILD}`)
    : null;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const { fixtures, oddsMap, bbcMap } = await readDataset(env, dataVer);
  const config = configFrom(url);
  const resolvedFixtures = applyBbcKnockout(fixtures, bbcMap, config.bbc);
  const opts = { flags: config.flags, code: config.code, lang: config.lang };
  const now = Date.now();
  const matches = selectMatches(resolvedFixtures, oddsMap, config)
    .filter((s) => Date.parse(s.fixture.utcKickoff) >= now)
    .sort((a, b) => Date.parse(a.fixture.utcKickoff) - Date.parse(b.fixture.utcKickoff))
    .map((s) => ({
      id: s.fixture.id,
      utcKickoff: s.fixture.utcKickoff,
      summary: matchSummary(s.fixture, opts),
      reasons: s.reasons.map((reason) => reasonLabel(reason, config.lang)),
      probabilities: probabilityLines(s.fixture, s.odds, config.lang),
    }));
  const response = Response.json(
    { matches },
    {
      headers: {
        "Content-Language": config.lang,
        "Cache-Control": "public, max-age=300",
      },
    }
  );
  if (cache && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      // Root defaults to HTML so crawlers and link-preview services can read it.
      // Preserve existing root subscriptions that explicitly request calendar.
      return prefersCalendar(request) ? serveFeed(url, request, env, ctx) : htmlResponse(request);
    }
    // /feed.ics is unconditionally the calendar feed — no content negotiation,
    // so no client can ever be misclassified. The builder UI lives at "/".
    if (url.pathname === "/feed.ics") return serveFeed(url, request, env, ctx);
    if (url.pathname === "/api/preview") return servePreview(url, env, ctx);
    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env) {
    await handleScheduled(event, env);
    // This isolate may also serve fetches; don't let it hold a stale version memo.
    VERSION = { store: null, value: null, readAt: 0 };
  },
};
