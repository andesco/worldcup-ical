import { codeForFd, codeForOa, nameFor } from "./flags.js";

export const BBC_SCHEDULE_URL =
  "https://www.bbc.com/sport/football/world-cup/schedule";

function codeForBbc(name) {
  return codeForFd(name) || codeForOa(name);
}

function initialData(html) {
  const match = String(html).match(
    /window\.__INITIAL_DATA__=("(?:\\.|[^"\\])*")/
  );
  if (!match) throw new Error("BBC initial data not found");
  return JSON.parse(JSON.parse(match[1]));
}

function bbcTeam(team) {
  const code = codeForBbc(team && team.name && team.name.fullName);
  if (!code) return null;
  return {
    code,
    name: nameFor(code),
    official: team.name.code === code,
  };
}

export function parseBbcKnockout(html) {
  const data = initialData(html);
  const containerKey = Object.keys(data.data || {}).find((key) =>
    key.startsWith("football-world-cup-2022?")
  );
  const tournament = containerKey && data.data[containerKey];
  const knockout = tournament &&
    tournament.data &&
    tournament.data.knockoutStage;
  if (!knockout) throw new Error("BBC knockout data not found");

  const matches = (knockout.preFinalRounds || [])
    .flatMap((round) => round.matches || []);
  if (knockout.thirdPlacePlayoff && knockout.thirdPlacePlayoff.match) {
    matches.push(knockout.thirdPlacePlayoff.match);
  }
  if (knockout.final && knockout.final.match) {
    matches.push(knockout.final.match);
  }

  const out = {};
  for (const match of matches) {
    const event = match.event || {};
    if (!event.date || !event.date.iso || !Array.isArray(event.teams)) continue;
    const home = event.teams.find((team) => team.alignment === "home");
    const away = event.teams.find((team) => team.alignment === "away");
    out[event.date.iso] = {
      home: bbcTeam(home),
      away: bbcTeam(away),
    };
  }
  return out;
}

export async function fetchBbcKnockout() {
  const res = await fetch(BBC_SCHEDULE_URL, {
    headers: { "User-Agent": "worldcup-ical/1.0" },
  });
  if (!res.ok) throw new Error(`BBC schedule ${res.status}`);
  return parseBbcKnockout(await res.text());
}

export function applyBbcKnockout(fixtures, bbcMap, projections = false) {
  return fixtures.map((fixture) => {
    if (!fixture.knockout) return fixture;
    const bbc = bbcMap[fixture.utcKickoff];
    if (!bbc) return fixture;

    const eligible = (side) =>
      side && (side.official || projections)
        ? { code: side.code, name: side.name }
        : null;
    return {
      ...fixture,
      home: fixture.home || eligible(bbc.home),
      away: fixture.away || eligible(bbc.away),
    };
  });
}
