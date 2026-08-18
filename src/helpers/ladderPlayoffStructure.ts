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

export const LADDER_MIN_PLAYOFF_SIZE = 256;

export const getEffectiveLadderSize = (
  registeredCount: number,
  maxPlayers?: number,
): number => {
  if (!Number.isFinite(registeredCount) || registeredCount <= 0) return 0;

  const capped =
    maxPlayers && maxPlayers > 0
      ? Math.min(registeredCount, maxPlayers)
      : registeredCount;

  return LADDER_PLAYOFF_SIZES.find((size) => size <= capped) ?? 0;
};

export const getLadderPlayoffStructureForRegistrations = (
  registeredCount: number,
  maxPlayers?: number,
): LadderPlayoffStructure => {
  const size = getEffectiveLadderSize(registeredCount, maxPlayers);
  if (size === 0) return { playoffSpots: 0, inTheMoney: 0 };
  return getLadderPlayoffStructure(size);
};
