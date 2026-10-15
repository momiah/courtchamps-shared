import type { Court } from "./court";
import type { Game } from "./game";
import type { LadderType } from "./ladder";

export const SHUTTLE_TYPE = {
  FEATHER: "Feather",
  PLASTIC: "Plastic",
} as const;

export type ShuttleType = (typeof SHUTTLE_TYPE)[keyof typeof SHUTTLE_TYPE];

export const LADDER_MATCH_STATUS = {
  POSTED: "posted",
  ACCEPTED: "accepted",
  COMPLETED: "completed",
  /** Set when a player cancels the match from the match settings screen. */
  CANCELLED: "cancelled",
  /** Auto-set when an accepted match sees no activity for the expire window. */
  EXPIRED: "expired",
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
 * One side of a doubles ladder match. Captured at post time for the poster's
 * team and on accept for the opponent's, so score entry can group each game's
 * players into their team and scoring can update the right team docs. Absent on
 * singles matches.
 */
export interface MatchTeam {
  teamId: string;
  teamKey: string;
  playerIds: string[];
}

/**
 * A pending request from one side of an accepted match to cancel it. Only the
 * opposing side can accept (the match is cancelled) or decline (the request is
 * cleared and the match goes ahead).
 */
export interface LadderMatchCancellationRequest {
  requestedBy: string;
  requestedAt: Date;
}

/**
 * A pending request from one side of an accepted match, before any game is
 * reported, to move it to a new date and time. Only the opposing side can
 * accept (the match moves) or decline (the request is cleared).
 */
export interface LadderMatchRescheduleRequest {
  requestedBy: string;
  requestedAt: Date;
  matchDate: string;
  matchTime: MatchTime;
}

/**
 * A one-off extension of an accepted match once a game has been reported. It
 * applies straight away and the match does not expire before `expiresAt`.
 */
export interface LadderMatchExtension {
  requestedBy: string;
  requestedAt: Date;
  expiresAt: Date;
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
  /**
   * Doubles only: the two teams in this fixture. teams[0] is the poster's team
   * (set on post), teams[1] the accepter's (set on accept). Absent on singles.
   */
  teams?: MatchTeam[];
  /** Copied from the ladder so match consumers need not refetch it. */
  ladderType?: LadderType;
  /**
   * Set when the match completed as a walkover (e.g. an approved no-show) rather
   * than being played out. No games are recorded on a walkover.
   */
  walkover?: boolean;
  /** The winning side of a walkover: teamKey (doubles) or userId (singles). */
  walkoverWinner?: string;
  /** Why the match was forfeited, e.g. "No show" (extensible to other types). */
  walkoverReason?: string;
  /** When the match was completed (played out or by walkover). */
  completedAt?: Date;
  /**
   * True while a no-show report against this match is pending an admin decision;
   * check-in is paused until it resolves. Cleared if the report is rejected.
   */
  noShowReported?: boolean;
  /** When the match was auto-cancelled as unattended. */
  cancelledAt?: Date;
  /** Why the match was cancelled, e.g. "Unattended". */
  cancelledReason?: string;
  /**
   * Server-assigned report time per game, keyed by gameId. Written with a
   * server timestamp (the games array can't hold one) so auto-approval ages a
   * game from a clock the reporter can't set.
   */
  gameReportedAt?: Record<string, Date>;
  /** Last time a game was reported or approved — the match's activity clock. */
  lastUpdated?: Date;
  /** When the match was auto-expired after being abandoned mid-play. */
  expiredAt?: Date;
  /** Set while one side of an accepted match has asked to cancel it. */
  cancellationRequest?: LadderMatchCancellationRequest | null;
  /** Set while one side of an accepted match has asked to move it. */
  rescheduleRequest?: LadderMatchRescheduleRequest | null;
  /** Set once the match has used its one extension. */
  extension?: LadderMatchExtension | null;
  /** Set on the two matches that make up a playoff tie (see LadderPlayoffTie). */
  playoffTieId?: string | null;
  /** 1 = first match (the coin-toss winner hosts), 2 = second match, 3 = the one-game decider when the aggregate is level. */
  playoffLeg?: 1 | 2 | 3;
  /**
   * Playoff matches only: how many times the away side has declined the host's
   * arranged time for this match. Carried over when the host arranges again.
   */
  scheduleDeclines?: number;
  /**
   * Playoff match 2 offered on the spot after match 1, at match 1's court:
   * accepting carries match 1's check-in over; declining doesn't count as one
   * of the away side's declines.
   */
  playNow?: boolean;
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
