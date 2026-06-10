// src/ics.js
import { flagFor } from "./flags.js";
import { catalog, probabilityLines, stageName, teamName } from "./localization.js";

export function icsDate(iso) {
  // "2026-06-11T20:00:00Z" or "...T20:00:00.000Z" -> "20260611T200000Z"
  return iso.replace(/\.\d+Z$/, "Z").replace(/[-:]/g, "");
}

export function escapeText(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Fold to <=75 OCTETS per line (RFC 5545 measures bytes, not characters) on
// codepoint boundaries (avoids splitting emoji — a flag is 8 bytes in UTF-8),
// continuation lines start with a single space. CRLF line breaks per RFC5545.
const UTF8 = new TextEncoder();
export function foldLine(line) {
  if (UTF8.encode(line).length <= 75) return line;
  const out = [];
  let current = "";
  let bytes = 0;
  let budget = 75; // continuation lines spend 1 octet on the leading space
  for (const ch of line) { // for..of iterates codepoints, never half a surrogate pair
    const w = UTF8.encode(ch).length;
    if (bytes + w > budget) {
      out.push(out.length === 0 ? current : " " + current);
      current = ch;
      bytes = w;
      budget = 74;
    } else {
      current += ch;
      bytes += w;
    }
  }
  out.push(out.length === 0 ? current : " " + current);
  return out.join("\r\n");
}

// One side of a matchup. Flags bookend the match (home: flag-then-label,
// away: label-then-flag). Falls back to the bracket slot code (e.g. "A1", "X3")
// when the team is undecided, or null when there's no slot either.
function sideLabel(team, slot, side, opts) {
  if (team) {
    const label = opts.code ? team.code : teamName(team.code, opts.lang, team.name);
    if (!opts.flags) return label;
    const f = flagFor(team.code);
    return side === "home" ? `${f} ${label}` : `${label} ${f}`;
  }
  return slot || null;
}

// opts: { flags (default true), code (default false: full name vs FIFA 3-letter) }
export function matchSummary(fixture, opts = {}) {
  const o = { flags: true, code: false, lang: "en", ...opts };
  const c = catalog(o.lang);
  const { home, away, stage } = fixture;
  const h = sideLabel(home, fixture.slotHome, "home", o);
  const a = sideLabel(away, fixture.slotAway, "away", o);
  if (!fixture.knockout) {
    return `${h || c.feed.tbd} ${c.feed.versus} ${a || c.feed.tbd}`;
  }
  // Knockout: never append the round as a suffix. R32 shows slot codes; later
  // rounds with undecided teams fall back to just the round name.
  if (h && a) return `${h} ${c.feed.versus} ${a}`;
  return stageName(stage, o.lang);
}

// SEQUENCE increases monotonically as a fixture firms up: TBD=0, scheduled=1, finished=2.
function sequenceFor(fixture) {
  if (fixture.finished) return 2;
  return fixture.home && fixture.away ? 1 : 0;
}

function descriptionFor(fixture, odds, opts) {
  const c = catalog(opts.lang);
  const lines = [];
  const home = fixture.home && teamName(fixture.home.code, opts.lang, fixture.home.name);
  const away = fixture.away && teamName(fixture.away.code, opts.lang, fixture.away.name);
  if (!fixture.knockout) {
    lines.push(`${stageName(fixture.stage, opts.lang)}: ${home || c.feed.tbd} ${c.feed.versus} ${away || c.feed.tbd}`);
  }
  lines.push(...probabilityLines(fixture, odds, opts.lang));
  if (fixture.finished && fixture.score) {
    lines.push(`${c.feed.final}: ${home} ${fixture.score.home}-${fixture.score.away} ${away}`);
  }
  return lines.join("\n");
}

function textProperty(name, value, lang) {
  const language = lang && lang !== "en" ? `;LANGUAGE=${lang}` : "";
  return foldLine(`${name}${language}:${escapeText(value)}`);
}

export function buildVEvent({ fixture, odds, reasons, opts = {} }) {
  const o = { flags: true, code: false, lang: "en", ...opts };
  const start = icsDate(fixture.utcKickoff);
  const end = icsDate(new Date(Date.parse(fixture.utcKickoff) + 2 * 3600 * 1000).toISOString());
  const lines = [
    "BEGIN:VEVENT",
    `UID:wc2026-${fixture.id}@worldcup.andrewe.ca`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SEQUENCE:${sequenceFor(fixture)}`,
    textProperty("SUMMARY", matchSummary(fixture, o), o.lang),
  ];
  if (fixture.venue && fixture.venue.name) {
    const loc = fixture.venue.city
      ? `${fixture.venue.name}, ${fixture.venue.city}`
      : fixture.venue.name;
    lines.push(foldLine(`LOCATION:${escapeText(loc)}`));
  }
  const description = descriptionFor(fixture, odds, o);
  if (description) lines.push(textProperty("DESCRIPTION", description, o.lang));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function buildCalendar(vevents, opts = {}) {
  const lang = opts.lang || "en";
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//andrewe//worldcup-ical//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    textProperty("X-WR-CALNAME", catalog(lang).feed.calendarName, lang),
  ];
  return [...head, ...vevents, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
