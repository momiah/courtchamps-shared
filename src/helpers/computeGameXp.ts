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
  /** The demon (≥10 point margin) bonus. */
  demonBonus: number;
  /** `streakXp + rankXp + demonBonus`, the standard per-game XP delta. */
  finalXp: number;
}

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
  const baseXP = streakType === "W" ? 20 : -15;
  const scoreDifference = winnerScore - loserScore;

  const differenceMultiplier =
    combinedWinnerXp > 0 ? combinedLoserXp / combinedWinnerXp : 1;

  const rankMultiplier =
    differenceMultiplier < 2
      ? 0
      : differenceMultiplier > 3
        ? 3
        : differenceMultiplier;

  const lossMultiplier =
    streakCount <= -7
      ? 3
      : streakCount <= -5
        ? 2.5
        : streakCount <= -3
          ? 2
          : streakCount <= -2
            ? 1.5
            : 1;

  const winMultiplier =
    streakCount >= 7
      ? 5
      : streakCount >= 5
        ? 4
        : streakCount >= 3
          ? 3
          : streakCount > 1
            ? 2
            : 1;

  const multiplier = streakType === "W" ? winMultiplier : lossMultiplier;
  const streakXp = baseXP * multiplier;

  const rankXpValue = streakXp * rankMultiplier;
  const rankXp = isNaN(rankXpValue) ? 0 : rankXpValue;

  let demonBonus = 0;
  if (scoreDifference >= 10) {
    demonBonus = streakType === "W" ? streakXp : -streakXp;
  }

  const finalXp = streakXp + rankXp + demonBonus;

  return { streakXp, rankXp, demonBonus, finalXp };
};
