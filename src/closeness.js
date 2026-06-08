// src/closeness.js
// Convert decimal 1X2 odds to implied probabilities, remove the bookmaker's
// overround (vig) by normalising to 100, and round to integer percentages.
export function impliedFrom1x2(homeDec, drawDec, awayDec) {
  const h = 1 / homeDec, d = 1 / drawDec, a = 1 / awayDec;
  const sum = h + d + a;
  const homePct = Math.round((h / sum) * 100);
  const drawPct = Math.round((d / sum) * 100);
  const awayPct = 100 - homePct - drawPct; // absorb rounding so the trio sums to 100
  return { homePct, drawPct, awayPct };
}

// "Closeness" of a fixture: the gap between the two sides' win probabilities.
// Smaller gap = more evenly matched.
export function closenessGap({ homePct, awayPct }) {
  return Math.abs(homePct - awayPct);
}
