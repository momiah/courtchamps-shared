/**
 * Systematic playoff / payout structure for a ladder, keyed by the ladder's
 * `maxPlayers`. This is the single source of truth consumed by BOTH the
 * "How to Play" Playoffs onboarding screen and the (later) payout function.
 *
 * Pattern:
 *   playoffSpots = maxPlayers / 16   (players who advance to the knockout)
 *   inTheMoney   = maxPlayers / 32   (players who finish "in the money")
 */
export interface LadderPlayoffStructure {
  /** Number of players who advance to the single-elimination knockout. */
  playoffSpots: number;
  /** Number of players who finish "in the money" (share of the prize pot). */
  inTheMoney: number;
}

/** Divisor applied to `maxPlayers` to derive the number of playoff spots. */
export const PLAYOFF_SPOTS_DIVISOR = 16;

/** Divisor applied to `maxPlayers` to derive the "in the money" count. */
export const IN_THE_MONEY_DIVISOR = 32;

/**
 * Canonical lookup table for the supported ladder sizes. Values follow the
 * `maxPlayers / 16` and `maxPlayers / 32` pattern.
 */
export const LADDER_PLAYOFF_STRUCTURE: Record<number, LadderPlayoffStructure> = {
  2048: { playoffSpots: 128, inTheMoney: 64 },
  1024: { playoffSpots: 64, inTheMoney: 32 },
  512: { playoffSpots: 32, inTheMoney: 16 },
  256: { playoffSpots: 16, inTheMoney: 8 },
};

/**
 * The ladder sizes with an entry in {@link LADDER_PLAYOFF_STRUCTURE}, ordered
 * largest first. Useful for rendering the full onboarding table.
 */
export const LADDER_PLAYOFF_SIZES: number[] = Object.keys(
  LADDER_PLAYOFF_STRUCTURE,
)
  .map(Number)
  .sort((a, b) => b - a);

/**
 * Returns the playoff structure for a ladder of the given `maxPlayers`.
 *
 * Known sizes (2048 / 1024 / 512 / 256) resolve from the canonical table;
 * any other positive size is derived from the same `/16` and `/32` pattern so
 * the structure stays consistent as new ladder sizes are introduced.
 */
export const getLadderPlayoffStructure = (
  maxPlayers: number,
): LadderPlayoffStructure => {
  const known = LADDER_PLAYOFF_STRUCTURE[maxPlayers];
  if (known) return known;

  if (!Number.isFinite(maxPlayers) || maxPlayers <= 0) {
    return { playoffSpots: 0, inTheMoney: 0 };
  }

  return {
    playoffSpots: Math.floor(maxPlayers / PLAYOFF_SPOTS_DIVISOR),
    inTheMoney: Math.floor(maxPlayers / IN_THE_MONEY_DIVISOR),
  };
};
