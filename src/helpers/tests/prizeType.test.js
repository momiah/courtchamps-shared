import { getPrizeType, normalizePrizeType } from "../prizeType";

describe("prize type", () => {
  it.each([
    [20, "Cash"],
    [0, "Community"],
    [undefined, "Community"],
    [null, "Community"],
  ])("an entry fee of %p is a %s prize", (entryFee, expected) => {
    expect(getPrizeType(entryFee)).toBe(expected);
  });

  it.each([
    ["Cash", "Cash"],
    ["Community", "Community"],
    ["Cash & Trophy", "Cash"],
    ["Cash & Medal", "Cash"],
    ["Trophy", "Community"],
    ["Medal", "Community"],
    ["", "Community"],
    [undefined, "Community"],
  ])("reads a stored %p as %s", (stored, expected) => {
    expect(normalizePrizeType(stored)).toBe(expected);
  });
});
