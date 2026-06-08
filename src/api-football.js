// src/api-football.js
import { codeForApiName } from "./flags.js";
import { impliedFrom1x2 } from "./closeness.js";

export const AF_BASE = "https://v3.football.api-sports.io";
const FINISHED = new Set(["FT", "AET", "PEN"]);

function headers(env) {
  return { "x-apisports-key": env.API_FOOTBALL_KEY };
}

async function getJson(url, env) {
  const res = await fetch(url, { headers: headers(env) });
  if (!res.ok) throw new Error(`API-Football ${res.status} for ${url}`);
  return res.json();
}

function team(apiTeam) {
  if (!apiTeam || !apiTeam.name) return null;
  const code = codeForApiName(apiTeam.name);
  return code ? { code, name: apiTeam.name } : null; // unmapped -> treat as TBD
}

export function normalizeFixtures(json) {
  return (json.response || []).map((r) => {
    const finished = FINISHED.has(r.fixture.status.short);
    const goals = r.goals || {};
    return {
      id: r.fixture.id,
      utcKickoff: new Date(r.fixture.date).toISOString().replace(/\.\d+Z$/, "Z"),
      status: r.fixture.status.short,
      finished,
      stage: r.league.round,
      venue: { name: r.fixture.venue?.name || "TBD", city: r.fixture.venue?.city || "" },
      home: team(r.teams.home),
      away: team(r.teams.away),
      score: finished && goals.home != null ? { home: goals.home, away: goals.away } : null,
    };
  });
}

export async function fetchFixtures(env) {
  const json = await getJson(`${AF_BASE}/fixtures?league=1&season=2026`, env);
  return normalizeFixtures(json);
}

export function normalizeOdds(json) {
  const out = {};
  for (const r of json.response || []) {
    const book = r.bookmakers?.[0];
    const bet = book?.bets?.find((b) => b.id === 1); // Match Winner
    if (!bet) continue;
    const get = (v) => Number(bet.values.find((x) => x.value === v)?.odd);
    const h = get("Home"), d = get("Draw"), a = get("Away");
    if (!h || !d || !a) continue;
    out[String(r.fixture.id)] = impliedFrom1x2(h, d, a);
  }
  return out;
}

export async function fetchOddsForDate(env, dateStr) {
  const book = env.ODDS_BOOKMAKER || "8";
  const url = `${AF_BASE}/odds?league=1&season=2026&bet=1&bookmaker=${book}&date=${dateStr}`;
  return normalizeOdds(await getJson(url, env));
}
