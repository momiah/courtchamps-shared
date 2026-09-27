import {
  resolveLadderMatchOutcome,
  teamUserIds,
  isLadderGameApproved,
  ladderDecider,
  isLadderMatchReportDecided,
} from "../ladderMatchResult";

const approvedGame = (winnerTeam) => ({
  gameId: "g",
  approvalStatus: "approved",
  team1: { player1: { userId: "a" }, player2: null, score: 0 },
  team2: { player1: { userId: "b" }, player2: null, score: 0 },
  result: { winner: { team: winnerTeam }, loser: {} },
});

const pendingGame = () => ({
  gameId: "g",
  approvalStatus: "Pending",
  team1: { player1: { userId: "a" }, player2: null },
  team2: { player1: { userId: "b" }, player2: null },
  result: null,
});

describe("resolveLadderMatchOutcome", () => {
  it("is undecided before a side reaches the best-of majority", () => {
    const games = [approvedGame("Team 1"), pendingGame(), pendingGame()];
    expect(resolveLadderMatchOutcome(games, 3)).toEqual({
      decided: false,
      winnerTeam: null,
    });
  });

  it("decides once a side clinches the majority (2-0 in a best-of-3)", () => {
    const games = [approvedGame("Team 1"), approvedGame("Team 1"), pendingGame()];
    expect(resolveLadderMatchOutcome(games, 3)).toEqual({
      decided: true,
      winnerTeam: "Team 1",
    });
  });

  it("resolves a best-of-1 from a single approved game", () => {
    expect(resolveLadderMatchOutcome([approvedGame("Team 2")], 1)).toEqual({
      decided: true,
      winnerTeam: "Team 2",
    });
  });

  it("ignores unapproved games when tallying", () => {
    const games = [approvedGame("Team 2"), pendingGame()];
    expect(resolveLadderMatchOutcome(games, 3).decided).toBe(false);
  });
});

describe("teamUserIds", () => {
  it("returns the userIds on the requested side", () => {
    const game = approvedGame("Team 1");
    expect(teamUserIds(game, "Team 1")).toEqual(["a"]);
    expect(teamUserIds(game, "Team 2")).toEqual(["b"]);
  });
});

describe("isLadderGameApproved", () => {
  it("is true only for approved games", () => {
    expect(isLadderGameApproved(approvedGame("Team 1"))).toBe(true);
    expect(isLadderGameApproved(pendingGame())).toBe(false);
  });
});

describe("ladderDecider", () => {
  it("is the wins needed to clinch each best-of", () => {
    expect(ladderDecider(5)).toBe(3);
    expect(ladderDecider(7)).toBe(4);
    expect(ladderDecider(9)).toBe(5);
    expect(ladderDecider(11)).toBe(6);
  });
});

describe("isLadderMatchReportDecided", () => {
  // A reported (but not yet approved) win, so the lock triggers before approval.
  const reported = (winnerTeam, id) => ({
    gameId: id,
    approvalStatus: "Pending",
    team1: { player1: { userId: "a" }, player2: null },
    team2: { player1: { userId: "b" }, player2: null },
    result: { winner: { team: winnerTeam }, loser: {} },
  });
  const empty = (id) => ({ gameId: id, approvalStatus: "", result: null });

  it("locks a best-of-5 once a side reports the 3rd win (3-0)", () => {
    const games = [
      reported("Team 1", "g1"),
      reported("Team 1", "g2"),
      reported("Team 1", "g3"),
      empty("g4"),
      empty("g5"),
    ];
    expect(isLadderMatchReportDecided(games, 5)).toBe(true);
    // Reporting the 4th shell is refused (it is a dead rubber).
    expect(isLadderMatchReportDecided(games, 5, "g4")).toBe(true);
  });

  it("still allows the 4th game at 2-1", () => {
    const games = [
      reported("Team 1", "g1"),
      reported("Team 2", "g2"),
      reported("Team 1", "g3"),
      empty("g4"),
      empty("g5"),
    ];
    expect(isLadderMatchReportDecided(games, 5, "g4")).toBe(false);
  });

  it("locks the 5th game at 3-1 but allows it at 2-2", () => {
    const at31 = [
      reported("Team 1", "g1"),
      reported("Team 1", "g2"),
      reported("Team 2", "g3"),
      reported("Team 1", "g4"),
      empty("g5"),
    ];
    expect(isLadderMatchReportDecided(at31, 5, "g5")).toBe(true);

    const at22 = [
      reported("Team 1", "g1"),
      reported("Team 2", "g2"),
      reported("Team 1", "g3"),
      reported("Team 2", "g4"),
      empty("g5"),
    ];
    expect(isLadderMatchReportDecided(at22, 5, "g5")).toBe(false);
  });

  it("ignores the game being written so an existing report can be edited", () => {
    const games = [
      reported("Team 1", "g1"),
      reported("Team 1", "g2"),
      reported("Team 1", "g3"),
    ];
    // Re-reporting g3 checks only g1+g2 (2-0), which has not clinched.
    expect(isLadderMatchReportDecided(games, 5, "g3")).toBe(false);
  });
});
