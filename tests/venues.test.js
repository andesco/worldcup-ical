import { describe, expect, it } from "vitest";
import { venueFixtureCount, venueForFixture } from "../src/venues.js";

describe("canonical venues", () => {
  it("covers all 104 tournament fixtures", () => {
    expect(venueFixtureCount).toBe(104);
  });

  it("returns canonical stadium and city names", () => {
    expect(venueForFixture(537327)).toEqual({
      name: "Estadio Azteca",
      city: "Mexico City",
    });
    expect(venueForFixture(537430)).toEqual({
      name: "GEHA Field at Arrowhead Stadium",
      city: "Kansas City",
    });
  });

  it("safely returns null for unknown fixtures", () => {
    expect(venueForFixture(1)).toBeNull();
  });
});
