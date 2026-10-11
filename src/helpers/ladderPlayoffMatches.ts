import { LADDER_MATCH_STATUS } from "../types/ladderMatch";
import type {
  LadderMatch,
  LadderMatchInput,
  MatchTeam,
} from "../types/ladderMatch";
import { LADDER_TYPE } from "../types/ladder";
import type { LadderType } from "../types/ladder";
import type { LadderPlayoffSide } from "../types/ladderPlayoff";
import { createLadderMatchGames } from "./createLadderMatchGames";
import {
  LADDER_PLAYOFF_REMINDER_DAYS,
  LADDER_PLAYOFF_TIE_OUTCOME,
  LADDER_PLAYOFF_TIE_STATUS,
} from "../types/ladderPlayoff";
import type {
  LadderPlayoffCoinToss,
  LadderPlayoffTie,
  LadderPlayoffTieOutcome,
  LadderPlayoffTieSide,
} from "../types/ladderPlayoff";
import type { Game } from "../types/game";
import { isLadderGameApproved, teamUserIds } from "./ladderMatchResult";
import { ladderPlayoffTieId } from "./ladderPlayoffs";
import { scheduleLadderPlayoffTie } from "./ladderPlayoffSchedule";

const DAY_MS = 24 * 60 * 60 * 1000;

export const LADDER_PLAYOFF_DECIDER_BEST_OF = 1;

type PlayoffLeg = Pick<LadderMatch, "games" | "matchStatus" | "playoffLeg">;

export const otherLadderPlayoffSide = (
  side: LadderPlayoffTieSide,
): LadderPlayoffTieSide => (side === "team1" ? "team2" : "team1");

/** Reminder days now due for a tie that haven't been sent yet. */
export const getDueLadderPlayoffReminderDays = (
  tie: Pick<
    LadderPlayoffTie,
    "status" | "scheduledAt" | "remindersSentDays"
  >,
  now: Date,
): number[] => {
  if (tie.status !== LADDER_PLAYOFF_TIE_STATUS.SCHEDULED || !tie.scheduledAt) {
    return [];
  }
  const elapsedDays = (now.getTime() - tie.scheduledAt.getTime()) / DAY_MS;
  const sent = tie.remindersSentDays ?? [];
  return LADDER_PLAYOFF_REMINDER_DAYS.filter(
    (day) => elapsedDays >= day && !sent.includes(day),
  );
};

export const flipLadderPlayoffCoin = ({
  random,
  userId,
  now,
}: {
  random: () => number;
  userId: string;
  now: Date;
}): LadderPlayoffCoinToss => ({
  firstHost: random() < 0.5 ? "team1" : "team2",
  flippedBy: userId,
  flippedAt: now,
});

/** Who hosts a leg: the coin-toss winner hosts match 1; the other side hosts match 2 and any decider. */
export const getLadderPlayoffLegHost = (
  coinToss: Pick<LadderPlayoffCoinToss, "firstHost">,
  leg: 1 | 2 | 3,
): LadderPlayoffTieSide =>
  leg === 1 ? coinToss.firstHost : otherLadderPlayoffSide(coinToss.firstHost);

const sideOfPlayers = (
  tie: Pick<LadderPlayoffTie, "side1" | "side2">,
  userIds: string[],
): LadderPlayoffTieSide | null => {
  if (userIds.some((id) => tie.side1?.playerIds.includes(id))) return "team1";
  if (userIds.some((id) => tie.side2?.playerIds.includes(id))) return "team2";
  return null;
};

export interface LadderPlayoffTally {
  team1Games: number;
  team2Games: number;
  team1Points: number;
  team2Points: number;
  gamesPlayed: number;
}

const addGame = (
  tie: Pick<LadderPlayoffTie, "side1" | "side2">,
  tally: LadderPlayoffTally,
  game: Game,
): LadderPlayoffTally => {
  const winnerSide = game.result
    ? sideOfPlayers(tie, teamUserIds(game, game.result.winner.team))
    : null;
  if (!winnerSide) return tally;
  const team1Label = sideOfPlayers(tie, teamUserIds(game, "Team 1"));
  const gameTeam1Score = game.team1?.score ?? 0;
  const gameTeam2Score = game.team2?.score ?? 0;
  const [team1Score, team2Score] =
    team1Label === "team1"
      ? [gameTeam1Score, gameTeam2Score]
      : [gameTeam2Score, gameTeam1Score];
  return {
    team1Games: tally.team1Games + Number(winnerSide === "team1"),
    team2Games: tally.team2Games + Number(winnerSide === "team2"),
    team1Points: tally.team1Points + team1Score,
    team2Points: tally.team2Points + team2Score,
    gamesPlayed: tally.gamesPlayed + 1,
  };
};

/** Approved games and points per tie side across every leg (decider included). */
export const tallyLadderPlayoffTie = (
  tie: Pick<LadderPlayoffTie, "side1" | "side2">,
  legs: PlayoffLeg[],
): LadderPlayoffTally =>
  legs
    .flatMap((leg) => (leg.games ?? []).filter(isLadderGameApproved))
    .reduce<LadderPlayoffTally>((tally, game) => addGame(tie, tally, game), {
      team1Games: 0,
      team2Games: 0,
      team1Points: 0,
      team2Points: 0,
      gamesPlayed: 0,
    });

const legByNumber = (legs: PlayoffLeg[], leg: 1 | 2 | 3) =>
  legs.find((match) => match.playoffLeg === leg);

const isLegComplete = (leg: PlayoffLeg | undefined): boolean =>
  leg?.matchStatus === LADDER_MATCH_STATUS.COMPLETED;

export interface LadderPlayoffTieDecision {
  decided: boolean;
  winner: LadderPlayoffTieSide | null;
  deciderRequired: boolean;
  tally: LadderPlayoffTally;
}

/**
 * Once both matches are complete: the side with more games won goes through;
 * if level, the one-game decider (leg 3) settles it.
 */
export const decideLadderPlayoffTie = (
  tie: Pick<LadderPlayoffTie, "side1" | "side2">,
  legs: PlayoffLeg[],
): LadderPlayoffTieDecision => {
  const regularLegs = legs.filter((leg) => leg.playoffLeg !== 3);
  const tally = tallyLadderPlayoffTie(tie, regularLegs);
  const undecided = { decided: false, winner: null, deciderRequired: false, tally };
  if (!isLegComplete(legByNumber(legs, 1)) || !isLegComplete(legByNumber(legs, 2))) {
    return undecided;
  }
  if (tally.team1Games !== tally.team2Games) {
    return {
      decided: true,
      winner: tally.team1Games > tally.team2Games ? "team1" : "team2",
      deciderRequired: false,
      tally,
    };
  }
  const decider = legByNumber(legs, 3);
  if (!isLegComplete(decider)) {
    return { ...undecided, deciderRequired: true };
  }
  const deciderTally = tallyLadderPlayoffTie(tie, [decider as PlayoffLeg]);
  if (deciderTally.team1Games === deciderTally.team2Games) {
    return { ...undecided, deciderRequired: true };
  }
  return {
    decided: true,
    winner: deciderTally.team1Games > deciderTally.team2Games ? "team1" : "team2",
    deciderRequired: true,
    tally,
  };
};

/**
 * When the window runs out: games won so far, then points, then the
 * higher-ranked side. Nothing played means nobody goes through.
 */
export const decideLadderPlayoffTieAtDeadline = (
  tie: Pick<LadderPlayoffTie, "side1" | "side2">,
  legs: PlayoffLeg[],
): { winner: LadderPlayoffTieSide | null; outcome: LadderPlayoffTieOutcome } => {
  const tally = tallyLadderPlayoffTie(tie, legs);
  if (tally.gamesPlayed === 0) {
    return { winner: null, outcome: LADDER_PLAYOFF_TIE_OUTCOME.VOID };
  }
  const outcome = LADDER_PLAYOFF_TIE_OUTCOME.DEADLINE;
  if (tally.team1Games !== tally.team2Games) {
    return { winner: tally.team1Games > tally.team2Games ? "team1" : "team2", outcome };
  }
  if (tally.team1Points !== tally.team2Points) {
    return { winner: tally.team1Points > tally.team2Points ? "team1" : "team2", outcome };
  }
  const rank1 = tie.side1?.rank ?? Number.POSITIVE_INFINITY;
  const rank2 = tie.side2?.rank ?? Number.POSITIVE_INFINITY;
  return { winner: rank1 <= rank2 ? "team1" : "team2", outcome };
};

const sideKey = (side: LadderPlayoffTieSide) =>
  side === "team1" ? "side1" : "side2";

/**
 * Records a tie's result and moves the bracket on: the winner fills their slot
 * in the next round (semi-final losers fill the 3rd-place game), a next-round
 * tie starts once both its feeders are finished, a tie left with one side is a
 * walkover, and a tie left with none is void. Returns every tie it changed.
 */
export const advanceLadderPlayoffBracket = ({
  ties,
  tieId,
  winner,
  outcome,
  now,
}: {
  ties: LadderPlayoffTie[];
  tieId: string;
  winner: LadderPlayoffTieSide | null;
  outcome: LadderPlayoffTieOutcome;
  now: Date;
}): LadderPlayoffTie[] => {
  const byId = new Map(ties.map((tie) => [tie.tieId, { ...tie }]));
  const changed = new Set<string>();
  const totalRounds = Math.max(
    ...ties.filter((tie) => !tie.isThirdPlacePlayoff).map((tie) => tie.round),
  );

  const update = (id: string, fields: Partial<LadderPlayoffTie>) => {
    const tie = byId.get(id);
    if (!tie) return;
    byId.set(id, { ...tie, ...fields });
    changed.add(id);
  };

  const sideOf = (tie: LadderPlayoffTie, side: LadderPlayoffTieSide | null) =>
    side
      ? { side: tie[sideKey(side)], team: side === "team1" ? tie.team1 : tie.team2 }
      : { side: null, team: { player1: null, player2: null } };

  const isFinished = (tie: LadderPlayoffTie | undefined) =>
    tie?.status === LADDER_PLAYOFF_TIE_STATUS.COMPLETED;

  const feedersOf = (tie: LadderPlayoffTie): (LadderPlayoffTie | undefined)[] => {
    const feederRound = tie.round - 1;
    const firstSlot = tie.isThirdPlacePlayoff ? 0 : tie.slot * 2;
    return [
      byId.get(ladderPlayoffTieId(feederRound, firstSlot)),
      byId.get(ladderPlayoffTieId(feederRound, firstSlot + 1)),
    ];
  };

  const complete = (
    id: string,
    tieWinner: LadderPlayoffTieSide | null,
    tieOutcome: LadderPlayoffTieOutcome,
  ) => {
    update(id, {
      status: LADDER_PLAYOFF_TIE_STATUS.COMPLETED,
      winner: tieWinner,
      outcome: tieOutcome,
      completedAt: now,
    });
    propagate(id);
  };

  const tryStart = (id: string) => {
    const tie = byId.get(id);
    if (!tie || isFinished(tie)) return;
    if (!feedersOf(tie).every(isFinished)) return;
    const hasTeam1 = !!tie.side1;
    const hasTeam2 = !!tie.side2;
    if (hasTeam1 && hasTeam2) {
      update(id, scheduleLadderPlayoffTie(now));
    } else if (hasTeam1 || hasTeam2) {
      complete(id, hasTeam1 ? "team1" : "team2", LADDER_PLAYOFF_TIE_OUTCOME.WALKOVER);
    } else {
      complete(id, null, LADDER_PLAYOFF_TIE_OUTCOME.VOID);
    }
  };

  const fill = (
    targetId: string,
    position: LadderPlayoffTieSide,
    from: LadderPlayoffTie,
    side: LadderPlayoffTieSide | null,
  ) => {
    const { side: entrant, team } = sideOf(from, side);
    update(targetId, {
      [sideKey(position)]: entrant,
      [position]: team,
    } as Partial<LadderPlayoffTie>);
  };

  const propagate = (id: string) => {
    const tie = byId.get(id);
    if (!tie || tie.isThirdPlacePlayoff || tie.round >= totalRounds) return;
    const position: LadderPlayoffTieSide = tie.slot % 2 === 0 ? "team1" : "team2";
    const nextId = ladderPlayoffTieId(tie.round + 1, Math.floor(tie.slot / 2));
    fill(nextId, position, tie, tie.winner);

    const thirdPlace =
      tie.round === totalRounds - 1
        ? ties.find((candidate) => candidate.isThirdPlacePlayoff)
        : undefined;
    if (thirdPlace) {
      const loser =
        tie.winner && tie.side1 && tie.side2 ? otherLadderPlayoffSide(tie.winner) : null;
      fill(thirdPlace.tieId, position, tie, loser);
    }

    tryStart(nextId);
    if (thirdPlace) tryStart(thirdPlace.tieId);
  };

  complete(tieId, winner, outcome);
  return [...changed].map((id) => byId.get(id) as LadderPlayoffTie);
};

const toMatchTeam = (side: LadderPlayoffSide): MatchTeam => ({
  teamId: side.teamId ?? "",
  teamKey: side.entrantKey,
  playerIds: side.playerIds,
});

/**
 * A playoff match between a tie's two sides, hosted by `host`. Matches 1 and 2
 * use the round's best-of; the decider (leg 3) is one game. No court fee: each
 * side pays its own home venue. Posted until the away side accepts.
 */
export const buildLadderPlayoffLegMatch = ({
  tie,
  leg,
  host,
  ladderMatchId,
  ladderType,
  input,
  createdBy,
  now,
  accepted = false,
}: {
  tie: Pick<LadderPlayoffTie, "tieId" | "side1" | "side2" | "bestOf">;
  leg: 1 | 2 | 3;
  host: LadderPlayoffTieSide;
  ladderMatchId: string;
  ladderType: LadderType;
  input: Pick<
    LadderMatchInput,
    "court" | "matchDate" | "matchTime" | "currencyType" | "shuttleType"
  >;
  createdBy: string;
  now: Date;
  accepted?: boolean;
}): LadderMatch => {
  const hostSide = host === "team1" ? tie.side1 : tie.side2;
  const awaySide = host === "team1" ? tie.side2 : tie.side1;
  if (!hostSide || !awaySide) {
    throw new Error(`Playoff tie ${tie.tieId} needs both sides before a match`);
  }
  const bestOf = leg === 3 ? LADDER_PLAYOFF_DECIDER_BEST_OF : tie.bestOf ?? 5;
  const isDoubles = ladderType === LADDER_TYPE.DOUBLES;
  return {
    ladderMatchId,
    court: input.court,
    bestOf,
    matchDate: input.matchDate,
    matchTime: input.matchTime,
    courtFee: 0,
    currencyType: input.currencyType,
    shuttleType: input.shuttleType,
    participants: [...hostSide.playerIds, ...awaySide.playerIds],
    games: createLadderMatchGames(bestOf, ladderMatchId),
    matchStatus: accepted
      ? LADDER_MATCH_STATUS.ACCEPTED
      : LADDER_MATCH_STATUS.POSTED,
    createdBy,
    createdAt: now,
    ...(accepted ? { acceptedAt: now } : {}),
    ...(isDoubles ? { teams: [toMatchTeam(hostSide), toMatchTeam(awaySide)] } : {}),
    ladderType,
    playoffTieId: tie.tieId,
    playoffLeg: leg,
  };
};
