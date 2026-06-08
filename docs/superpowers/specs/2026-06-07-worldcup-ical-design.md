# World Cup iCal — Design Spec

**Date:** 2026-06-07
**Status:** Approved design, pre-implementation
**Deploy target:** `worldcup.andrewe.dev` (Cloudflare Worker)

## Purpose

A bespoke iCal (`.ics`) subscription service for the 2026 FIFA World Cup
(June 11 – July 19, 2026, hosted USA/Canada/Mexico). A user builds a personal
feed that includes matches according to a set of toggleable rules: their
favourite teams, "big games" between top-ranked teams, and "close games" that
the live model rates as evenly matched. The feed is a standard calendar
subscription URL that updates itself as the tournament unfolds (group results
resolving the knockout bracket, odds shifting).

## Background / context

This follows the user's established pattern (calsnap, teamsnap-custom-calendar,
ical-proxy): a single Cloudflare Worker + KV + cron trigger that serves `.ics`.
The World Cup feed reuses that shape.

## Data sources

| Data | Source | Liveness | Notes |
|---|---|---|---|
| **Fixtures / bracket** | API-Football (api-sports.io), `league=1&season=2026` | Live, polled | All 104 matches; knockout matchups fill in as group results land. |
| **Per-fixture closeness** | API-Football `/odds` Match Winner (bet=1), single reference bookmaker | Live, polled | Source refreshes ~every 3h. Closeness derived from 1X2 implied probability gap. |
| **Outright winner ranking** ("big game" top-X) | Manual dated snapshot baked into repo | Static, manually refreshable | API-Football has **no** outright/futures market. Tournament-winner odds move slowly, so a snapshot is acceptable. |

### API-Football specifics
- Free tier: **100 requests/day**, resets 00:00 UTC.
- World Cup 2026 = `league=1&season=2026`. `fixtures?league=1&season=2026` returns
  the full schedule incl. venues and bracket placeholders.
- Odds: available 1–14 days before a fixture, server-refresh ~every 3h, only last
  7 days retained (irrelevant — we cache the latest in KV).
- Requires a free API key (one-time signup), stored as a Worker secret.

### Outright odds snapshot (captured 2026-06-07)
Consensus pre-tournament outright winner odds, ordered (shortest odds = rank 1):

| Rank | Team | Decimal | Implied % |
|---|---|---|---|
| 1 | Spain | 5.50 | ~18% |
| 2 | France | 5.75 | ~17% |
| 3 | England | 7.50 | ~13% |
| 4 | Brazil | 9.50 | ~11% |
| 5 | Portugal | 9.50 | ~11% |
| 6 | Argentina | 10.0 | ~10% |
| 7 | Germany | 15.0 | ~7% |
| 8 | Netherlands | 21.0 | ~5% |
| 9 | Norway | 36.0 | ~3% |
| 10 | Belgium | 41.0 | ~2.4% |
| 11 | Colombia | 41.0 | ~2.4% |
| 12 | Uruguay | 51.0 | ~2% |

Stored as a dated static module; refreshed by editing + redeploy. The list is
extendable beyond 12 if a feed sets a larger X (ranks beyond the snapshot are
treated as "not top-X").

## Architecture

Single Cloudflare Worker, new repo `~/Developer/worldcup-ical`, deployed to
`worldcup.andrewe.dev`. KV namespace bound for caching + per-feed config.

### Routes
- `GET /` — settings UI (build / edit a feed)
- `GET /api/preview?<params>` — return matches that currently qualify for the given params (UI live preview)
- `GET /feed.ics?<params>` — the calendar; **stateless** — config is read entirely from the URL; reads cached data only, **0 API calls**

### KV keys
KV holds only shared cached data — there is **no per-feed server state**.
- `fixtures` — shared fixture dataset (all feeds read this)
- `odds` — per-fixture closeness data (implied probs / win%)
- `fixtures_lastupdate`, `odds_lastupdate` — timestamps for ETag / 304 handling

### Feed config = URL params (stateless, public, standard)
The feed is fully described by its URL — portable, human-editable, no stored IDs.
Each rule is enabled by the presence of its param:

```
/feed.ics?teams=ESP,CAN,ARG&topx=8&close=10
```

| Param | Meaning | Rule enabled when |
|---|---|---|
| `teams` | comma-separated FIFA 3-letter codes | present & non-empty → Favourites on |
| `topx`  | integer X | present → Big-game on (both teams ∈ top-X) |
| `close` | integer threshold in pts | present → Close-game on (`|home%−away%| ≤ close`) |

Omitting a param disables that rule. A feed with no recognised params is empty
(or returns all matches — decide in planning; default: empty). Param parsing is
the single source of truth; the UI is just a builder/parser for this URL.

## Data pipeline (cron → KV)

One cron over an 18-hour daily window (7AM–1AM Pacific; June–July 2026 is all
PDT = UTC−7, no DST crossing). Fixtures and odds are decoupled because odds only
change ~every 3h server-side.

```
*/30 14-23,0-7 * * *    # fixtures: every 30 min, 7AM–1AM PDT
0    14-23,0-7 * * *    # odds:     every hour,   7AM–1AM PDT
```

| Data | Cadence | Runs/day | Req/run | Req/day |
|---|---|---|---|---|
| Fixtures | every 30 min | 36 | 1 | 36 |
| Odds (bet=1, 1 bookmaker, next 48h) | every hour | 18 | ~2 | ~36 |
| | | | **Total** | **~72/day** (under 100) |

Implementation note: a single 30-min scheduled handler may be used instead of
two cron lines — always pull fixtures; pull odds only on the top of the hour.
Either approach must stay within the ~72/day budget.

The scheduled handler:
1. `GET fixtures?league=1&season=2026` → write `fixtures` + `fixtures_lastupdate`.
2. (hourly only) For each date in the next 48h with fixtures, `GET /odds?league=1&season=2026&bet=1&bookmaker=<ref>&date=<d>` → derive per-fixture implied probs → write `odds` + `odds_lastupdate`.

API quota is constant regardless of subscriber count (1 or 1,000,000 feeds).

## Selection logic

A match is **included** if **any enabled rule** matches (rules OR'd):

1. **Favourites** — either team ∈ the feed's favourites list.
2. **Big game** — *both* teams ∈ top-X of the outright ranking (X per feed).
3. **Close game** — `abs(home% − away%) ≤ thresholdPts` using the latest cached
   per-fixture model, once odds for that fixture exist.

Knockout fixtures with TBD/placeholder teams (e.g. "Winner Group A") cannot
satisfy any rule yet; they are re-evaluated automatically once the cron resolves
real teams. A fixture may match multiple rules; it appears once, and all matching
reasons are listed in the event description.

## Feed (.ics) output

Standard VCALENDAR / VEVENT. **No emojis except country flags.**

- `SUMMARY`: `🇪🇸 Spain vs 🇫🇷 France — Round of 16`
  (flag + name per team; em-dash + stage/round). Team→flag map for all 48 nations.
- `DTSTART` / `DTEND`: kickoff in UTC (`...Z`), 2h duration; clients localize.
- `LOCATION`: stadium, city.
- `DESCRIPTION`: stage/group; inclusion reasons as plain text
  (e.g. `Included: favourite team; close game (52% / 48%)`); live win% / odds;
  final score once the match is finished.
- `UID`: stable, derived from the API-Football fixture ID, so reschedules update
  in place rather than duplicating.
- `SEQUENCE`: incremented when a fixture's time/venue/teams change.
- HTTP caching: `ETag` = hash of (URL params + latest fixture/odds update) so
  distinct feeds don't collide; `Last-Modified` from latest fixture/odds update;
  `If-None-Match` / `If-Modified-Since` → `304`; `Cache-Control: public, max-age=...`.

## Web UI

Single page served at `/`:
- Searchable checklist of all 48 teams (grouped) for favourites.
- Toggles + inputs: Big-game on/off + X; Close-game on/off + threshold (pts).
- Live preview (`/api/preview`) showing which upcoming matches currently qualify.
- "Copy subscribe URL" + `webcal://` link (the `/feed.ics?<params>` URL it builds).
- Edit an existing feed by pasting its URL — params are parsed back into the form.

## Tournament-timeline behavior

Group fixtures are fixed from day one. As results land, the 30-min cron rewrites
`fixtures`; knockout VEVENTs gain real teams, venues, and closeness; subscribers'
calendars update on their next client refresh. The outright snapshot is refreshed
manually if/when the user wants the top-X ranking re-based.

## Error handling

- API-Football failure on a cron run: keep serving the last good KV cache; log; do
  not blank the feed.
- Missing odds for a fixture: close-game rule simply doesn't fire for it (favourites
  / big-game still apply).
- Unknown / placeholder knockout teams: skip rule evaluation until resolved.
- Quota guard: track daily request count; if approaching the cap, skip the odds
  pull before skipping fixtures (bracket integrity > closeness freshness).

## Testing

- Unit: selection logic (each rule + OR composition), implied-prob/closeness math,
  flag mapping, `.ics` serialization (UID stability, SEQUENCE bump, escaping).
- Integration: cron handler against recorded API-Football fixtures + odds fixtures;
  KV read/write; 304 conditional-request handling.
- Manual: subscribe in Apple/Google Calendar; verify a config produces the expected
  matches and updates after a simulated bracket change.

## Out of scope (YAGNI)

- Live in-tournament re-ranking of outright odds (snapshot only).
- Multiple bookmakers / odds comparison (single reference bookmaker).
- Auth / user accounts / stored feed IDs (feeds are stateless, public, self-describing URLs).
- Other tournaments / seasons.

## Open items carried to planning

- Reference bookmaker choice for the odds query.
- Exact flag-emoji map for all 48 nations (build during implementation).
- Whether to use one 30-min cron with in-handler hourly gating vs two cron lines.
