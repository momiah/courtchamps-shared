import type { MatchTeam } from "./ladderMatch";

/** Minutes after the scheduled start before a present player may report a no-show. */
export const NO_SHOW_GRACE_MINUTES = 30;

export const NO_SHOW_STATUS = {
  /** Waiting for the rest of the present team to co-sign the claim. */
  COLLECTING: "collecting",
  /** Fully co-signed by the present team; awaiting admin review. */
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type NoShowStatus = (typeof NO_SHOW_STATUS)[keyof typeof NO_SHOW_STATUS];

/**
 * A claim that an opposing side failed to check in, entitling the present side
 * to a walkover. Raised from the check-in flow after the grace period: every
 * present player on the claiming side co-signs (see `signatures`), then it goes
 * to a ladder admin to approve. On approval the match is completed as a plain
 * walkover win — no games, so no game XP/medals, but the result still counts in
 * each side's match-result form.
 */
export interface NoShowClaim {
  claimId: string;
  ladderId: string;
  ladderMatchId: string;
  /** Denormalised for the admin list (avoids a match read per claim). */
  matchDate: string;
  matchTime: string;
  courtName: string;
  /** The present side claiming the walkover. */
  claimantTeam: MatchTeam;
  /** The side that failed to check in. */
  noShowTeam: MatchTeam;
  /**
   * userIds on the claiming side who have co-signed. The claim is submitted
   * (status PENDING) once this covers every player in `claimantTeam.playerIds`.
   */
  signatures: string[];
  status: NoShowStatus;
  createdBy: string;
  createdAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
}
