import {
  getLadderMatchReference,
  buildLadderCheckInPayload,
  parseLadderCheckInPayload,
  isValidLadderCheckInScan,
  addLadderMatchCheckIn,
  getLadderCheckedInUserIds,
  hasUserCheckedIn,
  getLadderCheckInProgress,
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

  it("builds a payload carrying the id, derived reference and owner userId", () => {
    expect(buildLadderCheckInPayload(match, "user1")).toEqual({
      ladderMatchId: "match_XY9zab",
      reference: "XY9ZAB",
      userId: "user1",
    });
  });

  it("parses back a stringified payload", () => {
    const raw = JSON.stringify(buildLadderCheckInPayload(match, "user1"));
    expect(parseLadderCheckInPayload(raw)).toEqual({
      ladderMatchId: "match_XY9zab",
      reference: "XY9ZAB",
      userId: "user1",
    });
  });

  it("returns null for malformed or foreign QR data", () => {
    expect(parseLadderCheckInPayload("not-json")).toBeNull();
    expect(parseLadderCheckInPayload(JSON.stringify({ foo: "bar" }))).toBeNull();
  });

  it("returns null when the owner userId is missing", () => {
    expect(
      parseLadderCheckInPayload(
        JSON.stringify({ ladderMatchId: "match_XY9zab", reference: "XY9ZAB" }),
      ),
    ).toBeNull();
  });
});

describe("isValidLadderCheckInScan", () => {
  const match = { ladderMatchId: "match_XY9zab" };

  it("accepts this match's own QR", () => {
    const raw = JSON.stringify(buildLadderCheckInPayload(match, "user1"));
    expect(isValidLadderCheckInScan(match, raw)).toBe(true);
  });

  it("rejects a QR for a different match", () => {
    const other = JSON.stringify(
      buildLadderCheckInPayload({ ladderMatchId: "match_other1" }, "user1"),
    );
    expect(isValidLadderCheckInScan(match, other)).toBe(false);
  });

  it("rejects a tampered reference", () => {
    const raw = JSON.stringify({
      ladderMatchId: "match_XY9zab",
      reference: "WRONG1",
      userId: "user1",
    });
    expect(isValidLadderCheckInScan(match, raw)).toBe(false);
  });
});

describe("check-in state", () => {
  const singles = { participants: ["a", "b"] };
  const doubles = { participants: ["a", "b", "c", "d"] };

  it("records the first participant without completing (singles)", () => {
    const at = new Date("2026-08-27T10:00:00Z");
    const checkIn = addLadderMatchCheckIn(singles, "a", at);
    expect(checkIn.checkedInBy).toEqual(["a"]);
    expect(checkIn.checkedInAt).toEqual({ a: at });
    expect(checkIn.completed).toBe(false);
    expect(checkIn.completedAt).toBeUndefined();
  });

  it("completes once every participant is in (singles)", () => {
    const at1 = new Date("2026-08-27T10:00:00Z");
    const at2 = new Date("2026-08-27T10:05:00Z");
    const first = addLadderMatchCheckIn(singles, "a", at1);
    const second = addLadderMatchCheckIn(
      { ...singles, checkIn: first },
      "b",
      at2,
    );
    expect(second.checkedInBy).toEqual(["a", "b"]);
    expect(second.completed).toBe(true);
    expect(second.completedAt).toEqual(at2);
  });

  it("needs all four before completing (doubles)", () => {
    let checkIn;
    ["a", "b", "c"].forEach((id) => {
      checkIn = addLadderMatchCheckIn({ ...doubles, checkIn }, id);
      expect(checkIn.completed).toBe(false);
    });
    checkIn = addLadderMatchCheckIn({ ...doubles, checkIn }, "d");
    expect(checkIn.completed).toBe(true);
    expect(checkIn.checkedInBy).toEqual(["a", "b", "c", "d"]);
  });

  it("is idempotent per user", () => {
    const first = addLadderMatchCheckIn(singles, "a");
    const again = addLadderMatchCheckIn({ ...singles, checkIn: first }, "a");
    expect(again.checkedInBy).toEqual(["a"]);
    expect(again.completed).toBe(false);
  });

  it("preserves the original completion time", () => {
    const at1 = new Date("2026-08-27T10:00:00Z");
    const at2 = new Date("2026-08-27T10:05:00Z");
    const at3 = new Date("2026-08-27T10:09:00Z");
    const a = addLadderMatchCheckIn(singles, "a", at1);
    const done = addLadderMatchCheckIn({ ...singles, checkIn: a }, "b", at2);
    // A redundant re-add keeps the first completion time.
    const still = addLadderMatchCheckIn({ ...singles, checkIn: done }, "b", at3);
    expect(still.completedAt).toEqual(at2);
  });

  it("reports progress and per-user status", () => {
    const first = addLadderMatchCheckIn(doubles, "a");
    const match = { ...doubles, checkIn: first };
    expect(getLadderCheckedInUserIds(match)).toEqual(["a"]);
    expect(hasUserCheckedIn(match, "a")).toBe(true);
    expect(hasUserCheckedIn(match, "b")).toBe(false);
    expect(getLadderCheckInProgress(match)).toEqual({ checkedIn: 1, total: 4 });
  });

  it("derives the games-unlock flag from completed", () => {
    expect(isLadderMatchCheckedIn({})).toBe(false);
    expect(
      isLadderMatchCheckedIn({ checkIn: { checkedInBy: ["a"], completed: false } }),
    ).toBe(false);
    expect(
      isLadderMatchCheckedIn({
        checkIn: { checkedInBy: ["a", "b"], completed: true },
      }),
    ).toBe(true);
  });
});
