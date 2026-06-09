import { describe, it, expect } from "vitest";
import { parseFeedParams } from "../src/params.js";

const cfg = (qs) => parseFeedParams(new URL("https://x/feed.ics" + qs).searchParams);

describe("parseFeedParams", () => {
  it("parses teams into an uppercased set", () => {
    const c = cfg("?teams=esp,can,arg");
    expect([...c.teams].sort()).toEqual(["ARG", "CAN", "ESP"]);
    expect(c.hasAnyRule).toBe(true);
  });

  it("parses rank and competitive as integers", () => {
    const c = cfg("?rank=8&competitive=10");
    expect(c.rank).toBe(8);
    expect(c.competitive).toBe(10);
  });

  it("disables a rule when its param is absent", () => {
    const c = cfg("?teams=ESP");
    expect(c.rank).toBeNull();
    expect(c.competitive).toBeNull();
  });

  it("ignores empty/invalid values", () => {
    const c = cfg("?teams=&rank=abc&competitive=-3");
    expect(c.teams.size).toBe(0);
    expect(c.rank).toBeNull();
    expect(c.competitive).toBeNull();
    expect(c.hasAnyRule).toBe(false);
  });

  it("treats the knockout flag as a boolean rule", () => {
    expect(cfg("?knockout=1").knockout).toBe(true);
    expect(cfg("?knockout=1").hasAnyRule).toBe(true);
    expect(cfg("?teams=ESP").knockout).toBe(false);
  });

  it("treats the host-openers flag as a boolean rule", () => {
    expect(cfg("?openers=1").hostOpeners).toBe(true);
    expect(cfg("?openers=1").hasAnyRule).toBe(true);
    expect(cfg("?teams=ESP").hostOpeners).toBe(false);
  });
});
