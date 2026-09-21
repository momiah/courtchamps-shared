import {
  reachedNoShowLimit,
  buildNoShowStrikeUpdate,
  disqualificationDisclaimer,
} from "../disqualification";
import { NO_SHOW_DQ_THRESHOLD } from "../../types/disqualification";

describe("reachedNoShowLimit", () => {
  it("is false below the threshold and true at or above it", () => {
    expect(reachedNoShowLimit(NO_SHOW_DQ_THRESHOLD - 1)).toBe(false);
    expect(reachedNoShowLimit(NO_SHOW_DQ_THRESHOLD)).toBe(true);
    expect(reachedNoShowLimit(NO_SHOW_DQ_THRESHOLD + 3)).toBe(true);
  });
});

describe("buildNoShowStrikeUpdate", () => {
  it("increments the strike count without disqualifying below the threshold", () => {
    expect(buildNoShowStrikeUpdate(0)).toEqual({ noShowCount: 1 });
    expect(buildNoShowStrikeUpdate(3)).toEqual({ noShowCount: 4 });
  });

  it("treats a missing current count as zero", () => {
    expect(buildNoShowStrikeUpdate(undefined)).toEqual({ noShowCount: 1 });
  });

  it("disqualifies for no_show once the strike reaches the threshold", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(buildNoShowStrikeUpdate(NO_SHOW_DQ_THRESHOLD - 1, now)).toEqual({
      noShowCount: NO_SHOW_DQ_THRESHOLD,
      disqualified: true,
      disqualifiedReason: "no_show",
      disqualifiedAt: now,
    });
  });

  it("keeps disqualifying past the threshold", () => {
    const update = buildNoShowStrikeUpdate(NO_SHOW_DQ_THRESHOLD + 1);
    expect(update.noShowCount).toBe(NO_SHOW_DQ_THRESHOLD + 2);
    expect(update.disqualified).toBe(true);
    expect(update.disqualifiedReason).toBe("no_show");
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
