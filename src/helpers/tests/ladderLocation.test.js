import { getLadderLocation } from "../ladderPreRegistrationDisplay";

describe("getLadderLocation", () => {
  it("shows the city with the country code", () => {
    expect(
      getLadderLocation({
        city: "London",
        countryCode: "GB",
        region: "North London",
      }),
    ).toBe("London, GB");
  });

  it("shows the city alone without a country code", () => {
    expect(getLadderLocation({ city: "London" })).toBe("London");
  });

  it("falls back to the region until a city is set", () => {
    expect(
      getLadderLocation({
        city: " ",
        countryCode: "GB",
        region: "North London",
      }),
    ).toBe("North London");
    expect(getLadderLocation({})).toBe("");
  });
});
