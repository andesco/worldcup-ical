// src/ics.js
import { flagFor } from "./flags.js";

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

// Fold to <=73 chars per line on codepoint boundaries (avoids splitting emoji),
// continuation lines start with a single space. CRLF line breaks per RFC5545.
export function foldLine(line) {
  const chars = [...line];
  if (chars.length <= 73) return line;
  const out = [];
  let i = 0;
  while (i < chars.length) {
    const take = i === 0 ? 73 : 72;
    const chunk = chars.slice(i, i + take).join("");
    out.push(i === 0 ? chunk : " " + chunk);
    i += take;
  }
  return out.join("\r\n");
}

export function matchSummary(fixture) {
  const { home, away, stage } = fixture;
  const hn = home ? `${flagFor(home.code)} ${home.name}` : "TBD";
  const an = away ? `${flagFor(away.code)} ${away.name}` : "TBD";
  return `${hn} vs. ${an} — ${stage}`;
}

// SEQUENCE increases monotonically as a fixture firms up: TBD=0, scheduled=1, finished=2.
function sequenceFor(fixture) {
  if (fixture.finished) return 2;
  return fixture.home && fixture.away ? 1 : 0;
}

function descriptionFor(fixture, odds, reasons) {
  const lines = [`Included: ${reasons.join("; ")}`];
  if (odds) lines.push(`Win probability: ${fixture.home.name} ${odds.homePct}% / Draw ${odds.drawPct}% / ${fixture.away.name} ${odds.awayPct}%`);
  if (fixture.finished && fixture.score) {
    lines.push(`Final: ${fixture.home.name} ${fixture.score.home}-${fixture.score.away} ${fixture.away.name}`);
  }
  return lines.join("\n");
}

export function buildVEvent({ fixture, odds, reasons }) {
  const start = icsDate(fixture.utcKickoff);
  const end = icsDate(new Date(Date.parse(fixture.utcKickoff) + 2 * 3600 * 1000).toISOString());
  const lines = [
    "BEGIN:VEVENT",
    `UID:wc2026-${fixture.id}@worldcup.andrewe.dev`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SEQUENCE:${sequenceFor(fixture)}`,
    foldLine(`SUMMARY:${escapeText(matchSummary(fixture))}`),
  ];
  if (fixture.venue && fixture.venue.name) {
    const loc = fixture.venue.city
      ? `${fixture.venue.name}, ${fixture.venue.city}`
      : fixture.venue.name;
    lines.push(foldLine(`LOCATION:${escapeText(loc)}`));
  }
  lines.push(foldLine(`DESCRIPTION:${escapeText(descriptionFor(fixture, odds, reasons))}`));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function buildCalendar(vevents) {
  const head = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//andrewe//worldcup-ical//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:World Cup 2026",
  ];
  return [...head, ...vevents, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
