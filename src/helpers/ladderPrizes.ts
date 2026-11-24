import type { Ladder } from "../types/ladder";
import type { LadderPlayoffTie } from "../types/ladderPlayoff";
import {
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS,
  LADDER_PLAYOFF_WALKOVER_REASON,
} from "../types/ladderPlayoff";
import { roundLabel } from "./advanceBrackets";
import { calculateLadderPrizePool } from "./calculateLadderPrizePool";
import { getEffectiveLadderSize } from "./ladderPlayoffStructure";
import {
  getLadderCpPayoutForPlace,
  getLadderCpPayouts,
  getLadderPayoutForPlace,
  getLadderPayouts,
} from "./ladderPayoutStructure";
import type { LadderPayoutBand } from "./ladderPayoutStructure";

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
    cp: getLadderCpPayoutForPlace(pool.xp, size, place),
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
 * How a finishing place reads: "1st" to "4th", "Joint 2nd" for a void Final,
 * and "Joint 5th", "Joint 9th"… for everyone knocked out in the same round
 * (a place below 4th is the bottom of its round's band, e.g. 8 for 5th–8th).
 */
export const formatLadderFinishPlace = (place: number, voided = false): string =>
  place > 4
    ? `Joint ${ordinalPlace(place / 2 + 1)}`
    : `${voided ? "Joint " : ""}${ordinalPlace(place)}`;

/** "1st", or "Quarter-Final (Joint 5th)" for a band of places a playoff round shares. */
export const formatLadderPayoutPlace = (payout: Pick<LadderPayoutBand, "toPlace">) =>
  payout.toPlace > 4
    ? `${roundLabel(payout.toPlace)} (${formatLadderFinishPlace(payout.toPlace)})`
    : formatLadderFinishPlace(payout.toPlace);

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

export const splitLadderPrize = (prize: LadderPlacePrize, players: number): LadderPlacePrize => ({
  cash: Math.round((prize.cash / Math.max(1, players)) * 100) / 100,
  cp: Math.floor(prize.cp / Math.max(1, players)),
});

/** "£897 and 2,240 CP", or for a pair "£897 and 2,240 CP for your team (£448.50 and 1,120 CP each)". */
export const formatLadderSidePrize = (
  prize: LadderPlacePrize,
  players: number,
  currencyType: string,
): string | null => {
  const won = formatLadderPrizeWon(prize, currencyType);
  if (!won || players < 2) return won;
  return `${won} for your team (${formatLadderPrizeWon(splitLadderPrize(prize, players), currencyType)} each)`;
};

const sumPayouts = (payouts: { total: number }[]): number =>
  payouts.reduce((sum, payout) => sum + payout.total, 0);

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
 * place. The prize nobody won goes into the Unclaimed Prize Pot: its cash is
 * split equally between the sides that won cash, its CP between the sides that
 * won CP, counting only sides that played and were not disqualified, any
 * rounding going to the highest finisher; with nobody to share it, it is
 * retained by Court Champs. A disqualified side keeps its place and
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
  const pot = {
    cash: pool.cash > 0 ? sumPayouts(getLadderPayouts(pool.cash, size)) : 0,
    cp: sumPayouts(getLadderCpPayouts(pool.xp, size)),
  };
  const claimed = placed.reduce((sum, placing) => addPrizes(sum, placing.placePrize), NO_PRIZE);
  const unclaimed = {
    cash: Math.max(0, pot.cash - claimed.cash),
    cp: Math.max(0, pot.cp - claimed.cp),
  };
  const sharing = placed.filter((placing) => !placing.voided && !placing.disqualified);
  const shareOf = (currency: keyof LadderPlacePrize) => {
    const sharers = sharing.filter((placing) => placing.placePrize[currency] > 0);
    const each = sharers.length ? Math.floor(unclaimed[currency] / sharers.length) : 0;
    const remainder = unclaimed[currency] - each * sharers.length;
    return (placing: (typeof placed)[number]): number =>
      sharers.includes(placing) ? each + (placing === sharers[0] ? remainder : 0) : 0;
  };
  const cashShare = shareOf("cash");
  const cpShare = shareOf("cp");
  const kept = {
    cash: sharing.some((placing) => placing.placePrize.cash > 0) ? 0 : unclaimed.cash,
    cp: sharing.some((placing) => placing.placePrize.cp > 0) ? 0 : unclaimed.cp,
  };

  const payouts = placed.map((placing): LadderPlayoffPayout => {
    const potShare = { cash: cashShare(placing), cp: cpShare(placing) };
    const prize = addPrizes(placing.placePrize, potShare);
    const players = Math.max(1, placing.playerIds.length);
    const perPlace = splitLadderPrize(placing.placePrize, players);
    const perShare = splitLadderPrize(potShare, players);
    return {
      ...placing,
      potShare,
      prize,
      perPlayer: { placePrize: perPlace, potShare: perShare, prize: addPrizes(perPlace, perShare) },
    };
  });

  return { payouts, unclaimed, kept };
};
