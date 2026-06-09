// src/r32-bracket.js
// Official 2026 Round-of-32 slot pairings, keyed by the fixture's UTC kickoff
// (football-data exposes no slot info for undecided knockout games). Codes are
// letter-first: "A1" = Group A winner, "C2" = Group C runner-up. The eight
// third-place slots are shown simply as "X3" (which group's third lands there
// isn't fixed until the group stage ends).
// Sourced from the FIFA / Wikipedia knockout schedule (Matches 73–88).
export const R32_SLOTS = {
  "2026-06-28T19:00:00Z": { home: "A2", away: "B2" }, // M73
  "2026-06-29T17:00:00Z": { home: "C1", away: "F2" }, // M76
  "2026-06-29T20:30:00Z": { home: "E1", away: "X3" }, // M74
  "2026-06-30T01:00:00Z": { home: "F1", away: "C2" }, // M75
  "2026-06-30T17:00:00Z": { home: "E2", away: "I2" }, // M78
  "2026-06-30T21:00:00Z": { home: "I1", away: "X3" }, // M77
  "2026-07-01T01:00:00Z": { home: "A1", away: "X3" }, // M79
  "2026-07-01T16:00:00Z": { home: "L1", away: "X3" }, // M80
  "2026-07-01T20:00:00Z": { home: "G1", away: "X3" }, // M82
  "2026-07-02T00:00:00Z": { home: "D1", away: "X3" }, // M81
  "2026-07-02T19:00:00Z": { home: "H1", away: "J2" }, // M84
  "2026-07-02T23:00:00Z": { home: "K2", away: "L2" }, // M83
  "2026-07-03T03:00:00Z": { home: "B1", away: "X3" }, // M85
  "2026-07-03T18:00:00Z": { home: "D2", away: "G2" }, // M88
  "2026-07-03T22:00:00Z": { home: "J1", away: "H2" }, // M86
  "2026-07-04T01:30:00Z": { home: "K1", away: "X3" }, // M87
};

export function r32Slots(utcKickoff) {
  return R32_SLOTS[utcKickoff] || null;
}
