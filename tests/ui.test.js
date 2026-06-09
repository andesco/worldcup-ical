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
    expect(html).toContain('id="rank"');
    expect(html).toContain('id="knockout-on"');
    expect(html).toContain('id="openers-on"');
    expect(html).toContain('id="flags-on"');
    expect(html).toContain('id="code-on"');
    expect(html).toContain('id="language"');
    expect(html).toContain('class="language-icon"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('id="competitive"');
    expect(html).toContain('id="subscribe-url"');
    expect(html.indexOf('id="language"')).toBeLessThan(html.indexOf('data-role="team-list"'));
  });

  it("embeds the team table so the client can render flags + names", () => {
    const html = renderSettingsPage();
    expect(html).toContain("Spain");
    expect(html).toContain("🇪🇸");
  });

  it("renders localized markup and native language names", () => {
    const html = renderSettingsPage("fr");
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain("<h1 data-i18n-feed=\"calendarName\">Coupe du monde 2026</h1>");
    expect(html).toContain("<title>Coupe du monde 2026</title>");
    expect(html).toContain("Abonnement calendrier personnalisé");
    expect(html).toContain("Español");
    expect(html).toContain("Português (Brasil)");
    expect(html).toContain("Norsk bokmål");
  });

  it("keeps language as a non-English URL option and preserves selected codes during rerenders", () => {
    const html = renderSettingsPage("es");
    expect(html).toContain("if (currentLocale !== 'en') p.set('lang', currentLocale)");
    expect(html).toContain("selectedCodes.add(c.value)");
    expect(html).toContain("cb.checked = selectedCodes.has(t.code)");
    expect(html).toContain("toLocaleString(currentLocale");
    expect(html).toContain("m.probabilities.join(', ')");
    expect(html).toContain("location.origin + '/' + (qs ? '?' + qs : '')");
    expect(html).not.toContain("location.origin + '/feed.ics'");
    expect(html).toContain("key !== 'lang' && key !== 'flags' && key !== 'code'");
  });
});
