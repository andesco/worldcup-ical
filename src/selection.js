// src/selection.js
import { inTopX } from "./odds-snapshot.js";
import { closenessGap } from "./closeness.js";

// Apply the three OR'd rules to one fixture. `odds` is the normalised
// { homePct, drawPct, awayPct } for this fixture, or null if unavailable.
export function evaluateMatch(fixture, odds, config) {
  const reasons = [];
  const { home, away } = fixture;
  const haveTeams = !!home && !!away; // TBD knockout slots can't satisfy any rule

  if (haveTeams && config.teams.size > 0 &&
      (config.teams.has(home.code) || config.teams.has(away.code))) {
    reasons.push("favourite team");
  }

  if (haveTeams && config.topx != null &&
      inTopX(home.code, config.topx) && inTopX(away.code, config.topx)) {
    reasons.push("big game");
  }

  if (haveTeams && config.close != null && odds) {
    if (closenessGap(odds) <= config.close) {
      reasons.push(`close game (${odds.homePct}% / ${odds.awayPct}%, draw ${odds.drawPct}%)`);
    }
  }

  return { included: reasons.length > 0, reasons };
}
