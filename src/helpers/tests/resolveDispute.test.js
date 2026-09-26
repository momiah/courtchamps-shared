import { planDisputeResolution, DisputeResolutionError } from "../resolveDispute";
import { normalizeTeamKey } from "../generateInitialTeamStats";

const detail = () => ({
  XP: 500, prevGameXP: 0, numberOfGamesPlayed: 0, numberOfWins: 0,
  numberOfLosses: 0, winPercentage: 0, highestWinStreak: 0, highestLossStreak: 0,
  winStreak3: 0, winStreak5: 0, winStreak7: 0, totalPoints: 0, demonWin: 0,
  totalPointDifference: 0, lastActive: null,
});
const user = (userId) => ({ userId, username: userId, profileDetail: detail() });
const team = (ids) => ({
  team: ids.slice().sort(), teamKey: normalizeTeamKey(ids), teamId: normalizeTeamKey(ids),
  playerIds: ids, numberOfWins: 0, numberOfLosses: 0, numberOfGamesPlayed: 0,
  resultLog: [], matchResultLog: [], pointDifferenceLog: [], averagePointDifference: 0,
  totalPointDifference: 0, currentStreak: 0, highestWinStreak: 0, highestLossStreak: 0,
  winStreak3: 0, winStreak5: 0, winStreak7: 0, demonWin: 0, lossesTo: {}, rival: null,
  XP: 100, prevGameXP: 0,
});
const P = (userId) => ({ userId });
const game = (a, b) => ({
  gameId: "g1", date: "22-09-2026", approvalStatus: "pending",
  team1: { player1: P("mm"), player2: P("sl"), score: a },
  team2: { player1: P("ak"), player2: P("jp"), score: b },
  result: a > b
    ? { winner: { team: "Team 1", players: ["mm", "sl"], score: a }, loser: { team: "Team 2", players: ["ak", "jp"], score: b } }
    : { winner: { team: "Team 2", players: ["ak", "jp"], score: b }, loser: { team: "Team 1", players: ["mm", "sl"], score: a } },
});
const dispute = {
  disputeId: "d1", gameId: "g1", ladderType: "Doubles", openedBy: "ak",
  originalGame: game(21, 18), disputedGame: game(18, 21),
  events: [{ type: "opened", stage: "under_review", createdBy: "ak", createdAt: new Date(0) }],
  adminNotes: null,
};
const match = () => ({
  matchStatus: "accepted", bestOf: 1, games: [game(21, 18)],
  teams: [{ teamKey: normalizeTeamKey(["mm", "sl"]) }, { teamKey: normalizeTeamKey(["ak", "jp"]) }],
});
const input = (resolution, over = {}) => ({
  dispute, match: match(), participants: [],
  users: ["mm", "sl", "ak", "jp"].map(user),
  ladderTeams: [team(["mm", "sl"]), team(["ak", "jp"])],
  resolution, actorId: "ak", now: new Date(1000), ...over,
});

describe("planDisputeResolution", () => {
  it("cancelling keeps and scores the original game", async () => {
    const plan = await planDisputeResolution(input("cancelled"));
    expect(plan.finalGame.team1.score).toBe(21);
    expect(plan.finalGame.approvalStatus).toBe("approved");
    expect(plan.matchUpdate.matchStatus).toBe("completed");
    const winner = plan.teams.find((t) => t.teamKey === normalizeTeamKey(["mm", "sl"]));
    expect(winner.numberOfWins).toBe(1);
    expect(plan.disputeUpdate.resolution).toBe("cancelled");
    expect(plan.disputeUpdate.resolvedBy).toBe("ak");
    expect(plan.disputeUpdate.events.at(-1)).toMatchObject({ type: "cancelled", stage: "resolved", createdBy: "ak" });
  });

  it("upholding applies the disputed game with the admin note", async () => {
    const plan = await planDisputeResolution(input("upheld", { actorId: "admin", note: " Clear on video " }));
    expect(plan.finalGame.team2.score).toBe(21);
    expect(plan.disputeUpdate.adminNotes).toBe("Clear on video");
    expect(plan.disputeUpdate.events.at(-1)).toMatchObject({ type: "resolved", note: "Clear on video" });
  });

  it("voids as a 'voided' phase", async () => {
    const plan = await planDisputeResolution(input("void", { actorId: "system" }));
    expect(plan.disputeUpdate.events.at(-1).type).toBe("voided");
    expect(plan.disputeUpdate.evidenceDueAt).toBeNull();
  });

  it("refuses a completed match or a missing game", async () => {
    await expect(planDisputeResolution(input("rejected", { match: { ...match(), matchStatus: "completed" } }))).rejects.toBeInstanceOf(DisputeResolutionError);
    await expect(planDisputeResolution(input("rejected", { match: { ...match(), games: [] } }))).rejects.toBeInstanceOf(DisputeResolutionError);
  });
});
