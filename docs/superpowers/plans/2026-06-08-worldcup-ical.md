# World Cup iCal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stateless Cloudflare Worker that serves a personalised `.ics` World Cup 2026 calendar from a self-describing URL (`/feed.ics?teams=...&topx=...&close=...`), kept fresh by a cron that polls API-Football for fixtures and odds.

**Architecture:** One Worker. A `scheduled` (cron) handler polls API-Football and caches a normalised fixtures dataset + per-fixture closeness odds in KV. A `fetch` handler serves the settings UI, a live preview JSON endpoint, and the `.ics` feed — the feed reads only cached KV data (0 API calls) and applies selection rules parsed from the URL params. All business logic lives in small pure modules; the two handlers are thin.

**Tech Stack:** JavaScript (ES modules), Cloudflare Workers + KV + Cron Triggers, Wrangler, Vitest (plain — pure modules and handlers tested with a mocked `env`/`fetch`, no Miniflare required).

---

## File Structure

```
worldcup-ical/
├── package.json
├── wrangler.toml
├── vitest.config.js
├── src/
│   ├── index.js          # Worker entry: fetch router + scheduled handler delegation
│   ├── flags.js          # Canonical team table: FIFA code ↔ name ↔ ISO2 ↔ flag ↔ API name
│   ├── odds-snapshot.js  # Static dated outright winner ranking + rank/top-X helpers
│   ├── params.js         # Parse /feed.ics URL params → feed config
│   ├── closeness.js      # 1X2 decimal odds → normalised win% + closeness gap
│   ├── selection.js      # evaluateMatch(): apply the three OR'd rules, return reasons
│   ├── ics.js            # RFC5545 serialization (escape, fold, dates, VEVENT, VCALENDAR)
│   ├── feed.js           # selectMatches() + buildFeed(): tie selection → ics
│   ├── api-football.js   # API-Football client: fetch + normalise fixtures & odds
│   ├── cron.js           # handleScheduled(): poll API → write KV
│   └── ui.js             # renderSettingsPage(): settings HTML + client builder JS
└── tests/
    ├── flags.test.js
    ├── odds-snapshot.test.js
    ├── params.test.js
    ├── closeness.test.js
    ├── selection.test.js
    ├── ics.test.js
    ├── feed.test.js
    ├── api-football.test.js
    ├── cron.test.js
    ├── index.test.js
    └── ui.test.js
```

### Shared data shapes (referenced throughout — keep consistent)

**Normalised fixture** (elements of the `fixtures` KV array):
```js
{
  id: 1234,                            // API-Football fixture id (number)
  utcKickoff: "2026-06-11T20:00:00Z",  // ISO 8601 Z
  status: "NS",                        // API short status: NS, 1H, FT, ...
  finished: false,                     // true when status is FT/AET/PEN
  stage: "Group Stage - 1",            // league.round string, used as label
  venue: { name: "SoFi Stadium", city: "Inglewood" },
  home: { code: "MEX", name: "Mexico" },  // or null if TBD
  away: { code: "USA", name: "USA" },     // or null if TBD
  score: { home: 2, away: 1 }             // or null if not yet played
}
```

**Normalised odds** (`odds` KV object, keyed by fixture id as string):
```js
{ "1234": { homePct: 52, drawPct: 24, awayPct: 24 } }   // ints summing ~100
```

**Feed config** (output of `parseFeedParams`):
```js
{ teams: Set<string>, topx: number|null, close: number|null, hasAnyRule: boolean }
```

---

## Task 0: Project scaffold

**Files:**
- Create: `package.json`, `vitest.config.js`, `wrangler.toml`, `tests/smoke.test.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "worldcup-ical",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "wrangler": "^3.90.0"
  }
}
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
```

- [ ] **Step 3: Create `wrangler.toml`** (KV id filled in Task 12; placeholder ok until then)

```toml
name = "worldcup-ical"
main = "src/index.js"
compatibility_date = "2024-11-01"

# fixtures: every 30 min; odds gated to top-of-hour inside the handler.
# Window 14:00-08:00 UTC = 7AM-1AM PDT (June-July 2026 is all PDT).
[triggers]
crons = [ "*/30 14-23,0-7 * * *" ]

[[kv_namespaces]]
binding = "WC_STORE"
id = "PLACEHOLDER_REPLACE_IN_TASK_12"
```

- [ ] **Step 4: Create `tests/smoke.test.js`**

```js
import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Install and run**

Run: `cd ~/Developer/worldcup-ical && npm install && npm test`
Expected: smoke test PASSES.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.js wrangler.toml tests/smoke.test.js package-lock.json
git commit -m "chore: scaffold worldcup-ical worker + vitest"
```

---

## Task 1: Team table + flags (`src/flags.js`)

Canonical mapping between FIFA 3-letter codes (used in `teams=` param + outright snapshot), display names, ISO2 (for flag emoji), and API-Football team names (for normalisation).

**Files:**
- Create: `src/flags.js`
- Test: `tests/flags.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { flagEmoji, flagFor, nameFor, codeForApiName } from "../src/flags.js";

describe("flags", () => {
  it("builds a flag emoji from ISO2", () => {
    expect(flagEmoji("ES")).toBe("🇪🇸");
    expect(flagEmoji("us")).toBe("🇺🇸");
  });

  it("resolves flag + name for known FIFA codes", () => {
    expect(flagFor("ESP")).toBe("🇪🇸");
    expect(nameFor("ESP")).toBe("Spain");
    expect(flagFor("USA")).toBe("🇺🇸");
    expect(flagFor("CAN")).toBe("🇨🇦");
    expect(flagFor("MEX")).toBe("🇲🇽");
  });

  it("maps API-Football team names back to FIFA codes", () => {
    expect(codeForApiName("Spain")).toBe("ESP");
    expect(codeForApiName("USA")).toBe("USA");
    expect(codeForApiName("Netherlands")).toBe("NED");
  });

  it("returns null code for unknown API names", () => {
    expect(codeForApiName("Atlantis")).toBeNull();
  });

  it("returns a neutral placeholder flag for unknown codes", () => {
    expect(flagFor("ZZZ")).toBe("🏳️");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- flags`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/flags.js
// Canonical team table. `api` is the API-Football team name (for reverse mapping).
// Populated with the outright-snapshot teams + the three hosts. Remaining qualified
// nations are added in Task 1, Step 6 following the exact same row shape.
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- flags`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/flags.js tests/flags.test.js
git commit -m "feat: team table with FIFA code / flag / API-name mapping"
```

- [ ] **Step 6: Populate the remaining qualified nations (data step)**

Procedure (do during deploy once the API key exists, or from any public 2026 team list): for every nation not already in `TEAMS`, add a row `{ code, name, iso2, api }` using the exact shape above — `code` = FIFA 3-letter code, `iso2` = ISO 3166-1 alpha-2 (drives the flag), `api` = the team's `name` as returned by `GET https://v3.football.api-sports.io/teams?league=1&season=2026`. No logic changes. Add an assertion to `tests/flags.test.js` that the table has 48 entries once complete, then re-run `npm test -- flags` and commit.

---

## Task 2: Outright winner ranking snapshot (`src/odds-snapshot.js`)

**Files:**
- Create: `src/odds-snapshot.js`
- Test: `tests/odds-snapshot.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { OUTRIGHT_RANKING, SNAPSHOT_DATE, outrightRank, inTopX } from "../src/odds-snapshot.js";

describe("odds snapshot", () => {
  it("exposes a dated ordered ranking", () => {
    expect(SNAPSHOT_DATE).toBe("2026-06-07");
    expect(OUTRIGHT_RANKING[0]).toBe("ESP");
    expect(OUTRIGHT_RANKING[1]).toBe("FRA");
  });

  it("ranks 1-based, Infinity when off the list", () => {
    expect(outrightRank("ESP")).toBe(1);
    expect(outrightRank("URU")).toBe(12);
    expect(outrightRank("USA")).toBe(Infinity);
  });

  it("top-X is inclusive and excludes off-list teams", () => {
    expect(inTopX("ENG", 8)).toBe(true);   // rank 3
    expect(inTopX("NED", 8)).toBe(true);   // rank 8
    expect(inTopX("NOR", 8)).toBe(false);  // rank 9
    expect(inTopX("USA", 50)).toBe(false); // off list
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- odds-snapshot`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/odds-snapshot.js
// Manual, dated snapshot of outright World Cup winner odds (shortest odds = rank 1).
// API-Football has no futures market; tournament-winner odds move slowly, so a
// snapshot is acceptable. Refresh by editing this list + SNAPSHOT_DATE, then redeploy.
export const SNAPSHOT_DATE = "2026-06-07";

export const OUTRIGHT_RANKING = [
  "ESP", "FRA", "ENG", "BRA", "POR", "ARG",
  "GER", "NED", "NOR", "BEL", "COL", "URU",
];

export function outrightRank(code) {
  const i = OUTRIGHT_RANKING.indexOf(code);
  return i === -1 ? Infinity : i + 1;
}

export function inTopX(code, x) {
  return outrightRank(code) <= x;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- odds-snapshot`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/odds-snapshot.js tests/odds-snapshot.test.js
git commit -m "feat: dated outright winner ranking snapshot + top-X helpers"
```

---

## Task 3: URL param parsing (`src/params.js`)

**Files:**
- Create: `src/params.js`
- Test: `tests/params.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { parseFeedParams } from "../src/params.js";

const cfg = (qs) => parseFeedParams(new URL("https://x/feed.ics" + qs).searchParams);

describe("parseFeedParams", () => {
  it("parses teams into an uppercased set", () => {
    const c = cfg("?teams=esp,can,arg");
    expect([...c.teams].sort()).toEqual(["ARG", "CAN", "ESP"]);
    expect(c.hasAnyRule).toBe(true);
  });

  it("parses topx and close as integers", () => {
    const c = cfg("?topx=8&close=10");
    expect(c.topx).toBe(8);
    expect(c.close).toBe(10);
  });

  it("disables a rule when its param is absent", () => {
    const c = cfg("?teams=ESP");
    expect(c.topx).toBeNull();
    expect(c.close).toBeNull();
  });

  it("ignores empty/invalid values", () => {
    const c = cfg("?teams=&topx=abc&close=-3");
    expect(c.teams.size).toBe(0);
    expect(c.topx).toBeNull();
    expect(c.close).toBeNull();
    expect(c.hasAnyRule).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- params`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/params.js
function posInt(raw) {
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function parseFeedParams(searchParams) {
  const teams = new Set(
    (searchParams.get("teams") || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
  const topx = posInt(searchParams.get("topx"));
  const close = posInt(searchParams.get("close"));
  const hasAnyRule = teams.size > 0 || topx !== null || close !== null;
  return { teams, topx, close, hasAnyRule };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- params`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/params.js tests/params.test.js
git commit -m "feat: parse stateless feed config from URL params"
```

---

## Task 4: Closeness math (`src/closeness.js`)

**Files:**
- Create: `src/closeness.js`
- Test: `tests/closeness.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { impliedFrom1x2, closenessGap } from "../src/closeness.js";

describe("closeness", () => {
  it("converts decimal 1X2 odds to vig-removed win% summing to 100", () => {
    const p = impliedFrom1x2(2.0, 3.5, 4.0); // raw implied 0.5 / 0.2857 / 0.25 = 1.0357
    expect(p.homePct + p.drawPct + p.awayPct).toBe(100);
    expect(p.homePct).toBeGreaterThan(p.awayPct);
  });

  it("treats a near-even market as close", () => {
    const p = impliedFrom1x2(2.5, 3.2, 2.6);
    expect(closenessGap(p)).toBeLessThanOrEqual(5);
  });

  it("treats a lopsided market as not close", () => {
    const p = impliedFrom1x2(1.2, 6.0, 12.0);
    expect(closenessGap(p)).toBeGreaterThan(40);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- closeness`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- closeness`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/closeness.js tests/closeness.test.js
git commit -m "feat: 1X2 odds to vig-removed win% and closeness gap"
```

---

## Task 5: Selection logic (`src/selection.js`)

**Files:**
- Create: `src/selection.js`
- Test: `tests/selection.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { evaluateMatch } from "../src/selection.js";

const fx = (over = {}) => ({
  id: 1, utcKickoff: "2026-06-20T18:00:00Z", status: "NS", finished: false,
  stage: "Group Stage - 1", venue: { name: "V", city: "C" },
  home: { code: "ESP", name: "Spain" }, away: { code: "NOR", name: "Norway" },
  score: null, ...over,
});
const cfg = (over = {}) => ({ teams: new Set(), topx: null, close: null, ...over });

describe("evaluateMatch", () => {
  it("includes a match with a favourite team", () => {
    const r = evaluateMatch(fx(), null, cfg({ teams: new Set(["NOR"]) }));
    expect(r.included).toBe(true);
    expect(r.reasons).toContain("favourite team");
  });

  it("big-game needs BOTH teams in top-X", () => {
    // ESP rank 1, NOR rank 9 → not both in top 8
    expect(evaluateMatch(fx(), null, cfg({ topx: 8 })).included).toBe(false);
    // ESP rank 1, FRA rank 2 → both in top 8
    const both = fx({ away: { code: "FRA", name: "France" } });
    const r = evaluateMatch(both, null, cfg({ topx: 8 }));
    expect(r.included).toBe(true);
    expect(r.reasons).toContain("big game");
  });

  it("close-game fires only when odds exist and gap within threshold", () => {
    const odds = { homePct: 48, drawPct: 26, awayPct: 26 }; // gap 22
    expect(evaluateMatch(fx(), odds, cfg({ close: 10 })).included).toBe(false);
    const tight = { homePct: 40, drawPct: 24, awayPct: 36 }; // gap 4
    const r = evaluateMatch(fx(), tight, cfg({ close: 10 }));
    expect(r.included).toBe(true);
    expect(r.reasons).toContain("close game (40% / 36%)");
  });

  it("ignores rules for fixtures with TBD teams", () => {
    const tbd = fx({ home: null, away: null });
    expect(evaluateMatch(tbd, null, cfg({ teams: new Set(["ESP"]), topx: 8 })).included).toBe(false);
  });

  it("collects multiple reasons and de-dupes inclusion", () => {
    const both = fx({ away: { code: "FRA", name: "France" } });
    const r = evaluateMatch(both, { homePct: 41, drawPct: 22, awayPct: 37 },
      cfg({ teams: new Set(["ESP"]), topx: 8, close: 10 }));
    expect(r.included).toBe(true);
    expect(r.reasons).toEqual([
      "favourite team", "big game", "close game (41% / 37%)",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- selection`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/selection.js
import { inTopX } from "./odds-snapshot.js";
import { closenessGap } from "./closeness.js";

// Apply the three OR'd rules to one fixture. `odds` is the normalised
// { homePct, drawPct, awayPct } for this fixture, or null if unavailable.
export function evaluateMatch(fixture, odds, config) {
  const reasons = [];
  const { home, away } = fixture;
  const haveTeams = !!home && !!away; // TBD knockout slots can't satisfy any rule

  if (haveTeams && config.teams.size > 0 &&
      (config.teams.has(home.code) || config.teams.has(away.code))) {
    reasons.push("favourite team");
  }

  if (haveTeams && config.topx != null &&
      inTopX(home.code, config.topx) && inTopX(away.code, config.topx)) {
    reasons.push("big game");
  }

  if (haveTeams && config.close != null && odds) {
    if (closenessGap(odds) <= config.close) {
      reasons.push(`close game (${odds.homePct}% / ${odds.awayPct}%)`);
    }
  }

  return { included: reasons.length > 0, reasons };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- selection`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/selection.js tests/selection.test.js
git commit -m "feat: OR'd match selection rules with inclusion reasons"
```

---

## Task 6: ICS serialization (`src/ics.js`)

**Files:**
- Create: `src/ics.js`
- Test: `tests/ics.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { icsDate, escapeText, foldLine, matchSummary, buildVEvent, buildCalendar } from "../src/ics.js";

const fx = (over = {}) => ({
  id: 42, utcKickoff: "2026-06-11T20:00:00Z", status: "NS", finished: false,
  stage: "Group Stage - 1", venue: { name: "SoFi Stadium", city: "Inglewood" },
  home: { code: "ESP", name: "Spain" }, away: { code: "FRA", name: "France" },
  score: null, ...over,
});

describe("ics", () => {
  it("formats ISO Z to ICS UTC stamp", () => {
    expect(icsDate("2026-06-11T20:00:00Z")).toBe("20260611T200000Z");
  });

  it("escapes RFC5545 special characters", () => {
    expect(escapeText("a, b; c\\d\ne")).toBe("a\\, b\\; c\\\\d\\ne");
  });

  it("folds long lines on codepoint boundaries with leading space", () => {
    const long = "X".repeat(200);
    const folded = foldLine(long);
    expect(folded.split("\r\n").length).toBeGreaterThan(1);
    folded.split("\r\n").forEach((l, i) => {
      if (i > 0) expect(l.startsWith(" ")).toBe(true);
    });
  });

  it("builds a flags-only summary with stage suffix", () => {
    expect(matchSummary(fx())).toBe("🇪🇸 Spain vs 🇫🇷 France — Group Stage - 1");
  });

  it("builds a VEVENT with stable UID, 2h end, location, reasons", () => {
    const ev = buildVEvent({ fixture: fx(), odds: { homePct: 41, drawPct: 22, awayPct: 37 }, reasons: ["big game", "close game (41% / 37%)"] });
    expect(ev).toContain("UID:wc2026-42@worldcup.andrewe.dev");
    expect(ev).toContain("DTSTART:20260611T200000Z");
    expect(ev).toContain("DTEND:20260611T220000Z");
    expect(ev).toContain("LOCATION:SoFi Stadium\\, Inglewood");
    expect(ev).toContain("Included: big game\\; close game (41% / 37%)");
    expect(ev).toContain("SEQUENCE:1"); // scheduled with known teams
  });

  it("includes the final score once finished", () => {
    const ev = buildVEvent({ fixture: fx({ finished: true, status: "FT", score: { home: 2, away: 1 } }), odds: null, reasons: ["favourite team"] });
    expect(ev).toContain("Final: Spain 2-1 France");
    expect(ev).toContain("SEQUENCE:2");
  });

  it("wraps events in a VCALENDAR", () => {
    const cal = buildCalendar([buildVEvent({ fixture: fx(), odds: null, reasons: ["favourite team"] })]);
    expect(cal.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(cal.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(cal).toContain("PRODID:-//andrewe//worldcup-ical//EN");
    expect(cal).toContain("X-WR-CALNAME:World Cup 2026");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ics`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/ics.js
import { flagFor } from "./flags.js";

export function icsDate(iso) {
  return iso.replace(/[-:]/g, "").replace(/\.\d+/, "").replace("T", "T");
  // "2026-06-11T20:00:00Z" -> "20260611T200000Z"
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
  return `${flagFor(home.code)} ${home.name} vs ${flagFor(away.code)} ${away.name} — ${stage}`;
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
  const loc = `${fixture.venue.name}, ${fixture.venue.city}`;
  const lines = [
    "BEGIN:VEVENT",
    `UID:wc2026-${fixture.id}@worldcup.andrewe.dev`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SEQUENCE:${sequenceFor(fixture)}`,
    foldLine(`SUMMARY:${escapeText(matchSummary(fixture))}`),
    foldLine(`LOCATION:${escapeText(loc)}`),
    foldLine(`DESCRIPTION:${escapeText(descriptionFor(fixture, odds, reasons))}`),
    "END:VEVENT",
  ];
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ics`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ics.js tests/ics.test.js
git commit -m "feat: RFC5545 ics serialization with flags-only summaries"
```

---

## Task 7: Feed builder (`src/feed.js`)

**Files:**
- Create: `src/feed.js`
- Test: `tests/feed.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { selectMatches, buildFeed } from "../src/feed.js";

const fixtures = [
  { id: 1, utcKickoff: "2026-06-11T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "ESP", name: "Spain" }, away: { code: "FRA", name: "France" }, score: null },
  { id: 2, utcKickoff: "2026-06-12T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "USA", name: "USA" }, away: { code: "GHA", name: "Ghana" }, score: null },
];
const oddsMap = { "1": { homePct: 41, drawPct: 22, awayPct: 37 } };

describe("feed", () => {
  it("selects only qualifying fixtures with reasons", () => {
    const sel = selectMatches(fixtures, oddsMap, { teams: new Set(["USA"]), topx: 8, close: 10 });
    const ids = sel.map((s) => s.fixture.id).sort();
    expect(ids).toEqual([1, 2]); // 1 = big+close, 2 = favourite
    const one = sel.find((s) => s.fixture.id === 1);
    expect(one.reasons).toContain("big game");
  });

  it("builds a full ICS calendar of the selection", () => {
    const ics = buildFeed(fixtures, oddsMap, { teams: new Set(["USA"]), topx: null, close: null });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:wc2026-2@worldcup.andrewe.dev");
    expect(ics).not.toContain("UID:wc2026-1@"); // Spain-France not a favourite
  });

  it("an empty selection still yields a valid empty calendar", () => {
    const ics = buildFeed(fixtures, oddsMap, { teams: new Set(), topx: null, close: null });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- feed`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- feed`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/feed.js tests/feed.test.js
git commit -m "feat: select qualifying fixtures and build ics feed"
```

---

## Task 8: API-Football client (`src/api-football.js`)

**Files:**
- Create: `src/api-football.js`
- Test: `tests/api-football.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchFixtures, fetchOddsForDate, AF_BASE } from "../src/api-football.js";

const env = { API_FOOTBALL_KEY: "k", ODDS_BOOKMAKER: "8" };

afterEach(() => vi.unstubAllGlobals());

function stubJson(payload) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => payload })));
}

describe("api-football client", () => {
  it("normalises fixtures incl. TBD teams and finished scores", async () => {
    stubJson({ response: [
      { fixture: { id: 1, date: "2026-06-11T20:00:00+00:00", status: { short: "NS" }, venue: { name: "SoFi", city: "Inglewood" } },
        league: { round: "Group Stage - 1" }, teams: { home: { name: "Spain" }, away: { name: "France" } }, goals: { home: null, away: null } },
      { fixture: { id: 2, date: "2026-07-10T18:00:00+00:00", status: { short: "FT" }, venue: { name: "MetLife", city: "East Rutherford" } },
        league: { round: "Round of 16" }, teams: { home: { name: "Brazil" }, away: { name: "Uruguay" } }, goals: { home: 2, away: 1 } },
      { fixture: { id: 3, date: "2026-07-11T18:00:00+00:00", status: { short: "NS" }, venue: { name: "TBD", city: "TBD" } },
        league: { round: "Quarter-finals" }, teams: { home: { name: "Atlantis" }, away: { name: null } }, goals: { home: null, away: null } },
    ]});
    const fx = await fetchFixtures(env);
    expect(fx[0]).toMatchObject({ id: 1, utcKickoff: "2026-06-11T20:00:00Z", finished: false, home: { code: "ESP", name: "Spain" } });
    expect(fx[1]).toMatchObject({ finished: true, score: { home: 2, away: 1 } });
    expect(fx[2].home).toBeNull(); // unknown api name -> TBD
    expect(fx[2].away).toBeNull();
  });

  it("sends the api key header and league/season query", async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => ({ response: [] }) }));
    vi.stubGlobal("fetch", spy);
    await fetchFixtures(env);
    const [url, opts] = spy.mock.calls[0];
    expect(url).toBe(`${AF_BASE}/fixtures?league=1&season=2026`);
    expect(opts.headers["x-apisports-key"]).toBe("k");
  });

  it("normalises Match Winner odds for a date into win% keyed by fixture id", async () => {
    stubJson({ response: [
      { fixture: { id: 1 }, bookmakers: [ { id: 8, bets: [ { id: 1, name: "Match Winner", values: [
        { value: "Home", odd: "2.00" }, { value: "Draw", odd: "3.50" }, { value: "Away", odd: "4.00" },
      ] } ] } ] },
    ]});
    const odds = await fetchOddsForDate(env, "2026-06-11");
    expect(odds["1"].homePct + odds["1"].drawPct + odds["1"].awayPct).toBe(100);
    expect(odds["1"].homePct).toBeGreaterThan(odds["1"].awayPct);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-football`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api-football`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/api-football.js tests/api-football.test.js
git commit -m "feat: API-Football client normalising fixtures and odds"
```

---

## Task 9: Cron handler (`src/cron.js`)

**Files:**
- Create: `src/cron.js`
- Test: `tests/cron.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi, afterEach } from "vitest";
import { handleScheduled, datesNext48h } from "../src/cron.js";

function makeKV(init = {}) {
  const m = new Map(Object.entries(init));
  return { store: m, get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v) };
}
afterEach(() => vi.unstubAllGlobals());

describe("cron", () => {
  it("lists unique fixture dates within 48h of now", () => {
    const fixtures = [
      { id: 1, utcKickoff: "2026-06-11T20:00:00Z" },
      { id: 2, utcKickoff: "2026-06-12T18:00:00Z" },
      { id: 3, utcKickoff: "2026-06-20T18:00:00Z" }, // outside window
    ];
    const dates = datesNext48h(fixtures, new Date("2026-06-11T08:00:00Z"));
    expect(dates).toEqual(["2026-06-11", "2026-06-12"]);
  });

  it("always writes fixtures; pulls odds only at top of hour", async () => {
    const fixtures = [{ id: 1, utcKickoff: "2026-06-11T20:00:00Z" }];
    vi.stubGlobal("fetch", vi.fn(async (url) => ({
      ok: true,
      json: async () =>
        url.includes("/fixtures")
          ? { response: [{ fixture: { id: 1, date: "2026-06-11T20:00:00+00:00", status: { short: "NS" }, venue: { name: "V", city: "C" } }, league: { round: "Group Stage - 1" }, teams: { home: { name: "Spain" }, away: { name: "France" } }, goals: {} }] }
          : { response: [{ fixture: { id: 1 }, bookmakers: [{ id: 8, bets: [{ id: 1, values: [{ value: "Home", odd: "2.0" }, { value: "Draw", odd: "3.5" }, { value: "Away", odd: "4.0" }] }] }] }] },
    })));
    const env = { WC_STORE: makeKV(), API_FOOTBALL_KEY: "k" };

    // :30 run -> fixtures only
    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T17:30:00Z") }, env);
    expect(env.WC_STORE.store.has("fixtures")).toBe(true);
    expect(env.WC_STORE.store.has("odds")).toBe(false);

    // :00 run -> fixtures + odds
    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T18:00:00Z") }, env);
    expect(env.WC_STORE.store.has("odds")).toBe(true);
    expect(JSON.parse(env.WC_STORE.store.get("odds"))["1"]).toBeTruthy();
  });

  it("keeps last good cache when the fixtures fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const env = { WC_STORE: makeKV({ fixtures: JSON.stringify([{ id: 9 }]) }), API_FOOTBALL_KEY: "k" };
    await handleScheduled({ scheduledTime: Date.parse("2026-06-11T18:00:00Z") }, env);
    expect(JSON.parse(env.WC_STORE.store.get("fixtures"))[0].id).toBe(9); // unchanged
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- cron`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/cron.js
import { fetchFixtures, fetchOddsForDate } from "./api-football.js";

export function datesNext48h(fixtures, now) {
  const end = now.getTime() + 48 * 3600 * 1000;
  const set = new Set();
  for (const f of fixtures) {
    const t = Date.parse(f.utcKickoff);
    if (t >= now.getTime() && t <= end) set.add(f.utcKickoff.slice(0, 10));
  }
  return [...set].sort();
}

export async function handleScheduled(event, env) {
  const now = new Date(event.scheduledTime);

  // Fixtures every run. On failure, leave the last good cache untouched.
  let fixtures = null;
  try {
    fixtures = await fetchFixtures(env);
    await env.WC_STORE.put("fixtures", JSON.stringify(fixtures));
    await env.WC_STORE.put("fixtures_lastupdate", String(now.getTime()));
  } catch (err) {
    console.error("fixtures pull failed:", err.message);
    const cached = await env.WC_STORE.get("fixtures");
    if (cached) fixtures = JSON.parse(cached);
  }

  // Odds only at the top of the hour (gates ~hourly inside the 30-min cron).
  if (now.getUTCMinutes() === 0 && fixtures) {
    try {
      const merged = {};
      for (const date of datesNext48h(fixtures, now)) {
        Object.assign(merged, await fetchOddsForDate(env, date));
      }
      await env.WC_STORE.put("odds", JSON.stringify(merged));
      await env.WC_STORE.put("odds_lastupdate", String(now.getTime()));
    } catch (err) {
      console.error("odds pull failed:", err.message);
      // keep last good odds cache
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- cron`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cron.js tests/cron.test.js
git commit -m "feat: scheduled handler polling fixtures (30m) and odds (hourly)"
```

---

## Task 10: Worker entry / router (`src/index.js`)

**Files:**
- Create: `src/index.js`
- Test: `tests/index.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect, vi } from "vitest";
import worker from "../src/index.js";

function makeKV(init = {}) {
  const m = new Map(Object.entries(init));
  return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => void m.set(k, v) };
}

const fixtures = [
  { id: 1, utcKickoff: "2026-06-11T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "ESP", name: "Spain" }, away: { code: "FRA", name: "France" }, score: null },
  { id: 2, utcKickoff: "2026-06-12T20:00:00Z", status: "NS", finished: false, stage: "Group Stage - 1",
    venue: { name: "V", city: "C" }, home: { code: "USA", name: "USA" }, away: { code: "CAN", name: "Canada" }, score: null },
];
const env = () => ({
  WC_STORE: makeKV({ fixtures: JSON.stringify(fixtures), odds: JSON.stringify({}), fixtures_lastupdate: "1000", odds_lastupdate: "1000" }),
});
const req = (path, headers = {}) => new Request("https://worldcup.andrewe.dev" + path, { headers });

describe("worker fetch", () => {
  it("serves the settings UI at /", async () => {
    const res = await worker.fetch(req("/"), env());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("World Cup 2026");
  });

  it("serves a filtered ICS feed with correct content type", async () => {
    const res = await worker.fetch(req("/feed.ics?teams=USA"), env());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/calendar");
    const body = await res.text();
    expect(body).toContain("UID:wc2026-2@worldcup.andrewe.dev");
    expect(body).not.toContain("UID:wc2026-1@");
  });

  it("returns 304 when If-None-Match matches the feed ETag", async () => {
    const e = env();
    const first = await worker.fetch(req("/feed.ics?teams=USA"), e);
    const etag = first.headers.get("etag");
    expect(etag).toBeTruthy();
    const second = await worker.fetch(req("/feed.ics?teams=USA", { "If-None-Match": etag }), e);
    expect(second.status).toBe(304);
  });

  it("gives distinct ETags to distinct feeds", async () => {
    const e = env();
    const a = (await worker.fetch(req("/feed.ics?teams=USA"), e)).headers.get("etag");
    const b = (await worker.fetch(req("/feed.ics?teams=CAN"), e)).headers.get("etag");
    expect(a).not.toBe(b);
  });

  it("returns preview JSON of qualifying upcoming matches", async () => {
    const res = await worker.fetch(req("/api/preview?teams=USA"), env());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.matches[0]).toMatchObject({ id: 2, reasons: ["favourite team"] });
  });

  it("404s unknown routes", async () => {
    const res = await worker.fetch(req("/nope"), env());
    expect(res.status).toBe(404);
  });

  it("delegates scheduled() to the cron handler", async () => {
    const e = { WC_STORE: makeKV(), API_FOOTBALL_KEY: "k" };
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ response: [] }) })));
    await worker.scheduled({ scheduledTime: Date.parse("2026-06-11T17:30:00Z") }, e);
    vi.unstubAllGlobals();
    expect(true).toBe(true); // no throw
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- index`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/index.js
import { parseFeedParams } from "./params.js";
import { buildFeed, selectMatches } from "./feed.js";
import { handleScheduled } from "./cron.js";
import { renderSettingsPage } from "./ui.js";

function hashETag(str) {
  // FNV-1a 32-bit -> hex, wrapped in quotes per HTTP ETag syntax.
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `"${(h >>> 0).toString(16)}"`;
}

async function readCache(env) {
  const [fx, odds, fLast, oLast] = await Promise.all([
    env.WC_STORE.get("fixtures"),
    env.WC_STORE.get("odds"),
    env.WC_STORE.get("fixtures_lastupdate"),
    env.WC_STORE.get("odds_lastupdate"),
  ]);
  return {
    fixtures: fx ? JSON.parse(fx) : [],
    oddsMap: odds ? JSON.parse(odds) : {},
    stamp: `${fLast || 0}-${oLast || 0}`,
  };
}

function configFrom(url) {
  const c = parseFeedParams(url.searchParams);
  c.teams = c.teams; // Set passes through to selection
  return c;
}

async function serveFeed(url, request, env) {
  const { fixtures, oddsMap, stamp } = await readCache(env);
  const config = configFrom(url);
  const etag = hashETag(url.search + "|" + stamp);

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const body = buildFeed(fixtures, oddsMap, config);
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "ETag": etag,
      "Cache-Control": "public, max-age=1800",
    },
  });
}

async function servePreview(url, env) {
  const { fixtures, oddsMap } = await readCache(env);
  const config = configFrom(url);
  const now = Date.now();
  const matches = selectMatches(fixtures, oddsMap, config)
    .filter((s) => Date.parse(s.fixture.utcKickoff) >= now)
    .sort((a, b) => Date.parse(a.fixture.utcKickoff) - Date.parse(b.fixture.utcKickoff))
    .map((s) => ({
      id: s.fixture.id,
      utcKickoff: s.fixture.utcKickoff,
      stage: s.fixture.stage,
      home: s.fixture.home,
      away: s.fixture.away,
      reasons: s.reasons,
    }));
  return Response.json({ matches });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response(renderSettingsPage(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (url.pathname === "/feed.ics") return serveFeed(url, request, env);
    if (url.pathname === "/api/preview") return servePreview(url, env);
    return new Response("Not found", { status: 404 });
  },

  async scheduled(event, env) {
    await handleScheduled(event, env);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- index`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/index.js tests/index.test.js
git commit -m "feat: worker router with feed, preview, ETag/304, scheduled delegation"
```

---

## Task 11: Settings UI (`src/ui.js`)

**Files:**
- Create: `src/ui.js`
- Test: `tests/ui.test.js`

- [ ] **Step 1: Write the failing test**

```js
import { describe, it, expect } from "vitest";
import { renderSettingsPage } from "../src/ui.js";

describe("settings page", () => {
  it("returns an HTML document", () => {
    const html = renderSettingsPage();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("World Cup 2026");
  });

  it("includes team checkboxes, rule inputs, and an output URL field", () => {
    const html = renderSettingsPage();
    expect(html).toContain('data-role="team-list"');
    expect(html).toContain('id="topx"');
    expect(html).toContain('id="close"');
    expect(html).toContain('id="subscribe-url"');
  });

  it("embeds the team table so the client can render flags + names", () => {
    const html = renderSettingsPage();
    expect(html).toContain("Spain");
    expect(html).toContain("🇪🇸");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ui`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the implementation**

```js
// src/ui.js
import { TEAMS, flagEmoji } from "./flags.js";

export function renderSettingsPage() {
  const teamData = JSON.stringify(
    TEAMS.map((t) => ({ code: t.code, name: t.name, flag: flagEmoji(t.iso2) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>World Cup 2026 — Custom Calendar</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
  fieldset { margin: 1rem 0; }
  .teams { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .25rem; }
  label.team { display: flex; gap: .4rem; align-items: center; }
  input[type=number] { width: 5rem; }
  #subscribe-url { width: 100%; font-family: monospace; }
  .row { margin: .5rem 0; }
</style>
</head>
<body>
<h1>World Cup 2026 — Custom Calendar</h1>
<p>Pick favourite teams and/or enable rules, then subscribe to the generated calendar URL.</p>

<fieldset>
  <legend>Favourite teams</legend>
  <input type="search" id="team-filter" placeholder="Filter teams…">
  <div class="teams" data-role="team-list"></div>
</fieldset>

<fieldset>
  <legend>Big games</legend>
  <label class="row"><input type="checkbox" id="bigGame-on"> Both teams in the top
    <input type="number" id="topx" min="1" max="48" value="8"> by winner odds</label>
</fieldset>

<fieldset>
  <legend>Close games</legend>
  <label class="row"><input type="checkbox" id="closeGame-on"> Win probabilities within
    <input type="number" id="close" min="1" max="50" value="10"> points</label>
</fieldset>

<div class="row">
  <label>Subscribe URL<br><input id="subscribe-url" readonly></label>
  <button id="copy">Copy</button>
  <a id="webcal" href="#">Open in calendar</a>
</div>

<h2>Preview</h2>
<ul id="preview"></ul>

<script>
const TEAMS = ${teamData};
const list = document.querySelector('[data-role="team-list"]');
function renderTeams(filter = "") {
  list.innerHTML = "";
  for (const t of TEAMS) {
    if (filter && !t.name.toLowerCase().includes(filter.toLowerCase())) continue;
    const id = "t-" + t.code;
    const label = document.createElement("label");
    label.className = "team";
    label.innerHTML = '<input type="checkbox" value="' + t.code + '" id="' + id + '">' +
      t.flag + " " + t.name;
    list.appendChild(label);
  }
}
renderTeams();
document.getElementById("team-filter").addEventListener("input", (e) => renderTeams(e.target.value));

function buildParams() {
  const teams = [...document.querySelectorAll('[data-role="team-list"] input:checked')].map((c) => c.value);
  const p = new URLSearchParams();
  if (teams.length) p.set("teams", teams.join(","));
  if (document.getElementById("bigGame-on").checked) p.set("topx", document.getElementById("topx").value);
  if (document.getElementById("closeGame-on").checked) p.set("close", document.getElementById("close").value);
  return p;
}

async function update() {
  const p = buildParams();
  const base = location.origin + "/feed.ics";
  const url = base + (p.toString() ? "?" + p.toString() : "");
  document.getElementById("subscribe-url").value = url;
  document.getElementById("webcal").href = url.replace(/^https?:/, "webcal:");

  const res = await fetch("/api/preview?" + p.toString());
  const data = await res.json();
  const ul = document.getElementById("preview");
  ul.innerHTML = "";
  for (const m of data.matches.slice(0, 30)) {
    const li = document.createElement("li");
    const when = new Date(m.utcKickoff).toLocaleString();
    li.textContent = when + " — " + (m.home ? m.home.name : "TBD") + " vs " +
      (m.away ? m.away.name : "TBD") + " [" + m.reasons.join(", ") + "]";
    ul.appendChild(li);
  }
}

document.addEventListener("input", update);
document.getElementById("copy").addEventListener("click", () => {
  navigator.clipboard.writeText(document.getElementById("subscribe-url").value);
});

// Pre-fill the form from an existing feed URL pasted into the address bar (?teams=...).
(function prefill() {
  const sp = new URLSearchParams(location.search);
  (sp.get("teams") || "").split(",").filter(Boolean).forEach((code) => {
    const cb = document.getElementById("t-" + code.toUpperCase());
    if (cb) cb.checked = true;
  });
  if (sp.get("topx")) { document.getElementById("bigGame-on").checked = true; document.getElementById("topx").value = sp.get("topx"); }
  if (sp.get("close")) { document.getElementById("closeGame-on").checked = true; document.getElementById("close").value = sp.get("close"); }
  update();
})();
</script>
</body>
</html>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- ui`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui.js tests/ui.test.js
git commit -m "feat: settings page UI with live preview and URL builder"
```

---

## Task 12: Deploy configuration (manual)

**Files:**
- Modify: `wrangler.toml`

- [ ] **Step 1: Authenticate Wrangler (interactive — user runs this)**

In the Claude Code prompt, type: `! npx wrangler login`
Expected: browser opens, auth succeeds.

- [ ] **Step 2: Create the KV namespace**

Run: `cd ~/Developer/worldcup-ical && npx wrangler kv namespace create WC_STORE`
Expected: prints an `id`. Copy it.

- [ ] **Step 3: Put the KV id into `wrangler.toml`**

Replace `PLACEHOLDER_REPLACE_IN_TASK_12` in `wrangler.toml` with the id from Step 2.

- [ ] **Step 4: Add the custom domain route to `wrangler.toml`**

Append:
```toml
[[routes]]
pattern = "worldcup.andrewe.dev"
custom_domain = true
```

- [ ] **Step 5: Set secrets**

Run:
```bash
npx wrangler secret put API_FOOTBALL_KEY   # paste the API-Football free-tier key
npx wrangler secret put ODDS_BOOKMAKER     # optional; a numeric bookmaker id, e.g. 8
```
(If `ODDS_BOOKMAKER` is skipped, the client defaults to `8`.)

- [ ] **Step 6: Deploy**

Run: `npx wrangler deploy`
Expected: deploy succeeds; prints the worker URL + version id.

- [ ] **Step 7: Smoke-test live**

Run:
```bash
curl -s "https://worldcup.andrewe.dev/feed.ics?teams=ESP,USA&topx=8&close=10" | head -20
```
Expected: a `BEGIN:VCALENDAR` document. Open `https://worldcup.andrewe.dev/` in a browser and confirm the builder + preview work.

- [ ] **Step 8: Trigger one cron run to warm the cache**

Run: `npx wrangler dev` then, in another shell, hit the scheduled endpoint, OR wait for the next cron tick within the 14:00–08:00 UTC window. Confirm KV now has `fixtures`:
```bash
npx wrangler kv key get fixtures --binding WC_STORE | head -c 200
```
Expected: JSON array of fixtures.

- [ ] **Step 9: Commit deploy config**

```bash
git add wrangler.toml
git commit -m "chore: wrangler KV, custom domain, deploy config"
```

---

## Self-Review

**Spec coverage:**
- Stateless URL-param feed → Tasks 3, 7, 10. ✓
- Three OR'd rules (favourites / big-game top-X / close-game) → Task 5. ✓
- Outright snapshot (dated, manual) → Task 2. ✓
- API-Football fixtures + odds, normalisation → Task 8. ✓
- Cron: fixtures 30m, odds hourly, 18h window, quota-safe, last-good-cache on failure → Tasks 9, 0 (cron line). ✓
- KV shared cache only, no per-feed state → Tasks 9, 10. ✓
- `.ics` output: flags-only summary, UID stability, SEQUENCE, reasons + win% + score in description, UTC times, 2h duration → Task 6. ✓
- HTTP caching: ETag (params + data stamp), 304 → Task 10. ✓
- Web UI: 48-team checklist, rule toggles, live preview, copy/webcal, edit-by-paste → Task 11. ✓
- Flags for 48 nations → Task 1 (+ data completion step). ✓
- Deploy to worldcup.andrewe.dev → Task 12. ✓
- Error handling (API failure, missing odds, TBD teams, quota guard) → Tasks 5, 8, 9. ✓

**Placeholder scan:** The only non-code "fill-in" is Task 1 Step 6 (adding the remaining nation rows) — a genuine data-entry step with an explicit, shown row shape and a verification assertion, not a logic placeholder. The `wrangler.toml` KV id placeholder is resolved in Task 12 Step 3. No "TODO/handle edge cases" hand-waving remains.

**Type consistency:** Fixture/odds/config shapes match across Tasks 5–11; function names (`evaluateMatch`, `selectMatches`, `buildFeed`, `buildVEvent`, `buildCalendar`, `parseFeedParams`, `impliedFrom1x2`, `closenessGap`, `inTopX`, `fetchFixtures`, `fetchOddsForDate`, `handleScheduled`, `datesNext48h`, `renderSettingsPage`, `flagFor`, `codeForApiName`) are defined once and used consistently. KV binding is `WC_STORE` everywhere; secrets `API_FOOTBALL_KEY` / `ODDS_BOOKMAKER` everywhere.
