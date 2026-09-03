import { createLadderMatchGames } from "../createLadderMatchGames";
import { isShellGame } from "../advanceBrackets";

describe("createLadderMatchGames", () => {
  it("returns bestOf shells (5 shells when bestOf = 5)", () => {
    expect(createLadderMatchGames(5)).toHaveLength(5);
    expect(createLadderMatchGames(3)).toHaveLength(3);
    expect(createLadderMatchGames(9)).toHaveLength(9);
  });

  it("numbers the shells sequentially from 1", () => {
    const shells = createLadderMatchGames(5);
    expect(shells.map((game) => game.gameNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("marks every shell as a shell game", () => {
    createLadderMatchGames(5).forEach((game) => {
      expect(isShellGame(game)).toBe(true);
    });
  });

  it("seeds empty teams, scores, result and approval status", () => {
    const [shell] = createLadderMatchGames(3);
    expect(shell.team1.player1).toBeNull();
    expect(shell.team2.player1).toBeNull();
    expect(shell.team1.score).toBe(0);
    expect(shell.team2.score).toBe(0);
    expect(shell.result).toBeNull();
    expect(shell.approvalStatus).toBe("");
    expect(shell.numberOfApprovals).toBe(0);
    expect(shell.numberOfDeclines).toBe(0);
  });

  it("returns no shells for a non-positive bestOf", () => {
    expect(createLadderMatchGames(0)).toEqual([]);
    expect(createLadderMatchGames(-2)).toEqual([]);
  });

  it("leaves gameId empty when no ladderMatchId is supplied", () => {
    createLadderMatchGames(3).forEach((game) => {
      expect(game.gameId).toBe("");
    });
  });

  it("assigns stable, unique gameIds when a ladderMatchId is supplied", () => {
    const shells = createLadderMatchGames(3, "match123");
    expect(shells.map((game) => game.gameId)).toEqual([
      "match123-g1",
      "match123-g2",
      "match123-g3",
    ]);
    // still detected as shells despite having ids
    shells.forEach((game) => expect(isShellGame(game)).toBe(true));
  });
});
