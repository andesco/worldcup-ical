// src/odds-api.js
// Per-match odds client for the-odds-api.com. The active WC sport key is
// `soccer_fifa_world_cup`; the h2h market gives 1X2 decimal odds per fixture.
// One call returns all currently-priced events (~1 credit of the 500/mo free tier).
import { codeForOa } from "./flags.js";
import { impliedFrom1x2 } from "./closeness.js";

export const OA_BASE = "https://api.the-odds-api.com/v4";
export const OA_SPORT = "soccer_fifa_world_cup";

// Unordered pair key so a fixture matches regardless of which source calls a
// team "home" (World Cup venues are neutral).
export function pairKey(codeA, codeB) {
  return [codeA, codeB].sort().join("|");
}

// Returns a list of { key, byCode, drawPct, date }. `byCode` maps each team's
// FIFA code to its win %, so the consumer can re-orient to its own home/away.
export function normalizeOdds(events) {
  const out = [];
  for (const e of events || []) {
    const homeCode = codeForOa(e.home_team);
    const awayCode = codeForOa(e.away_team);
    if (!homeCode || !awayCode) continue;
    const book = (e.bookmakers || [])[0];
    const market = book && (book.markets || []).find((m) => m.key === "h2h");
    if (!market) continue;
    const price = (name) => {
      const o = (market.outcomes || []).find((x) => x.name === name);
      return o ? Number(o.price) : NaN;
    };
    const h = price(e.home_team), a = price(e.away_team), d = price("Draw");
    if (!h || !d || !a) continue;
    const p = impliedFrom1x2(h, d, a);
    out.push({
      key: pairKey(homeCode, awayCode),
      byCode: { [homeCode]: p.homePct, [awayCode]: p.awayPct },
      drawPct: p.drawPct,
      date: (e.commence_time || "").slice(0, 10),
    });
  }
  return out;
}

export async function fetchOdds(env) {
  const url = `${OA_BASE}/sports/${OA_SPORT}/odds/?apiKey=${env.ODDS_API_KEY}` +
    `&regions=us&markets=h2h&oddsFormat=decimal`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`the-odds-api ${res.status}`);
  return normalizeOdds(await res.json());
}
