import type { Ladder } from "../types/ladder";
import type { LadderPlayoffTie } from "../types/ladderPlayoff";
import {
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_PLAYOFF_WALKOVER_REASON,
} from "../types/ladderPlayoff";
import { calculateLadderPrizePool } from "./calculateLadderPrizePool";
import { getEffectiveLadderSize } from "./ladderPlayoffStructure";
import { getLadderPayoutForPlace, getLadderPayouts } from "./ladderPayoutStructure";

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
  voided: boolean;
}

/**
 * The sides a finished tie places: both sides of the Final and the 3rd-place
 * tie, and the loser of any other tie unless they go on to play for 3rd. A
 * void tie places both sides at the lowest place its round guarantees. A side
 * that lost on a disqualification walkover is flagged.
 */
export const getLadderTiePlacings = (
  tie: LadderPlayoffTie,
  ties: LadderPlayoffTie[],
): LadderPlayoffPlacing[] => {
  if (tie.status !== LADDER_PLAYOFF_TIE_STATUS.COMPLETED) return [];
  const totalRounds = getLadderPlayoffTotalRounds(ties);
  const places = getLadderTieFinishPlaces(tie, totalRounds);
  const decidesMedal = places.winner !== null;
  const loserPlaysForThird =
    !decidesMedal &&
    tie.round === totalRounds - 1 &&
    ties.some((other) => other.isThirdPlacePlayoff);
  const placing = (
    playerIds: string[],
    place: number,
    fields: Partial<LadderPlayoffPlacing> = {},
  ): LadderPlayoffPlacing => ({
    tieId: tie.tieId,
    playerIds,
    place,
    decidesMedal,
    disqualified: false,
    voided: false,
    ...fields,
  });

  if (!tie.winner) {
    if (tie.outcome !== LADDER_PLAYOFF_TIE_OUTCOME.VOID) return [];
    const lowest = loserPlaysForThird ? 4 : places.loser;
    return [tie.side1, tie.side2]
      .filter((side): side is NonNullable<typeof side> => !!side)
      .map((side) => placing(side.playerIds, lowest, { voided: true }));
  }

  const winnerKey = tie.winner === "team1" ? "side1" : "side2";
  const loserKey = winnerKey === "side1" ? "side2" : "side1";
  const placings: LadderPlayoffPlacing[] = [];
  const winnerSide = tie[winnerKey];
  if (places.winner !== null && winnerSide) {
    placings.push(placing(winnerSide.playerIds, places.winner));
  }
  const loserSide = tie[loserKey];
  if (loserSide && !loserPlaysForThird) {
    placings.push(
      placing(loserSide.playerIds, places.loser, {
        disqualified:
          tie.walkoverReason === LADDER_PLAYOFF_WALKOVER_REASON.DISQUALIFIED_OPPONENT,
      }),
    );
  }
  return placings;
};

const NO_PRIZE: LadderPlacePrize = { cash: 0, cp: 0 };

const addPrizes = (a: LadderPlacePrize, b: LadderPlacePrize): LadderPlacePrize => ({
  cash: a.cash + b.cash,
  cp: a.cp + b.cp,
});

const hasPrize = (prize: LadderPlacePrize): boolean => prize.cash > 0 || prize.cp > 0;

const splitPrize = (prize: LadderPlacePrize, players: number): LadderPlacePrize => ({
  cash: Math.round((prize.cash / players) * 100) / 100,
  cp: Math.floor(prize.cp / players),
});

const potOf = (amount: number, size: number): number =>
  getLadderPayouts(amount, size).reduce((sum, payout) => sum + payout.total, 0);

export interface LadderPlayoffPayout extends LadderPlayoffPlacing {
  /** Prize for the place, for the whole side. */
  placePrize: LadderPlacePrize;
  /** The side's equal share of the Unclaimed Prize Pot. */
  potShare: LadderPlacePrize;
  /** placePrize plus potShare, for the whole side. */
  prize: LadderPlacePrize;
  /** What each player of the side is paid; a doubles pair splits the side's prize. */
  perPlayer: { placePrize: LadderPlacePrize; potShare: LadderPlacePrize; prize: LadderPlacePrize };
}

export interface LadderPrizePlan {
  payouts: LadderPlayoffPayout[];
  /** Prize money nobody won because a tie was void or a place was left empty. */
  unclaimed: LadderPlacePrize;
  /** Unclaimed money with nobody else in the money to share it, retained by Court Champs. */
  kept: LadderPlacePrize;
}

/**
 * Every side the finished playoffs pay. Each placed side gets the prize for its
 * place. The prize money nobody won goes into the Unclaimed Prize Pot and is
 * split equally between the sides in the money that played and were not
 * disqualified, any rounding going to the highest finisher; with nobody to
 * share it, the funds are retained by Court Champs. A disqualified side keeps its place and
 * prize, which the caller holds for review.
 */
export const planLadderPlayoffPrizes = (
  ladder: PrizeLadder,
  ties: LadderPlayoffTie[],
  disqualifiedUserIds: Iterable<string> = [],
): LadderPrizePlan => {
  const disqualified = new Set(disqualifiedUserIds);
  const placed = ties
    .flatMap((tie) => getLadderTiePlacings(tie, ties))
    .map((placing) => ({
      ...placing,
      disqualified:
        placing.disqualified || placing.playerIds.some((userId) => disqualified.has(userId)),
      placePrize: getLadderPlacePrize(ladder, placing.place),
    }))
    .filter((placing) => hasPrize(placing.placePrize))
    .sort((a, b) => a.place - b.place || a.tieId.localeCompare(b.tieId));

  const { pool, size } = getLadderPrizeSetup(ladder);
  const pot = { cash: pool.cash > 0 ? potOf(pool.cash, size) : 0, cp: potOf(pool.xp, size) };
  const claimed = placed.reduce((sum, placing) => addPrizes(sum, placing.placePrize), NO_PRIZE);
  const unclaimed = {
    cash: Math.max(0, pot.cash - claimed.cash),
    cp: Math.max(0, pot.cp - claimed.cp),
  };
  const sharers = placed.filter((placing) => !placing.voided && !placing.disqualified);
  const each = sharers.length
    ? {
        cash: Math.floor(unclaimed.cash / sharers.length),
        cp: Math.floor(unclaimed.cp / sharers.length),
      }
    : NO_PRIZE;
  const remainder = {
    cash: unclaimed.cash - each.cash * sharers.length,
    cp: unclaimed.cp - each.cp * sharers.length,
  };
  const top = sharers[0];

  const payouts = placed.map((placing): LadderPlayoffPayout => {
    const sharing = sharers.includes(placing);
    const potShare = sharing
      ? placing === top
        ? addPrizes(each, remainder)
        : each
      : NO_PRIZE;
    const prize = addPrizes(placing.placePrize, potShare);
    const players = Math.max(1, placing.playerIds.length);
    const perPlace = splitPrize(placing.placePrize, players);
    const perShare = splitPrize(potShare, players);
    return {
      ...placing,
      potShare,
      prize,
      perPlayer: { placePrize: perPlace, potShare: perShare, prize: addPrizes(perPlace, perShare) },
    };
  });

  return { payouts, unclaimed, kept: sharers.length ? NO_PRIZE : unclaimed };
};
