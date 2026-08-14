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

export const calculateLadderPrizePool = ({
  entryFee,
  participantCount,
}: LadderPrizePoolParams): LadderPrizePool => {
  const xp = participantCount * LADDER_XP_PER_PLAYER;
  const cash =
    entryFee > 0 ? entryFee * participantCount * (1 - PLATFORM_FEE) : 0;

  return { cash, xp };
};
