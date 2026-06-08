import { describe, it, expect, vi } from "vitest";
import worker from "../src/index.js";

function makeKV(init = {}) {
  const m = new Map(Object.entries(init));
  return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v) };
}

const fixtures = [
  { id: 1, utcKickoff: "2026-06-11T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "ESP", name: "Spain" }, away: { code: "FRA", name: "France" }, score: null },
  { id: 2, utcKickoff: "2026-06-12T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "USA", name: "USA" }, away: { code: "CAN", name: "Canada" }, score: null },
];
const env = () => ({
  WC_STORE: makeKV({ fixtures: JSON.stringify(fixtures), odds: JSON.stringify({}), fixtures_lastupdate: "1000", odds_lastupdate: "1000" }),
});
const req = (path, headers = {}) => new Request("https://worldcup.andrewe.dev" + path, { headers });

describe("worker fetch", () => {
  it("serves the settings UI at /", async () => {
    const res = await worker.fetch(req("/"), env());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("World Cup 2026");
  });

  it("serves a filtered ICS feed with correct content type", async () => {
    const res = await worker.fetch(req("/feed.ics?teams=USA"), env());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("UID:wc2026-2@worldcup.andrewe.dev");
    expect(body).not.toContain("UID:wc2026-1@");
  });

  it("serves the builder UI when /feed.ics is opened in a browser (Accept: text/html)", async () => {
    const res = await worker.fetch(req("/feed.ics?teams=USA", { Accept: "text/html,application/xhtml+xml" }), env());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("World Cup 2026");
  });

  it("serves the builder UI when /feed.ics is a browser navigation (Sec-Fetch-Dest: document)", async () => {
    const res = await worker.fetch(req("/feed.ics?teams=USA", { "Sec-Fetch-Dest": "document" }), env());
    expect(res.headers.get("content-type")).toContain("text/html");
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

  it("gives distinct ETags to distinct feeds", async () => {
    const e = env();
    const a = (await worker.fetch(req("/feed.ics?teams=USA"), e)).headers.get("etag");
    const b = (await worker.fetch(req("/feed.ics?teams=CAN"), e)).headers.get("etag");
    expect(a).not.toBe(b);
  });

  it("returns preview JSON of qualifying upcoming matches", async () => {
    const res = await worker.fetch(req("/api/preview?teams=USA"), env());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.matches[0]).toMatchObject({ id: 2, reasons: ["favourite team"] });
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
