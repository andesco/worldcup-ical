import { describe, it, expect } from "vitest";
import { evaluateMatch } from "../src/selection.js";

const fx = (over = {}) => ({
  id: 1, utcKickoff: "2026-06-20T18:00:00Z", status: "NS", finished: false,
  stage: "Group Stage - 1", venue: { name: "V", city: "C" },
  home: { code: "ESP", name: "Spain" }, away: { code: "NOR", name: "Norway" },
  score: null, ...over,
});
const cfg = (over = {}) => ({ teams: new Set(), topx: null, competitive: null, ...over });

describe("evaluateMatch", () => {
  it("includes a match with a favourite team", () => {
    const r = evaluateMatch(fx(), null, cfg({ teams: new Set(["NOR"]) }));
    expect(r.included).toBe(true);
    expect(r.reasons).toContain("favourite team");
  });

  it("big-game needs BOTH teams in top-X", () => {
    expect(evaluateMatch(fx(), null, cfg({ topx: 8 })).included).toBe(false);
    const both = fx({ away: { code: "FRA", name: "France" } });
    const r = evaluateMatch(both, null, cfg({ topx: 8 }));
    expect(r.included).toBe(true);
    expect(r.reasons).toContain("big game");
  });

  it("competitive-game fires only when odds exist and gap within threshold", () => {
    const odds = { homePct: 48, drawPct: 26, awayPct: 26 };
    expect(evaluateMatch(fx(), odds, cfg({ competitive: 10 })).included).toBe(false);
    const tight = { homePct: 40, drawPct: 24, awayPct: 36 };
    const r = evaluateMatch(fx(), tight, cfg({ competitive: 10 }));
    expect(r.included).toBe(true);
    expect(r.reasons).toContain("competitive game (40% / 36%, draw 24%)");
  });

  it("ignores rules for fixtures with TBD teams", () => {
    const tbd = fx({ home: null, away: null });
    expect(evaluateMatch(tbd, null, cfg({ teams: new Set(["ESP"]), topx: 8 })).included).toBe(false);
  });

  it("collects multiple reasons and de-dupes inclusion", () => {
    const both = fx({ away: { code: "FRA", name: "France" } });
    const r = evaluateMatch(both, { homePct: 41, drawPct: 22, awayPct: 37 },
      cfg({ teams: new Set(["ESP"]), topx: 8, competitive: 10 }));
    expect(r.included).toBe(true);
    expect(r.reasons).toEqual([
      "favourite team", "big game", "competitive game (41% / 37%, draw 22%)",
    ]);
  });
});
