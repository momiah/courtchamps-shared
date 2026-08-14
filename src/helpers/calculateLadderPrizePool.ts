// 10% platform fee taken from paid-ladder entry-fee pools.
export const PLATFORM_FEE = 0.1;

// XP contributed to the pot per participant. The XP pot is intentionally a flat
// per-player amount (not the league activity formula, which multiplies
// participants by games and overflows on large ladders). Tune as needed.
export const LADDER_XP_PER_PLAYER = 100;

export interface LadderPrizePoolParams {
  // Ladder entry fee per participant. `0` means a free ladder.
  entryFee: number;
  // Number of participants that have joined the ladder.
  participantCount: number;
}

export interface LadderPrizePool {
  // Cash pot from pooled entry fees, less the platform fee.
  // Paid ladders only — always 0 on a free ladder.
  cash: number;
  // XP pot, awarded on every ladder (paid and free).
  xp: number;
}

// Prize pots for a ladder.
//
// - XP pot (always): a flat amount per participant, awarded on paid and free
//   ladders alike.
// - Cash pot (paid ladders only): the collected entry fees, less the platform
//   fee. Free ladders (entryFee === 0) return a cash pot of 0.
//
// Cash is additive: a paid ladder awards BOTH cash and XP; a free ladder awards
// XP only.
export const calculateLadderPrizePool = ({
  entryFee,
  participantCount,
}: LadderPrizePoolParams): LadderPrizePool => {
  const xp = participantCount * LADDER_XP_PER_PLAYER;
  const cash =
    entryFee > 0 ? entryFee * participantCount * (1 - PLATFORM_FEE) : 0;

  return { cash, xp };
};
