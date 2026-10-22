import { PRO_LEVEL_MAX, PRO_LEVEL_THRESHOLDS, getProLevel } from "../proLevel";

describe("PROLevel", () => {
  it("rises one level each time lifetime cash won passes a threshold", () => {
    expect([0, 5000, 5001, 10000, 10001, 30001, 50001, 100000, 100001, 250000].map(getProLevel)).toEqual([
      0, 0, 1, 1, 2, 3, 4, 4, 5, 5,
    ]);
  });

  it("treats a missing or invalid total as nothing won", () => {
    expect(getProLevel(undefined)).toBe(0);
    expect(getProLevel(null)).toBe(0);
    expect(getProLevel(Number.NaN)).toBe(0);
  });

  it("has five levels", () => {
    expect(PRO_LEVEL_MAX).toBe(5);
    expect(PRO_LEVEL_THRESHOLDS).toEqual([5000, 10000, 30000, 50000, 100000]);
  });
});
