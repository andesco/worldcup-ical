import { describe, expect, it } from "vitest";
import { TEAMS } from "../src/flags.js";
import {
  CATALOGS,
  SUPPORTED_LOCALES,
  localeFromAcceptLanguage,
  probabilityLines,
  reasonLabel,
  requestLocale,
  resolveLocale,
  stageName,
} from "../src/localization.js";

describe("localization", () => {
  it("has key parity and all 48 localized team names", () => {
    const shape = (value) => Object.keys(value).sort();
    for (const locale of SUPPORTED_LOCALES) {
      expect(shape(CATALOGS[locale].ui)).toEqual(shape(CATALOGS.en.ui));
      expect(shape(CATALOGS[locale].stages)).toEqual(shape(CATALOGS.en.stages));
      expect(shape(CATALOGS[locale].reasons)).toEqual(shape(CATALOGS.en.reasons));
      expect(shape(CATALOGS[locale].feed)).toEqual(shape(CATALOGS.en.feed));
      expect(Object.keys(CATALOGS[locale].teams)).toHaveLength(48);
      for (const team of TEAMS) expect(CATALOGS[locale].teams[team.code]).toBeTruthy();
      expect(CATALOGS[locale].reasons.competitive).not.toContain("%");
    }
  });

  it("maps exact and regional locale tags", () => {
    expect(resolveLocale("es-AR")).toBe("es");
    expect(resolveLocale("no-NO")).toBe("nb");
    expect(resolveLocale("nb-NO")).toBe("nb");
    expect(resolveLocale("pt-BR")).toBe("pt-BR");
    expect(resolveLocale("pt-AO")).toBe("pt-PT");
    expect(resolveLocale("xx")).toBeNull();
  });

  it("chooses the best supported Accept-Language value", () => {
    expect(localeFromAcceptLanguage("it;q=1, fr-CA;q=0.8, de;q=0.7")).toBe("fr");
    expect(localeFromAcceptLanguage("pt-BR,pt;q=0.9")).toBe("pt-BR");
    expect(localeFromAcceptLanguage("es;q=0")).toBe("en");
    expect(localeFromAcceptLanguage("xx")).toBe("en");
  });

  it("gives a valid explicit URL locale precedence and safely handles invalid values", () => {
    expect(requestLocale(new URL("https://x/?lang=de"), "fr")).toBe("de");
    expect(requestLocale(new URL("https://x/?lang=bad"), "fr")).toBe("en");
    expect(requestLocale(new URL("https://x/"), "fr-CA")).toBe("fr");
  });

  it("localizes stages and structured reasons", () => {
    expect(stageName("Round of 8", "de")).toBe("Viertelfinale");
    expect(stageName("Group A", "fr")).toBe("Groupe A");
    expect(reasonLabel({ id: "competitive", values: { home: 40, away: 36, draw: 24 } }, "es"))
      .toBe("partido competitivo");
    expect(probabilityLines(
      { home: { code: "EGY", name: "Egypt" }, away: { code: "IRN", name: "Iran" } },
      { homePct: 40, awayPct: 29, drawPct: 31 },
      "es",
    )).toEqual(["Egipto: 40%", "Irán: 29%", "empate: 31%"]);
  });
});
