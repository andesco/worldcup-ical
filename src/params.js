// src/params.js
function posInt(raw) {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseFeedParams(searchParams) {
  const teams = new Set(
    (searchParams.get("teams") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
  const rank = posInt(searchParams.get("rank"));
  const competitive = posInt(searchParams.get("competitive"));
  const knockout = searchParams.has("knockout");
  const hostOpeners = searchParams.has("openers");
  const hasAnyRule =
    teams.size > 0 || rank !== null || competitive !== null || knockout || hostOpeners;
  return { teams, rank, competitive, knockout, hostOpeners, hasAnyRule };
}
