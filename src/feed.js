// src/feed.js
import { evaluateMatch } from "./selection.js";
import { buildVEvent, buildCalendar } from "./ics.js";

export function selectMatches(fixtures, oddsMap, config) {
  const out = [];
  for (const fixture of fixtures) {
    const odds = oddsMap[String(fixture.id)] || null;
    const { included, reasons } = evaluateMatch(fixture, odds, config);
    if (included) out.push({ fixture, odds, reasons });
  }
  return out;
}

export function buildFeed(fixtures, oddsMap, config) {
  const selected = selectMatches(fixtures, oddsMap, config);
  const events = selected.map(buildVEvent);
  return buildCalendar(events);
}
