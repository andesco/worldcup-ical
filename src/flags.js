// src/flags.js
// Canonical 48-team table for WC 2026. `flag` is the precomputed emoji (England &
// Scotland use subdivision flags). `fd` = football-data.org team name, `oa` =
// the-odds-api team name — both used to map a provider's team back to our FIFA code
// so fixtures (football-data) and odds (the-odds-api) can be joined on `code`.
export const TEAMS = [
  { code: "ALG", name: "Algeria", flag: "🇩🇿", fd: "Algeria", oa: "Algeria" },
  { code: "ARG", name: "Argentina", flag: "🇦🇷", fd: "Argentina", oa: "Argentina" },
  { code: "AUS", name: "Australia", flag: "🇦🇺", fd: "Australia", oa: "Australia" },
  { code: "AUT", name: "Austria", flag: "🇦🇹", fd: "Austria", oa: "Austria" },
  { code: "BEL", name: "Belgium", flag: "🇧🇪", fd: "Belgium", oa: "Belgium" },
  { code: "BIH", name: "Bosnia-Herzegovina", flag: "🇧🇦", fd: "Bosnia-Herzegovina", oa: "Bosnia & Herzegovina" },
  { code: "BRA", name: "Brazil", flag: "🇧🇷", fd: "Brazil", oa: "Brazil" },
  { code: "CAN", name: "Canada", flag: "🇨🇦", fd: "Canada", oa: "Canada" },
  { code: "CPV", name: "Cape Verde Islands", flag: "🇨🇻", fd: "Cape Verde Islands", oa: "Cape Verde" },
  { code: "COL", name: "Colombia", flag: "🇨🇴", fd: "Colombia", oa: "Colombia" },
  { code: "COD", name: "Congo DR", flag: "🇨🇩", fd: "Congo DR", oa: "DR Congo" },
  { code: "CRO", name: "Croatia", flag: "🇭🇷", fd: "Croatia", oa: "Croatia" },
  { code: "CUW", name: "Curaçao", flag: "🇨🇼", fd: "Curaçao", oa: "Curaçao" },
  { code: "CZE", name: "Czechia", flag: "🇨🇿", fd: "Czechia", oa: "Czech Republic" },
  { code: "ECU", name: "Ecuador", flag: "🇪🇨", fd: "Ecuador", oa: "Ecuador" },
  { code: "EGY", name: "Egypt", flag: "🇪🇬", fd: "Egypt", oa: "Egypt" },
  { code: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fd: "England", oa: "England" },
  { code: "FRA", name: "France", flag: "🇫🇷", fd: "France", oa: "France" },
  { code: "GER", name: "Germany", flag: "🇩🇪", fd: "Germany", oa: "Germany" },
  { code: "GHA", name: "Ghana", flag: "🇬🇭", fd: "Ghana", oa: "Ghana" },
  { code: "HAI", name: "Haiti", flag: "🇭🇹", fd: "Haiti", oa: "Haiti" },
  { code: "IRN", name: "Iran", flag: "🇮🇷", fd: "Iran", oa: "Iran" },
  { code: "IRQ", name: "Iraq", flag: "🇮🇶", fd: "Iraq", oa: "Iraq" },
  { code: "CIV", name: "Ivory Coast", flag: "🇨🇮", fd: "Ivory Coast", oa: "Ivory Coast" },
  { code: "JPN", name: "Japan", flag: "🇯🇵", fd: "Japan", oa: "Japan" },
  { code: "JOR", name: "Jordan", flag: "🇯🇴", fd: "Jordan", oa: "Jordan" },
  { code: "MEX", name: "Mexico", flag: "🇲🇽", fd: "Mexico", oa: "Mexico" },
  { code: "MAR", name: "Morocco", flag: "🇲🇦", fd: "Morocco", oa: "Morocco" },
  { code: "NED", name: "Netherlands", flag: "🇳🇱", fd: "Netherlands", oa: "Netherlands" },
  { code: "NZL", name: "New Zealand", flag: "🇳🇿", fd: "New Zealand", oa: "New Zealand" },
  { code: "NOR", name: "Norway", flag: "🇳🇴", fd: "Norway", oa: "Norway" },
  { code: "PAN", name: "Panama", flag: "🇵🇦", fd: "Panama", oa: "Panama" },
  { code: "PAR", name: "Paraguay", flag: "🇵🇾", fd: "Paraguay", oa: "Paraguay" },
  { code: "POR", name: "Portugal", flag: "🇵🇹", fd: "Portugal", oa: "Portugal" },
  { code: "QAT", name: "Qatar", flag: "🇶🇦", fd: "Qatar", oa: "Qatar" },
  { code: "KSA", name: "Saudi Arabia", flag: "🇸🇦", fd: "Saudi Arabia", oa: "Saudi Arabia" },
  { code: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", fd: "Scotland", oa: "Scotland" },
  { code: "SEN", name: "Senegal", flag: "🇸🇳", fd: "Senegal", oa: "Senegal" },
  { code: "RSA", name: "South Africa", flag: "🇿🇦", fd: "South Africa", oa: "South Africa" },
  { code: "KOR", name: "South Korea", flag: "🇰🇷", fd: "South Korea", oa: "South Korea" },
  { code: "ESP", name: "Spain", flag: "🇪🇸", fd: "Spain", oa: "Spain" },
  { code: "SWE", name: "Sweden", flag: "🇸🇪", fd: "Sweden", oa: "Sweden" },
  { code: "SUI", name: "Switzerland", flag: "🇨🇭", fd: "Switzerland", oa: "Switzerland" },
  { code: "TUN", name: "Tunisia", flag: "🇹🇳", fd: "Tunisia", oa: "Tunisia" },
  { code: "TUR", name: "Turkey", flag: "🇹🇷", fd: "Turkey", oa: "Turkey" },
  { code: "USA", name: "United States", flag: "🇺🇸", fd: "United States", oa: "USA" },
  { code: "URY", name: "Uruguay", flag: "🇺🇾", fd: "Uruguay", oa: "Uruguay" },
  { code: "UZB", name: "Uzbekistan", flag: "🇺🇿", fd: "Uzbekistan", oa: "Uzbekistan" },
];

const BY_CODE = new Map(TEAMS.map((t) => [t.code, t]));
const BY_FD = new Map(TEAMS.map((t) => [t.fd, t]));
const BY_OA = new Map(TEAMS.map((t) => [t.oa, t]));

export function flagFor(code) {
  const t = BY_CODE.get(code);
  return t ? t.flag : "🏳️"; // white flag for unknown
}

export function nameFor(code) {
  const t = BY_CODE.get(code);
  return t ? t.name : code;
}

// Map a football-data.org team name to our FIFA code (null if unknown/TBD).
export function codeForFd(fdName) {
  const t = fdName ? BY_FD.get(fdName) : null;
  return t ? t.code : null;
}

// Map a the-odds-api team name to our FIFA code (null if unknown).
export function codeForOa(oaName) {
  const t = oaName ? BY_OA.get(oaName) : null;
  return t ? t.code : null;
}
