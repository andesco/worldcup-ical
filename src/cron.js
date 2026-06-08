// src/cron.js
import { fetchFixtures, fetchOddsForDate } from "./api-football.js";

export function datesNext48h(fixtures, now) {
  const end = now.getTime() + 48 * 3600 * 1000;
  const set = new Set();
  for (const f of fixtures) {
    const t = Date.parse(f.utcKickoff);
    if (t >= now.getTime() && t <= end) set.add(f.utcKickoff.slice(0, 10));
  }
  return [...set].sort();
}

export async function handleScheduled(event, env) {
  const now = new Date(event.scheduledTime);

  // Fixtures every run. On failure, leave the last good cache untouched.
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

  // Odds only at the top of the hour (gates ~hourly inside the 30-min cron).
  if (now.getUTCMinutes() === 0 && fixtures) {
    try {
      const merged = {};
      for (const date of datesNext48h(fixtures, now)) {
        Object.assign(merged, await fetchOddsForDate(env, date));
      }
      await env.WC_STORE.put("odds", JSON.stringify(merged));
      await env.WC_STORE.put("odds_lastupdate", String(now.getTime()));
    } catch (err) {
      console.error("odds pull failed:", err.message);
      // keep last good odds cache
    }
  }
}
