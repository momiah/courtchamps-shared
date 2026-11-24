import { PAYOUT_STRUCTURE } from "../types/ladder";
import type { PayoutStructure } from "../types/ladder";
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

type PayoutTable = Record<number, LadderPayoutBand[]>;

/**
 * Progressive, cash and CP alike: top-heavy, paying the in-the-money places,
 * one band per playoff round below 4th.
 */
const PROGRESSIVE: PayoutTable = {
  2048: [
    ...topFour(0.35, 0.2, 0.1, 0.05),
    band(5, 8, 0.07),
    band(9, 16, 0.06),
    band(17, 32, 0.07),
    band(33, 64, 0.1),
  ],
  1024: [
    ...topFour(0.35, 0.2, 0.1, 0.05),
    band(5, 8, 0.1),
    band(9, 16, 0.1),
    band(17, 32, 0.1),
  ],
  512: [...topFour(0.35, 0.2, 0.1, 0.05), band(5, 8, 0.15), band(9, 16, 0.15)],
  256: [...topFour(0.35, 0.2, 0.12, 0.08), band(5, 8, 0.25)],
  128: [...topFour(0.35, 0.2, 0.12, 0.08), band(5, 8, 0.25)],
};

/** Linear cash: flatter, paying the in-the-money places, one band per playoff round below 4th. */
const LINEAR_CASH: PayoutTable = {
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

/** Linear CP: flatter still, paying every playoff place, one band per playoff round below 4th. */
const LINEAR_CP: PayoutTable = {
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

/** Each payout structure's cash and CP tables, by ladder size. */
export const LADDER_PAYOUT_TABLES: Record<PayoutStructure, { cash: PayoutTable; cp: PayoutTable }> = {
  [PAYOUT_STRUCTURE.PROGRESSIVE]: { cash: PROGRESSIVE, cp: PROGRESSIVE },
  [PAYOUT_STRUCTURE.LINEAR]: { cash: LINEAR_CASH, cp: LINEAR_CP },
};

const tablesFor = (payoutStructure: PayoutStructure) =>
  LADDER_PAYOUT_TABLES[payoutStructure] ?? LADDER_PAYOUT_TABLES[PAYOUT_STRUCTURE.LINEAR];

const payoutsFrom = (prizePool: number, bands: LadderPayoutBand[]): LadderPayout[] => {
  const pool = Math.floor(prizePool);
  const payouts = bands.map((band) => {
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

export const getLadderPayouts = (
  prizePool: number,
  ladderSize: number,
  payoutStructure: PayoutStructure,
): LadderPayout[] => payoutsFrom(prizePool, tablesFor(payoutStructure).cash[ladderSize] ?? []);

export const getLadderCpPayouts = (
  prizePool: number,
  ladderSize: number,
  payoutStructure: PayoutStructure,
): LadderPayout[] => payoutsFrom(prizePool, tablesFor(payoutStructure).cp[ladderSize] ?? []);

const payoutForPlace = (payouts: LadderPayout[], place: number): number =>
  payouts.find((payout) => place >= payout.fromPlace && place <= payout.toPlace)?.each ?? 0;

export const getLadderPayoutForPlace = (
  prizePool: number,
  ladderSize: number,
  place: number,
  payoutStructure: PayoutStructure,
): number => payoutForPlace(getLadderPayouts(prizePool, ladderSize, payoutStructure), place);

export const getLadderCpPayoutForPlace = (
  prizePool: number,
  ladderSize: number,
  place: number,
  payoutStructure: PayoutStructure,
): number => payoutForPlace(getLadderCpPayouts(prizePool, ladderSize, payoutStructure), place);

/**
 * How many places win a prize in a full ladder: in the money for cash; for CP,
 * in the money under progressive and every playoff place under linear.
 */
export const getLadderPrizePlaces = (
  maxPlayers: number,
  cash: boolean,
  payoutStructure: PayoutStructure,
): number => {
  const { inTheMoney, playoffSpots } = getLadderPlayoffStructure(maxPlayers);
  return cash || payoutStructure === PAYOUT_STRUCTURE.PROGRESSIVE ? inTheMoney : playoffSpots;
};

export interface LadderPrizeBand {
  fromPlace: number;
  toPlace: number;
  cash: number;
  cp: number;
}

/**
 * The rows of a prize table, with the cash and CP each player or team takes:
 * every place that wins CP on a free ladder, and only the places that win cash
 * on a cash ladder (places paid CP alone are told when they finish).
 */
export const getLadderPrizeBands = (
  pool: { cash: number; xp: number },
  ladderSize: number,
  payoutStructure: PayoutStructure,
): LadderPrizeBand[] => {
  const cash = pool.cash > 0 ? getLadderPayouts(pool.cash, ladderSize, payoutStructure) : [];
  const bands = getLadderCpPayouts(pool.xp, ladderSize, payoutStructure).map((cpPayout) => ({
    fromPlace: cpPayout.fromPlace,
    toPlace: cpPayout.toPlace,
    cash: payoutForPlace(cash, cpPayout.fromPlace),
    cp: cpPayout.each,
  }));
  return pool.cash > 0 ? bands.filter((band) => band.cash > 0) : bands;
};

