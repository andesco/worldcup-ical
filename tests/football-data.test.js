import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchFixtures, normalizeFixtures, stageLabel, FD_BASE } from "../src/football-data.js";

afterEach(() => vi.unstubAllGlobals());

const sample = {
  matches: [
    { id: 1, utcDate: "2026-06-11T19:00:00Z", status: "TIMED", stage: "GROUP_STAGE", group: "GROUP_A",
      homeTeam: { name: "Mexico" }, awayTeam: { name: "South Africa" },
      score: { fullTime: { home: null, away: null } } },
    { id: 2, utcDate: "2026-07-10T18:00:00Z", status: "FINISHED", stage: "LAST_16", group: null,
      homeTeam: { name: "United States" }, awayTeam: { name: "Czechia" },
      score: { fullTime: { home: 2, away: 1 } } },
    { id: 3, utcDate: "2026-07-15T18:00:00Z", status: "TIMED", stage: "SEMI_FINALS", group: null,
      homeTeam: { name: null }, awayTeam: { name: null },
      score: { fullTime: { home: null, away: null } } },
  ],
};

describe("football-data client", () => {
  it("labels stages and groups", () => {
    expect(stageLabel("GROUP_STAGE", "GROUP_A")).toBe("Group A");
    expect(stageLabel("LAST_32")).toBe("Round of 32");
    expect(stageLabel("QUARTER_FINALS")).toBe("Quarter-final");
    expect(stageLabel("FINAL")).toBe("Final");
  });

  it("normalises fixtures, mapping names to codes", () => {
    const fx = normalizeFixtures(sample);
    expect(fx[0]).toMatchObject({
      id: 1, utcKickoff: "2026-06-11T19:00:00Z", finished: false, stage: "Group A",
      venue: null, home: { code: "MEX", name: "Mexico" }, away: { code: "RSA", name: "South Africa" },
    });
  });

  it("includes score only when finished; maps alias names", () => {
    const fx = normalizeFixtures(sample);
    expect(fx[1]).toMatchObject({ finished: true, stage: "Round of 16",
      home: { code: "USA" }, away: { code: "CZE" }, score: { home: 2, away: 1 } });
  });

  it("treats unknown/TBD knockout teams as null", () => {
    const fx = normalizeFixtures(sample);
    expect(fx[2].home).toBeNull();
    expect(fx[2].away).toBeNull();
  });

  it("flags knockout stages (everything except GROUP_STAGE)", () => {
    const fx = normalizeFixtures(sample);
    expect(fx[0].knockout).toBe(false); // GROUP_STAGE
    expect(fx[1].knockout).toBe(true);  // LAST_16
    expect(fx[2].knockout).toBe(true);  // SEMI_FINALS
  });

  it("flags each host nation's earliest home match as a host opener", () => {
    const fx = normalizeFixtures({ matches: [
      { id: 10, utcDate: "2026-06-11T19:00:00Z", status: "TIMED", stage: "GROUP_STAGE", group: "GROUP_A",
        homeTeam: { name: "Mexico" }, awayTeam: { name: "South Africa" }, score: { fullTime: {} } },
      { id: 11, utcDate: "2026-06-18T22:00:00Z", status: "TIMED", stage: "GROUP_STAGE", group: "GROUP_A",
        homeTeam: { name: "Mexico" }, awayTeam: { name: "Norway" }, score: { fullTime: {} } },
      { id: 12, utcDate: "2026-06-13T01:00:00Z", status: "TIMED", stage: "GROUP_STAGE", group: "GROUP_D",
        homeTeam: { name: "United States" }, awayTeam: { name: "Paraguay" }, score: { fullTime: {} } },
    ]});
    const byId = Object.fromEntries(fx.map((f) => [f.id, f]));
    expect(byId[10].hostOpener).toBe(true);  // Mexico's first home game
    expect(byId[11].hostOpener).toBe(false); // Mexico's second home game
    expect(byId[12].hostOpener).toBe(true);  // USA's first home game
  });

  it("sends the X-Auth-Token header to the WC season endpoint", async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => ({ matches: [] }) }));
    vi.stubGlobal("fetch", spy);
    await fetchFixtures({ FOOTBALL_DATA_TOKEN: "tok" });
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${FD_BASE}/competitions/WC/matches?season=2026`);
    expect(opts.headers["X-Auth-Token"]).toBe("tok");
  });
});
