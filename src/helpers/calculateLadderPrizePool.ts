export const PLATFORM_FEE = 0.1;
export const LADDER_XP_PER_PLAYER = 50;

export interface LadderPrizePoolParams {
  entryFee: number;
  participantCount: number;
}

export interface LadderPrizePool {
  cash: number;
  xp: number;
}

export interface LadderEntryPrice {
  entryFee: number;
  platformFee: number;
  total: number;
}

/** The whole entry fee goes into the pot; the platform fee is paid on top. */
export const calculateLadderPrizePool = ({
  entryFee,
  participantCount,
}: LadderPrizePoolParams): LadderPrizePool => ({
  cash: entryFee > 0 ? entryFee * participantCount : 0,
  xp: participantCount * LADDER_XP_PER_PLAYER,
});

/** What a player pays to join: the entry fee plus the platform fee on top. */
export const getLadderEntryPrice = (entryFee: number): LadderEntryPrice => {
  const platformFee = entryFee > 0 ? entryFee * PLATFORM_FEE : 0;
  return { entryFee, platformFee, total: entryFee + platformFee };
};
