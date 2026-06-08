// src/flags.js
// Canonical team table. `api` is the API-Football team name (for reverse mapping).
// Populated with the outright-snapshot teams + the three hosts. Remaining qualified
// nations are added later following the exact same row shape.
export const TEAMS = [
  { code: "ESP", name: "Spain",       iso2: "ES", api: "Spain" },
  { code: "FRA", name: "France",      iso2: "FR", api: "France" },
  { code: "ENG", name: "England",     iso2: "GB", api: "England" },
  { code: "BRA", name: "Brazil",      iso2: "BR", api: "Brazil" },
  { code: "POR", name: "Portugal",    iso2: "PT", api: "Portugal" },
  { code: "ARG", name: "Argentina",   iso2: "AR", api: "Argentina" },
  { code: "GER", name: "Germany",     iso2: "DE", api: "Germany" },
  { code: "NED", name: "Netherlands", iso2: "NL", api: "Netherlands" },
  { code: "NOR", name: "Norway",      iso2: "NO", api: "Norway" },
  { code: "BEL", name: "Belgium",     iso2: "BE", api: "Belgium" },
  { code: "COL", name: "Colombia",    iso2: "CO", api: "Colombia" },
  { code: "URU", name: "Uruguay",     iso2: "UY", api: "Uruguay" },
  { code: "USA", name: "USA",         iso2: "US", api: "USA" },
  { code: "CAN", name: "Canada",      iso2: "CA", api: "Canada" },
  { code: "MEX", name: "Mexico",      iso2: "MX", api: "Mexico" },
];

const BY_CODE = new Map(TEAMS.map((t) => [t.code, t]));
const BY_API = new Map(TEAMS.map((t) => [t.api, t]));

export function flagEmoji(iso2) {
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function flagFor(code) {
  const t = BY_CODE.get(code);
  return t ? flagEmoji(t.iso2) : "🏳️";
}

export function nameFor(code) {
  const t = BY_CODE.get(code);
  return t ? t.name : code;
}

export function codeForApiName(apiName) {
  const t = BY_API.get(apiName);
  return t ? t.code : null;
}
