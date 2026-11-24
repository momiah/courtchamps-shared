import { getLadderPlayoffStructure } from "./ladderPlayoffStructure";

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

const band = (fromPlace: number, toPlace: number, share: number): LadderPayoutBand => ({
  fromPlace,
  toPlace,
  share,
});

const topFour = (
  first: number,
  second: number,
  third: number,
  fourth: number,
): LadderPayoutBand[] => [
  band(1, 1, first),
  band(2, 2, second),
  band(3, 3, third),
  band(4, 4, fourth),
];

/** Cash: the in-the-money places, one band per playoff round below 4th. */
export const LADDER_PAYOUT_STRUCTURE: Record<number, LadderPayoutBand[]> = {
  2048: [
    ...topFour(0.26, 0.16, 0.1, 0.05),
    band(5, 8, 0.08),
    band(9, 16, 0.09),
    band(17, 32, 0.1),
    band(33, 64, 0.16),
  ],
  1024: [
    ...topFour(0.28, 0.16, 0.1, 0.06),
    band(5, 8, 0.12),
    band(9, 16, 0.13),
    band(17, 32, 0.15),
  ],
  512: [...topFour(0.28, 0.16, 0.1, 0.06), band(5, 8, 0.2), band(9, 16, 0.2)],
  256: [...topFour(0.3, 0.18, 0.12, 0.086), band(5, 8, 0.314)],
  128: [...topFour(0.3, 0.18, 0.12, 0.086), band(5, 8, 0.314)],
};

/** CP: every playoff place, flatter than cash, one band per playoff round below 4th. */
export const LADDER_CP_PAYOUT_STRUCTURE: Record<number, LadderPayoutBand[]> = {
  2048: [
    ...topFour(0.15, 0.1, 0.07, 0.05),
    band(5, 8, 0.1),
    band(9, 16, 0.1),
    band(17, 32, 0.13),
    band(33, 64, 0.16),
    band(65, 128, 0.14),
  ],
  1024: [
    ...topFour(0.15, 0.1, 0.07, 0.05),
    band(5, 8, 0.1),
    band(9, 16, 0.11),
    band(17, 32, 0.15),
    band(33, 64, 0.27),
  ],
  512: [
    ...topFour(0.15, 0.1, 0.07, 0.05),
    band(5, 8, 0.14),
    band(9, 16, 0.18),
    band(17, 32, 0.31),
  ],
  256: [...topFour(0.18, 0.12, 0.09, 0.07), band(5, 8, 0.24), band(9, 16, 0.3)],
  128: [...topFour(0.24, 0.16, 0.12, 0.1), band(5, 8, 0.38)],
};

export const getLadderPayouts = (
  prizePool: number,
  ladderSize: number,
  structure: Record<number, LadderPayoutBand[]> = LADDER_PAYOUT_STRUCTURE,
): LadderPayout[] => {
  const pool = Math.floor(prizePool);
  const payouts = (structure[ladderSize] ?? []).map((band) => {
    const places = band.toPlace - band.fromPlace + 1;
    const each = Math.floor((pool * band.share) / places + 1e-9);
    return { ...band, places, total: each * places, each };
  });
  if (payouts.length === 0) return payouts;
  const paid = payouts.reduce((sum, payout) => sum + payout.total, 0);
  const champion = payouts[0];
  champion.each += pool - paid;
  champion.total = champion.each * champion.places;
  return payouts;
};

export const getLadderCpPayouts = (prizePool: number, ladderSize: number): LadderPayout[] =>
  getLadderPayouts(prizePool, ladderSize, LADDER_CP_PAYOUT_STRUCTURE);

const payoutForPlace = (payouts: LadderPayout[], place: number): number =>
  payouts.find((payout) => place >= payout.fromPlace && place <= payout.toPlace)?.each ?? 0;

export const getLadderPayoutForPlace = (
  prizePool: number,
  ladderSize: number,
  place: number,
): number => payoutForPlace(getLadderPayouts(prizePool, ladderSize), place);

export const getLadderCpPayoutForPlace = (
  prizePool: number,
  ladderSize: number,
  place: number,
): number => payoutForPlace(getLadderCpPayouts(prizePool, ladderSize), place);

/** How many places win a prize in a full ladder: in the money for cash, every playoff place for CP. */
export const getLadderPrizePlaces = (maxPlayers: number, cash: boolean): number => {
  const { inTheMoney, playoffSpots } = getLadderPlayoffStructure(maxPlayers);
  return cash ? inTheMoney : playoffSpots;
};

export interface LadderPrizeBand {
  fromPlace: number;
  toPlace: number;
  cash: number;
  cp: number;
}

/** Every place that wins anything, with the cash and CP each player or team in it takes. */
export const getLadderPrizeBands = (
  pool: { cash: number; xp: number },
  ladderSize: number,
): LadderPrizeBand[] => {
  const cash = pool.cash > 0 ? getLadderPayouts(pool.cash, ladderSize) : [];
  return getLadderCpPayouts(pool.xp, ladderSize).map((cpPayout) => ({
    fromPlace: cpPayout.fromPlace,
    toPlace: cpPayout.toPlace,
    cash: payoutForPlace(cash, cpPayout.fromPlace),
    cp: cpPayout.each,
  }));
};

