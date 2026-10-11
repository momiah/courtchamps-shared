import {
  getLadderMatchStartMs,
  isLadderMatchExpired,
} from "../ladderAutoCancel";

const START = Date.UTC(2026, 8, 18, 17, 30); // 18-09-2026 18:30 in London (BST)
const HOUR = 60 * 60 * 1000;
const base = (over = {}) => ({
  matchStatus: "accepted",
  matchDate: "18-09-2026",
  matchTime: { start: "18:30" },
  games: [],
  ...over,
});
const after = (h) => START + h * HOUR;

describe("getLadderMatchStartMs", () => {
  it("reads the time as London time in summer and winter, whatever the machine's zone", () => {
    expect(getLadderMatchStartMs("11-10-2026", "18:00")).toBe(Date.UTC(2026, 9, 11, 17, 0));
    expect(getLadderMatchStartMs("15-01-2027", "18:00")).toBe(Date.UTC(2027, 0, 15, 18, 0));
  });

  it("handles the clock changes", () => {
    expect(getLadderMatchStartMs("29-03-2026", "00:30")).toBe(Date.UTC(2026, 2, 29, 0, 30));
    expect(getLadderMatchStartMs("29-03-2026", "03:00")).toBe(Date.UTC(2026, 2, 29, 2, 0));
    expect(getLadderMatchStartMs("25-10-2026", "03:00")).toBe(Date.UTC(2026, 9, 25, 3, 0));
  });

  it("parses DD-MM-YYYY and HH:MM", () => {
    expect(getLadderMatchStartMs("18-09-2026", "18:30")).toBe(START);
  });
  it("returns null for a malformed date", () => {
    expect(getLadderMatchStartMs("nope", "18:30")).toBeNull();
    expect(getLadderMatchStartMs(undefined, "18:30")).toBeNull();
  });
});

describe("isLadderMatchExpired", () => {
  it("expires from the scheduled start when nothing happens", () => {
    expect(isLadderMatchExpired(base(), after(71))).toBe(false);
    expect(isLadderMatchExpired(base(), after(72))).toBe(true);
  });

  it("resets the clock to the last activity (a game report)", () => {
    const match = base({ lastUpdated: new Date(after(10)) });
    // Reference is start+10h, so 72h from start has not elapsed yet.
    expect(isLadderMatchExpired(match, after(72))).toBe(false);
    expect(isLadderMatchExpired(match, after(82))).toBe(true);
  });

  it("counts a check-in as activity", () => {
    const match = base({ checkIn: { completedAt: new Date(after(5)) } });
    expect(isLadderMatchExpired(match, after(76))).toBe(false);
    expect(isLadderMatchExpired(match, after(77))).toBe(true);
  });

  it("never expires a non-accepted match", () => {
    expect(
      isLadderMatchExpired(base({ matchStatus: "completed" }), after(200)),
    ).toBe(false);
  });

  it("never expires a walkover or a match under no-show review", () => {
    expect(isLadderMatchExpired(base({ walkover: true }), after(200))).toBe(
      false,
    );
    expect(
      isLadderMatchExpired(base({ noShowReported: true }), after(200)),
    ).toBe(false);
  });

  it("never expires while a game is disputed", () => {
    expect(
      isLadderMatchExpired(base({ games: [{ approvalStatus: "disputed" }] }), after(200)),
    ).toBe(false);
  });

  it("does not expire without a start time or any activity", () => {
    expect(isLadderMatchExpired(base({ matchDate: "nope" }), after(200))).toBe(
      false,
    );
  });
});

describe("isLadderMatchExpired with an extension", () => {
  const extended = (h) =>
    base({ extension: { requestedBy: "u1", requestedAt: new Date(START), expiresAt: new Date(after(h)) } });

  it("does not expire before the extension runs out", () => {
    expect(isLadderMatchExpired(extended(168), after(167))).toBe(false);
  });

  it("expires once the extension and the inactivity window have both passed", () => {
    expect(isLadderMatchExpired(extended(168), after(168))).toBe(true);
  });

  it("keeps the inactivity window when there was activity late in the extension", () => {
    const match = { ...extended(168), lastUpdated: new Date(after(160)) };
    expect(isLadderMatchExpired(match, after(200))).toBe(false);
    expect(isLadderMatchExpired(match, after(232))).toBe(true);
  });
});
