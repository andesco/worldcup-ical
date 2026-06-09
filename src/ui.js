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
    /* Column count is always a factor of 48 so all 48 teams fill complete,
       equal-length columns (no ragged final row). */
    .team-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }
    @media (min-width: 576px)  { .team-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 768px)  { .team-grid { grid-template-columns: repeat(4, 1fr); } }
    @media (min-width: 1024px) { .team-grid { grid-template-columns: repeat(6, 1fr); } }
    .team-grid label {
      font-weight: normal;
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
    }
    .team-grid label span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .team-grid input { flex: 0 0 auto; }
    .team-grid input:checked + span {
      font-weight: bold;
    }
    fieldset { margin-top: 1.25rem; }
    fieldset legend { font-size: 1.25rem; font-weight: bold; }
    .rule-row { min-height: 2.5rem; }
    .rule-row input[type="number"] { width: 5rem; display: inline-block; margin: 0 0.25rem; }
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
        <div class="team-grid" data-role="team-list"></div>
      </fieldset>

      <fieldset>
        <legend>Big games</legend>
        <label class="rule-row">
          <input type="checkbox" id="bigGame-on">
          both teams in the top <input type="number" id="topx" min="1" max="48" value="8"> by winner odds
        </label>
      </fieldset>

      <fieldset>
        <legend>Close games</legend>
        <label class="rule-row">
          <input type="checkbox" id="closeGame-on">
          win probabilities within <input type="number" id="close" min="1" max="50" value="10"> points
        </label>
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
      if (document.getElementById('closeGame-on').checked) p.set('close', document.getElementById('close').value);
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

    (function prefill() {
      var sp = new URLSearchParams(location.search);
      (sp.get('teams') || '').split(',').filter(Boolean).forEach(function (code) {
        var cb = document.getElementById('t-' + code.toUpperCase());
        if (cb) cb.checked = true;
      });
      if (sp.get('topx')) { document.getElementById('bigGame-on').checked = true; document.getElementById('topx').value = sp.get('topx'); }
      if (sp.get('close')) { document.getElementById('closeGame-on').checked = true; document.getElementById('close').value = sp.get('close'); }
      update();
    })();
  </script>
</body>
</html>`;
}
