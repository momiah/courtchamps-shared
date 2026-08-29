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
 * Persisted check-in state for a ladder match. Check-in is a single mutual
 * handshake: the poster displays a QR code, the accepter scans it, and on a
 * successful scan the match is checked in as a unit (both players at once).
 * Absent until that scan completes.
 */
export interface LadderMatchCheckIn {
  /**
   * userIds of the participants who have completed their own check-in. Every
   * player checks in from their own (location-verified) device, so the games
   * only unlock once this covers every participant — for singles that's 2, for
   * doubles all 4.
   */
  checkedInBy: string[];
  /** Per-user check-in time, keyed by userId. */
  checkedInAt: Record<string, Date>;
  /** True once every participant has checked in and the games are unlocked. */
  completed: boolean;
  /** When the match became fully checked in (the last participant checked in). */
  completedAt?: Date;
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
  /** userId of the player who accepted the match (set on accept). */
  acceptedBy?: string;
  /** When the match was accepted (set on accept). */
  acceptedAt?: Date;
  /** Persisted check-in handshake state (set on a successful QR scan). */
  checkIn?: LadderMatchCheckIn;
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
