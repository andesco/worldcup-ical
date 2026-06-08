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
  });

  it("builds a flags-only summary with stage suffix", () => {
    expect(matchSummary(fx())).toBe("🇪🇸 Spain vs 🇫🇷 France — Group Stage - 1");
  });

  it("builds a VEVENT with stable UID, 2h end, location, reasons", () => {
    const ev = buildVEvent({ fixture: fx(), odds: { homePct: 41, drawPct: 22, awayPct: 37 }, reasons: ["big game", "close game (41% / 37%)"] });
    expect(ev).toContain("UID:wc2026-42@worldcup.andrewe.dev");
    expect(ev).toContain("DTSTART:20260611T200000Z");
    expect(ev).toContain("DTEND:20260611T220000Z");
    expect(ev).toContain("LOCATION:SoFi Stadium\\, Inglewood");
    expect(ev).toContain("Included: big game\\; close game (41% / 37%)");
    expect(ev).toContain("SEQUENCE:1");
  });

  it("includes the final score once finished", () => {
    const ev = buildVEvent({ fixture: fx({ finished: true, status: "FT", score: { home: 2, away: 1 } }), odds: null, reasons: ["favourite team"] });
    expect(ev).toContain("Final: Spain 2-1 France");
    expect(ev).toContain("SEQUENCE:2");
  });

  it("wraps events in a VCALENDAR", () => {
    const cal = buildCalendar([buildVEvent({ fixture: fx(), odds: null, reasons: ["favourite team"] })]);
    expect(cal.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(cal.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(cal).toContain("PRODID:-//andrewe//worldcup-ical//EN");
    expect(cal).toContain("X-WR-CALNAME:World Cup 2026");
  });
});
