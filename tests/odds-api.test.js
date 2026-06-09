import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchOdds, normalizeOdds, pairKey, OA_BASE, OA_SPORT } from "../src/odds-api.js";

afterEach(() => vi.unstubAllGlobals());

const event = (over = {}) => ({
  home_team: "Mexico", away_team: "South Africa", commence_time: "2026-06-11T19:00:00Z",
  bookmakers: [{ key: "betmgm", markets: [{ key: "h2h", outcomes: [
    { name: "Mexico", price: 1.44 }, { name: "South Africa", price: 7.5 }, { name: "Draw", price: 4.33 },
  ] }] }],
  ...over,
});

describe("the-odds-api client", () => {
  it("pairKey is order-independent", () => {
    expect(pairKey("MEX", "RSA")).toBe(pairKey("RSA", "MEX"));
  });

  it("normalises into per-code win% with a draw and date", () => {
    const [o] = normalizeOdds([event()]);
    expect(o.key).toBe(pairKey("MEX", "RSA"));
    expect(o.date).toBe("2026-06-11");
    expect(o.byCode.MEX + o.byCode.RSA + o.drawPct).toBe(100);
    expect(o.byCode.MEX).toBeGreaterThan(o.byCode.RSA); // 1.44 << 7.5
  });

  it("maps alias names and skips unmappable or incomplete events", () => {
    const ok = event({ home_team: "Czech Republic", away_team: "DR Congo",
      bookmakers: [{ markets: [{ key: "h2h", outcomes: [
        { name: "Czech Republic", price: 2.1 }, { name: "DR Congo", price: 3.5 }, { name: "Draw", price: 3.2 },
      ] }] }] });
    const bad = event({ home_team: "Atlantis" });
    const out = normalizeOdds([ok, bad]);
    expect(out.length).toBe(1);
    expect(out[0].key).toBe(pairKey("CZE", "COD"));
  });

  it("calls the active WC sport h2h endpoint with the api key", async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => [] }));
    vi.stubGlobal("fetch", spy);
    await fetchOdds({ ODDS_API_KEY: "k" });
    const url = spy.mock.calls[0][0];
    expect(url.startsWith(`${OA_BASE}/sports/${OA_SPORT}/odds/`)).toBe(true);
    expect(url).toContain("apiKey=k");
    expect(url).toContain("markets=h2h");
  });
});
