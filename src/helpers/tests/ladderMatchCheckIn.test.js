import {
  getLadderMatchReference,
  buildLadderCheckInPayload,
  parseLadderCheckInPayload,
  isValidLadderCheckInScan,
  buildLadderMatchCheckIn,
  isLadderMatchCheckedIn,
} from "../ladderMatchCheckIn";

describe("getLadderMatchReference", () => {
  it("uppercases the last six characters of the id", () => {
    expect(getLadderMatchReference("ladderMatch_abc123")).toBe("ABC123");
  });

  it("returns the whole id (uppercased) when shorter than six chars", () => {
    expect(getLadderMatchReference("ab12")).toBe("AB12");
  });

  it("is safe for an empty id", () => {
    expect(getLadderMatchReference("")).toBe("");
  });
});

describe("check-in payload round-trip", () => {
  const match = { ladderMatchId: "match_XY9zab" };

  it("builds a payload carrying the id and derived reference", () => {
    expect(buildLadderCheckInPayload(match)).toEqual({
      ladderMatchId: "match_XY9zab",
      reference: "XY9ZAB",
    });
  });

  it("parses back a stringified payload", () => {
    const raw = JSON.stringify(buildLadderCheckInPayload(match));
    expect(parseLadderCheckInPayload(raw)).toEqual({
      ladderMatchId: "match_XY9zab",
      reference: "XY9ZAB",
    });
  });

  it("returns null for malformed or foreign QR data", () => {
    expect(parseLadderCheckInPayload("not-json")).toBeNull();
    expect(parseLadderCheckInPayload(JSON.stringify({ foo: "bar" }))).toBeNull();
  });
});

describe("isValidLadderCheckInScan", () => {
  const match = { ladderMatchId: "match_XY9zab" };

  it("accepts this match's own QR", () => {
    const raw = JSON.stringify(buildLadderCheckInPayload(match));
    expect(isValidLadderCheckInScan(match, raw)).toBe(true);
  });

  it("rejects a QR for a different match", () => {
    const other = JSON.stringify(
      buildLadderCheckInPayload({ ladderMatchId: "match_other1" }),
    );
    expect(isValidLadderCheckInScan(match, other)).toBe(false);
  });

  it("rejects a tampered reference", () => {
    const raw = JSON.stringify({
      ladderMatchId: "match_XY9zab",
      reference: "WRONG1",
    });
    expect(isValidLadderCheckInScan(match, raw)).toBe(false);
  });
});

describe("check-in state", () => {
  it("builds a completed check-in record", () => {
    const at = new Date("2026-08-27T10:00:00Z");
    expect(buildLadderMatchCheckIn("user-1", at)).toEqual({
      completed: true,
      checkedInAt: at,
      scannedBy: "user-1",
    });
  });

  it("derives the checked-in flag from persisted state", () => {
    expect(isLadderMatchCheckedIn({})).toBe(false);
    expect(
      isLadderMatchCheckedIn({
        checkIn: { completed: false, checkedInAt: new Date(), scannedBy: "x" },
      }),
    ).toBe(false);
    expect(
      isLadderMatchCheckedIn({
        checkIn: { completed: true, checkedInAt: new Date(), scannedBy: "x" },
      }),
    ).toBe(true);
  });
});
