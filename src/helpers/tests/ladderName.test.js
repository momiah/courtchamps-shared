import { getLadderName } from "../ladderPreRegistrationDisplay";

describe("getLadderName", () => {
  it("puts the city before the ladder title", () => {
    expect(
      getLadderName({
        city: "London",
        region: "North London",
        genderType: "Mens",
        ladderType: "Singles",
      }),
    ).toBe("London Men's Singles");
    expect(
      getLadderName({
        city: " Manchester ",
        genderType: "Mixed",
        ladderType: "Doubles",
      }),
    ).toBe("Manchester Mixed Doubles");
  });

  it("falls back to the region when there is no city", () => {
    expect(
      getLadderName({
        city: " ",
        region: "North London",
        genderType: "Womens",
        ladderType: "Doubles",
      }),
    ).toBe("North London Women's Doubles");
  });

  it("uses the title alone with no city or region", () => {
    expect(getLadderName({ genderType: "Mens", ladderType: "Doubles" })).toBe(
      "Men's Doubles",
    );
    expect(getLadderName({})).toBe("");
  });
});
