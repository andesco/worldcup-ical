// src/cron.js
import { fetchFixtures } from "./football-data.js";
import { fetchOdds, pairKey } from "./odds-api.js";

// Join the-odds-api per-code probabilities onto football-data fixtures, producing
// the oddsMap (keyed by fixture id) that the feed consumes. Re-orients each entry
// to the fixture's own home/away.
//
// Finished fixtures are skipped, and when the same team pair appears more than
// once (a group-stage meeting plus a knockout rematch), the entry's kickoff date
// disambiguates — otherwise the upcoming game's odds would attach to both, and a
// finished match could retroactively gain a "competitive" reason.
export function joinOdds(fixtures, oddsList) {
  const idx = new Map();
  for (const o of oddsList) {
    const list = idx.get(o.key);
    if (list) list.push(o);
    else idx.set(o.key, [o]);
  }
  const oddsMap = {};
  for (const f of fixtures) {
    if (!f.home || !f.away || f.finished) continue;
    const candidates = idx.get(pairKey(f.home.code, f.away.code));
    if (!candidates) continue;
    const date = String(f.utcKickoff || "").slice(0, 10);
    const o = candidates.length === 1
      ? candidates[0]
      : candidates.find((c) => c.date === date);
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
  let changed = false;

  // Fixtures every run; only write (and bump the version) when the data actually
  // changed, so identical pulls don't bust the edge cache. Keep last good cache on failure.
  let fixtures = null;
  try {
    fixtures = await fetchFixtures(env);
    const json = JSON.stringify(fixtures);
    if (json !== (await env.WC_STORE.get("fixtures"))) {
      await env.WC_STORE.put("fixtures", json);
      changed = true;
    }
  } catch (err) {
    console.error("fixtures pull failed:", err.message);
    const cached = await env.WC_STORE.get("fixtures");
    if (cached) fixtures = JSON.parse(cached);
  }

  // Odds only at the top of the hour (the-odds-api refreshes ~hourly anyway).
  if (now.getUTCMinutes() === 0 && fixtures) {
    try {
      const oddsMap = joinOdds(fixtures, await fetchOdds(env));
      const json = JSON.stringify(oddsMap);
      if (json !== (await env.WC_STORE.get("odds"))) {
        await env.WC_STORE.put("odds", json);
        changed = true;
      }
    } catch (err) {
      console.error("odds pull failed:", err.message);
      // keep last good odds cache
    }
  }

  // A single version stamp the feed handler keys ETag + edge cache on.
  if (changed) await env.WC_STORE.put("data_version", String(now.getTime()));
}
