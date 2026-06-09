// src/football-data.js
// Fixtures client for football-data.org (free tier covers FIFA World Cup).
// Auth: HTTP header "X-Auth-Token". The full schedule (incl. knockout bracket,
// filled in as results land) is competitions/WC/matches?season=2026.
import { codeForFd, nameFor } from "./flags.js";

export const FD_BASE = "https://api.football-data.org/v4";

const STAGE_LABELS = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-final",
  SEMI_FINALS: "Semi-final",
  THIRD_PLACE: "Third-place play-off",
  FINAL: "Final",
};

// "GROUP_A" -> "Group A"; knockout stages use STAGE_LABELS.
export function stageLabel(stage, group) {
  if (stage === "GROUP_STAGE" && group) {
    return "Group " + group.replace(/^GROUP_/, "");
  }
  return STAGE_LABELS[stage] || stage;
}

function team(apiTeam) {
  const code = codeForFd(apiTeam && apiTeam.name);
  return code ? { code, name: nameFor(code) } : null; // null = TBD knockout slot
}

export function normalizeFixtures(json) {
  return (json.matches || []).map((m) => {
    const finished = m.status === "FINISHED";
    const ft = (m.score && m.score.fullTime) || {};
    return {
      id: m.id,
      utcKickoff: m.utcDate, // already ISO 8601 Z
      status: m.status,
      finished,
      stage: stageLabel(m.stage, m.group),
      venue: null, // football-data free tier does not expose venue
      home: team(m.homeTeam),
      away: team(m.awayTeam),
      score: finished && ft.home != null ? { home: ft.home, away: ft.away } : null,
    };
  });
}

export async function fetchFixtures(env) {
  const res = await fetch(`${FD_BASE}/competitions/WC/matches?season=2026`, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_TOKEN },
  });
  if (!res.ok) throw new Error(`football-data ${res.status}`);
  return normalizeFixtures(await res.json());
}
