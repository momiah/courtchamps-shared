import {
  LADDER_INACTIVITY_WARNING_DAYS,
  appliesLadderInactivityRemoval,
  getInactiveLadderEntrants,
  getLadderInactivityRemoval,
  getLadderInactivityStep,
  getLadderInactivityWarning,
  isCompletedLadderMatchFor,
  markLadderInactivityWarningSent,
} from "../ladderInactivity";

const DAY_MS = 24 * 60 * 60 * 1000;
const closes = 1_800_000_000_000;
const ladder = (over = {}) => ({
  name: "North London Singles",
  entryFee: 0,
  status: "registrationOpen",
  registrationClosesAt: new Date(closes),
  ...over,
});
const daysBefore = (days) => closes - days * DAY_MS;

describe("getLadderInactivityStep", () => {
  it("does nothing until the first warning day", () => {
    expect(getLadderInactivityStep(ladder(), daysBefore(15))).toBeNull();
  });

  it("warns on each warning day once", () => {
    const [first, second] = LADDER_INACTIVITY_WARNING_DAYS;
    expect(getLadderInactivityStep(ladder(), daysBefore(first))).toEqual({ kind: "warn", daysLeft: first });
    expect(
      getLadderInactivityStep(ladder({ inactivityWarningDaysSent: [first] }), daysBefore(first) + DAY_MS),
    ).toBeNull();
    expect(
      getLadderInactivityStep(ladder({ inactivityWarningDaysSent: [first] }), daysBefore(second)),
    ).toEqual({ kind: "warn", daysLeft: second });
  });

  it("sends only the latest warning when earlier ones were missed", () => {
    expect(getLadderInactivityStep(ladder(), daysBefore(2))).toEqual({ kind: "warn", daysLeft: 3 });
    expect(markLadderInactivityWarningSent([], 3)).toEqual([14, 7, 3]);
    expect(
      getLadderInactivityStep(ladder({ inactivityWarningDaysSent: [14, 7, 3] }), daysBefore(1)),
    ).toEqual({ kind: "warn", daysLeft: 1 });
  });

  it("removes once registration has closed, and only once", () => {
    expect(getLadderInactivityStep(ladder(), closes)).toEqual({ kind: "remove" });
    expect(getLadderInactivityStep(ladder({ inactivityRemovedAt: new Date(closes) }), closes)).toBeNull();
  });

  it("leaves paid ladders and ladders past registration alone", () => {
    expect(appliesLadderInactivityRemoval({ entryFee: 10 })).toBe(false);
    expect(getLadderInactivityStep(ladder({ entryFee: 10 }), closes)).toBeNull();
    expect(getLadderInactivityStep(ladder({ status: "registrationClosed" }), closes)).toBeNull();
    expect(getLadderInactivityStep(ladder({ registrationClosesAt: null }), closes)).toBeNull();
  });

  it("reads Firestore timestamps", () => {
    const registrationClosesAt = { toDate: () => new Date(closes) };
    expect(getLadderInactivityStep(ladder({ registrationClosesAt }), closes)).toEqual({ kind: "remove" });
  });
});

describe("inactive entrants", () => {
  const user = { entrantId: "user", playerIds: ["user"] };
  const opponent = { entrantId: "opponent", playerIds: ["opponent"] };
  const played = { matchStatus: "completed", participants: ["user", "opponent"] };

  it("counts a completed season match for both sides", () => {
    expect(getInactiveLadderEntrants([user, opponent], [played])).toEqual([]);
  });

  it("ignores matches that aren't completed and playoff matches", () => {
    const matches = [
      { ...played, matchStatus: "accepted" },
      { ...played, matchStatus: "expired" },
      { ...played, playoffTieId: "tie1" },
    ];
    expect(getInactiveLadderEntrants([user, opponent], matches)).toEqual([user, opponent]);
  });

  it("counts a walkover only for its winner", () => {
    const walkover = { ...played, walkover: true, walkoverWinner: "opponent" };
    expect(isCompletedLadderMatchFor(opponent, walkover)).toBe(true);
    expect(getInactiveLadderEntrants([user, opponent], [walkover])).toEqual([user]);
  });

  it("counts doubles matches by team", () => {
    const team = { entrantId: "teamA", playerIds: ["user", "partner"] };
    const other = { entrantId: "teamB", playerIds: ["opponent", "opponentPartner"] };
    const idle = { entrantId: "teamC", playerIds: ["x", "y"] };
    const match = {
      matchStatus: "completed",
      participants: ["user", "partner", "opponent", "opponentPartner"],
      teams: [
        { teamId: "a", teamKey: "teamA", playerIds: ["user", "partner"] },
        { teamId: "b", teamKey: "teamB", playerIds: ["opponent", "opponentPartner"] },
      ],
    };
    expect(getInactiveLadderEntrants([team, other, idle], [match])).toEqual([idle]);
  });
});

describe("messages", () => {
  it("tells the user how long they have and what happens", () => {
    expect(getLadderInactivityWarning(ladder(), 3).message).toBe(
      "Registration for North London Singles closes in 3 days. Play a match before then, or you'll be removed from the ladder.",
    );
    expect(getLadderInactivityWarning(ladder(), 1).message).toContain("closes in 1 day.");
    expect(getLadderInactivityRemoval(ladder())).toEqual({
      title: "Removed from North London Singles",
      message:
        "You didn't play a match in North London Singles before registration closed, so you've been removed from the ladder.",
    });
  });
});
