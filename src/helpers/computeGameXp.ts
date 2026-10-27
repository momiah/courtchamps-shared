export interface ComputeGameXpParams {
  /** The current streak type ("W" / "L") for the entity being scored. */
  streakType: string | null;
  /** The current streak count (positive for wins, negative for losses). */
  streakCount: number;
  /** Combined XP of the winning side (drives the rank/upset multiplier). */
  combinedWinnerXp: number;
  /** Combined XP of the losing side. */
  combinedLoserXp: number;
  winnerScore: number;
  loserScore: number;
}

export interface GameXpBreakdown {
  /**
   * The streak XP component: `baseXP × streak multiplier`. This is the base
   * value the ladder-only bonuses multiply.
   */
  streakXp: number;
  /** The rank/upset XP: `streakXp × rankMultiplier`. */
  rankXp: number;
  /** The demon bonus for a decisive margin (see {@link DECISIVE_WIN_MARGIN}). */
  demonBonus: number;
  /** `streakXp + rankXp + demonBonus`, the standard per-game XP delta. */
  finalXp: number;
}

/** The CP a game is worth before any multiplier: gained on a win, lost on a defeat. */
export const GAME_XP_BASE = { WIN: 20, LOSS: -15 } as const;

/**
 * Win-streak multipliers, longest streak first: the first whose `streak` the
 * current run reaches applies. A single win (no streak) is ×1.
 */
export const WIN_STREAK_XP_MULTIPLIERS = [
  { streak: 7, multiplier: 5 },
  { streak: 5, multiplier: 4 },
  { streak: 3, multiplier: 3 },
  { streak: 2, multiplier: 2 },
] as const;

/** Losing-streak multipliers on the CP lost, longest streak first. */
export const LOSS_STREAK_XP_MULTIPLIERS = [
  { streak: 7, multiplier: 3 },
  { streak: 5, multiplier: 2.5 },
  { streak: 3, multiplier: 2 },
  { streak: 2, multiplier: 1.5 },
] as const;

/**
 * Rank gap: once the loser has at least `MIN_RATIO` times the winner's CP, the
 * winner earns that ratio times their streak CP again on top (capped at
 * `MAX_MULTIPLIER`), and the higher-ranked loser loses the same extra.
 */
export const RANK_GAP_XP = { MIN_RATIO: 2, MAX_MULTIPLIER: 3 } as const;

/** Winning a game by at least this many points (an Assassin) doubles its CP swing. */
export const DECISIVE_WIN_MARGIN = 10;

/** How much a decisive (Assassin) win multiplies the game's CP swing. */
export const DECISIVE_WIN_XP_MULTIPLIER = 2;

/** The streak multiplier for a run of `streak` games (wins or losses). */
const streakMultiplier = (
  table: readonly { streak: number; multiplier: number }[],
  streak: number,
) => table.find((step) => streak >= step.streak)?.multiplier ?? 1;

/** The CP multiplier a win streak of this length earns. */
export const getWinStreakXpMultiplier = (streak: number) =>
  streakMultiplier(WIN_STREAK_XP_MULTIPLIERS, streak);

/** The CP multiplier a losing streak of this length costs. */
export const getLossStreakXpMultiplier = (streak: number) =>
  streakMultiplier(LOSS_STREAK_XP_MULTIPLIERS, streak);

/**
 * Pure XP calculation shared by {@link calculatePlayerPerformance} and
 * {@link calculateTeamPerformance}. Returns the XP breakdown for a single game
 * without mutating anything, so callers decide where the result is applied
 * (participant / user / team) and can layer ladder-only bonuses on top of
 * `streakXp`.
 */
export const computeGameXp = ({
  streakType,
  streakCount,
  combinedWinnerXp,
  combinedLoserXp,
  winnerScore,
  loserScore,
}: ComputeGameXpParams): GameXpBreakdown => {
  const won = streakType === "W";
  const baseXP = won ? GAME_XP_BASE.WIN : GAME_XP_BASE.LOSS;
  const scoreDifference = winnerScore - loserScore;

  const differenceMultiplier =
    combinedWinnerXp > 0 ? combinedLoserXp / combinedWinnerXp : 1;

  const rankMultiplier =
    differenceMultiplier < RANK_GAP_XP.MIN_RATIO
      ? 0
      : Math.min(differenceMultiplier, RANK_GAP_XP.MAX_MULTIPLIER);

  const multiplier = won
    ? getWinStreakXpMultiplier(streakCount)
    : getLossStreakXpMultiplier(-streakCount);
  const streakXp = baseXP * multiplier;

  const rankXpValue = streakXp * rankMultiplier;
  const rankXp = isNaN(rankXpValue) ? 0 : rankXpValue;

  // A decisive margin multiplies the game's XP swing: an extra reward for the
  // winner, an extra penalty for the loser. streakXp already carries the sign
  // (positive for a win, negative for a loss), so the bonus is streakXp times
  // the extra multiplier for both sides.
  const demonBonus =
    scoreDifference >= DECISIVE_WIN_MARGIN
      ? streakXp * (DECISIVE_WIN_XP_MULTIPLIER - 1)
      : 0;

  const finalXp = streakXp + rankXp + demonBonus;

  return { streakXp, rankXp, demonBonus, finalXp };
};
