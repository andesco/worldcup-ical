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
