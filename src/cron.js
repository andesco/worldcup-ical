// src/cron.js
import { fetchFixtures } from "./football-data.js";
import { fetchOdds, pairKey } from "./odds-api.js";

// Join the-odds-api per-code probabilities onto football-data fixtures, producing
// the oddsMap (keyed by fixture id) that the feed consumes. Re-orients each entry
// to the fixture's own home/away.
export function joinOdds(fixtures, oddsList) {
  const idx = new Map(oddsList.map((o) => [o.key, o]));
  const oddsMap = {};
  for (const f of fixtures) {
    if (!f.home || !f.away) continue;
    const o = idx.get(pairKey(f.home.code, f.away.code));
    if (!o) continue;
    oddsMap[String(f.id)] = {
      homePct: o.byCode[f.home.code],
      drawPct: o.drawPct,
      awayPct: o.byCode[f.away.code],
    };
  }
  return oddsMap;
}

export async function handleScheduled(event, env) {
  const now = new Date(event.scheduledTime);

  // Fixtures every run; keep last good cache on failure.
  let fixtures = null;
  try {
    fixtures = await fetchFixtures(env);
    await env.WC_STORE.put("fixtures", JSON.stringify(fixtures));
    await env.WC_STORE.put("fixtures_lastupdate", String(now.getTime()));
  } catch (err) {
    console.error("fixtures pull failed:", err.message);
    const cached = await env.WC_STORE.get("fixtures");
    if (cached) fixtures = JSON.parse(cached);
  }

  // Odds only at the top of the hour (the-odds-api refreshes ~hourly anyway).
  if (now.getUTCMinutes() === 0 && fixtures) {
    try {
      const oddsList = await fetchOdds(env);
      const oddsMap = joinOdds(fixtures, oddsList);
      await env.WC_STORE.put("odds", JSON.stringify(oddsMap));
      await env.WC_STORE.put("odds_lastupdate", String(now.getTime()));
    } catch (err) {
      console.error("odds pull failed:", err.message);
      // keep last good odds cache
    }
  }
}
