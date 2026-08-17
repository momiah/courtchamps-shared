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
