import type { Game } from "../types/game";

/**
 * Build `bestOf` empty {@link Game} shells for a ladder match. Each shell
 * mirrors the `gameSchema` defaults (empty teams/scores/result, `approvalStatus`
 * ""), carries a sequential `gameNumber` (1..bestOf), and is recognised by the
 * shared `isShellGame` helper (both teams have no `player1`).
 *
 * When `ladderMatchId` is supplied, every shell is given a stable, unique
 * `gameId` (`{ladderMatchId}-g{n}`) so ladder games are identified by `gameId`
 * everywhere — aligning them with league/tournament games and letting the score
 * publish/approve flow locate a game by id rather than by display `gameNumber`.
 */
export const createLadderMatchGames = (
  bestOf: number,
  ladderMatchId?: string,
): Game[] => {
  const count = Math.max(0, Math.floor(bestOf));

  return Array.from({ length: count }, (_, index) => {
    const gameNumber = index + 1;
    return {
      gameId: ladderMatchId ? `${ladderMatchId}-g${gameNumber}` : "",
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
      gameNumber,
    };
  });
};
