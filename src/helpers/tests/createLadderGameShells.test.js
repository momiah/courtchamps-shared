import { createLadderGameShells } from "../createLadderGameShells";
import { isShellGame } from "../advanceBrackets";

describe("createLadderGameShells", () => {
  it("returns bestOf shells (5 shells when bestOf = 5)", () => {
    expect(createLadderGameShells(5)).toHaveLength(5);
    expect(createLadderGameShells(3)).toHaveLength(3);
    expect(createLadderGameShells(9)).toHaveLength(9);
  });

  it("numbers the shells sequentially from 1", () => {
    const shells = createLadderGameShells(5);
    expect(shells.map((game) => game.gameNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("marks every shell as a shell game", () => {
    createLadderGameShells(5).forEach((game) => {
      expect(isShellGame(game)).toBe(true);
    });
  });

  it("seeds empty teams, scores, result and approval status", () => {
    const [shell] = createLadderGameShells(3);
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
    expect(createLadderGameShells(0)).toEqual([]);
    expect(createLadderGameShells(-2)).toEqual([]);
  });
});
