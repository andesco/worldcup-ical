import { describe, it, expect } from "vitest";
import { OUTRIGHT_RANKING, SNAPSHOT_DATE, outrightRank, inTopX } from "../src/odds-snapshot.js";

describe("odds snapshot", () => {
  it("exposes a dated ordered ranking", () => {
    expect(SNAPSHOT_DATE).toBe("2026-06-07");
    expect(OUTRIGHT_RANKING[0]).toBe("ESP");
    expect(OUTRIGHT_RANKING[1]).toBe("FRA");
  });

  it("ranks 1-based, Infinity when off the list", () => {
    expect(outrightRank("ESP")).toBe(1);
    expect(outrightRank("URU")).toBe(12);
    expect(outrightRank("USA")).toBe(Infinity);
  });

  it("top-X is inclusive and excludes off-list teams", () => {
    expect(inTopX("ENG", 8)).toBe(true);
    expect(inTopX("NED", 8)).toBe(true);
    expect(inTopX("NOR", 8)).toBe(false);
    expect(inTopX("USA", 50)).toBe(false);
  });
});
