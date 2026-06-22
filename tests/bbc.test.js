import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BBC_SCHEDULE_URL,
  applyBbcKnockout,
  fetchBbcKnockout,
  parseBbcKnockout,
} from "../src/bbc.js";

afterEach(() => vi.unstubAllGlobals());

function htmlFor(matches, extra = {}) {
  const initial = {
    data: {
      "football-world-cup-2022?tournament=world-cup": {
        data: {
          knockoutStage: {
            preFinalRounds: [{ roundName: "Last 32", matches }],
            ...extra,
          },
        },
      },
    },
  };
  return `<script>window.__INITIAL_DATA__=${JSON.stringify(JSON.stringify(initial))};</script>`;
}

const match = (iso, homeName, homeCode, awayName, awayCode) => ({
  event: {
    date: { iso },
    teams: [
      { alignment: "home", name: { fullName: homeName, code: homeCode } },
      { alignment: "away", name: { fullName: awayName, code: awayCode } },
    ],
  },
});

describe("BBC knockout data", () => {
  it("distinguishes officially clinched teams from projected teams", () => {
    const parsed = parseBbcKnockout(htmlFor([
      match("2026-07-01T01:00:00Z", "Mexico", "MEX", "Spain", "CEFHI3"),
    ]));
    expect(parsed["2026-07-01T01:00:00Z"]).toEqual({
      home: { code: "MEX", name: "Mexico", official: true },
      away: { code: "ESP", name: "Spain", official: false },
    });
  });

  it("applies official teams by default and projections only when enabled", () => {
    const fixtures = [{
      id: 79,
      utcKickoff: "2026-07-01T01:00:00Z",
      knockout: true,
      stage: "Round of 32",
      home: null,
      away: null,
    }];
    const bbc = parseBbcKnockout(htmlFor([
      match(fixtures[0].utcKickoff, "Mexico", "MEX", "Spain", "CEFHI3"),
    ]));

    expect(applyBbcKnockout(fixtures, bbc, false)[0]).toMatchObject({
      home: { code: "MEX" },
      away: null,
    });
    expect(applyBbcKnockout(fixtures, bbc, true)[0]).toMatchObject({
      home: { code: "MEX" },
      away: { code: "ESP" },
    });
  });

  it("never overwrites an official fixture-provider team", () => {
    const fixtures = [{
      id: 79,
      utcKickoff: "2026-07-01T01:00:00Z",
      knockout: true,
      stage: "Round of 32",
      home: { code: "MEX", name: "Mexico" },
      away: null,
    }];
    const bbc = {
      [fixtures[0].utcKickoff]: {
        home: { code: "KOR", name: "South Korea", official: false },
        away: { code: "ESP", name: "Spain", official: false },
      },
    };
    expect(applyBbcKnockout(fixtures, bbc, true)[0].home.code).toBe("MEX");
  });

  it("fills confirmed participants in every knockout round", () => {
    const r16Kickoff = "2026-07-04T17:00:00Z";
    const finalKickoff = "2026-07-19T19:00:00Z";
    const parsed = parseBbcKnockout(htmlFor([], {
      preFinalRounds: [{
        roundName: "Last 16",
        matches: [
          match(r16Kickoff, "Mexico", "MEX", "W-32-3", "W-32-3"),
        ],
      }],
      final: {
        match: match(finalKickoff, "Germany", "GER", "W-SF2", "W-SF2"),
      },
    }));
    const fixtures = [
      {
        id: 89,
        utcKickoff: r16Kickoff,
        knockout: true,
        stage: "Round of 16",
        home: null,
        away: null,
      },
      {
        id: 104,
        utcKickoff: finalKickoff,
        knockout: true,
        stage: "Final",
        home: null,
        away: null,
      },
    ];

    const resolved = applyBbcKnockout(fixtures, parsed, false);
    expect(resolved[0]).toMatchObject({
      home: { code: "MEX" },
      away: null,
    });
    expect(resolved[1]).toMatchObject({
      home: { code: "GER" },
      away: null,
    });
  });

  it("fetches the BBC schedule page", async () => {
    const body = htmlFor([
      match("2026-07-01T01:00:00Z", "Mexico", "MEX", "Spain", "CEFHI3"),
    ]);
    const spy = vi.fn(async () => ({ ok: true, text: async () => body }));
    vi.stubGlobal("fetch", spy);
    const parsed = await fetchBbcKnockout();
    expect(spy).toHaveBeenCalledWith(BBC_SCHEDULE_URL, expect.any(Object));
    expect(parsed["2026-07-01T01:00:00Z"].home.code).toBe("MEX");
  });
});
