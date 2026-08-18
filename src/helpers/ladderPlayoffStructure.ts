export interface LadderPlayoffStructure {
  playoffSpots: number;
  inTheMoney: number;
}

export const PLAYOFF_SPOTS_DIVISOR = 16;

export const IN_THE_MONEY_DIVISOR = 32;

export const LADDER_PLAYOFF_STRUCTURE: Record<number, LadderPlayoffStructure> = {
  2048: { playoffSpots: 128, inTheMoney: 64 },
  1024: { playoffSpots: 64, inTheMoney: 32 },
  512: { playoffSpots: 32, inTheMoney: 16 },
  256: { playoffSpots: 16, inTheMoney: 8 },
};

export const LADDER_PLAYOFF_SIZES: number[] = Object.keys(
  LADDER_PLAYOFF_STRUCTURE,
)
  .map(Number)
  .sort((a, b) => b - a);

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

/**
 * Smallest ladder size that runs a playoff / prize distribution. Below this a
 * ladder has not reached the first tier, so no spots or prizes are allocated.
 */
export const LADDER_MIN_PLAYOFF_SIZE = 256;

/**
 * The playoff/payout structure is TIERED, not based on a ladder's advertised
 * maxPlayers. Prizes are distributed against the ladder's *actual* size at the
 * close of registration, snapped DOWN to the nearest defined tier.
 *
 * Example: a 2048-capacity ladder that only reaches 512 registrations by the
 * registration end date pays out at the 512 tier (32 playoff spots, 16 in the
 * money) — not the 2048 tier.
 *
 * @param registeredCount number of players registered at registration close
 * @param maxPlayers      optional cap; the effective size never exceeds it
 * @returns the effective tier size (a key of LADDER_PLAYOFF_STRUCTURE), or 0
 *          when fewer than LADDER_MIN_PLAYOFF_SIZE players registered
 */
export const getEffectiveLadderSize = (
  registeredCount: number,
  maxPlayers?: number,
): number => {
  if (!Number.isFinite(registeredCount) || registeredCount <= 0) return 0;

  const capped =
    maxPlayers && maxPlayers > 0
      ? Math.min(registeredCount, maxPlayers)
      : registeredCount;

  // LADDER_PLAYOFF_SIZES is ordered largest-first, so the first tier that is
  // <= the registered count is the highest tier the ladder actually reached.
  return LADDER_PLAYOFF_SIZES.find((size) => size <= capped) ?? 0;
};

/**
 * Tiered playoff structure driven by the ladder's actual registrations at
 * registration close (see {@link getEffectiveLadderSize}). This is the source
 * of truth the payout function should consume; the onboarding screen uses it to
 * explain how prizes scale with the final ladder size.
 */
export const getLadderPlayoffStructureForRegistrations = (
  registeredCount: number,
  maxPlayers?: number,
): LadderPlayoffStructure => {
  const size = getEffectiveLadderSize(registeredCount, maxPlayers);
  if (size === 0) return { playoffSpots: 0, inTheMoney: 0 };
  return getLadderPlayoffStructure(size);
};
