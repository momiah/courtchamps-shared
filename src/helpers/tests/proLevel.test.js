import { PRO_LEVEL_MAX, PRO_LEVEL_THRESHOLDS, getProLevel } from "../proLevel";

describe("PROLevel", () => {
  it("rises one level each time lifetime cash won passes a threshold", () => {
    expect([0, 1000, 1001, 5000, 5001, 10001, 30000, 30001, 50000, 50001, 250000].map(getProLevel)).toEqual([
      0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5,
    ]);
  });

  it("treats a missing or invalid total as nothing won", () => {
    expect(getProLevel(undefined)).toBe(0);
    expect(getProLevel(null)).toBe(0);
    expect(getProLevel(Number.NaN)).toBe(0);
  });

  it("has five levels", () => {
    expect(PRO_LEVEL_MAX).toBe(5);
    expect(PRO_LEVEL_THRESHOLDS).toEqual([1000, 5000, 10000, 30000, 50000]);
  });
});
