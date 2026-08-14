// 10% platform fee taken from paid-ladder entry-fee pools.
export const PLATFORM_FEE = 0.1;

export interface LadderPrizePoolParams {
  // Ladder entry fee per participant. `0` means a free ladder.
  entryFee: number;
  // Number of participants that have joined the ladder.
  participantCount: number;
  // Free-ladder inputs (ignored when `entryFee > 0`).
  numberOfGamesPlayed?: number;
  totalGamePointsWon?: number;
}

// Total prize pot for a ladder.
//
// - PAID ladder (entryFee > 0): the collected entry fees, less the platform fee.
// - FREE ladder (entryFee === 0): the league prize formula (previously inline in
//   the mobile app's components/Summary/CompetitionSummary.js).
export const calculateLadderPrizePool = ({
  entryFee,
  participantCount,
  numberOfGamesPlayed = 0,
  totalGamePointsWon = 0,
}: LadderPrizePoolParams): number => {
  if (entryFee > 0) {
    return entryFee * participantCount * (1 - PLATFORM_FEE);
  }

  return (participantCount * numberOfGamesPlayed + totalGamePointsWon) / 2;
};
