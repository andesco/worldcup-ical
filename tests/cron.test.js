import { describe, it, expect, vi, afterEach } from "vitest";
import { handleScheduled, datesNext48h } from "../src/cron.js";

function makeKV(init = {}) {
  const m = new Map(Object.entries(init));
  return { store: m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v) };
}
afterEach(() => vi.unstubAllGlobals());

describe("cron", () => {
  it("lists unique fixture dates within 48h of now", () => {
    const fixtures = [
      { id: 1, utcKickoff: "2026-06-11T20:00:00Z" },
      { id: 2, utcKickoff: "2026-06-12T18:00:00Z" },
      { id: 3, utcKickoff: "2026-06-20T18:00:00Z" },
    ];
    const dates = datesNext48h(fixtures, new Date("2026-06-11T08:00:00Z"));
    expect(dates).toEqual(["2026-06-11", "2026-06-12"]);
  });

  it("always writes fixtures; pulls odds only at top of hour", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => ({
      ok: true,
      json: async () =>
        url.includes("/fixtures")
          ? { response: [{ fixture: { id: 1, date: "2026-06-11T20:00:00+00:00", status: { short: "NS" }, venue: { name: "V", city: "C" } }, league: { round: "Group Stage - 1" }, teams: { home: { name: "Spain" }, away: { name: "France" } }, goals: {} }] }
          : { response: [{ fixture: { id: 1 }, bookmakers: [{ id: 8, bets: [{ id: 1, values: [{ value: "Home", odd: "2.0" }, { value: "Draw", odd: "3.5" }, { value: "Away", odd: "4.0" }] }] }] }] },
    })));
    const env = { WC_STORE: makeKV(), API_FOOTBALL_KEY: "k" };

    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T17:30:00Z") }, env);
    expect(env.WC_STORE.store.has("fixtures")).toBe(true);
    expect(env.WC_STORE.store.has("odds")).toBe(false);

    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T18:00:00Z") }, env);
    expect(env.WC_STORE.store.has("odds")).toBe(true);
    expect(JSON.parse(env.WC_STORE.store.get("odds"))["1"]).toBeTruthy();
  });

  it("keeps last good cache when the fixtures fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const env = { WC_STORE: makeKV({ fixtures: JSON.stringify([{ id: 9 }]) }), API_FOOTBALL_KEY: "k" };
    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T18:00:00Z") }, env);
    expect(JSON.parse(env.WC_STORE.store.get("fixtures"))[0].id).toBe(9);
  });
});
