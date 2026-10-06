import type { GameTeam } from "./game";
import type { LadderHomeCourt } from "./ladder";

export const LADDER_PLAYOFF_TIES_COLLECTION = "playoffTies";

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
  winner: "team1" | "team2" | null;
  createdAt: Date;
}
