// src/ui.js
import { TEAMS } from "./flags.js";
import { CATALOGS, LOCALE_NAMES, SUPPORTED_LOCALES, catalog, resolveLocale } from "./localization.js";

export function renderSettingsPage(locale = "en") {
  const lang = resolveLocale(locale) || "en";
  const activeCatalog = catalog(lang);
  const u = activeCatalog.ui;
  const teamData = JSON.stringify(
    TEAMS.map((t) => ({ code: t.code, name: catalog(lang).teams[t.code], flag: t.flag }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );
  const clientCatalogs = JSON.stringify(CATALOGS);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeCatalog.feed.calendarName}</title>
  <meta name="description" content="Follow your favourite teams and add big or competitive World Cup 2026 matches to a calendar that updates automatically.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://worldcup.andrewe.ca/">
  <meta property="og:title" content="World Cup 2026 — Custom Calendar Subscription">
  <meta property="og:description" content="Follow favourite teams and add big or competitive matches to a calendar that updates automatically.">
  <meta property="og:image" content="https://worldcup.andrewe.ca/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="World Cup 2026 custom calendar subscription">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="World Cup 2026 — Custom Calendar Subscription">
  <meta name="twitter:description" content="Follow favourite teams and add big or competitive matches to a calendar that updates automatically.">
  <meta name="twitter:image" content="https://worldcup.andrewe.ca/og-image.png">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
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
    .language-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; }
    .language-row select { width: auto; margin: 0; }
    .language-icon { width: 1.25rem; height: 1.25rem; flex: none; fill: currentColor; }

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
    .probabilities { display: block; margin: 0.25rem 0 0 1rem; color: var(--pico-muted-color); }
  </style>
</head>
<body>
  <main class="container">
    <h1 data-i18n-feed="calendarName">${activeCatalog.feed.calendarName}</h1>
    <h4 data-i18n="subtitle">${u.subtitle}</h4>

    <small>
      <span data-i18n="sourceCode">${u.sourceCode}</span>: <a href="https://github.com/andesco/worldcup-ical">andesco/worldcup-ical</a><br />
      <span data-i18n="sourceData">${u.sourceData}</span>: <a href="https://www.football-data.org">football-data.org</a> &middot; <a href="https://the-odds-api.com">the-odds-api</a>
    </small>

    <form id="builder">
      <label class="rule-row language-row" for="language">
        <svg class="language-icon" viewBox="6 -75 80 80" aria-hidden="true">
          <path d="M46.2402 4.15039C68.0176 4.15039 85.6934-13.4766 85.6934-35.2539C85.6934-57.0312 68.0176-74.6582 46.2402-74.6582C24.5117-74.6582 6.83594-57.0312 6.83594-35.2539C6.83594-13.4766 24.5117 4.15039 46.2402 4.15039ZM46.2402-1.70898C27.7344-1.70898 12.7441-16.748 12.7441-35.2539C12.7441-53.7598 27.7344-68.7988 46.2402-68.7988C64.7461-68.7988 79.7852-53.7598 79.7852-35.2539C79.7852-16.748 64.7461-1.70898 46.2402-1.70898Z"/>
          <path d="M46.2402 1.66016C57.1777 1.66016 65.8203-14.4043 65.8203-35.1562C65.8203-56.0547 57.2266-72.168 46.2402-72.168C35.2539-72.168 26.709-56.0547 26.709-35.1562C26.709-14.4043 35.3027 1.66016 46.2402 1.66016ZM46.2402-3.66211C39.0137-3.66211 32.4707-18.5059 32.4707-35.1562C32.4707-52.002 39.0137-66.8457 46.2402-66.8457C53.5156-66.8457 60.0586-52.002 60.0586-35.1562C60.0586-18.5059 53.5156-3.66211 46.2402-3.66211Z"/>
          <path d="M46.2402 2.92969C47.8027 2.92969 49.0723 1.66016 49.0723 0.0976562L49.0723-70.2148C49.0723-71.7773 47.8027-73.0469 46.2402-73.0469C44.7266-73.0469 43.4082-71.7773 43.4082-70.2148L43.4082 0.0976562C43.4082 1.66016 44.7266 2.92969 46.2402 2.92969ZM22.7539-9.52148C27.7344-13.5742 35.9375-15.7715 46.2402-15.7715C56.5918-15.7715 64.7461-13.5742 69.7754-9.52148C70.9961-8.54492 72.6562-8.39844 73.7793-9.47266C74.9023-10.5469 75-12.3047 73.8281-13.4277C68.75-18.1641 58.1543-21.4355 46.2402-21.4355C34.375-21.4355 23.7793-18.1641 18.7012-13.4277C17.5293-12.3047 17.627-10.5469 18.75-9.47266C19.873-8.39844 21.4844-8.54492 22.7539-9.52148ZM12.0605-32.4219L81.3965-32.4219C82.959-32.4219 84.2285-33.6914 84.2285-35.2539C84.2285-36.8164 82.959-38.0859 81.3965-38.0859L12.0605-38.0859C10.498-38.0859 9.22852-36.8164 9.22852-35.2539C9.22852-33.6914 10.498-32.4219 12.0605-32.4219ZM46.2402-48.877C58.1543-48.877 68.75-52.1484 73.8281-56.8848C75-58.0078 74.9023-59.7656 73.7793-60.8398C72.6562-61.9141 70.9961-61.7676 69.7754-60.791C64.7461-56.7383 56.5918-54.541 46.2402-54.541C35.9375-54.541 27.7344-56.7383 22.7539-60.791C21.4844-61.7676 19.873-61.9141 18.75-60.8398C17.627-59.7656 17.5293-58.0078 18.7012-56.8848C23.7793-52.1484 34.375-48.877 46.2402-48.877Z"/>
        </svg>
        <span data-i18n="language">${u.language}</span>
        <select id="language">
          ${SUPPORTED_LOCALES.map((option) => `<option value="${option}"${option === lang ? " selected" : ""}>${LOCALE_NAMES[option]}</option>`).join("")}
        </select>
      </label>

      <fieldset>
        <legend data-i18n="favourites">${u.favourites}</legend>
        <input type="search" id="team-filter" placeholder="${u.filterTeams}" data-i18n-placeholder="filterTeams">
        <div class="team-grid-wrap">
          <div class="team-grid" data-role="team-list"></div>
        </div>
      </fieldset>

      <fieldset>
        <legend data-i18n="bigGames">${u.bigGames}</legend>
        <label class="rule-row">
          <input type="checkbox" id="bigGame-on">
          <span data-i18n="rankBefore">${u.rankBefore}</span>
          <span class="num">
            <input type="number" id="rank" min="1" max="48" value="12">
            <span class="num-btns">
              <button type="button" data-target="rank" data-step="1" aria-label="${u.increase}" data-i18n-aria="increase">▲</button>
              <button type="button" data-target="rank" data-step="-1" aria-label="${u.decrease}" data-i18n-aria="decrease">▼</button>
            </span>
          </span>
          <span data-i18n="rankAfter">${u.rankAfter}</span>
        </label>
        <label class="rule-row">
          <input type="checkbox" id="knockout-on">
          <span data-i18n="knockout">${u.knockout}</span>
        </label>
        <label class="rule-row">
          <input type="checkbox" id="openers-on">
          <span data-i18n="openers">${u.openers}</span>
        </label>
      </fieldset>

      <fieldset>
        <legend data-i18n="competitiveGames">${u.competitiveGames}</legend>
        <label class="rule-row">
          <input type="checkbox" id="competitiveGame-on">
          <span data-i18n="competitiveBefore">${u.competitiveBefore}</span>
          <span class="num">
            <input type="number" id="competitive" min="1" max="50" value="25">
            <span class="num-btns">
              <button type="button" data-target="competitive" data-step="1" aria-label="${u.increase}" data-i18n-aria="increase">▲</button>
              <button type="button" data-target="competitive" data-step="-1" aria-label="${u.decrease}" data-i18n-aria="decrease">▼</button>
            </span>
          </span>
          <span data-i18n="percentagePoints">${u.percentagePoints}</span>
        </label>
      </fieldset>

      <fieldset>
        <legend data-i18n="options">${u.options}</legend>
        <label class="rule-row">
          <input type="checkbox" id="flags-on" checked>
          <span data-i18n="flags">${u.flags}</span>
        </label>
        <label class="rule-row">
          <input type="checkbox" id="code-on">
          <span data-i18n="code">${u.code}</span>
        </label>
      </fieldset>

      <article id="urlOutput">
        <header data-i18n="subscriptionUrl">${u.subscriptionUrl}</header>
        <code id="subscribe-url"></code>
        <footer>
          <button type="button" id="copyBtn" data-i18n="copyUrl">${u.copyUrl}</button>
          <a id="webcal" href="#" role="button" class="outline secondary" style="margin-left: 1rem;" data-i18n="subscribe">${u.subscribe}</a>
        </footer>
      </article>
    </form>

    <h4 data-i18n="examples">${u.examples}</h4>
    <article id="previewOutput">
      <ul id="preview"><li><small>${u.selectPrompt}</small></li></ul>
    </article>
  </main>

  <script>
    var TEAMS = ${teamData};
    var CATALOGS = ${clientCatalogs};
    var currentLocale = ${JSON.stringify(lang)};
    var selectedCodes = new Set();
    var updateToken = 0;
    var list = document.querySelector('[data-role="team-list"]');

    function renderTeams(filter) {
      [].slice.call(document.querySelectorAll('[data-role="team-list"] input:checked')).forEach(function (c) { selectedCodes.add(c.value); });
      filter = (filter || '').toLowerCase();
      list.innerHTML = '';
      var localizedTeams = TEAMS.map(function (t) { return { code: t.code, flag: t.flag, name: CATALOGS[currentLocale].teams[t.code] || CATALOGS.en.teams[t.code] }; })
        .sort(function (a, b) { return a.name.localeCompare(b.name, currentLocale); });
      for (var i = 0; i < localizedTeams.length; i++) {
        var t = localizedTeams[i];
        if (filter && t.name.toLowerCase().indexOf(filter) === -1) continue;
        var label = document.createElement('label');
        var cb = document.createElement('input');
        cb.type = 'checkbox'; cb.value = t.code; cb.id = 't-' + t.code; cb.checked = selectedCodes.has(t.code);
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
      selectedCodes.forEach(function (code) { if (teams.indexOf(code) === -1) teams.push(code); });
      var p = new URLSearchParams();
      if (teams.length) p.set('teams', teams.join(','));
      if (document.getElementById('bigGame-on').checked) p.set('rank', document.getElementById('rank').value);
      if (document.getElementById('competitiveGame-on').checked) p.set('competitive', document.getElementById('competitive').value);
      if (document.getElementById('knockout-on').checked) p.set('knockout', '1');
      if (document.getElementById('openers-on').checked) p.set('openers', '1');
      // Display options: flags on by default (encode only when off), code off by default.
      if (!document.getElementById('flags-on').checked) p.set('flags', '0');
      if (document.getElementById('code-on').checked) p.set('code', '1');
      if (currentLocale !== 'en') p.set('lang', currentLocale);
      return p;
    }

    function applyLocale(locale) {
      currentLocale = CATALOGS[locale] ? locale : 'en';
      var strings = CATALOGS[currentLocale].ui;
      document.documentElement.lang = currentLocale;
      document.title = CATALOGS[currentLocale].feed.calendarName + ' — ' + strings.subtitle;
      [].slice.call(document.querySelectorAll('[data-i18n-feed]')).forEach(function (el) {
        var key = el.getAttribute('data-i18n-feed');
        el.textContent = CATALOGS[currentLocale].feed[key] || CATALOGS.en.feed[key];
      });
      [].slice.call(document.querySelectorAll('[data-i18n]')).forEach(function (el) {
        var key = el.getAttribute('data-i18n');
        el.textContent = strings[key] || CATALOGS.en.ui[key];
      });
      [].slice.call(document.querySelectorAll('[data-i18n-placeholder]')).forEach(function (el) {
        var key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = strings[key] || CATALOGS.en.ui[key];
      });
      [].slice.call(document.querySelectorAll('[data-i18n-aria]')).forEach(function (el) {
        var key = el.getAttribute('data-i18n-aria');
        el.setAttribute('aria-label', strings[key] || CATALOGS.en.ui[key]);
      });
      renderTeams(document.getElementById('team-filter').value);
    }

    function update() {
      var token = ++updateToken;
      var p = buildParams();
      var qs = p.toString();
      var url = location.origin + '/' + (qs ? '?' + qs : '');
      document.getElementById('subscribe-url').textContent = url;
      document.getElementById('webcal').href = url.replace(/^https?:/, 'webcal:');
      // Keep the browser address bar in sync so the page is shareable/bookmarkable
      // and reloads back into the same selection. replaceState avoids history spam.
      history.replaceState(null, '', qs ? '?' + qs : location.pathname);

      fetch('/api/preview' + (qs ? '?' + qs : '')).then(function (r) { return r.json(); }).then(function (data) {
        if (token !== updateToken) return;
        var ul = document.getElementById('preview');
        ul.innerHTML = '';
        var matches = data.matches || [];
        if (!matches.length) { var empty = document.createElement('li'); var small = document.createElement('small'); small.textContent = CATALOGS[currentLocale].ui.noMatches; empty.appendChild(small); ul.appendChild(empty); return; }
        matches.slice(0, 40).forEach(function (m) {
          var li = document.createElement('li');
          var when = new Date(m.utcKickoff).toLocaleString(currentLocale, { dateStyle: 'medium', timeStyle: 'short' });
          li.textContent = when + ' — ' + m.summary;
          var r = document.createElement('span');
          r.className = 'reasons';
          r.textContent = ' · ' + m.reasons.join(', ');
          li.appendChild(r);
          if (m.probabilities && m.probabilities.length) {
            var probabilities = document.createElement('small');
            probabilities.className = 'probabilities';
            probabilities.textContent = m.probabilities.join(', ');
            li.appendChild(probabilities);
          }
          ul.appendChild(li);
        });
      });
    }

    function showCopied(btn) {
      clearTimeout(btn._t);
      btn.textContent = '✓ ' + CATALOGS[currentLocale].ui.copied;
      btn.classList.add('copied');
      btn._t = setTimeout(function () { btn.textContent = CATALOGS[currentLocale].ui.copyUrl; btn.classList.remove('copied'); }, 1500);
    }
    document.getElementById('copyBtn').addEventListener('click', function () {
      var url = document.getElementById('subscribe-url').textContent;
      showCopied(this);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url);
    });

    document.getElementById('builder').addEventListener('input', function (event) {
      if (event.target.matches('[data-role="team-list"] input')) {
        if (event.target.checked) selectedCodes.add(event.target.value);
        else selectedCodes.delete(event.target.value);
      }
      if (event.target.id === 'language') applyLocale(event.target.value);
      update();
    });

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
      // A "fresh" visit has no query at all -> apply sensible defaults.
      // A URL with any params is an explicit config and is honoured exactly.
      var fresh = Array.from(sp.keys()).filter(function (key) { return key !== 'lang' && key !== 'flags' && key !== 'code'; }).length === 0;

      var teamCodes = sp.has('teams')
        ? (sp.get('teams') || '').split(',').filter(Boolean)
        : (fresh ? ['CAN', 'MEX', 'USA'] : []);
      teamCodes.forEach(function (code) {
        selectedCodes.add(code.toUpperCase());
        var cb = document.getElementById('t-' + code.toUpperCase());
        if (cb) cb.checked = true;
      });

      if (sp.get('rank')) { document.getElementById('bigGame-on').checked = true; document.getElementById('rank').value = sp.get('rank'); }
      else if (fresh) { document.getElementById('bigGame-on').checked = true; }

      if (sp.get('competitive')) { document.getElementById('competitiveGame-on').checked = true; document.getElementById('competitive').value = sp.get('competitive'); }
      else if (fresh) { document.getElementById('competitiveGame-on').checked = true; }

      if (sp.has('knockout') || fresh) { document.getElementById('knockout-on').checked = true; }
      if (sp.has('openers')) { document.getElementById('openers-on').checked = true; }

      // Display options: flags default on (off only when flags=0); code default off.
      document.getElementById('flags-on').checked = sp.get('flags') !== '0';
      document.getElementById('code-on').checked = sp.get('code') === '1';

      applyLocale(document.getElementById('language').value);
      update();
    })();
  </script>
</body>
</html>`;
}
