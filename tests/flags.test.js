import { describe, it, expect } from "vitest";
import { flagEmoji, flagFor, nameFor, codeForApiName } from "../src/flags.js";

describe("flags", () => {
  it("builds a flag emoji from ISO2", () => {
    expect(flagEmoji("ES")).toBe("🇪🇸");
    expect(flagEmoji("us")).toBe("🇺🇸");
  });

  it("resolves flag + name for known FIFA codes", () => {
    expect(flagFor("ESP")).toBe("🇪🇸");
    expect(nameFor("ESP")).toBe("Spain");
    expect(flagFor("USA")).toBe("🇺🇸");
    expect(flagFor("CAN")).toBe("🇨🇦");
    expect(flagFor("MEX")).toBe("🇲🇽");
  });

  it("maps API-Football team names back to FIFA codes", () => {
    expect(codeForApiName("Spain")).toBe("ESP");
    expect(codeForApiName("USA")).toBe("USA");
    expect(codeForApiName("Netherlands")).toBe("NED");
  });

  it("returns null code for unknown API names", () => {
    expect(codeForApiName("Atlantis")).toBeNull();
  });

  it("returns a neutral placeholder flag for unknown codes", () => {
    expect(flagFor("ZZZ")).toBe("🏳️");
  });
});
