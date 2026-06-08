// src/index.js
import { parseFeedParams } from "./params.js";
import { buildFeed, selectMatches } from "./feed.js";
import { handleScheduled } from "./cron.js";
import { renderSettingsPage } from "./ui.js";

function hashETag(str) {
  // FNV-1a 32-bit -> hex, wrapped in quotes per HTTP ETag syntax.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `"${(h >>> 0).toString(16)}"`;
}

async function readCache(env) {
  const [fx, odds, fLast, oLast] = await Promise.all([
    env.WC_STORE.get("fixtures"),
    env.WC_STORE.get("odds"),
    env.WC_STORE.get("fixtures_lastupdate"),
    env.WC_STORE.get("odds_lastupdate"),
  ]);
  return {
    fixtures: fx ? JSON.parse(fx) : [],
    oddsMap: odds ? JSON.parse(odds) : {},
    stamp: `${fLast || 0}-${oLast || 0}`,
  };
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

function htmlResponse() {
  return new Response(renderSettingsPage(), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function serveFeed(url, request, env) {
  const { fixtures, oddsMap, stamp } = await readCache(env);
  const config = configFrom(url);
  const etag = hashETag(url.search + "|" + stamp);

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const body = buildFeed(fixtures, oddsMap, config);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "ETag": etag,
      "Cache-Control": "public, max-age=1800",
    },
  });
}

async function servePreview(url, env) {
  const { fixtures, oddsMap } = await readCache(env);
  const config = configFrom(url);
  const now = Date.now();
  const matches = selectMatches(fixtures, oddsMap, config)
    .filter((s) => Date.parse(s.fixture.utcKickoff) >= now)
    .sort((a, b) => Date.parse(a.fixture.utcKickoff) - Date.parse(b.fixture.utcKickoff))
    .map((s) => ({
      id: s.fixture.id,
      utcKickoff: s.fixture.utcKickoff,
      stage: s.fixture.stage,
      home: s.fixture.home,
      away: s.fixture.away,
      reasons: s.reasons,
    }));
  return Response.json({ matches });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") return htmlResponse();
    if (url.pathname === "/feed.ics") {
      // Same URL serves both: builder page for browsers, calendar data for clients.
      return prefersHtml(request) ? htmlResponse() : serveFeed(url, request, env);
    }
    if (url.pathname === "/api/preview") return servePreview(url, env);
    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env) {
    await handleScheduled(event, env);
  },
};
