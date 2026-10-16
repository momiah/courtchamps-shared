import {
  LADDER_POSTING_CLOSE_DAYS,
  LADDER_RESULTS_CLOSE_DAYS,
  LADDER_STANDINGS_FINAL_DAYS,
  getLadderPostingDeadline,
  getLadderResultsDeadline,
  getLadderStandingsDeadline,
  isLadderMatchClosedByResults,
  isLadderPostingClosed,
  isLadderResultsClosed,
  isLadderStandingsFinal,
} from "../ladderSeasonClose";

const DAY = 24 * 60 * 60 * 1000;
const playoffStartsAt = new Date("2026-11-20T09:00:00Z");
const ladder = { playoffStartsAt };
const before = (days, ms = 0) => new Date(playoffStartsAt.getTime() - days * DAY + ms);

describe("ladder season close", () => {
  it("closes posting 7 days, results 5 days and standings 1 day before playoffs", () => {
    expect([LADDER_POSTING_CLOSE_DAYS, LADDER_RESULTS_CLOSE_DAYS, LADDER_STANDINGS_FINAL_DAYS]).toEqual([7, 5, 1]);
    expect(getLadderPostingDeadline(ladder)).toEqual(before(7));
    expect(getLadderResultsDeadline(ladder)).toEqual(before(5));
    expect(getLadderStandingsDeadline(ladder)).toEqual(before(1));
  });

  it("reads Firestore timestamps and has no deadlines without a playoff date", () => {
    expect(getLadderResultsDeadline({ playoffStartsAt: { toDate: () => playoffStartsAt } })).toEqual(before(5));
    expect(getLadderPostingDeadline({ playoffStartsAt: null })).toBeNull();
    expect(isLadderPostingClosed({ playoffStartsAt: null }, new Date())).toBe(false);
    expect(isLadderResultsClosed(undefined, {}, new Date())).toBe(false);
  });

  it("switches on at each deadline", () => {
    expect(isLadderPostingClosed(ladder, before(7, -1))).toBe(false);
    expect(isLadderPostingClosed(ladder, before(7))).toBe(true);
    expect(isLadderStandingsFinal(ladder, before(1, -1))).toBe(false);
    expect(isLadderStandingsFinal(ladder, before(1))).toBe(true);
  });

  it("closes results for regular matches only, never a playoff match", () => {
    expect(isLadderResultsClosed(ladder, {}, before(5, -1))).toBe(false);
    expect(isLadderResultsClosed(ladder, {}, before(5))).toBe(true);
    expect(isLadderResultsClosed(ladder, { playoffTieId: "r1-s0" }, before(0))).toBe(false);
  });
});

describe("isLadderMatchClosedByResults", () => {
  const accepted = (over = {}) => ({ matchStatus: "accepted", games: [{ approvalStatus: "approved" }, { approvalStatus: "" }], ...over });
  const after = before(5);

  it("closes an accepted regular match once results close, keeping approved games", () => {
    expect(isLadderMatchClosedByResults(ladder, accepted(), before(5, -1))).toBe(false);
    expect(isLadderMatchClosedByResults(ladder, accepted(), after)).toBe(true);
  });

  it.each([
    ["a game awaiting approval", accepted({ games: [{ approvalStatus: "pending" }] })],
    ["an open dispute", accepted({ games: [{ approvalStatus: "disputed" }] })],
    ["a no-show claim", accepted({ noShowReported: true })],
    ["a playoff match", accepted({ playoffTieId: "r1-s0" })],
    ["a completed match", accepted({ matchStatus: "completed" })],
  ])("waits for %s", (_, match) => {
    expect(isLadderMatchClosedByResults(ladder, match, after)).toBe(false);
  });
});
