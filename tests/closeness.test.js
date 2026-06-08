import { describe, it, expect } from "vitest";
import { impliedFrom1x2, closenessGap } from "../src/closeness.js";

describe("closeness", () => {
  it("converts decimal 1X2 odds to vig-removed win% summing to 100", () => {
    const p = impliedFrom1x2(2.0, 3.5, 4.0);
    expect(p.homePct + p.drawPct + p.awayPct).toBe(100);
    expect(p.homePct).toBeGreaterThan(p.awayPct);
  });

  it("treats a near-even market as close", () => {
    const p = impliedFrom1x2(2.5, 3.2, 2.6);
    expect(closenessGap(p)).toBeLessThanOrEqual(5);
  });

  it("treats a lopsided market as not close", () => {
    const p = impliedFrom1x2(1.2, 6.0, 12.0);
    expect(closenessGap(p)).toBeGreaterThan(40);
  });
});
