import {
  decideLadderNoShowCloseOut,
  getLadderWalkoverSides,
  planLadderWalkover,
  planReportStrikes,
} from "../ladderReportSettlement";
import { getLadderMatchStartMs } from "../ladderAutoCancel";

const now = new Date("2026-11-19T09:00:00Z");
const singlesReport = (over = {}) => ({
  reportId: "r1",
  ladderId: "L1",
  ladderMatchId: "m1",
  reason: "no_show",
  reportedBy: "a",
  target: { type: "player", userIds: ["b"] },
  walkover: { winnerType: "player", winnerUserIds: ["a"] },
  status: "pending",
  ...over,
});

describe("planLadderWalkover", () => {
  const report = singlesReport();
  const sides = getLadderWalkoverSides(report, report.walkover);

  it("gives the winner a win and up to 50 CP from the no-show", () => {
    const plan = planLadderWalkover({
      walkover: report.walkover,
      sides,
      sideData: [
        { numberOfWins: 2, competitionXP: 100, matchResultLog: ["L"] },
        { numberOfLosses: 1, competitionXP: 30 },
      ],
      match: { matchStatus: "accepted" },
      mode: "approve",
      now,
    });
    expect(plan.cp).toBe(30);
    expect(plan.sideUpdates).toEqual([
      { numberOfWins: 3, matchResultLog: ["L", "W"], competitionXP: 130 },
      { numberOfLosses: 2, matchResultLog: ["L"], competitionXP: 0 },
    ]);
    expect(plan.matchUpdate).toMatchObject({ matchStatus: "completed", walkover: true, walkoverWinner: "a", walkoverCp: 30, completedAt: now });
  });

  it("undoes a walkover using the CP it moved", () => {
    const plan = planLadderWalkover({
      walkover: report.walkover,
      sides,
      sideData: [
        { numberOfWins: 3, competitionXP: 130, matchResultLog: ["L", "W"] },
        { numberOfLosses: 2, competitionXP: 0, matchResultLog: ["L"] },
      ],
      match: { matchStatus: "completed", walkoverCp: 30 },
      mode: "revert",
      now,
    });
    expect(plan.sideUpdates[0]).toEqual({ numberOfWins: 2, matchResultLog: ["L"], competitionXP: 100 });
    expect(plan.sideUpdates[1]).toEqual({ numberOfLosses: 1, matchResultLog: [], competitionXP: 30 });
    expect(plan.matchUpdate).toMatchObject({ matchStatus: "accepted", walkover: false, noShowReported: true });
  });

  it("refuses a completed match", () => {
    expect(() =>
      planLadderWalkover({ walkover: report.walkover, sides, sideData: [{}, {}], match: { matchStatus: "completed" }, mode: "approve", now }),
    ).toThrow("already been completed");
  });

  it("covers both ladder and global team docs in doubles", () => {
    const doubles = singlesReport({
      target: { type: "team", userIds: ["b", "c"], teamKey: "bc", teamId: "bc" },
      walkover: { winnerType: "team", winnerUserIds: ["a", "d"], winnerTeamKey: "ad", winnerTeamId: "ad" },
    });
    expect(getLadderWalkoverSides(doubles, doubles.walkover).map((side) => `${side.kind}:${side.id}:${side.role}`)).toEqual([
      "ladderTeam:ad:winner",
      "team:ad:winner",
      "ladderTeam:bc:loser",
      "team:bc:loser",
    ]);
  });
});

describe("planReportStrikes", () => {
  it("adds a no-show strike to the ladder tally and the player's conduct", () => {
    const plan = planReportStrikes({ report: singlesReport(), counts: [undefined], users: [{ conduct: { note: "x" } }], mode: "apply", now });
    expect(plan.countUpdates).toEqual([{ userId: "b", ladderId: "L1", teamKey: null, strikes: { no_show: 1 }, updatedAt: now }]);
    expect(plan.userUpdates).toEqual([{ conduct: { note: "x", strikes: { no_show: 1 }, lastReportedAt: now } }]);
  });
});

describe("decideLadderNoShowCloseOut", () => {
  const start = getLadderMatchStartMs("18-11-2026", "18:00");
  const at = (minutes) => ({ verifiedAt: new Date(start + minutes * 60_000), distanceMeters: 20, accuracyMeters: 10 });
  const match = (arrivals) => ({ matchDate: "18-11-2026", matchTime: { start: "18:00" }, arrivals });

  it("awards when only the claimant arrived and they aren't flagged", () => {
    const claim = singlesReport();
    expect(decideLadderNoShowCloseOut({ match: match({ a: at(5) }), claims: [claim], claimantHistory: [claim] })).toEqual({ award: true, report: claim });
  });

  it.each([
    ["claimant_not_arrived", match({}), [singlesReport()], []],
    ["opponent_arrived", match({ a: at(5), b: at(10) }), [singlesReport()], []],
    [
      "both_sides_claimed",
      match({ a: at(5) }),
      [singlesReport(), singlesReport({ reportId: "r2", reportedBy: "b", target: { type: "player", userIds: ["a"] }, walkover: { winnerType: "player", winnerUserIds: ["b"] } })],
      [],
    ],
    ["claimant_flagged", match({ a: at(5) }), [singlesReport()], [singlesReport({ reportId: "old", ladderId: "L0", status: "rejected" })]],
    [
      "claimant_flagged",
      match({ a: at(5) }),
      [singlesReport()],
      ["x", "y", "z"].map((reportId) => singlesReport({ reportId, status: "approved" })),
    ],
    ["no_claim", match({ a: at(5) }), [singlesReport({ status: "rejected" })], []],
  ])("doesn't award: %s", (reason, value, claims, claimantHistory) => {
    expect(decideLadderNoShowCloseOut({ match: value, claims, claimantHistory })).toEqual({ award: false, reason });
  });

  it("doesn't hold a claim the system closed against the claimant", () => {
    const claim = singlesReport();
    const closedBySystem = singlesReport({ reportId: "old", ladderId: "L0", status: "rejected", resolvedBy: "system" });
    expect(decideLadderNoShowCloseOut({ match: match({ a: at(5) }), claims: [claim], claimantHistory: [closedBySystem] })).toEqual({ award: true, report: claim });
  });

  it.each([
    ["no_claim", match({ a: at(5) }), [singlesReport({ status: "rejected" })], []],
  ])("doesn't award: %s", (reason, value, claims, claimantHistory) => {
    expect(decideLadderNoShowCloseOut({ match: value, claims, claimantHistory })).toEqual({ award: false, reason });
  });
});
