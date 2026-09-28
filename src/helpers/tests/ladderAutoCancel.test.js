import {
  getLadderMatchStartMs,
  isLadderMatchExpired,
} from "../ladderAutoCancel";

const START = new Date(2026, 8, 18, 18, 30).getTime(); // 18-09-2026 18:30
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
