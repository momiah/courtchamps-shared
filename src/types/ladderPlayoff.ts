import type { GameTeam } from "./game";
import type { LadderHomeCourt } from "./ladder";

export const LADDER_PLAYOFF_TIES_COLLECTION = "playoffTies";

/** Days a tie has to play both matches (and a decider, if needed). */
export const LADDER_PLAYOFF_TIE_DAYS = 10;

/** Days into a tie's window when both sides get a reminder. */
export const LADDER_PLAYOFF_REMINDER_DAYS = [3, 6, 9] as const;

export const LADDER_PLAYOFF_TIE_OUTCOME = {
  /** Decided on aggregate once both matches (and any decider) were played. */
  PLAYED: "played",
  /** The window ran out; decided on what had been played. */
  DEADLINE: "deadline",
  /** One side only: the other feeder tie was void or a no-show walkover. */
  WALKOVER: "walkover",
  /** Neither side played (or neither side arrived); nobody goes through. */
  VOID: "void",
} as const;

export type LadderPlayoffTieOutcome =
  (typeof LADDER_PLAYOFF_TIE_OUTCOME)[keyof typeof LADDER_PLAYOFF_TIE_OUTCOME];

export type LadderPlayoffTieSide = "team1" | "team2";

/** Who hosts the first match, decided by the coin flip on the tie screen. */
export interface LadderPlayoffCoinToss {
  firstHost: LadderPlayoffTieSide;
  flippedBy: string;
  flippedAt: Date;
}

export const LADDER_PLAYOFF_TIE_STATUS = {
  /** Both sides known; waiting to be played. */
  SCHEDULED: "scheduled",
  /** One or both sides still to come from an earlier round. */
  AWAITING_ENTRANTS: "awaitingEntrants",
  COMPLETED: "completed",
} as const;

export type LadderPlayoffTieStatus =
  (typeof LADDER_PLAYOFF_TIE_STATUS)[keyof typeof LADDER_PLAYOFF_TIE_STATUS];

/** One side of a playoff tie: a player (singles) or team (doubles). */
export interface LadderPlayoffSide {
  /** userId (singles) or teamKey (doubles). */
  entrantKey: string;
  teamId: string | null;
  playerIds: string[];
  /** 1-based ladder ranking position when the bracket was created. */
  rank: number;
  homeCourt: LadderHomeCourt | null;
}

/**
 * One bracket slot, stored at ladders/{ladderId}/playoffTies/{tieId}. Written
 * only by the processLadderPhases Cloud Function. `team1` / `team2` carry the
 * players in the shape the bracket UI renders; `side1` / `side2` carry the
 * entrant details the backend needs.
 */
export interface LadderPlayoffTie {
  tieId: string;
  ladderId: string;
  /** 1-based round number. */
  round: number;
  /** 0-based position within the round. */
  slot: number;
  gameNumber: number;
  isThirdPlacePlayoff: boolean;
  team1: GameTeam;
  team2: GameTeam;
  side1: LadderPlayoffSide | null;
  side2: LadderPlayoffSide | null;
  status: LadderPlayoffTieStatus;
  winner: LadderPlayoffTieSide | null;
  createdAt: Date;
  /** Games per match for this round. */
  bestOf?: number;
  /** When both sides became known; the tie's window starts here. */
  scheduledAt?: Date | null;
  /** scheduledAt + LADDER_PLAYOFF_TIE_DAYS. */
  deadlineAt?: Date | null;
  coinToss?: LadderPlayoffCoinToss | null;
  leg1MatchId?: string | null;
  leg2MatchId?: string | null;
  /** True once the aggregate is level after both matches: one deciding game. */
  deciderRequired?: boolean;
  /** Reminder days (from LADDER_PLAYOFF_REMINDER_DAYS) already sent. */
  remindersSentDays?: number[];
  outcome?: LadderPlayoffTieOutcome | null;
  completedAt?: Date | null;
}
