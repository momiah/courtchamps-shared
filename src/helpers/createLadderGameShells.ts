import type { Game } from "../types/game";

/**
 * Build `bestOf` empty {@link Game} shells for a ladder game. Each shell mirrors
 * the `gameSchema` defaults (empty teams/scores/result, `approvalStatus` ""),
 * carries a sequential `gameNumber` (1..bestOf), and is recognised by the
 * shared `isShellGame` helper (both teams have no `player1`).
 */
export const createLadderGameShells = (bestOf: number): Game[] => {
  const count = Math.max(0, Math.floor(bestOf));

  return Array.from({ length: count }, (_, index) => ({
    gameId: "",
    gamescore: "",
    date: "",
    team1: { player1: null, player2: null, score: 0 },
    team2: { player1: null, player2: null, score: 0 },
    result: null,
    numberOfApprovals: 0,
    numberOfDeclines: 0,
    approvalStatus: "",
    reporter: "",
    approvers: [],
    gameNumber: index + 1,
  }));
};
