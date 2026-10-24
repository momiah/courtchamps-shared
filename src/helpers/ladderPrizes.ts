import type { Ladder } from "../types/ladder";
import type { LadderPlayoffTie } from "../types/ladderPlayoff";
import {
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_PLAYOFF_WALKOVER_REASON,
} from "../types/ladderPlayoff";
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

export const getLadderPlayoffTotalRounds = (
  ties: Pick<LadderPlayoffTie, "round" | "isThirdPlacePlayoff">[],
): number =>
  Math.max(...ties.filter((tie) => !tie.isThirdPlacePlayoff).map((tie) => tie.round));

export const PLACEMENT_STAT_KEYS = ["first", "second", "third", "fourth"] as const;

export type PlacementStatKey = (typeof PLACEMENT_STAT_KEYS)[number];

export const getPlacementStatKey = (place: number): PlacementStatKey | null =>
  PLACEMENT_STAT_KEYS[place - 1] ?? null;

export interface LadderPlayoffPlacing {
  tieId: string;
  playerIds: string[];
  place: number;
  decidesMedal: boolean;
  disqualified: boolean;
}

/**
 * The sides a finished tie places: both sides of the Final and the 3rd-place
 * tie, and the loser of any other tie unless they go on to play for 3rd. A
 * side that lost on a disqualification walkover is flagged and wins nothing.
 */
export const getLadderTiePlacings = (
  tie: LadderPlayoffTie,
  ties: LadderPlayoffTie[],
): LadderPlayoffPlacing[] => {
  if (tie.status !== LADDER_PLAYOFF_TIE_STATUS.COMPLETED || !tie.winner) return [];
  const totalRounds = getLadderPlayoffTotalRounds(ties);
  const places = getLadderTieFinishPlaces(tie, totalRounds);
  const winnerKey = tie.winner === "team1" ? "side1" : "side2";
  const loserKey = winnerKey === "side1" ? "side2" : "side1";
  const decidesMedal = places.winner !== null;
  const placings: LadderPlayoffPlacing[] = [];
  const winnerSide = tie[winnerKey];
  if (places.winner !== null && winnerSide) {
    placings.push({
      tieId: tie.tieId,
      playerIds: winnerSide.playerIds,
      place: places.winner,
      decidesMedal,
      disqualified: false,
    });
  }
  const loserPlaysForThird =
    !decidesMedal &&
    tie.round === totalRounds - 1 &&
    ties.some((other) => other.isThirdPlacePlayoff);
  const loserSide = tie[loserKey];
  if (loserSide && !loserPlaysForThird) {
    placings.push({
      tieId: tie.tieId,
      playerIds: loserSide.playerIds,
      place: places.loser,
      decidesMedal,
      disqualified:
        tie.walkoverReason === LADDER_PLAYOFF_WALKOVER_REASON.DISQUALIFIED_OPPONENT,
    });
  }
  return placings;
};

export interface LadderPlayoffPayout extends LadderPlayoffPlacing {
  prize: LadderPlacePrize;
}

/** Every side the finished playoffs pay, each player of a side paid the side's prize. */
export const getLadderPlayoffPayouts = (
  ladder: PrizeLadder,
  ties: LadderPlayoffTie[],
): LadderPlayoffPayout[] =>
  ties
    .flatMap((tie) => getLadderTiePlacings(tie, ties))
    .filter((placing) => !placing.disqualified)
    .map((placing) => ({ ...placing, prize: getLadderPlacePrize(ladder, placing.place) }))
    .filter((payout) => payout.prize.cp > 0 || payout.prize.cash > 0);
