import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchFixtures, fetchOddsForDate, AF_BASE } from "../src/api-football.js";

const env = { API_FOOTBALL_KEY: "k", ODDS_BOOKMAKER: "8" };

afterEach(() => vi.unstubAllGlobals());

function stubJson(payload) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => payload })));
}

describe("api-football client", () => {
  it("normalises fixtures incl. TBD teams and finished scores", async () => {
    stubJson({ response: [
      { fixture: { id: 1, date: "2026-06-11T20:00:00+00:00", status: { short: "NS" }, venue: { name: "SoFi", city: "Inglewood" } },
        league: { round: "Group Stage - 1" }, teams: { home: { name: "Spain" }, away: { name: "France" } }, goals: { home: null, away: null } },
      { fixture: { id: 2, date: "2026-07-10T18:00:00+00:00", status: { short: "FT" }, venue: { name: "MetLife", city: "East Rutherford" } },
        league: { round: "Round of 16" }, teams: { home: { name: "Brazil" }, away: { name: "Uruguay" } }, goals: { home: 2, away: 1 } },
      { fixture: { id: 3, date: "2026-07-11T18:00:00+00:00", status: { short: "NS" }, venue: { name: "TBD", city: "TBD" } },
        league: { round: "Quarter-finals" }, teams: { home: { name: "Atlantis" }, away: { name: null } }, goals: { home: null, away: null } },
    ]});
    const fx = await fetchFixtures(env);
    expect(fx[0]).toMatchObject({ id: 1, utcKickoff: "2026-06-11T20:00:00Z", finished: false, home: { code: "ESP", name: "Spain" } });
    expect(fx[1]).toMatchObject({ finished: true, score: { home: 2, away: 1 } });
    expect(fx[2].home).toBeNull();
    expect(fx[2].away).toBeNull();
  });

  it("sends the api key header and league/season query", async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => ({ response: [] }) }));
    vi.stubGlobal("fetch", spy);
    await fetchFixtures(env);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${AF_BASE}/fixtures?league=1&season=2026`);
    expect(opts.headers["x-apisports-key"]).toBe("k");
  });

  it("normalises Match Winner odds for a date into win% keyed by fixture id", async () => {
    stubJson({ response: [
      { fixture: { id: 1 }, bookmakers: [ { id: 8, bets: [ { id: 1, name: "Match Winner", values: [
        { value: "Home", odd: "2.00" }, { value: "Draw", odd: "3.50" }, { value: "Away", odd: "4.00" },
      ] } ] } ] },
    ]});
    const odds = await fetchOddsForDate(env, "2026-06-11");
    expect(odds["1"].homePct + odds["1"].drawPct + odds["1"].awayPct).toBe(100);
    expect(odds["1"].homePct).toBeGreaterThan(odds["1"].awayPct);
  });
});
