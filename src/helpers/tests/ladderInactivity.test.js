import {
  LADDER_INACTIVITY_REMOVAL_SEASON_DAY,
  getLadderInactivityRules,
  isLadderInactivityRemovedUser,
  LADDER_INACTIVITY_JOIN_GRACE_DAYS,
  LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE,
  LADDER_INACTIVITY_WARNING_DAYS,
  appliesLadderInactivityRemoval,
  getInactiveLadderEntrants,
  getLadderInactivityRemoval,
  getLadderInactivityRemovalMs,
  getLadderInactivityStep,
  getLadderInactivityWarning,
  isCompletedLadderMatchFor,
  isWithinLadderInactivityJoinGrace,
  markLadderInactivityWarningSent,
} from "../ladderInactivity";
import { LADDER_REGISTRATION_CLOSE_DAYS } from "../ladderDates";

const DAY_MS = 24 * 60 * 60 * 1000;
const closes = 1_800_000_000_000;
const removal = closes - LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE * DAY_MS;
const ladder = (over = {}) => ({
  name: "North London Singles",
  entryFee: 0,
  status: "registrationOpen",
  registrationClosesAt: new Date(closes),
  seasonStartedAt: new Date(closes - LADDER_REGISTRATION_CLOSE_DAYS * DAY_MS),
  ...over,
});
const daysBeforeRemoval = (days) => removal - days * DAY_MS;

describe("removal date", () => {
  it("is 14 days before registration closes", () => {
    expect(LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE).toBe(14);
    expect(getLadderInactivityRemovalMs(ladder())).toBe(closes - 14 * DAY_MS);
    expect(getLadderInactivityRemovalMs(ladder({ registrationClosesAt: null }))).toBeNull();
  });
});

describe("getLadderInactivityStep", () => {
  it("does nothing until the first warning day", () => {
    expect(LADDER_INACTIVITY_WARNING_DAYS).toEqual([7, 3, 1]);
    expect(getLadderInactivityStep(ladder(), daysBeforeRemoval(8))).toBeNull();
  });

  it("warns on each warning day once, counting back from the removal date", () => {
    const [first, second] = LADDER_INACTIVITY_WARNING_DAYS;
    expect(getLadderInactivityStep(ladder(), daysBeforeRemoval(first))).toEqual({ kind: "warn", daysLeft: first });
    expect(
      getLadderInactivityStep(ladder({ inactivityWarningDaysSent: [first] }), daysBeforeRemoval(first) + DAY_MS),
    ).toBeNull();
    expect(
      getLadderInactivityStep(ladder({ inactivityWarningDaysSent: [first] }), daysBeforeRemoval(second)),
    ).toEqual({ kind: "warn", daysLeft: second });
  });

  it("sends only the latest warning when earlier ones were missed", () => {
    expect(getLadderInactivityStep(ladder(), daysBeforeRemoval(2))).toEqual({ kind: "warn", daysLeft: 3 });
    expect(markLadderInactivityWarningSent([], 3)).toEqual([7, 3]);
    expect(
      getLadderInactivityStep(ladder({ inactivityWarningDaysSent: [7, 3] }), daysBeforeRemoval(1)),
    ).toEqual({ kind: "warn", daysLeft: 1 });
  });

  it("removes on the removal date while registration is still open, and only once", () => {
    expect(getLadderInactivityStep(ladder(), removal - 1)).not.toEqual({ kind: "remove" });
    expect(getLadderInactivityStep(ladder(), removal)).toEqual({ kind: "remove" });
    expect(getLadderInactivityStep(ladder({ inactivityRemovedAt: new Date(removal) }), removal)).toBeNull();
  });

  it("waits for the season to start", () => {
    expect(getLadderInactivityStep(ladder({ seasonStartedAt: null }), daysBeforeRemoval(1))).toBeNull();
    expect(getLadderInactivityStep(ladder({ seasonStartedAt: null }), removal)).toBeNull();
  });

  it("leaves paid ladders and ladders past registration alone", () => {
    expect(appliesLadderInactivityRemoval({ entryFee: 10 })).toBe(false);
    expect(getLadderInactivityStep(ladder({ entryFee: 10 }), removal)).toBeNull();
    expect(getLadderInactivityStep(ladder({ status: "registrationClosed" }), removal)).toBeNull();
    expect(getLadderInactivityStep(ladder({ registrationClosesAt: null }), removal)).toBeNull();
  });

  it("reads Firestore timestamps", () => {
    const registrationClosesAt = { toDate: () => new Date(closes) };
    const seasonStartedAt = { toDate: () => new Date(closes - LADDER_REGISTRATION_CLOSE_DAYS * DAY_MS) };
    expect(getLadderInactivityStep(ladder({ registrationClosesAt, seasonStartedAt }), removal)).toEqual({
      kind: "remove",
    });
  });
});

describe("inactive entrants", () => {
  const joinedEarly = new Date(removal - 20 * DAY_MS);
  const user = { entrantId: "user", playerIds: ["user"], joinedAt: joinedEarly };
  const opponent = { entrantId: "opponent", playerIds: ["opponent"], joinedAt: joinedEarly };
  const played = { matchStatus: "completed", participants: ["user", "opponent"] };

  it("counts a completed season match for both sides", () => {
    expect(getInactiveLadderEntrants([user, opponent], [played], removal)).toEqual([]);
  });

  it("ignores matches that aren't completed and playoff matches", () => {
    const matches = [
      { ...played, matchStatus: "accepted" },
      { ...played, matchStatus: "expired" },
      { ...played, playoffTieId: "tie1" },
    ];
    expect(getInactiveLadderEntrants([user, opponent], matches, removal)).toEqual([user, opponent]);
  });

  it("counts a walkover only for its winner", () => {
    const walkover = { ...played, walkover: true, walkoverWinner: "opponent" };
    expect(isCompletedLadderMatchFor(opponent, walkover)).toBe(true);
    expect(getInactiveLadderEntrants([user, opponent], [walkover], removal)).toEqual([user]);
  });

  it("counts doubles matches by team", () => {
    const team = { entrantId: "teamA", playerIds: ["user", "partner"], joinedAt: joinedEarly };
    const other = { entrantId: "teamB", playerIds: ["opponent", "opponentPartner"], joinedAt: joinedEarly };
    const idle = { entrantId: "teamC", playerIds: ["x", "y"], joinedAt: joinedEarly };
    const match = {
      matchStatus: "completed",
      participants: ["user", "partner", "opponent", "opponentPartner"],
      teams: [
        { teamId: "a", teamKey: "teamA", playerIds: ["user", "partner"] },
        { teamId: "b", teamKey: "teamB", playerIds: ["opponent", "opponentPartner"] },
      ],
    };
    expect(getInactiveLadderEntrants([team, other, idle], [match], removal)).toEqual([idle]);
  });

  it("keeps entrants who joined within 14 days of the removal date", () => {
    expect(LADDER_INACTIVITY_JOIN_GRACE_DAYS).toBe(14);
    const graceStart = removal - 14 * DAY_MS;
    const onTheLine = { entrantId: "a", playerIds: ["a"], joinedAt: new Date(graceStart) };
    const justInside = { entrantId: "b", playerIds: ["b"], joinedAt: { toDate: () => new Date(graceStart + 1) } };
    const unknown = { entrantId: "c", playerIds: ["c"] };
    expect(isWithinLadderInactivityJoinGrace(onTheLine, removal)).toBe(false);
    expect(isWithinLadderInactivityJoinGrace(justInside, removal)).toBe(true);
    expect(getInactiveLadderEntrants([onTheLine, justInside, unknown], [], removal)).toEqual([onTheLine, unknown]);
  });
});

describe("messages", () => {
  it("tells the user how long they have and what happens", () => {
    expect(getLadderInactivityWarning(ladder(), 3).message).toBe(
      "Play a match in North London Singles in the next 3 days, or you'll be removed from the ladder to make room for new players.",
    );
    expect(getLadderInactivityWarning(ladder(), 1).message).toContain("in the next 1 day,");
    expect(getLadderInactivityRemoval(ladder())).toEqual({
      title: "Removed from North London Singles",
      message:
        "You didn't play a match in North London Singles in time, so you've been removed from the ladder. You can join again next season.",
    });
  });
});

describe("rejoining and rules", () => {
  it("blocks only users removed from this ladder", () => {
    const removedLadder = ladder({ inactivityRemovedUserIds: ["idle"] });
    expect(isLadderInactivityRemovedUser(removedLadder, "idle")).toBe(true);
    expect(isLadderInactivityRemovedUser(removedLadder, "user")).toBe(false);
    expect(isLadderInactivityRemovedUser(ladder(), "idle")).toBe(false);
    expect(isLadderInactivityRemovedUser(removedLadder, null)).toBe(false);
  });

  it("states the rule with the real numbers", () => {
    const day = LADDER_REGISTRATION_CLOSE_DAYS - LADDER_INACTIVITY_REMOVAL_DAYS_BEFORE_CLOSE;
    expect(LADDER_INACTIVITY_REMOVAL_SEASON_DAY).toBe(day);
    expect(getLadderInactivityRules("team")).toEqual([
      `On free ladders, every team needs to play at least one match in the first ${day} days of the season.`,
      "Teams who haven't are removed then, 14 days before registration closes, so new players can take their place.",
      "You'll get a reminder 7, 3 and 1 days before.",
      "Teams who join less than 14 days before then keep their place.",
      "Teams removed for inactivity can't rejoin that ladder until next season.",
    ]);
  });
});
