import {
  resolveLadderMatchOutcome,
  teamUserIds,
  isLadderGameApproved,
  ladderDecider,
  isLadderMatchReportDecided,
  getReportableLadderGameId,
  hasOpenLadderDispute,
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

// A reported (but not yet approved) win, so the lock triggers before approval.
const reported = (winnerTeam, id, gameNumber) => ({
  gameId: id,
  gameNumber,
  approvalStatus: "Pending",
  team1: { player1: { userId: "a" }, player2: null },
  team2: { player1: { userId: "b" }, player2: null },
  result: { winner: { team: winnerTeam }, loser: {} },
});
const empty = (id, gameNumber) => ({
  gameId: id,
  gameNumber,
  approvalStatus: "",
  result: null,
});

// Best-of-5 shells reported to a given running score, padded with empties.
const bo5 = (...winners) =>
  Array.from({ length: 5 }, (_, i) =>
    winners[i]
      ? reported(winners[i], `g${i + 1}`, i + 1)
      : empty(`g${i + 1}`, i + 1),
  );

describe("isLadderMatchReportDecided", () => {
  it("locks a best-of-5 once a side reports the 3rd win (3-0)", () => {
    expect(isLadderMatchReportDecided(bo5("Team 1", "Team 1", "Team 1"), 5)).toBe(
      true,
    );
  });

  it("is not decided at 2-1", () => {
    expect(isLadderMatchReportDecided(bo5("Team 1", "Team 2", "Team 1"), 5)).toBe(
      false,
    );
  });

  it("locks at 3-1 but not at 2-2", () => {
    expect(
      isLadderMatchReportDecided(bo5("Team 1", "Team 1", "Team 2", "Team 1"), 5),
    ).toBe(true);
    expect(
      isLadderMatchReportDecided(bo5("Team 1", "Team 2", "Team 1", "Team 2"), 5),
    ).toBe(false);
  });
});

describe("getReportableLadderGameId", () => {
  it("opens game 1 first and then each next shell in order", () => {
    expect(getReportableLadderGameId(bo5(), 5)).toBe("g1");
    expect(getReportableLadderGameId(bo5("Team 1"), 5)).toBe("g2");
    expect(getReportableLadderGameId(bo5("Team 1", "Team 2"), 5)).toBe("g3");
  });

  it("opens the 4th game at 2-1 and the 5th at 2-2", () => {
    expect(
      getReportableLadderGameId(bo5("Team 1", "Team 2", "Team 1"), 5),
    ).toBe("g4");
    expect(
      getReportableLadderGameId(bo5("Team 1", "Team 2", "Team 1", "Team 2"), 5),
    ).toBe("g5");
  });

  it("locks every remaining shell once the match is decided", () => {
    expect(
      getReportableLadderGameId(bo5("Team 1", "Team 1", "Team 1"), 5),
    ).toBeNull(); // 3-0, games 4 & 5 dead
    expect(
      getReportableLadderGameId(bo5("Team 1", "Team 1", "Team 2", "Team 1"), 5),
    ).toBeNull(); // 3-1, game 5 dead
  });

  it("finds the next shell by game order, not array order", () => {
    const shuffled = [
      empty("g3", 3),
      reported("Team 1", "g1", 1),
      empty("g2", 2),
    ];
    expect(getReportableLadderGameId(shuffled, 5)).toBe("g2");
  });
});

describe("hasOpenLadderDispute", () => {
  it("is true only when a game is still disputed", () => {
    expect(
      hasOpenLadderDispute([
        { gameId: "g1", approvalStatus: "approved" },
        { gameId: "g2", approvalStatus: "disputed" },
      ]),
    ).toBe(true);
    expect(
      hasOpenLadderDispute([
        { gameId: "g1", approvalStatus: "approved" },
        { gameId: "g2", approvalStatus: "pending" },
      ]),
    ).toBe(false);
  });
});
