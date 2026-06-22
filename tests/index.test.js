import { describe, it, expect, vi } from "vitest";
import worker from "../src/index.js";

function makeKV(init = {}) {
  const m = new Map(Object.entries(init));
  return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v) };
}

const fixtures = [
  { id: 1, utcKickoff: "2026-06-23T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "ESP", name: "Spain" }, away: { code: "FRA", name: "France" }, score: null },
  { id: 2, utcKickoff: "2026-06-24T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "USA", name: "USA" }, away: { code: "CAN", name: "Canada" }, score: null },
];
const env = (odds = {}, version = "1000") => ({
  WC_STORE: makeKV({ fixtures: JSON.stringify(fixtures), odds: JSON.stringify(odds), data_version: version }),
});
const req = (path, headers = {}) => new Request("https://worldcup.andrewe.ca" + path, { headers });

describe("worker fetch", () => {
  it("serves the settings UI at /", async () => {
    const res = await worker.fetch(req("/", { Accept: "text/html" }), env());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("World Cup 2026");
    expect(res.headers.get("content-language")).toBe("en");
    expect(res.headers.get("vary")).toBe("Accept-Language");
  });

  it("serves the ICS feed from the root URL to a client that explicitly requests it", async () => {
    const res = await worker.fetch(req("/?teams=USA", { Accept: "text/calendar" }), env());
    expect(res.headers.get("content-type")).toContain("text/calendar");
    expect(await res.text()).toContain("UID:wc2026-2@worldcup.andrewe.ca");
  });

  it("defaults the root URL to HTML for crawlers and generic clients", async () => {
    for (const headers of [{}, { Accept: "*/*" }, { "User-Agent": "Twitterbot/1.0" }]) {
      const res = await worker.fetch(req("/", headers), env());
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(await res.text()).toContain('property="og:image"');
    }
  });

  it("uses an explicit URL locale before browser language", async () => {
    const res = await worker.fetch(req("/?lang=de", { Accept: "text/html", "Accept-Language": "fr" }), env());
    expect(res.headers.get("content-language")).toBe("de");
    expect(res.headers.get("vary")).toBeNull();
    const body = await res.text();
    expect(body).toContain('<html lang="de">');
    expect(body).toContain("Benutzerdefiniertes Kalenderabonnement");
  });

  it("detects supported regional browser languages and falls back safely", async () => {
    const detected = await worker.fetch(req("/", { Accept: "text/html", "Accept-Language": "es-MX,fr;q=0.8" }), env());
    expect(detected.headers.get("content-language")).toBe("es");
    expect(await detected.text()).toContain('<html lang="es">');
    const invalid = await worker.fetch(req("/?lang=invalid", { Accept: "text/html", "Accept-Language": "fr" }), env());
    expect(invalid.headers.get("content-language")).toBe("en");
  });

  it("serves a filtered ICS feed with correct content type", async () => {
    const res = await worker.fetch(req("/feed.ics?teams=USA"), env());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("UID:wc2026-2@worldcup.andrewe.ca");
    expect(body).not.toContain("UID:wc2026-1@");
  });

  it("always serves ICS from /feed.ics, even to a browser (no content negotiation)", async () => {
    for (const headers of [
      { Accept: "text/html,application/xhtml+xml" },
      { "Sec-Fetch-Dest": "document" },
      {},
    ]) {
      const res = await worker.fetch(req("/feed.ics?teams=USA", headers), env());
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/calendar");
    }
  });

  it("serves the ICS feed to a calendar client (Accept: text/calendar)", async () => {
    const res = await worker.fetch(req("/feed.ics?teams=USA", { Accept: "text/calendar" }), env());
    expect(res.headers.get("content-type")).toContain("text/calendar");
    expect(await res.text()).toContain("BEGIN:VCALENDAR");
  });

  it("returns 304 when If-None-Match matches the feed ETag", async () => {
    const e = env();
    const first = await worker.fetch(req("/feed.ics?teams=USA"), e);
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    const second = await worker.fetch(req("/feed.ics?teams=USA", { "If-None-Match": etag }), e);
    expect(second.status).toBe(304);
  });

  it("returns 304 for weak or multi-value If-None-Match (proxy-mangled)", async () => {
    const e = env();
    const first = await worker.fetch(req("/feed.ics?teams=USA"), e);
    const etag = first.headers.get("etag");
    const weak = await worker.fetch(req("/feed.ics?teams=USA", { "If-None-Match": `W/${etag}` }), e);
    expect(weak.status).toBe(304);
    const multi = await worker.fetch(req("/feed.ics?teams=USA", { "If-None-Match": `"other", ${etag}` }), e);
    expect(multi.status).toBe(304);
  });

  it("serves ICS when a calendar client lists text/html but prefers text/calendar", async () => {
    const res = await worker.fetch(
      req("/feed.ics?teams=USA", { Accept: "text/calendar, text/html;q=0.5" }),
      env()
    );
    expect(res.headers.get("content-type")).toContain("text/calendar");
  });

  it("gives distinct ETags to distinct feeds", async () => {
    const e = env();
    const a = (await worker.fetch(req("/feed.ics?teams=USA"), e)).headers.get("etag");
    const b = (await worker.fetch(req("/feed.ics?teams=CAN"), e)).headers.get("etag");
    expect(a).not.toBe(b);
  });

  it("gives localized feeds distinct ETags while keeping event UIDs stable", async () => {
    const e = env();
    const en = await worker.fetch(req("/feed.ics?teams=USA"), e);
    const es = await worker.fetch(req("/feed.ics?teams=USA&lang=es"), e);
    expect(en.headers.get("etag")).not.toBe(es.headers.get("etag"));
    expect(es.headers.get("content-language")).toBe("es");
    const enBody = await en.text();
    const esBody = await es.text();
    expect(enBody.match(/UID:.+/)[0]).toBe(esBody.match(/UID:.+/)[0]);
    expect(esBody).toContain("SUMMARY;LANGUAGE=es:");
    expect(esBody).toContain("Estados Unidos");
  });

  it("keeps feeds without lang deterministically English", async () => {
    const res = await worker.fetch(req("/feed.ics?teams=USA", { "Accept-Language": "es" }), env());
    const body = await res.text();
    expect(body).toContain("United States");
    expect(body).not.toContain("LANGUAGE=es");
  });

  it("uses BBC projections only when bbc=1 while preserving official partial matchups", async () => {
    const kickoff = "2026-07-01T01:00:00Z";
    const knockoutFixture = {
      id: 79,
      utcKickoff: kickoff,
      status: "TIMED",
      finished: false,
      stage: "Round of 32",
      knockout: true,
      hostOpener: false,
      slotHome: "A1",
      slotAway: "X3",
      venue: { name: "Estadio Azteca", city: "Mexico City" },
      home: null,
      away: null,
      score: null,
    };
    const bbcMap = {
      [kickoff]: {
        home: { code: "MEX", name: "Mexico", official: true },
        away: { code: "CPV", name: "Cape Verde Islands", official: false },
      },
    };
    const knockoutEnv = (version) => ({
      WC_STORE: makeKV({
        fixtures: JSON.stringify([knockoutFixture]),
        odds: "{}",
        bbc_knockout: JSON.stringify(bbcMap),
        data_version: version,
      }),
    });

    const absent = await worker.fetch(
      req("/feed.ics?teams=MEX&flags=0"),
      knockoutEnv("bbc-absent")
    );
    expect(await absent.text()).toContain("SUMMARY:Mexico vs. X3");

    const disabled = await worker.fetch(
      req("/feed.ics?teams=MEX&flags=0&bbc=0"),
      knockoutEnv("bbc-disabled")
    );
    expect(await disabled.text()).toContain("SUMMARY:Mexico vs. X3");

    const enabled = await worker.fetch(
      req("/feed.ics?teams=MEX&flags=0&bbc=1"),
      knockoutEnv("bbc-enabled")
    );
    expect(await enabled.text()).toContain(
      "SUMMARY:Mexico vs. Cape Verde Islands"
    );
  });

  it("returns preview JSON of qualifying upcoming matches", async () => {
    const res = await worker.fetch(req("/api/preview?teams=USA"), env());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.matches[0]).toMatchObject({ id: 2, reasons: ["favourite team"] });
  });

  it("returns localized preview summaries and reason labels", async () => {
    const res = await worker.fetch(req("/api/preview?teams=USA&lang=es&flags=0"), env());
    expect(res.headers.get("content-language")).toBe("es");
    const data = await res.json();
    expect(data.matches[0].summary).toContain("Estados Unidos");
    expect(data.matches[0].summary).toContain("Canadá");
    expect(data.matches[0].reasons).toEqual(["equipo favorito"]);
    expect(data.matches[0].probabilities).toEqual([]);
  });

  it("returns localized preview probabilities on separate lines", async () => {
    const odds = { "1": { homePct: 40, awayPct: 29, drawPct: 31 } };
    const res = await worker.fetch(req("/api/preview?competitive=20&lang=es&flags=0"), env(odds, "1001"));
    const data = await res.json();
    expect(data.matches[0].reasons).toEqual(["partido competitivo"]);
    expect(data.matches[0].probabilities).toEqual(["España: 40%", "Francia: 29%", "empate: 31%"]);
  });

  it("404s unknown routes", async () => {
    const res = await worker.fetch(req("/nope"), env());
    expect(res.status).toBe(404);
  });

  it("delegates scheduled() to the cron handler", async () => {
    const e = { WC_STORE: makeKV(), API_FOOTBALL_KEY: "k" };
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ response: [] }) })));
    await worker.scheduled({ scheduledTime: Date.parse("2026-06-11T17:30:00Z") }, e);
    vi.unstubAllGlobals();
    expect(true).toBe(true);
  });
});
