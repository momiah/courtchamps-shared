import type { Ladder } from "../types/ladder";
import type { LadderPlayoffTie } from "../types/ladderPlayoff";
import { calculateLadderPrizePool } from "./calculateLadderPrizePool";
import { getEffectiveLadderSize } from "./ladderPlayoffStructure";
import { getLadderPayoutForPlace } from "./ladderPayoutStructure";

export interface LadderPlacePrize {
  cash: number;
  cp: number;
}

export type PrizeLadder = Pick<
  Ladder,
  "entryFee" | "participantCount" | "maxPlayers" | "playoffEntrantCount"
>;

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
};

const CURRENCY_GROUPING_THRESHOLD = 10000;

export const formatCurrency = (amount: number, currencyType: string): string => {
  const symbol = CURRENCY_SYMBOLS[currencyType] ?? "";
  const fixed = Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
  const value =
    Math.abs(amount) >= CURRENCY_GROUPING_THRESHOLD
      ? fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : fixed;
  return symbol ? `${symbol}${value}` : `${value} ${currencyType}`;
};

export const getLadderPrizeSetup = (ladder: PrizeLadder) => {
  const registered = ladder.playoffEntrantCount ?? ladder.participantCount ?? 0;
  return {
    pool: calculateLadderPrizePool({
      entryFee: ladder.entryFee ?? 0,
      participantCount: registered,
    }),
    size: getEffectiveLadderSize(registered, ladder.maxPlayers),
  };
};

export const getLadderPlacePrize = (
  ladder: PrizeLadder,
  place: number,
): LadderPlacePrize => {
  const { pool, size } = getLadderPrizeSetup(ladder);
  return {
    cash: pool.cash > 0 ? getLadderPayoutForPlace(pool.cash, size, place) : 0,
    cp: getLadderPayoutForPlace(pool.xp, size, place),
  };
};

/** "£320 and 800 CP", "800 CP", or null when nothing was won. */
export const formatLadderPrizeWon = (
  prize: LadderPlacePrize,
  currencyType: string,
): string | null => {
  const parts = [
    prize.cash > 0 ? formatCurrency(prize.cash, currencyType) : null,
    prize.cp > 0 ? `${prize.cp.toLocaleString("en-GB")} CP` : null,
  ].filter((part): part is string => !!part);
  return parts.length ? parts.join(" and ") : null;
};

export const ordinalPlace = (place: number): string => {
  const tens = place % 100;
  if (tens >= 11 && tens <= 13) return `${place}th`;
  return `${place}${["th", "st", "nd", "rd"][place % 10] ?? "th"}`;
};

/**
 * The places a finished tie decides: the Final's winner and loser finish 1st
 * and 2nd, the 3rd-place tie's 3rd and 4th. In earlier rounds only the loser
 * finishes, at the bottom of the band for that round (e.g. a Quarter-Final
 * loser finishes 8th, sharing 5th–8th); the winner plays on.
 */
export const getLadderTieFinishPlaces = (
  tie: Pick<LadderPlayoffTie, "round" | "isThirdPlacePlayoff">,
  totalRounds: number,
): { winner: number | null; loser: number } => {
  if (tie.isThirdPlacePlayoff) return { winner: 3, loser: 4 };
  if (tie.round >= totalRounds) return { winner: 1, loser: 2 };
  return { winner: null, loser: 2 ** (totalRounds - tie.round + 1) };
};
