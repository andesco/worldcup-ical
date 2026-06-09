import { describe, it, expect } from "vitest";
import { selectMatches, buildFeed } from "../src/feed.js";

const fixtures = [
  { id: 1, utcKickoff: "2026-06-11T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "ESP", name: "Spain" }, away: { code: "FRA", name: "France" }, score: null },
  { id: 2, utcKickoff: "2026-06-12T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "USA", name: "USA" }, away: { code: "GHA", name: "Ghana" }, score: null },
];
const oddsMap = { "1": { homePct: 41, drawPct: 22, awayPct: 37 } };

describe("feed", () => {
  it("selects only qualifying fixtures with reasons", () => {
    const sel = selectMatches(fixtures, oddsMap, { teams: new Set(["USA"]), topx: 8, competitive: 10 });
    const ids = sel.map((s) => s.fixture.id).sort();
    expect(ids).toEqual([1, 2]);
    const one = sel.find((s) => s.fixture.id === 1);
    expect(one.reasons).toContain("big game");
  });

  it("builds a full ICS calendar of the selection", () => {
    const ics = buildFeed(fixtures, oddsMap, { teams: new Set(["USA"]), topx: null, competitive: null });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:wc2026-2@worldcup.andrewe.dev");
    expect(ics).not.toContain("UID:wc2026-1@");
  });

  it("an empty selection still yields a valid empty calendar", () => {
    const ics = buildFeed(fixtures, oddsMap, { teams: new Set(), topx: null, competitive: null });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});
