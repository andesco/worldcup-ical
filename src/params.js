// src/params.js
import { resolveLocale } from "./localization.js";

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
  const bbc = searchParams.get("bbc") === "1";
  const hostOpeners = searchParams.has("openers");
  // Display options (not selection rules): flags on by default, FIFA code off.
  const flags = searchParams.get("flags") !== "0";
  const code = searchParams.get("code") === "1";
  const lang = resolveLocale(searchParams.get("lang")) || "en";
  return { teams, rank, competitive, knockout, bbc, hostOpeners, flags, code, lang };
}
