import { getLadderTitle } from "../ladderPreRegistrationDisplay";

describe("getLadderTitle", () => {
  it("joins the gender label and ladder type", () => {
    expect(getLadderTitle({ genderType: "Mens", ladderType: "Doubles" })).toBe(
      "Men's Doubles",
    );
    expect(
      getLadderTitle({ genderType: "Womens", ladderType: "Singles" }),
    ).toBe("Women's Singles");
    expect(getLadderTitle({ genderType: "Mixed", ladderType: "Doubles" })).toBe(
      "Mixed Doubles",
    );
  });

  it("keeps whichever part is present", () => {
    expect(getLadderTitle({ ladderType: "Singles" })).toBe("Singles");
    expect(getLadderTitle({})).toBe("");
  });
});
