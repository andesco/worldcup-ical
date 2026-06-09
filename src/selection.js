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
    reasons.push("knockout game");
  }

  if (haveTeams && config.teams.size > 0 &&
      (config.teams.has(home.code) || config.teams.has(away.code))) {
    reasons.push("favourite team");
  }

  if (haveTeams && config.rank != null &&
      inTopX(home.code, config.rank) && inTopX(away.code, config.rank)) {
    reasons.push("big game");
  }

  if (haveTeams && config.competitive != null && odds) {
    if (competitiveGap(odds) <= config.competitive) {
      reasons.push(`competitive game (${odds.homePct}% / ${odds.awayPct}%, draw ${odds.drawPct}%)`);
    }
  }

  return { included: reasons.length > 0, reasons };
}
