// src/selection.js
import { inTopX } from "./odds-snapshot.js";
import { competitiveGap } from "./competitive.js";

// Apply the three OR'd rules to one fixture. `odds` is the normalised
// { homePct, drawPct, awayPct } for this fixture, or null if unavailable.
export function evaluateMatch(fixture, odds, config) {
  const reasons = [];
  const { home, away } = fixture;
  const haveTeams = !!home && !!away; // team-based rules can't judge TBD slots

  // Knockout rule includes every knockout fixture, even before its teams are
  // decided (so all 32 slots land on the calendar).
  if (config.knockout && fixture.knockout) {
    reasons.push({ id: "knockout" });
  }

  if (config.hostOpeners && fixture.hostOpener) {
    reasons.push({ id: "hostOpener" });
  }

  if (haveTeams && config.teams.size > 0 &&
      (config.teams.has(home.code) || config.teams.has(away.code))) {
    reasons.push({ id: "favourite" });
  }

  if (haveTeams && config.rank != null &&
      inTopX(home.code, config.rank) && inTopX(away.code, config.rank)) {
    reasons.push({ id: "bigGame" });
  }

  if (haveTeams && config.competitive != null && odds) {
    if (competitiveGap(odds) <= config.competitive) {
      reasons.push({
        id: "competitive",
        values: { home: odds.homePct, away: odds.awayPct, draw: odds.drawPct },
      });
    }
  }

  return { included: reasons.length > 0, reasons };
}
