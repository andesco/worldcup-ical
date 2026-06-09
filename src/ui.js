// src/ui.js
import { TEAMS } from "./flags.js";

export function renderSettingsPage() {
  const teamData = JSON.stringify(
    TEAMS.map((t) => ({ code: t.code, name: t.name, flag: t.flag }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>World Cup 2026 — Custom Calendar</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
  <style>
    /* The grid responds to its OWN available width (container queries), not the
       device viewport. Column count is always a factor of 48 (1/2/3/4/6) so all
       48 teams fill complete, equal-length columns with no ragged final row —
       excluding 5 columns requires discrete steps, but they grow with space. */
    .team-grid-wrap { container-type: inline-size; }
    /* minmax(0, 1fr) — NOT plain 1fr — lets tracks shrink below content width so
       long names actually clip with an ellipsis instead of overflowing. */
    .team-grid {
      display: grid;
      grid-template-columns: repeat(1, minmax(0, 1fr));
      gap: 0.5rem;
    }
    @container (min-width: 22rem) { .team-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @container (min-width: 34rem) { .team-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @container (min-width: 46rem) { .team-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
    @container (min-width: 64rem) { .team-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
    /* The label itself is the clip box: width:100% pins it to the (minmax 0) track,
       and overflow/ellipsis trim the trailing name to one line ending in "…". */
    .team-grid label {
      font-weight: normal;
      margin: 0 0 0.5rem 0;
      display: block;
      width: 100%;
      max-width: 100%;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .team-grid input:checked + span {
      font-weight: bold;
    }
    fieldset { margin-top: 1.25rem; }
    fieldset legend { font-size: 1.25rem; font-weight: bold; }
    .rule-row { min-height: 2.5rem; }
    .rule-hint { margin: 0.25rem 0 0 1.9rem; color: var(--pico-muted-color); }

    /* Custom number stepper: native spin arrows are tiny and unstyleable in
       Safari, so we hide them and stack our own ▲/▼ buttons, each half the
       field height (combined = exact input height). */
    input[type="number"] { -moz-appearance: textfield; appearance: textfield; }
    input[type="number"]::-webkit-outer-spin-button,
    input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .num { display: inline-flex; align-items: stretch; vertical-align: middle; margin: 0 0.25rem; }
    .num input[type="number"] {
      width: 3.5rem; margin: 0; text-align: center;
      border-radius: var(--pico-border-radius) 0 0 var(--pico-border-radius);
    }
    .num-btns { display: flex; flex-direction: column; }
    .num-btns button {
      flex: 1 1 0; margin: 0; padding: 0 0.6rem; width: 2rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; line-height: 1; border-radius: 0;
      /* Neutral chrome that matches the input, not the blue primary button. */
      background: var(--pico-form-element-background-color);
      color: var(--pico-muted-color);
      border: 1px solid var(--pico-form-element-border-color); border-left: none;
    }
    .num-btns button:hover {
      background: var(--pico-secondary-background);
      color: var(--pico-secondary-inverse);
    }
    .num-btns button:first-child { border-bottom: none; border-top-right-radius: var(--pico-border-radius); }
    .num-btns button:last-child { border-bottom-right-radius: var(--pico-border-radius); }
    #subscribe-url { display: block; overflow-x: auto; white-space: nowrap; }
    #copyBtn { width: 8rem; }
    button.copied {
      --pico-background-color: #16803c;
      --pico-border-color: #16803c;
      --pico-color: #fff;
      background-color: #16803c !important;
      border-color: #16803c !important;
      color: #fff !important;
    }
    .reasons { color: var(--pico-muted-color); }
  </style>
</head>
<body>
  <main class="container">
    <h1>World Cup 2026</h1>
    <h4>Custom Calendar Subscription</h4>

    <small>
      source code: <a href="https://github.com/andesco/worldcup-ical">andesco/worldcup-ical</a><br />
      source data: <a href="https://www.football-data.org">football-data.org</a> &middot; <a href="https://the-odds-api.com">the-odds-api</a>
    </small>

    <form id="builder">
      <fieldset>
        <legend>Favourite teams</legend>
        <input type="search" id="team-filter" placeholder="Filter teams…">
        <div class="team-grid-wrap">
          <div class="team-grid" data-role="team-list"></div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Big games</legend>
        <label class="rule-row">
          <input type="checkbox" id="bigGame-on">
          both teams ranked in the top
          <span class="num">
            <input type="number" id="topx" min="1" max="48" value="8">
            <span class="num-btns">
              <button type="button" data-target="topx" data-step="1" aria-label="increase">▲</button>
              <button type="button" data-target="topx" data-step="-1" aria-label="decrease">▼</button>
            </span>
          </span>
          by odds to win the World Cup
        </label>
      </fieldset>

      <fieldset>
        <legend>Competitive games</legend>
        <label class="rule-row">
          <input type="checkbox" id="competitiveGame-on">
          the two teams' win chances are within
          <span class="num">
            <input type="number" id="competitive" min="1" max="50" value="10">
            <span class="num-btns">
              <button type="button" data-target="competitive" data-step="1" aria-label="increase">▲</button>
              <button type="button" data-target="competitive" data-step="-1" aria-label="decrease">▼</button>
            </span>
          </span>
          percentage points
        </label>
        <p class="rule-hint"><small>How evenly matched the game is. Smaller = tighter. The leftover percentage is the chance of a draw.</small></p>
      </fieldset>

      <article id="urlOutput">
        <header>Your calendar subscription URL:</header>
        <code id="subscribe-url"></code>
        <footer>
          <button type="button" id="copyBtn">Copy URL</button>
          <a id="webcal" href="#" role="button" class="outline secondary" style="margin-left: 1rem;">Subscribe</a>
        </footer>
      </article>
    </form>

    <h4>Example Matches in Feed</h4>
    <article id="previewOutput">
      <ul id="preview"><li><small>Select teams or enable a rule.</small></li></ul>
    </article>
  </main>

  <script>
    var TEAMS = ${teamData};
    var list = document.querySelector('[data-role="team-list"]');

    function renderTeams(filter) {
      filter = (filter || '').toLowerCase();
      list.innerHTML = '';
      for (var i = 0; i < TEAMS.length; i++) {
        var t = TEAMS[i];
        if (filter && t.name.toLowerCase().indexOf(filter) === -1) continue;
        var label = document.createElement('label');
        var cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = t.code; cb.id = 't-' + t.code;
        var span = document.createElement('span');
        span.textContent = ' ' + t.flag + ' ' + t.name;
        label.appendChild(cb); label.appendChild(span);
        list.appendChild(label);
      }
    }
    renderTeams();
    document.getElementById('team-filter').addEventListener('input', function (e) { renderTeams(e.target.value); });

    function buildParams() {
      var teams = [].slice.call(document.querySelectorAll('[data-role="team-list"] input:checked')).map(function (c) { return c.value; });
      var p = new URLSearchParams();
      if (teams.length) p.set('teams', teams.join(','));
      if (document.getElementById('bigGame-on').checked) p.set('topx', document.getElementById('topx').value);
      if (document.getElementById('competitiveGame-on').checked) p.set('competitive', document.getElementById('competitive').value);
      return p;
    }

    function update() {
      var p = buildParams();
      var qs = p.toString();
      var url = location.origin + '/feed.ics' + (qs ? '?' + qs : '');
      document.getElementById('subscribe-url').textContent = url;
      document.getElementById('webcal').href = url.replace(/^https?:/, 'webcal:');
      // Keep the browser address bar in sync so the page is shareable/bookmarkable
      // and reloads back into the same selection. replaceState avoids history spam.
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);

      fetch('/api/preview?' + qs).then(function (r) { return r.json(); }).then(function (data) {
        var ul = document.getElementById('preview');
        ul.innerHTML = '';
        var matches = data.matches || [];
        if (!matches.length) { ul.innerHTML = '<li><small>No matches yet for these settings.</small></li>'; return; }
        matches.slice(0, 40).forEach(function (m) {
          var li = document.createElement('li');
          var when = new Date(m.utcKickoff).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
          var home = m.home ? m.home.name : 'TBD';
          var away = m.away ? m.away.name : 'TBD';
          li.innerHTML = when + ' — ' + home + ' vs ' + away +
            ' <span class="reasons">· ' + m.reasons.join(', ') + '</span>';
          ul.appendChild(li);
        });
      });
    }

    function showCopied(btn) {
      clearTimeout(btn._t);
      btn.textContent = '✓ Copied';
      btn.classList.add('copied');
      btn._t = setTimeout(function () { btn.textContent = 'Copy URL'; btn.classList.remove('copied'); }, 1500);
    }
    document.getElementById('copyBtn').addEventListener('click', function () {
      var url = document.getElementById('subscribe-url').textContent;
      showCopied(this);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
    });

    document.getElementById('builder').addEventListener('input', update);

    // Custom number steppers (▲/▼)
    [].slice.call(document.querySelectorAll('.num-btns button')).forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var inp = document.getElementById(btn.getAttribute('data-target'));
        var step = Number(btn.getAttribute('data-step'));
        var min = Number(inp.min), max = Number(inp.max);
        var v = (Number(inp.value) || 0) + step;
        if (!isNaN(min)) v = Math.max(min, v);
        if (!isNaN(max)) v = Math.min(max, v);
        inp.value = v;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    (function prefill() {
      var sp = new URLSearchParams(location.search);
      (sp.get('teams') || '').split(',').filter(Boolean).forEach(function (code) {
        var cb = document.getElementById('t-' + code.toUpperCase());
        if (cb) cb.checked = true;
      });
      if (sp.get('topx')) { document.getElementById('bigGame-on').checked = true; document.getElementById('topx').value = sp.get('topx'); }
      if (sp.get('competitive')) { document.getElementById('competitiveGame-on').checked = true; document.getElementById('competitive').value = sp.get('competitive'); }
      update();
    })();
  </script>
</body>
</html>`;
}
