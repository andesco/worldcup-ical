// src/odds-snapshot.js
// Manual, dated snapshot of outright World Cup winner odds (shortest odds = rank 1).
// API-Football has no futures market; tournament-winner odds move slowly, so a
// snapshot is acceptable. Refresh by editing this list + SNAPSHOT_DATE, then redeploy.
export const SNAPSHOT_DATE = "2026-06-07";

export const OUTRIGHT_RANKING = [
  "ESP", "FRA", "ENG", "BRA", "POR", "ARG",
  "GER", "NED", "NOR", "BEL", "COL", "URU",
];

export function outrightRank(code) {
  const i = OUTRIGHT_RANKING.indexOf(code);
  return i === -1 ? Infinity : i + 1;
}

export function inTopX(code, x) {
  return outrightRank(code) <= x;
}
