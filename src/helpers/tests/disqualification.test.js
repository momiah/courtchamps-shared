import {
  applyStrike,
  getDisqualification,
  isDisqualified,
  disqualificationDisclaimer,
} from "../disqualification";
import { DISQUALIFICATION_THRESHOLDS } from "../../types/disqualification";

describe("applyStrike", () => {
  it("adds the first strike of a reason", () => {
    expect(applyStrike(undefined, "no_show")).toEqual({ no_show: 1 });
    expect(applyStrike({}, "abuse")).toEqual({ abuse: 1 });
  });

  it("increments an existing reason and preserves the others", () => {
    expect(applyStrike({ no_show: 2, abuse: 1 }, "abuse")).toEqual({
      no_show: 2,
      abuse: 2,
    });
  });
});

describe("getDisqualification", () => {
  it("is clear below every threshold", () => {
    const dq = getDisqualification({ no_show: 4, abuse: 2 });
    expect(dq.disqualified).toBe(false);
    expect(dq.reasons).toEqual([]);
    expect(dq.primaryReason).toBeUndefined();
  });

  it("trips once a reason reaches its threshold", () => {
    const dq = getDisqualification({ cheating: DISQUALIFICATION_THRESHOLDS.cheating });
    expect(dq.disqualified).toBe(true);
    expect(dq.reasons).toEqual(["cheating"]);
    expect(dq.primaryReason).toBe("cheating");
  });

  it("reports every tripped reason, most serious first", () => {
    const dq = getDisqualification({
      no_show: DISQUALIFICATION_THRESHOLDS.no_show,
      abuse: DISQUALIFICATION_THRESHOLDS.abuse,
    });
    expect(dq.reasons).toEqual(["abuse", "no_show"]);
    expect(dq.primaryReason).toBe("abuse");
  });

  it("honours a per-call threshold override", () => {
    expect(getDisqualification({ no_show: 2 }).disqualified).toBe(false);
    expect(
      getDisqualification(
        { no_show: 2 },
        { ...DISQUALIFICATION_THRESHOLDS, no_show: 2 },
      ).disqualified,
    ).toBe(true);
  });
});

describe("isDisqualified", () => {
  it("mirrors getDisqualification().disqualified", () => {
    expect(isDisqualified({ harassment: 3 })).toBe(true);
    expect(isDisqualified({ harassment: 2 })).toBe(false);
    expect(isDisqualified(undefined)).toBe(false);
  });
});

describe("disqualificationDisclaimer", () => {
  it("uses the plural reason label", () => {
    expect(disqualificationDisclaimer("no_show")).toBe(
      "You have been disqualified from this ladder due to multiple no-shows.",
    );
    expect(disqualificationDisclaimer("cheating")).toBe(
      "You have been disqualified from this ladder due to multiple cheating offences.",
    );
  });

  it("falls back when the reason is unknown", () => {
    expect(disqualificationDisclaimer()).toContain("policy breaches");
  });
});
