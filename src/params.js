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
  const topx = posInt(searchParams.get("topx"));
  const close = posInt(searchParams.get("close"));
  const hasAnyRule = teams.size > 0 || topx !== null || close !== null;
  return { teams, topx, close, hasAnyRule };
}
