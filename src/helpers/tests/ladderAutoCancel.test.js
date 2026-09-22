import {
  getLadderMatchStartMs,
  isLadderMatchUnattended,
  LADDER_MATCH_AUTO_CANCEL_HOURS,
} from "../ladderAutoCancel";

const START = new Date(2026, 8, 18, 18, 30).getTime(); // 18-09-2026 18:30
const base = (over = {}) => ({
  matchStatus: "accepted",
  participants: ["a", "b"],
  matchDate: "18-09-2026",
  matchTime: { start: "18:30" },
  games: [],
  ...over,
});

const hoursAfter = (h) => START + h * 60 * 60 * 1000;

describe("getLadderMatchStartMs", () => {
  it("parses DD-MM-YYYY and HH:MM", () => {
    expect(getLadderMatchStartMs("18-09-2026", "18:30")).toBe(START);
  });
  it("returns null for a malformed date", () => {
    expect(getLadderMatchStartMs("nope", "18:30")).toBeNull();
    expect(getLadderMatchStartMs(undefined, "18:30")).toBeNull();
  });
});

describe("isLadderMatchUnattended", () => {
  it("is false before the window elapses", () => {
    expect(isLadderMatchUnattended(base(), hoursAfter(23))).toBe(false);
  });

  it("is true once the window elapses with no activity", () => {
    expect(
      isLadderMatchUnattended(base(), hoursAfter(LADDER_MATCH_AUTO_CANCEL_HOURS)),
    ).toBe(true);
  });

  it("never cancels a non-accepted match", () => {
    expect(
      isLadderMatchUnattended(base({ matchStatus: "completed" }), hoursAfter(48)),
    ).toBe(false);
  });

  it("never cancels once someone has checked in", () => {
    const match = base({ checkIn: { completed: true } });
    expect(isLadderMatchUnattended(match, hoursAfter(48))).toBe(false);
  });

  it("never cancels a walkover or a match under no-show review", () => {
    expect(
      isLadderMatchUnattended(base({ walkover: true }), hoursAfter(48)),
    ).toBe(false);
    expect(
      isLadderMatchUnattended(base({ noShowReported: true }), hoursAfter(48)),
    ).toBe(false);
  });

  it("never cancels once a game has been played or reported", () => {
    const match = base({ games: [{ approvalStatus: "pending" }] });
    expect(isLadderMatchUnattended(match, hoursAfter(48))).toBe(false);
    const scored = base({ games: [{ result: { winner: {} } }] });
    expect(isLadderMatchUnattended(scored, hoursAfter(48))).toBe(false);
  });
});
