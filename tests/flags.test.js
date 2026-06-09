import { describe, it, expect } from "vitest";
import { TEAMS, flagFor, nameFor, codeForFd, codeForOa } from "../src/flags.js";

describe("flags", () => {
  it("has all 48 qualified teams", () => {
    expect(TEAMS.length).toBe(48);
  });

  it("resolves flag + name for FIFA codes (incl. subdivision flags)", () => {
    expect(flagFor("ESP")).toBe("🇪🇸");
    expect(nameFor("ESP")).toBe("Spain");
    expect(flagFor("USA")).toBe("🇺🇸");
    expect(flagFor("ENG")).toBe("🏴󠁧󠁢󠁥󠁮󠁧󠁿");
    expect(flagFor("SCO")).toBe("🏴󠁧󠁢󠁳󠁣󠁴󠁿");
  });

  it("maps football-data names to codes (incl. the join aliases)", () => {
    expect(codeForFd("Spain")).toBe("ESP");
    expect(codeForFd("United States")).toBe("USA");
    expect(codeForFd("Czechia")).toBe("CZE");
    expect(codeForFd("Congo DR")).toBe("COD");
  });

  it("maps the-odds-api names to the same codes despite name differences", () => {
    expect(codeForOa("Spain")).toBe("ESP");
    expect(codeForOa("USA")).toBe("USA");
    expect(codeForOa("Czech Republic")).toBe("CZE");
    expect(codeForOa("DR Congo")).toBe("COD");
    expect(codeForOa("Bosnia & Herzegovina")).toBe("BIH");
    expect(codeForOa("Cape Verde")).toBe("CPV");
  });

  it("returns null for unknown names and a neutral flag for unknown codes", () => {
    expect(codeForFd("Atlantis")).toBeNull();
    expect(codeForOa("Atlantis")).toBeNull();
    expect(codeForFd(null)).toBeNull();
    expect(flagFor("ZZZ")).toBe("🏳️");
  });

  it("every alias resolves to its own code", () => {
    for (const t of TEAMS) {
      expect(codeForOa(t.oa)).toBe(t.code);
      expect(codeForFd(t.fd)).toBe(t.code);
    }
  });
});
