import type { Court } from "./court";
import type { Game } from "./game";

export const SHUTTLE_TYPE = {
  FEATHER: "Feather",
  PLASTIC: "Plastic",
} as const;

export type ShuttleType = (typeof SHUTTLE_TYPE)[keyof typeof SHUTTLE_TYPE];

export const LADDER_MATCH_STATUS = {
  POSTED: "posted",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
} as const;

export type LadderMatchStatus =
  (typeof LADDER_MATCH_STATUS)[keyof typeof LADDER_MATCH_STATUS];

export const LADDER_MATCH_BEST_OF_OPTIONS = [5, 7, 9, 11] as const;

/** A scheduled match slot in 24-hour "HH:MM" format. `end` is optional. */
export interface MatchTime {
  start: string;
  end?: string;
}

/**
 * A ladder match: a single fixture between players that contains `bestOf`
 * individual {@link Game} shells.
 */
export interface LadderMatch {
  ladderMatchId: string;
  court: Court;
  bestOf: number;
  matchDate: string;
  matchTime: MatchTime;
  /**
   * Total court-hire cost, split across players. The poster pays the venue
   * first; the accepter then pays their share to the poster, and the platform
   * fee is deducted from that amount before it reaches the poster.
   */
  courtFee: number;
  currencyType: string;
  participants: string[];
  games: Game[];
  matchStatus: LadderMatchStatus;
  shuttleType: ShuttleType;
  createdBy: string;
  createdAt: Date;
}

export type LadderMatchInput = Pick<
  LadderMatch,
  | "court"
  | "bestOf"
  | "matchDate"
  | "matchTime"
  | "courtFee"
  | "currencyType"
  | "shuttleType"
>;
