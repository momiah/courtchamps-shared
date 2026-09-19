import type { MatchTeam } from "./ladderMatch";

/** Minutes after the scheduled start before a blocked player may report a no-show. */
export const NO_SHOW_GRACE_MINUTES = 30;

/**
 * CP awarded to the walkover winner, and deducted from the no-show, when a
 * no-show claim is approved. Flat and format-independent so match length can't
 * inflate it, and capped at the no-show's own balance (floored at 0) so it only
 * ever transfers CP that was genuinely earned — a walkover never mints CP.
 */
export const WALKOVER_CP = 50;

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
 * no games are created (so no game point difference, achievement medals or
 * global XP), but the match win/loss lands in each side's match-result form and
 * win/loss tally, and {@link WALKOVER_CP} ladder CP transfers from the no-show
 * to the claimant (capped at the no-show's balance, floored at 0).
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
