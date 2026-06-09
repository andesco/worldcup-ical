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
