import { describe, it, expect, vi, afterEach } from "vitest";
import { handleScheduled, joinOdds } from "../src/cron.js";

function makeKV(init = {}) {
  const m = new Map(Object.entries(init));
  return { store: m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v) };
}
afterEach(() => vi.unstubAllGlobals());

const fixtures = [
  { id: 1, utcKickoff: "2026-06-11T19:00:00Z", home: { code: "MEX", name: "Mexico" }, away: { code: "RSA", name: "South Africa" } },
  { id: 2, utcKickoff: "2026-06-12T18:00:00Z", home: null, away: null }, // TBD
];
// the-odds-api lists this game with home/away SWAPPED vs football-data:
const oddsList = [
  { key: "MEX|RSA", byCode: { MEX: 70, RSA: 14 }, drawPct: 16, date: "2026-06-11" },
];

describe("joinOdds", () => {
  it("re-orients odds to the fixture's own home/away and skips TBD", () => {
    const m = joinOdds(fixtures, oddsList);
    expect(m["1"]).toEqual({ homePct: 70, drawPct: 16, awayPct: 14 });
    expect(m["2"]).toBeUndefined();
  });
});

function stubFetch() {
  vi.stubGlobal("fetch", vi.fn(async (url) => ({
    ok: true,
    json: async () =>
      url.includes("football-data.org")
        ? { matches: [{ id: 1, utcDate: "2026-06-11T19:00:00Z", status: "TIMED", stage: "GROUP_STAGE", group: "GROUP_A",
            homeTeam: { name: "Mexico" }, awayTeam: { name: "South Africa" }, score: { fullTime: {} } }] }
        : [{ home_team: "South Africa", away_team: "Mexico", commence_time: "2026-06-11T19:00:00Z",
            bookmakers: [{ markets: [{ key: "h2h", outcomes: [
              { name: "Mexico", price: 1.4 }, { name: "South Africa", price: 8 }, { name: "Draw", price: 4.5 },
            ] }] }] }],
  })));
}

describe("handleScheduled", () => {
  it("writes fixtures every run; odds only at top of hour, joined to fixtures", async () => {
    stubFetch();
    const env = { WC_STORE: makeKV(), FOOTBALL_DATA_TOKEN: "t", ODDS_API_KEY: "k" };

    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T17:30:00Z") }, env);
    expect(env.WC_STORE.store.has("fixtures")).toBe(true);
    expect(env.WC_STORE.store.has("odds")).toBe(false);

    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T18:00:00Z") }, env);
    const odds = JSON.parse(env.WC_STORE.store.get("odds"));
    expect(odds["1"].homePct).toBeGreaterThan(odds["1"].awayPct); // Mexico favoured
    expect(env.WC_STORE.store.has("data_version")).toBe(true);
  });

  it("does not bump data_version when the data is unchanged", async () => {
    stubFetch();
    const env = { WC_STORE: makeKV(), FOOTBALL_DATA_TOKEN: "t", ODDS_API_KEY: "k" };
    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T18:00:00Z") }, env); // writes + sets version
    const v1 = env.WC_STORE.store.get("data_version");
    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T18:30:00Z") }, env); // identical data
    expect(env.WC_STORE.store.get("data_version")).toBe(v1);
  });

  it("keeps last good fixtures cache when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const env = { WC_STORE: makeKV({ fixtures: JSON.stringify([{ id: 9 }]) }), FOOTBALL_DATA_TOKEN: "t", ODDS_API_KEY: "k" };
    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T18:00:00Z") }, env);
    expect(JSON.parse(env.WC_STORE.store.get("fixtures"))[0].id).toBe(9);
  });
});
