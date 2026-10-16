export interface LadderPayoutBand {
  fromPlace: number;
  toPlace: number;
  share: number;
}

export interface LadderPayout extends LadderPayoutBand {
  places: number;
  total: number;
  each: number;
}

const topFour = (
  first: number,
  second: number,
  third: number,
  fourth: number,
): LadderPayoutBand[] => [
  { fromPlace: 1, toPlace: 1, share: first },
  { fromPlace: 2, toPlace: 2, share: second },
  { fromPlace: 3, toPlace: 3, share: third },
  { fromPlace: 4, toPlace: 4, share: fourth },
];

export const LADDER_PAYOUT_STRUCTURE: Record<number, LadderPayoutBand[]> = {
  2048: [
    ...topFour(0.35, 0.2, 0.1, 0.05),
    { fromPlace: 5, toPlace: 32, share: 0.2 },
    { fromPlace: 33, toPlace: 64, share: 0.1 },
  ],
  1024: [
    ...topFour(0.35, 0.2, 0.1, 0.05),
    { fromPlace: 5, toPlace: 32, share: 0.3 },
  ],
  512: [
    ...topFour(0.35, 0.2, 0.1, 0.05),
    { fromPlace: 5, toPlace: 16, share: 0.3 },
  ],
  256: [
    ...topFour(0.35, 0.2, 0.12, 0.08),
    { fromPlace: 5, toPlace: 8, share: 0.25 },
  ],
  128: [
    ...topFour(0.35, 0.2, 0.12, 0.08),
    { fromPlace: 5, toPlace: 8, share: 0.25 },
  ],
};

export const getLadderPayouts = (
  prizePool: number,
  ladderSize: number,
): LadderPayout[] =>
  (LADDER_PAYOUT_STRUCTURE[ladderSize] ?? []).map((band) => {
    const places = band.toPlace - band.fromPlace + 1;
    const total = prizePool * band.share;
    return { ...band, places, total, each: total / places };
  });

export const getLadderPayoutForPlace = (
  prizePool: number,
  ladderSize: number,
  place: number,
): number =>
  getLadderPayouts(prizePool, ladderSize).find(
    (payout) => place >= payout.fromPlace && place <= payout.toPlace,
  )?.each ?? 0;
