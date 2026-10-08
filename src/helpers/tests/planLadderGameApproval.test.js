import { planLadderGameApproval } from "../planLadderGameApproval";

const NOW = new Date("2026-10-01T12:00:00Z");

const makeUser = (userId, XP = 500) => ({
  userId,
  username: userId,
  profileDetail: {
    XP,
    prevGameXP: 0,
    numberOfGamesPlayed: 0,
    numberOfWins: 0,
    numberOfLosses: 0,
    winPercentage: 0,
    highestWinStreak: 0,
    highestLossStreak: 0,
    winStreak3: 0,
    winStreak5: 0,
    winStreak7: 0,
    totalPoints: 0,
    demonWin: 0,
    totalPointDifference: 0,
    lastActive: null,
  },
});

const makeParticipant = (userId, competitionXP = 100) => ({
  userId,
  username: userId,
  competitionXP,
  prevGameXP: 0,
  numberOfGamesPlayed: 0,
  numberOfWins: 0,
  numberOfLosses: 0,
  winPercentage: 0,
  resultLog: [],
  matchResultLog: [],
  pointDifferenceLog: [],
  totalPointDifference: 0,
  averagePointDifference: 0,
  currentStreak: { type: null, count: 0 },
  highestWinStreak: 0,
  highestLossStreak: 0,
  winStreak3: 0,
  winStreak5: 0,
  winStreak7: 0,
  demonWin: 0,
  totalPoints: 0,
});

const makeGame = (gameId, over = {}) => ({
  gameId,
  gameNumber: 1,
  date: "17-09-2026",
  reporter: "a",
  approvalStatus: "pending",
  numberOfApprovals: 0,
  numberOfDeclines: 0,
  approvers: [],
  team1: { player1: { userId: "a" } },
  team2: { player1: { userId: "b" } },
  result: {
    winner: { team: "Team 1", players: ["a"], score: 21 },
    loser: { team: "Team 2", players: ["b"], score: 15 },
  },
  ...over,
});

const makeMatch = (games, over = {}) => ({
  ladderMatchId: "m1",
  bestOf: 5,
  participants: ["a", "b"],
  matchStatus: "accepted",
  games,
  ...over,
});

const run = (match, gameId, actor, over = {}) =>
  planLadderGameApproval({
    match,
    gameId,
    actor,
    ladderStatus: "registrationClosed",
    participants: [makeParticipant("a"), makeParticipant("b")],
    users: [makeUser("a"), makeUser("b")],
    ladderTeams: [],
    now: NOW,
    ...over,
  });

const opponent = { kind: "user", userId: "b", username: "b" };
const reporter = { kind: "user", userId: "a", username: "a" };

describe("planLadderGameApproval", () => {
  it("scores the game and records the approver when the opponent approves", async () => {
    const result = await run(makeMatch([makeGame("g1")]), "g1", opponent);
    expect(result.ok).toBe(true);
    expect(result.fullyApproved).toBe(true);
    expect(result.nextMatch.games[0].approvalStatus).toBe("approved");
    expect(result.nextMatch.games[0].approvers).toEqual([
      { userId: "b", username: "b" },
    ]);
    const winner = result.participants.find((p) => p.userId === "a");
    expect(winner.competitionXP).toBeGreaterThan(100);
    expect(result.users).toHaveLength(2);
  });

  it("blocks the reporter from approving their own game", async () => {
    const result = await run(makeMatch([makeGame("g1")]), "g1", reporter);
    expect(result).toEqual({ ok: false, reason: "not_opponent" });
  });

  it("blocks a user who already approved and an already-approved game", async () => {
    const approved = makeGame("g1", { approvalStatus: "approved" });
    expect((await run(makeMatch([approved]), "g1", opponent)).reason).toBe(
      "unavailable",
    );
    const twice = makeGame("g1", { approvers: [{ userId: "b", username: "b" }] });
    expect((await run(makeMatch([twice]), "g1", opponent)).reason).toBe(
      "unavailable",
    );
  });

  it("blocks disputed games and games with no result", async () => {
    const disputed = makeGame("g1", { approvalStatus: "disputed" });
    expect((await run(makeMatch([disputed]), "g1", opponent)).reason).toBe(
      "unavailable",
    );
    const empty = makeGame("g1", { result: null });
    expect((await run(makeMatch([empty]), "g1", opponent)).reason).toBe(
      "unavailable",
    );
  });

  it("reports an unknown game", async () => {
    const result = await run(makeMatch([makeGame("g1")]), "nope", opponent);
    expect(result).toEqual({ ok: false, reason: "game_not_found" });
  });

  it.each(["playoffs", "completed", "cancelled"])(
    "refuses to action any game once the ladder is %s",
    async (ladderStatus) => {
      const user = await run(makeMatch([makeGame("g1")]), "g1", opponent, {
        ladderStatus,
      });
      const auto = await run(makeMatch([makeGame("g1")]), "g1", { kind: "auto" }, {
        ladderStatus,
      });
      expect(user).toEqual({ ok: false, reason: "ladder_frozen" });
      expect(auto).toEqual({ ok: false, reason: "ladder_frozen" });
    },
  );

  it("auto-approves as the system without needing an opponent", async () => {
    const result = await run(makeMatch([makeGame("g1")]), "g1", { kind: "auto" });
    expect(result.ok).toBe(true);
    const game = result.nextMatch.games[0];
    expect(game.autoApproved).toBe(true);
    expect(game.autoApprovedAt).toEqual(NOW);
    expect(game.approvers).toEqual([
      { userId: "system", username: "AutoApproval" },
    ]);
  });

  it("completes the match on the clinching game and stamps completion", async () => {
    const games = [
      makeGame("g1", { gameNumber: 1, approvalStatus: "approved" }),
      makeGame("g2", { gameNumber: 2, approvalStatus: "approved" }),
      makeGame("g3", { gameNumber: 3 }),
    ];
    const result = await run(makeMatch(games), "g3", opponent);
    expect(result.matchCompleted).toBe(true);
    expect(result.matchUpdate.matchStatus).toBe("completed");
    expect(result.matchUpdate.completedAt).toEqual(NOW);
    expect(result.participants.find((p) => p.userId === "a").matchResultLog).toEqual([
      "W",
    ]);
  });

  it("holds completion while another game is disputed", async () => {
    const games = [
      makeGame("g1", { gameNumber: 1, approvalStatus: "approved" }),
      makeGame("g2", { gameNumber: 2, approvalStatus: "approved" }),
      makeGame("g3", { gameNumber: 3 }),
      makeGame("g4", { gameNumber: 4, approvalStatus: "disputed" }),
    ];
    const result = await run(makeMatch(games), "g3", opponent);
    expect(result.ok).toBe(true);
    expect(result.matchCompleted).toBe(false);
    expect(result.matchUpdate.matchStatus).toBeUndefined();
  });

  it("does not complete a match twice", async () => {
    const games = [
      makeGame("g1", { gameNumber: 1, approvalStatus: "approved" }),
      makeGame("g2", { gameNumber: 2, approvalStatus: "approved" }),
      makeGame("g3", { gameNumber: 3 }),
    ];
    const result = await run(
      makeMatch(games, { matchStatus: "completed" }),
      "g3",
      opponent,
    );
    expect(result.matchCompleted).toBe(false);
  });

  it("can be chained over several games with the returned match", async () => {
    let match = makeMatch([
      makeGame("g1", { gameNumber: 1 }),
      makeGame("g2", { gameNumber: 2 }),
      makeGame("g3", { gameNumber: 3 }),
    ]);
    let participants = [makeParticipant("a"), makeParticipant("b")];
    const users = [makeUser("a"), makeUser("b")];
    let completed = false;
    for (const gameId of ["g1", "g2", "g3"]) {
      const result = await planLadderGameApproval({
        match,
        gameId,
        actor: { kind: "auto" },
        ladderStatus: "registrationClosed",
        participants,
        users,
        ladderTeams: [],
        now: NOW,
      });
      match = result.nextMatch;
      participants = result.participants;
      completed = completed || result.matchCompleted;
    }
    expect(completed).toBe(true);
    expect(match.matchStatus).toBe("completed");
    expect(participants.find((p) => p.userId === "a").numberOfWins).toBe(3);
  });
});
