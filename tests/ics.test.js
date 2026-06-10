import { describe, it, expect } from "vitest";
import { icsDate, escapeText, foldLine, matchSummary, buildVEvent, buildCalendar } from "../src/ics.js";

const fx = (over = {}) => ({
  id: 42, utcKickoff: "2026-06-11T20:00:00Z", status: "NS", finished: false,
  stage: "Group Stage - 1", venue: { name: "SoFi Stadium", city: "Inglewood" },
  home: { code: "ESP", name: "Spain" }, away: { code: "FRA", name: "France" },
  score: null, ...over,
});

describe("ics", () => {
  it("formats ISO Z to ICS UTC stamp", () => {
    expect(icsDate("2026-06-11T20:00:00Z")).toBe("20260611T200000Z");
  });

  it("escapes RFC5545 special characters", () => {
    expect(escapeText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });

  it("folds long lines on codepoint boundaries with leading space", () => {
    const long = "X".repeat(200);
    const folded = foldLine(long);
    expect(folded.split("\r\n").length).toBeGreaterThan(1);
    folded.split("\r\n").forEach((l, i) => {
      if (i > 0) expect(l.startsWith(" ")).toBe(true);
    });
    expect(folded.replace(/\r\n /g, "")).toBe(long); // unfolding round-trips
  });

  it("folds to at most 75 octets per line, even with multi-byte emoji", () => {
    const enc = new TextEncoder();
    // 40 flag emoji = 40 codepoint-pairs but 8 bytes each in UTF-8 (320 octets).
    const long = "SUMMARY:" + "🇪🇸".repeat(40);
    const folded = foldLine(long);
    folded.split("\r\n").forEach((l) => {
      expect(enc.encode(l).length).toBeLessThanOrEqual(75);
    });
    expect(folded.replace(/\r\n /g, "")).toBe(long); // no emoji split in half
  });

  it("leaves a line of exactly 75 octets unfolded", () => {
    const line = "X".repeat(75);
    expect(foldLine(line)).toBe(line);
  });

  it("bookends flags around the matchup without a group suffix", () => {
    expect(matchSummary(fx())).toBe("🇪🇸 Spain vs. France 🇫🇷");
  });

  it("supports flags-off and FIFA-code options", () => {
    expect(matchSummary(fx(), { flags: false })).toBe("Spain vs. France");
    expect(matchSummary(fx(), { code: true })).toBe("🇪🇸 ESP vs. FRA 🇫🇷");
    expect(matchSummary(fx(), { flags: false, code: true })).toBe("ESP vs. FRA");
  });

  it("renders TBD for null teams in a group game", () => {
    const tbd = { ...fx(), home: null, away: null };
    expect(matchSummary(tbd)).toBe("TBD vs. TBD");
  });

  it("uses R32 slot codes for undecided knockout games, no round suffix", () => {
    const r32 = { ...fx(), home: null, away: null, knockout: true, stage: "Round of 32", slotHome: "A1", slotAway: "X3" };
    expect(matchSummary(r32)).toBe("A1 vs. X3");
    // partial: one team known, slot for the other
    const partial = { ...r32, home: { code: "COL", name: "Colombia" } };
    expect(matchSummary(partial)).toBe("🇨🇴 Colombia vs. X3");
  });

  it("falls back to the round name for undecided R16+ games (no slots)", () => {
    const r16 = { ...fx(), home: null, away: null, knockout: true, stage: "Round of 16", slotHome: null, slotAway: null };
    expect(matchSummary(r16)).toBe("Round of 16");
  });

  it("decided knockout games show the matchup with no round suffix", () => {
    const ko = { ...fx(), knockout: true, stage: "Final" };
    expect(matchSummary(ko)).toBe("🇪🇸 Spain vs. France 🇫🇷");
  });

  it("builds a VEVENT with stable UID, 2h end, location, group matchup, and odds", () => {
    const ev = buildVEvent({ fixture: fx(), odds: { homePct: 41, drawPct: 22, awayPct: 37 }, reasons: [{ id: "bigGame" }, { id: "competitive", values: { home: 41, away: 37, draw: 22 } }] });
    expect(ev).toContain("UID:wc2026-42@worldcup.andrewe.ca");
    expect(ev).toContain("DTSTART:20260611T200000Z");
    expect(ev).toContain("DTEND:20260611T220000Z");
    expect(ev).toContain("LOCATION:SoFi Stadium\\, Inglewood");
    const unfolded = ev.replace(/\r\n /g, "");
    expect(unfolded).not.toContain("Included:");
    expect(unfolded).toContain("Group Stage - 1: Spain vs. France");
    expect(unfolded).toContain("Spain: 41%\\nFrance: 37%\\ndraw: 22%");
    expect(ev).toContain("SEQUENCE:1");
  });

  it("puts a group label and full country names in the description when the title uses codes", () => {
    const ev = buildVEvent({
      fixture: fx({ stage: "Group A" }),
      odds: null,
      reasons: [{ id: "favourite" }],
      opts: { flags: false, code: true },
    });
    expect(ev).toContain("SUMMARY:ESP vs. FRA");
    expect(ev).toContain("DESCRIPTION:Group A: Spain vs. France");
    expect(ev).not.toContain("Included:");
  });

  it("includes the final score once finished", () => {
    const ev = buildVEvent({ fixture: fx({ finished: true, status: "FT", score: { home: 2, away: 1 } }), odds: null, reasons: [{ id: "favourite" }] });
    expect(ev).toContain("Final: Spain 2-1 France");
    expect(ev).toContain("SEQUENCE:2");
  });

  it("wraps events in a VCALENDAR", () => {
    const cal = buildCalendar([buildVEvent({ fixture: fx(), odds: null, reasons: [{ id: "favourite" }] })]);
    expect(cal.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(cal.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(cal).toContain("PRODID:-//andrewe//worldcup-ical//EN");
    expect(cal).toContain("X-WR-CALNAME:World Cup 2026");
  });

  it("localizes summaries, descriptions, stages, names, and language parameters", () => {
    const ev = buildVEvent({
      fixture: fx(),
      odds: { homePct: 41, drawPct: 22, awayPct: 37 },
      reasons: [{ id: "bigGame" }],
      opts: { flags: false, code: true, lang: "es" },
    });
    expect(ev).toContain("SUMMARY;LANGUAGE=es:ESP vs. FRA");
    const unfolded = ev.replace(/\r\n /g, "");
    expect(unfolded).toContain("DESCRIPTION;LANGUAGE=es:Fase de grupos - 1: España vs. Francia");
    expect(unfolded).toContain("España: 41%\\nFrancia: 37%\\nempate: 22%");
    expect(unfolded).not.toContain("Incluido:");
    expect(ev).not.toContain("LOCATION;LANGUAGE=");
  });

  it("keeps UIDs stable across languages and localizes calendar names", () => {
    const en = buildVEvent({ fixture: fx(), odds: null, reasons: [{ id: "favourite" }], opts: { lang: "en" } });
    const de = buildVEvent({ fixture: fx(), odds: null, reasons: [{ id: "favourite" }], opts: { lang: "de" } });
    expect(en.match(/UID:.+/)[0]).toBe(de.match(/UID:.+/)[0]);
    expect(buildCalendar([de], { lang: "de" })).toContain("X-WR-CALNAME;LANGUAGE=de:Fußball-WM 2026");
  });
});
