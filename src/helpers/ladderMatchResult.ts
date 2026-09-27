import { notificationTypes } from "../schema";
import type { Game } from "../types";

const APPROVED_GAME = notificationTypes.RESPONSE.APPROVED_GAME;

/** A ladder game counts towards a match result only once it is fully approved. */
export const isLadderGameApproved = (game: Game): boolean =>
  game.approvalStatus === APPROVED_GAME;

type TeamLabel = "Team 1" | "Team 2";

export interface LadderMatchOutcome {
  /** True once one side has clinched the best-of (or every game is in). */
  decided: boolean;
  winnerTeam: TeamLabel | null;
}

/** Wins needed to clinch a best-of: 3 (bo5), 4 (bo7), 5 (bo9), 6 (bo11). */
export const ladderDecider = (bestOf: number): number =>
  Math.floor(bestOf / 2) + 1;

/**
 * True once a side has reached the best-of decider counting every game with a
 * reported result (pending, approved or disputed), not just approved ones. The
 * winning side can never exceed the decider, so this locks the remaining shells
 * the instant a match is mathematically over — before approvals land.
 */
export const isLadderMatchReportDecided = (
  games: Game[],
  bestOf: number,
): boolean => {
  let team1Wins = 0;
  let team2Wins = 0;
  for (const game of games) {
    if (game.result?.winner.team === "Team 1") team1Wins += 1;
    else if (game.result?.winner.team === "Team 2") team2Wins += 1;
  }
  const decider = ladderDecider(bestOf);
  return team1Wins >= decider || team2Wins >= decider;
};

/**
 * The one shell a player may report next: the first game in play order that has
 * no result yet, or null once the match is decided (or every game is in). Games
 * are reported strictly one at a time from game 1, and the decider locks the
 * rest, so this is the single gate the write path and the lobby both use.
 */
export const getReportableLadderGameId = (
  games: Game[],
  bestOf: number,
): string | null => {
  if (isLadderMatchReportDecided(games, bestOf)) return null;
  const next = [...games]
    .sort((a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0))
    .find((game) => !game.result);
  return next?.gameId ?? null;
};

/**
 * True while any game is still under dispute. A match must not be treated as
 * decided or completed until every dispute resolves, since a disputed game's
 * result is still contested and could change the outcome.
 */
export const hasOpenLadderDispute = (games: Game[]): boolean =>
  games.some((game) => game.approvalStatus === "disputed");

/**
 * Resolve a ladder match from its games: tally approved game wins per side and
 * decide once a side reaches the best-of majority. Falls back to the higher
 * tally when every game is approved but no majority was reached.
 */
export const resolveLadderMatchOutcome = (
  games: Game[],
  bestOf: number,
): LadderMatchOutcome => {
  const approved = games.filter(isLadderGameApproved);

  let team1Wins = 0;
  let team2Wins = 0;
  for (const game of approved) {
    if (game.result?.winner.team === "Team 1") team1Wins += 1;
    else if (game.result?.winner.team === "Team 2") team2Wins += 1;
  }

  const majority = ladderDecider(bestOf);
  if (team1Wins >= majority) return { decided: true, winnerTeam: "Team 1" };
  if (team2Wins >= majority) return { decided: true, winnerTeam: "Team 2" };

  if (games.length > 0 && approved.length === games.length) {
    if (team1Wins > team2Wins) return { decided: true, winnerTeam: "Team 1" };
    if (team2Wins > team1Wins) return { decided: true, winnerTeam: "Team 2" };
  }

  return { decided: false, winnerTeam: null };
};

/** userIds on one side of a game (player2 is doubles-only, hence filtered). */
export const teamUserIds = (game: Game, team: TeamLabel): string[] => {
  const side = team === "Team 1" ? game.team1 : game.team2;
  return [side.player1?.userId, side.player2?.userId].filter(
    (id): id is string => Boolean(id),
  );
};
