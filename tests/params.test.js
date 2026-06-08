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
