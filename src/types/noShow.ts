import type { MatchTeam } from "./ladderMatch";

/** Minutes after the scheduled start before a blocked player may report a no-show. */
export const NO_SHOW_GRACE_MINUTES = 30;

export const NO_SHOW_STATUS = {
  /** Raised by the blocked player; awaiting a ladder admin's decision. */
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type NoShowStatus = (typeof NO_SHOW_STATUS)[keyof typeof NO_SHOW_STATUS];

/**
 * A claim that an opposing side failed to show, so the present side is entitled
 * to a walkover. Raised from the check-in flow after the grace period by the
 * single geofence-verified player who is blocked from checking in because the
 * opponent didn't turn up (singles: the lone player; doubles: the player whose
 * opponent can't scan/be scanned). A ladder admin reviews and approves it — the
 * admin is the reliability gate, so no co-signing is required.
 *
 * On approval the match completes as a plain walkover win for `claimantTeam`:
 * no games are created (so no game CP, point difference or achievement medals),
 * but the match win/loss still lands in each side's match-result form and
 * counts toward each side's win/loss tally.
 */
export interface NoShowClaim {
  claimId: string;
  ladderId: string;
  ladderMatchId: string;
  /** Denormalised for the admin list (avoids a match read per claim). */
  matchDate: string;
  matchTime: string;
  courtName: string;
  /** The present side, awarded the walkover. Whole team, not just the claimant. */
  claimantTeam: MatchTeam;
  /** The side that didn't show. */
  noShowTeam: MatchTeam;
  /** The blocked player who raised the claim. */
  createdBy: string;
  status: NoShowStatus;
  createdAt: Date;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
}
